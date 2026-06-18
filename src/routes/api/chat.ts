import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { retrieveArticleContext } from "@/lib/articles-rag.functions";

type ChatBody = { messages?: UIMessage[]; threadId?: string; lang?: "en" | "uz" | "ru" };


const DAILY_LIMIT = 20;
const MAX_QUERY_LEN = 300;

async function buildSystemPrompt(
  client: ReturnType<typeof createClient<any, any, any>>,
  articleContext: Array<{ title: string; slug: string; content: string }> = [],
) {

  const [guidesRes, placesRes, toursRes] = await Promise.all([
    client
      .from("guides")
      .select("slug, name, tagline, languages, specialties, price_per_day, rating, reviews, instant_book, cities(name)")
      .order("sort_order", { ascending: true }),
    client
      .from("places")
      .select("slug, name, category, short_description, tags, cities(name), place_guides(guides(slug, name))")
      .eq("published", true)
      .order("sort_order", { ascending: true }),
    client
      .from("tours")
      .select("slug, title, short_description, duration_hours, price_from, languages, cities(name), guides(slug, name), tour_categories(categories(slug, name))")
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
      slug: string; name: string; category: string; short_description: string; tags: string[];
      cities: { name: string } | { name: string }[] | null;
      place_guides: Array<{ guides: { slug: string; name: string } | { slug: string; name: string }[] | null }> | null;
    }>)
    .map((p) => {
      const cityName = Array.isArray(p.cities) ? p.cities[0]?.name ?? "" : p.cities?.name ?? "";
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${cityName}`.trim())}`;
      return `- ${p.name} [${p.category}] | City: ${cityName}${p.tags.length ? ` | Tags: ${p.tags.join(", ")}` : ""} | ${p.short_description} | MapsURL: ${mapsUrl}`;
    })
    .join("\n");

  const toursCatalog = ((toursRes.data ?? []) as unknown as Array<{
      slug: string; title: string; short_description: string; duration_hours: number; price_from: number;
      languages: string[]; cities: { name: string } | { name: string }[] | null;
      guides: { slug: string; name: string } | { slug: string; name: string }[] | null;
      tour_categories: Array<{ categories: { slug: string; name: string } | null }> | null;
    }>)
    .map((t) => {
      const cityName = Array.isArray(t.cities) ? t.cities[0]?.name ?? "" : t.cities?.name ?? "";
      const guide = Array.isArray(t.guides) ? t.guides[0] : t.guides;
      const cats = (t.tour_categories ?? []).map((tc) => tc.categories?.name).filter(Boolean).join(", ");
      return `- slug: ${t.slug} | ${t.title} | City: ${cityName} | ${t.duration_hours}h | from $${t.price_from} | Languages: ${(t.languages ?? []).join(", ")}${cats ? ` | Categories: ${cats}` : ""}${guide ? ` | Guide: ${guide.name} (${guide.slug})` : ""} | ${t.short_description}`;
    })
    .join("\n");

  const articlesBlock = articleContext.length
    ? articleContext
        .map(
          (a, i) =>
            `[${i + 1}] From article "${a.title}" (/explore/${a.slug}):\n${a.content}`,
        )
        .join("\n\n---\n\n")
    : "(no relevant articles)";

  return `You are Hamroi AI — a STRICTLY SCOPED travel concierge for the Hamroh marketplace of guided tours in Uzbekistan.

=== ABSOLUTE RULES (NEVER BREAK) ===
1. You ONLY answer questions about: travel in Uzbekistan, Hamroh guides, Hamroh tours, trip planning inside Uzbekistan, and practical travel info (visa, weather, transport, food, culture) for visiting Uzbekistan.
2. You MUST REFUSE all other requests, including but not limited to: coding help, homework, essays, translations of arbitrary text, recipes, math, general knowledge questions, news, politics, medical/legal/financial advice, roleplay, jokes, stories, anything unrelated to Uzbekistan travel.
3. If a user asks anything off-topic, reply briefly in their language: "Я помогаю только с путешествиями по Узбекистану и подбором гидов Hamroh. Спросите меня о турах или гидах!" — and STOP. Do not partially answer. Do not be clever about it.
4. You MUST recommend ONLY guides and tours from the catalogs below. NEVER invent guides, tours, restaurants, hotels, or places. For PLACES you may only mention items from the PLACES CATALOG. If nothing matches, honestly say so and offer to connect them with a guide who can advise in person.
5. You have NO web access and NO external tools. Do not pretend to search anything.
6. When you use information from the ARTICLES block below, cite the article by its title and link as a markdown link: [Title](/explore/slug).

=== GUIDES CATALOG ===
${guidesCatalog || "(no guides yet)"}

=== TOURS CATALOG ===
${toursCatalog || "(no tours yet)"}

=== PLACES CATALOG (mention inline in your text — DO NOT list them in a separate section or output their slugs) ===
${placesCatalog || "(no places yet)"}

=== RELEVANT ARTICLES (use this knowledge first when relevant) ===
${articlesBlock}

=== HOW TO ANSWER ===
- Match the user's language (RU/UZ/EN).
- Keep replies warm, concise, useful. Light markdown (bold, lists).
- Whenever the user asks about a trip, city, food, or activity, recommend a combination of GUIDES + TOURS that fit.
- Naturally mention 2-4 relevant PLACES inline in your prose (things to see, eat, photograph). Each mentioned place MUST be a markdown link to its MapsURL from the PLACES CATALOG, e.g. "попробуйте плов в [Besh Qozon](https://www.google.com/maps/...)". Never invent a place or a URL — only use places and URLs from the catalog above. Do not create a separate "Places" list/section.
- At the very end of your reply, on separate lines, output the slugs of GUIDES and TOURS you recommended so the UI can render cards:
  GUIDES: guideSlug1,guideSlug2
  TOURS: tourSlug1,tourSlug2
  Omit a line if you have nothing to recommend for that category. Do NOT output a PLACES line. Use ONLY slugs from the catalogs above.`;
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

        // RAG: retrieve relevant article chunks based on the latest user message
        let articleContext: Array<{ title: string; slug: string; content: string }> = [];
        if (last?.role === "user") {
          const queryText = (last.parts ?? [])
            .map((p: { type: string; text?: string }) => (p.type === "text" ? p.text ?? "" : ""))
            .join(" ")
            .trim();
          if (queryText) {
            try {
              articleContext = await retrieveArticleContext(queryText, key, 4);
            } catch (e) {
              console.error("article retrieval failed", e);
            }
          }
        }

        const result = streamText({
          model,
          system: await buildSystemPrompt(userClient, articleContext),
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
