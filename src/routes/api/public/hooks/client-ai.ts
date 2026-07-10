/**
 * Public hook: Client (tourist) AI concierge — non-streaming, mobile-friendly.
 *
 * Mirrors the web /api/chat logic (same system prompt, same RAG over articles,
 * same guide/tour/place catalogs, same rate limits) but returns a single JSON
 * response instead of an AI SDK stream, and extracts the trailing
 *   GUIDES: slug1,slug2
 *   TOURS:  slug1,slug2
 * lines into arrays so mobile can render cards.
 *
 * Method: POST
 * URL:    /api/public/hooks/client-ai
 * Auth:   Authorization: Bearer <supabase user JWT> (tourist)
 *
 * Request body:
 *   {
 *     "message": "string, required, <= 300 chars",
 *     "history": [ { "role": "user"|"assistant", "content": "string" } ],  // optional
 *     "lang":    "en" | "ru" | "uz"                                        // optional, default "en"
 *   }
 *
 * Response 200:
 *   {
 *     "message":    "assistant reply as markdown (places inline as [name](maps url))",
 *     "guideSlugs": ["slug1", "slug2"],
 *     "tourSlugs":  ["slug1", "slug2"],
 *     "history":    [ ...updated turns, send back next request ]
 *   }
 *
 * Errors:
 *   400  { error }  — missing / oversized message, invalid JSON
 *   401  { error }  — missing/invalid JWT
 *   429  { error }  — 20 requests / rolling 24h exceeded
 *   500  { error }  — AI not configured / upstream failure
 *
 * Guarantees (parity with web /api/chat):
 * - AI is strictly scoped to Uzbekistan travel + Hamroh marketplace.
 * - Only recommends guides/tours/places/articles that exist in our DB.
 * - No external web access, no invented entities. Same hard system prompt.
 * - Rate limit: 20 AI requests per user per rolling 24h (ai_usage_log).
 * - Message length limit: 300 chars.
 * - All DB reads go through the user's JWT (RLS applies).
 */
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { retrieveArticleContext } from "@/lib/articles-rag.functions";

const DAILY_LIMIT = 20;
const MAX_QUERY_LEN = 300;

