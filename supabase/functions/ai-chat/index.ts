import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, lang = "ru" } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [toursRes, guidesRes, placesRes, articlesRes] = await Promise.all([
      supabase.from("tours").select("id,title_ru,title_en,short_description_ru,short_description_en,price_from,duration_hours,languages,rating").eq("published", true).limit(20),
      supabase.from("guides").select("id,name,tagline,languages,specialties,rating,city_id").limit(10),
      supabase.from("places").select("id,name,short_description,category,tags").eq("published", true).limit(20),
      supabase.from("articles").select("id,title,excerpt,slug").eq("published", true).limit(10),
    ]);

    const tours = toursRes.data || [];
    const guides = guidesRes.data || [];
    const places = placesRes.data || [];
    const articles = articlesRes.data || [];

    const systemPrompt = `Ты — AI ассистент платформы Hamroh для планирования поездок по Узбекистану.

ВАЖНО: Отвечай ТОЛЬКО на основе данных из нашей базы ниже. Не используй внешние знания.
Если информации нет в базе — честно скажи "У нас пока нет такого в базе".
Отвечай на русском языке. Будь дружелюбным и конкретным.

В конце КАЖДОГО ответа добавляй JSON блок с рекомендациями в точно таком формате:
<recommendations>
[{"type":"tour","id":"ID_ТУРА","title":"НАЗВАНИЕ","price":ЦЕНА,"rating":РЕЙТИНГ},{"type":"guide","id":"ID_ГИДА","title":"ИМЯ","rating":РЕЙТИНГ},{"type":"place","id":"ID_МЕСТА","title":"НАЗВАНИЕ","category":"КАТЕГОРИЯ"},{"type":"article","id":"ID","title":"НАЗВАНИЕ","slug":"SLUG"}]
</recommendations>

Включай только РЕАЛЬНО РЕЛЕВАНТНЫЕ рекомендации из базы. Максимум 4 рекомендации.

НАШИ ТУРЫ:
${tours.map((t: any) => `ID:${t.id} | ${t.title_ru || t.title_en}: ${t.short_description_ru || t.short_description_en || ""} | $${t.price_from} | ${t.duration_hours}ч | Языки: ${(t.languages || []).join(", ")} | ★${t.rating}`).join("\n")}

НАШИ ГИДЫ:
${guides.map((g: any) => `ID:${g.id} | ${g.name}: ${g.tagline || ""} | Языки: ${(g.languages || []).join(", ")} | Специализация: ${(g.specialties || []).join(", ")} | ★${g.rating}`).join("\n")}

МЕСТА:
${places.map((p: any) => `ID:${p.id} | ${p.name} (${p.category}): ${p.short_description || ""} | Теги: ${(p.tags || []).join(", ")}`).join("\n")}

СТАТЬИ:
${articles.map((a: any) => `ID:${a.id} | ${a.title}: ${a.excerpt || ""} | slug:${a.slug}`).join("\n")}`;

    const geminiMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
      }),
    });

    const data = await response.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const recMatch = fullText.match(/<recommendations>([\s\S]*?)<\/recommendations>/);
    let recommendations = [];
    let text = fullText.replace(/<recommendations>[\s\S]*?<\/recommendations>/g, "").trim();

    if (recMatch) {
      try {
        recommendations = JSON.parse(recMatch[1].trim());
      } catch (e) {}
    }

    return new Response(JSON.stringify({ message: text, recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
