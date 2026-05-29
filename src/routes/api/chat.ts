import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatBody = { messages?: UIMessage[]; threadId?: string };

async function buildSystemPrompt(client: ReturnType<typeof createClient<any, any, any>>) {
  const { data } = await client
    .from("guides")
    .select("slug, name, tagline, languages, specialties, price_per_day, rating, reviews, instant_book, cities(name)")
    .order("sort_order", { ascending: true });

  const catalog = ((data ?? []) as Array<{
      slug: string; name: string; tagline: string; languages: string[]; specialties: string[];
      price_per_day: number; rating: number; reviews: number; instant_book: boolean;
      cities: { name: string } | { name: string }[] | null;
    }>)
    .map((g) => {
      const cityName = Array.isArray(g.cities) ? g.cities[0]?.name ?? "" : g.cities?.name ?? "";
      return `- id: ${g.slug} | ${g.name} | City: ${cityName} | Languages: ${g.languages.join(", ")} | Specialties: ${g.specialties.join(", ")} | $${g.price_per_day}/day | Rating ${g.rating} (${g.reviews}) | ${g.instant_book ? "Instant book" : "Request to book"} | ${g.tagline}`;
    })
    .join("\n");

  return `You are Sancho AI, a friendly travel concierge helping travelers find the perfect local guide.

You have access to the following verified guide catalog:

${catalog}

Rules:
- When recommending guides, mention them by name and explain WHY they fit the traveler's needs (language, specialty, vibe).
- At the end of any recommendation, output a line in this exact format on its own line: GUIDES: id1,id2,id3 (using guide ids from the catalog). The UI will render them as cards.
- Keep replies warm, concise, and useful. Use light markdown (bold, lists).
- If the user asks about something unrelated to travel or guides, gently steer back.`;
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