type Turn = { role: "user" | "assistant"; content: string };
type Lang = "en" | "ru" | "uz";
type Holiday = { title: string; date_start: string; date_end?: string | null };
type ClientContext = { upcomingHolidays?: Holiday[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeHolidays(input: unknown): Holiday[] {
  if (!Array.isArray(input)) return [];
  const out: Holiday[] = [];
  for (const h of input) {
    if (!h || typeof h !== "object") continue;
    const rec = h as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim().slice(0, 120) : "";
    const date_start = typeof rec.date_start === "string" ? rec.date_start.slice(0, 10) : "";
    const date_end =
      typeof rec.date_end === "string" && DATE_RE.test(rec.date_end.slice(0, 10))
        ? rec.date_end.slice(0, 10)
        : null;
    if (!title || !DATE_RE.test(date_start)) continue;
    out.push({ title, date_start, date_end });
    if (out.length >= 20) break;
  }
  return out;
}

function formatHolidaysBlock(holidays: Holiday[]): string {
  if (!holidays.length) return "(none provided)";
  return holidays
    .map((h) => {
      const range = h.date_end && h.date_end !== h.date_start ? `${h.date_start} → ${h.date_end}` : h.date_start;
      return `- ${range}: ${h.title}`;
    })
    .join("\n");
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

async function buildSystemPrompt(
  client: ReturnType<typeof createClient<any, any, any>>,
  articleContext: Array<{ title: string; slug: string; content: string }>,
  lang: Lang,
  holidays: Holiday[],
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
  }>)
    .map((p) => {
      const cityName = Array.isArray(p.cities) ? p.cities[0]?.name ?? "" : p.cities?.name ?? "";
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${cityName}`.trim())}`;
      return `- ${p.name} [${p.category}] | City: ${cityName}${p.tags?.length ? ` | Tags: ${p.tags.join(", ")}` : ""} | ${p.short_description} | MapsURL: ${mapsUrl}`;
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
        .map((a, i) => `[${i + 1}] From article "${a.title}" (/explore/${a.slug}):\n${a.content}`)
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

=== UPCOMING PUBLIC HOLIDAYS IN UZBEKISTAN (client-provided; use only if the user asks about travel dates, opening hours, or planning around specific days) ===
${formatHolidaysBlock(holidays)}
- Warn the traveller that on these dates many shops, bazaars, museums, and offices may be closed or on reduced hours; transport can be busier and prices higher. Mention this only when it's relevant to the user's question — never as a random aside.



=== HOW TO ANSWER ===
- ALWAYS reply in this language: ${lang === "ru" ? "Russian (русский)" : lang === "uz" ? "Uzbek (o'zbek tili, latin script)" : "English"}. This is the user's selected UI language — ignore the language of their query and respond ONLY in the selected language.
- Keep replies warm, concise, useful. Light markdown (bold, lists).
- Whenever the user asks about a trip, city, food, or activity, recommend a combination of GUIDES + TOURS that fit.
- Naturally mention 2-4 relevant PLACES inline in your prose (things to see, eat, photograph). Each mentioned place MUST be a markdown link to its MapsURL from the PLACES CATALOG, e.g. "попробуйте плов в [Besh Qozon](https://www.google.com/maps/...)". Never invent a place or a URL — only use places and URLs from the catalog above. Do not create a separate "Places" list/section.
- At the very end of your reply, on separate lines, output the slugs of GUIDES and TOURS you recommended so the UI can render cards:
  GUIDES: guideSlug1,guideSlug2
  TOURS: tourSlug1,tourSlug2
  Omit a line if you have nothing to recommend for that category. Do NOT output a PLACES line. Use ONLY slugs from the catalogs above.`;
}

function extractSlugs(text: string): { message: string; guideSlugs: string[]; tourSlugs: string[] } {
  const guideSlugs: string[] = [];
  const tourSlugs: string[] = [];
  const lines = text.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const g = line.match(/^\s*GUIDES\s*:\s*(.+)\s*$/i);
    const t = line.match(/^\s*TOURS\s*:\s*(.+)\s*$/i);
    if (g) {
      g[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => guideSlugs.push(s));
    } else if (t) {
      t[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => tourSlugs.push(s));
    } else {
      kept.push(line);
    }
  }
  return {
    message: kept.join("\n").trim(),
    guideSlugs: Array.from(new Set(guideSlugs)),
    tourSlugs: Array.from(new Set(tourSlugs)),
  };
}

export const Route = createFileRoute("/api/public/hooks/client-ai")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePk = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, supabasePk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userRes.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
        }
        const userId = userRes.user.id;

        let body: { message?: string; history?: Turn[]; lang?: Lang };
        try {
          body = (await request.json()) as { message?: string; history?: Turn[]; lang?: Lang };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
        }
        const message = (body.message ?? "").trim();
        if (!message) {
          return Response.json({ error: "Missing message" }, { status: 400, headers: corsHeaders() });
        }
        if (message.length > MAX_QUERY_LEN) {
          return Response.json(
            { error: `Message too long. Max ${MAX_QUERY_LEN} characters.` },
            { status: 400, headers: corsHeaders() },
          );
        }
        const lang: Lang = body.lang === "ru" || body.lang === "uz" ? body.lang : "en";
        const history: Turn[] = Array.isArray(body.history)
          ? body.history
              .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
              .slice(-40)
          : [];

        // Rate limit: 20 / rolling 24h
        const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: usageCount } = await userClient
          .from("ai_usage_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", sinceIso);
        if ((usageCount ?? 0) >= DAILY_LIMIT) {
          return Response.json(
            { error: `Daily AI limit reached (${DAILY_LIMIT} / 24h). Try again later or contact a guide directly.` },
            { status: 429, headers: corsHeaders() },
          );
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "AI not configured" }, { status: 500, headers: corsHeaders() });
        }

        // RAG: article context for the latest user message
        let articleContext: Array<{ title: string; slug: string; content: string }> = [];
        try {
          articleContext = await retrieveArticleContext(message, key, 4);
        } catch (e) {
          console.error("client-ai: article retrieval failed", e);
        }

        const system = await buildSystemPrompt(userClient, articleContext, lang);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3.1-flash-lite-preview");

        try {
          const result = await generateText({
            model,
            system,
            messages: [
              ...history.map((h) => ({ role: h.role, content: h.content })),
              { role: "user" as const, content: message },
            ],
          });

          // Log usage (same table as /api/chat).
          await userClient.from("ai_usage_log").insert({ user_id: userId });

          const raw = result.text?.trim() ?? "";
          const { message: cleanMessage, guideSlugs, tourSlugs } = extractSlugs(raw);

          const nextHistory: Turn[] = [
            ...history,
            { role: "user" as const, content: message },
            { role: "assistant" as const, content: cleanMessage },
          ].slice(-40);

          return Response.json(
            {
              message: cleanMessage,
              guideSlugs,
              tourSlugs,
              history: nextHistory,
            },
            { headers: corsHeaders() },
          );
        } catch (e) {
          console.error("client-ai: generateText failed", e);
          const msg = e instanceof Error ? e.message : "AI request failed";
          return Response.json({ error: msg }, { status: 500, headers: corsHeaders() });
        }
      },
    },
  },
});
