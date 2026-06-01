import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
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
- If PLACES CATALOG has nothing relevant for the user's city/category, be honest: say "I don't have verified spots for that yet in our catalog" and pivot to recommending a local guide who specializes in that area — they'll know the freshest spots in person.
- Do NOT invent specific restaurant or place names that aren't in PLACES CATALOG. It's better to recommend a guide than to give outdated info.
- Keep replies warm, concise, and useful. Use light markdown (bold, lists).
- If the user asks about something unrelated to travel, gently steer back.`;
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
