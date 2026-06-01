import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";


type ChatBody = { messages?: UIMessage[]; threadId?: string };

async function buildSystemPrompt(client: ReturnType<typeof createClient<any, any, any>>) {
  const [guidesRes, placesRes] = await Promise.all([
    client
      .from("guides")
      .select("slug, name, tagline, languages, specialties, price_per_day, rating, reviews, instant_book, cities(name)")
      .order("sort_order", { ascending: true }),
    client
      .from("places")
      .select("name, category, short_description, tags, cities(name), place_guides(guides(slug, name))")
      .eq("published", true)
      .order("sort_order", { ascending: true }),
  ]);

  const guidesCatalog = ((guidesRes.data ?? []) as Array<{
      slug: string; name: string; tagline: string; languages: string[]; specialties: string[];
      price_per_day: number; rating: number; reviews: number; instant_book: boolean;
      cities: { name: string } | { name: string }[] | null;
    }>)
    .map((g) => {
      const cityName = Array.isArray(g.cities) ? g.cities[0]?.name ?? "" : g.cities?.name ?? "";
      return `- id: ${g.slug} | ${g.name} | City: ${cityName} | Languages: ${g.languages.join(", ")} | Specialties: ${g.specialties.join(", ")} | $${g.price_per_day}/day | Rating ${g.rating} (${g.reviews}) | ${g.instant_book ? "Instant book" : "Request to book"} | ${g.tagline}`;
    })
    .join("\n");

  const placesCatalog = ((placesRes.data ?? []) as unknown as Array<{
      name: string; category: string; short_description: string; tags: string[];
      cities: { name: string } | { name: string }[] | null;
      place_guides: Array<{ guides: { slug: string; name: string } | { slug: string; name: string }[] | null }> | null;
    }>)
    .map((p) => {
      const cityName = Array.isArray(p.cities) ? p.cities[0]?.name ?? "" : p.cities?.name ?? "";
      const linkedGuides = (p.place_guides ?? [])
        .flatMap((pg) => (Array.isArray(pg.guides) ? pg.guides : pg.guides ? [pg.guides] : []))
        .map((g) => `${g.name} (${g.slug})`)
        .join(", ");
      return `- ${p.name} [${p.category}] | City: ${cityName}${p.tags.length ? ` | Tags: ${p.tags.join(", ")}` : ""} | ${p.short_description}${linkedGuides ? ` | Guides who take travelers here: ${linkedGuides}` : ""}`;
    })
    .join("\n");

  return `You are Hamroi AI, a friendly travel concierge for Uzbekistan helping travelers find the perfect local guide and discover the best places.

You have access to two verified catalogs:

=== GUIDES CATALOG ===
${guidesCatalog || "(no guides yet)"}

=== PLACES CATALOG (restaurants, attractions, activities, routes) ===
${placesCatalog || "(no places yet)"}

Rules:
- When the user asks about places to visit, eat, or things to do — ALWAYS check PLACES CATALOG first. Recommend our verified places by name with a short reason.
- After recommending a place, suggest a guide who can take them there (look at "Guides who take travelers here" or any guide in that city whose specialties match).
- When recommending guides directly, mention them by name and explain WHY they fit (language, specialty, vibe).
- At the end of any recommendation that includes guides, output a line in this exact format on its own line: GUIDES: id1,id2,id3 (using guide slug ids). The UI will render them as cards.
- If PLACES CATALOG has nothing relevant, you MAY call the web_search tool to find fresh info (events, hours, new spots). Always frame web results as "I found this online" and then suggest a local guide who can verify it in person.
- Prefer our catalog over web results when both exist. Web search is a fallback, not the default.
- Do NOT invent specific restaurant or place names. Either use PLACES CATALOG, web_search results, or honestly recommend a guide instead.
- Keep replies warm, concise, and useful. Use light markdown (bold, lists).
- If the user asks about something unrelated to travel, gently steer back.`;
}

function createWebSearchTool() {
  return tool({
    description:
      "Search the web for fresh information about places, restaurants, events, opening hours, or attractions in Uzbekistan. Use only when PLACES CATALOG has no relevant entry.",
    inputSchema: z.object({
      query: z.string().describe("Search query in English or Russian, e.g. 'best plov restaurants Tashkent 2026'"),
      city: z.string().optional().describe("City name for context, e.g. Tashkent, Samarkand"),
    }),
    execute: async ({ query, city }) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return { error: "Web search not configured" };
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: city ? `${query} ${city} Uzbekistan` : `${query} Uzbekistan`,
            search_depth: "basic",
            max_results: 5,
            include_answer: true,
          }),
        });
        if (!res.ok) return { error: `Search failed: ${res.status}` };
        const data = (await res.json()) as {
          answer?: string;
          results?: Array<{ title: string; url: string; content: string }>;
        };
        const results = (data.results ?? []).slice(0, 5).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 300),
        }));
        // Log discovered places for admin moderation (fire-and-forget)
        if (results.length > 0) {
          const top = results[0];
          supabaseAdmin
            .from("place_suggestions")
            .insert({
              name: top.title.slice(0, 200),
              category: "other",
              city_name: city ?? "",
              description: (data.answer ?? top.snippet ?? "").slice(0, 1000),
              raw_query: query,
              source_url: top.url,
              status: "pending",
            })
            .then(() => {});
        }

        return { answer: data.answer ?? null, results };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Search error" };
      }
    },
  });
}


export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, supabasePublishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatBody;
        if (!Array.isArray(body.messages) || !body.threadId) {
          return new Response("Bad request", { status: 400 });
        }
        const threadId = body.threadId;

        // Verify thread ownership
        const { data: thread } = await userClient.from("ai_threads").select("id, title").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Persist the latest user message
        const last = body.messages[body.messages.length - 1];
        if (last?.role === "user") {
          await userClient.from("ai_messages").insert({
            thread_id: threadId,
            role: "user",
            parts: last.parts as unknown as object,
          });

          // Auto-title from first user message if still default
          if (thread.title === "New search") {
            const text = last.parts
              .map((p: { type: string; text?: string }) => (p.type === "text" ? p.text : ""))
              .join(" ")
              .slice(0, 60);
            if (text) {
              await userClient.from("ai_threads").update({ title: text, updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          } else {
            await userClient.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
          }
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: await buildSystemPrompt(userClient),
          messages: await convertToModelMessages(body.messages),
          tools: { web_search: createWebSearchTool() },
          stopWhen: stepCountIs(50),
        });


        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            const assistant = messages[messages.length - 1];
            if (assistant?.role === "assistant") {
              await userClient.from("ai_messages").insert({
                thread_id: threadId,
                role: "assistant",
                parts: assistant.parts as unknown as object,
              });
              await userClient.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          },
        });
      },
    },
  },
});
