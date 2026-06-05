import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { retrieveArticleContext } from "@/lib/articles-rag.functions";

type ChatBody = { messages?: UIMessage[]; threadId?: string };


const DAILY_LIMIT = 20;
const MAX_QUERY_LEN = 300;

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

  return `You are Hamroi AI — a STRICTLY SCOPED travel concierge for the Hamroh marketplace of guided tours in Uzbekistan.

=== ABSOLUTE RULES (NEVER BREAK) ===
1. You ONLY answer questions about: travel in Uzbekistan, Hamroh guides, Hamroh places/tours, trip planning inside Uzbekistan, and practical travel info (visa, weather, transport, food, culture) for visiting Uzbekistan.
2. You MUST REFUSE all other requests, including but not limited to: coding help, homework, essays, translations of arbitrary text, recipes, math, general knowledge questions, news, politics, medical/legal/financial advice, roleplay, jokes, stories, anything unrelated to Uzbekistan travel.
3. If a user asks anything off-topic, reply briefly in their language: "Я помогаю только с путешествиями по Узбекистану и подбором гидов Hamroh. Спросите меня о турах, гидах или местах!" — and STOP. Do not partially answer. Do not be clever about it.
4. You MUST recommend ONLY guides and places from the catalogs below. NEVER invent guides, restaurants, hotels, or places. If nothing matches, honestly say so and offer to connect them with a guide who can advise in person.
5. You have NO web access and NO external tools. Do not pretend to search anything.

=== GUIDES CATALOG ===
${guidesCatalog || "(no guides yet)"}

=== PLACES CATALOG ===
${placesCatalog || "(no places yet)"}

=== HOW TO ANSWER ===
- Match the user's language (RU/UZ/EN).
- Keep replies warm, concise, useful. Light markdown (bold, lists).
- When recommending guides, output their slugs at the end on its own line: GUIDES: id1,id2,id3 — the UI renders them as cards.
- Suggest a guide whenever you recommend a place.`;
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
        const userId = userRes.user.id;

        const body = (await request.json()) as ChatBody;
        if (!Array.isArray(body.messages) || !body.threadId) {
          return new Response("Bad request", { status: 400 });
        }
        const threadId = body.threadId;

        // Validate last user message length
        const last = body.messages[body.messages.length - 1];
        if (last?.role === "user") {
          const text = (last.parts ?? [])
            .map((p: { type: string; text?: string }) => (p.type === "text" ? p.text ?? "" : ""))
            .join("");
          if (text.length > MAX_QUERY_LEN) {
            return new Response(
              JSON.stringify({ error: `Слишком длинный запрос. Максимум ${MAX_QUERY_LEN} символов.` }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        // Rate limit: max DAILY_LIMIT AI requests per user per rolling 24h
        const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: usageCount } = await userClient
          .from("ai_usage_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", sinceIso);
        if ((usageCount ?? 0) >= DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: `Вы достигли лимита ${DAILY_LIMIT} запросов к ИИ за 24 часа. Попробуйте завтра или напишите гиду напрямую.`,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }

        // Verify thread ownership
        const { data: thread } = await userClient.from("ai_threads").select("id, title").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Persist the latest user message + log usage
        if (last?.role === "user") {
          await userClient.from("ai_messages").insert({
            thread_id: threadId,
            role: "user",
            parts: last.parts as unknown as object,
          });
          await userClient.from("ai_usage_log").insert({ user_id: userId });

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
        // Cheapest fast model for high-volume chat
        const model = gateway("google/gemini-3.1-flash-lite-preview");

        const result = streamText({
          model,
          system: await buildSystemPrompt(userClient),
          messages: await convertToModelMessages(body.messages),
          stopWhen: stepCountIs(3),
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
