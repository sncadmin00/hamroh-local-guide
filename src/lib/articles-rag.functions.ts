import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

/** Split markdown into ~1000-char chunks with 150-char overlap, by paragraph when possible. */
function chunkText(text: string, maxLen = 1000, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > maxLen) {
      if (buf) chunks.push(buf.trim());
      if (p.length > maxLen) {
        // hard-split very long paragraph
        let i = 0;
        while (i < p.length) {
          chunks.push(p.slice(i, i + maxLen));
          i += maxLen - overlap;
        }
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function embedBatch(input: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Admin-only: re-embed a single article. Deletes old chunks and re-creates them. */
export const reindexArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { articleId?: string };
    if (!v?.articleId || typeof v.articleId !== "string") {
      throw new Error("articleId required");
    }
    return { articleId: v.articleId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin check
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: article, error } = await supabaseAdmin
      .from("articles")
      .select("id, title, excerpt, body_md")
      .eq("id", data.articleId)
      .maybeSingle();
    if (error || !article) throw new Error("Article not found");

    // Delete existing chunks
    await supabaseAdmin.from("article_chunks").delete().eq("article_id", article.id);

    // Build chunks: prepend title + excerpt to body
    const fullText = [article.title, article.excerpt, article.body_md].filter(Boolean).join("\n\n");
    const chunks = chunkText(fullText);
    if (chunks.length === 0) return { ok: true, chunks: 0 };

    // Embed in batches of 32
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += 32) {
      const batch = chunks.slice(i, i + 32);
      const vecs = await embedBatch(batch, apiKey);
      embeddings.push(...vecs);
    }

    const rows = chunks.map((content, idx) => ({
      article_id: article.id,
      chunk_index: idx,
      content,
      embedding: embeddings[idx] as unknown as string,
      model: EMBEDDING_MODEL,
    }));

    const { error: insertErr } = await supabaseAdmin.from("article_chunks").insert(rows);
    if (insertErr) throw new Error(insertErr.message);

    return { ok: true, chunks: chunks.length };
  });

/** Admin-only: re-embed every published article (one-time bootstrap). */
export const reindexAllArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("published", true);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let total = 0;
    for (const a of articles ?? []) {
      try {
        // Call the same flow inline (avoid HTTP)
        const { data: article } = await supabaseAdmin
          .from("articles")
          .select("id, title, excerpt, body_md")
          .eq("id", a.id)
          .maybeSingle();
        if (!article) continue;
        await supabaseAdmin.from("article_chunks").delete().eq("article_id", article.id);
        const fullText = [article.title, article.excerpt, article.body_md].filter(Boolean).join("\n\n");
        const chunks = chunkText(fullText);
        if (chunks.length === 0) continue;
        const embeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i += 32) {
          const batch = chunks.slice(i, i + 32);
          embeddings.push(...(await embedBatch(batch, apiKey)));
        }
        const rows = chunks.map((content, idx) => ({
          article_id: article.id,
          chunk_index: idx,
          content,
          embedding: embeddings[idx] as unknown as string,
          model: EMBEDDING_MODEL,
        }));
        await supabaseAdmin.from("article_chunks").insert(rows);
        total += chunks.length;
      } catch (e) {
        console.error("reindex failed for article", a.id, e);
      }
    }
    return { ok: true, articles: articles?.length ?? 0, chunks: total };
  });

/** Server-side helper used by chat: embed a query and return top-k matching article chunks. */
export async function retrieveArticleContext(
  query: string,
  apiKey: string,
  limit = 4,
): Promise<Array<{ title: string; slug: string; content: string; similarity: number }>> {
  if (!query.trim()) return [];
  const [embedding] = await embedBatch([query.slice(0, 500)], apiKey);
  if (!embedding) return [];

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("match_article_chunks", {
    query_embedding: embedding as unknown as string,
    match_count: limit,
  });
  if (error || !data) return [];
  return (data as Array<{ article_title: string; article_slug: string; content: string; similarity: number }>)
    .filter((r) => r.similarity > 0.35)
    .map((r) => ({
      title: r.article_title,
      slug: r.article_slug,
      content: r.content,
      similarity: r.similarity,
    }));
}
