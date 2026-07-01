import { createClient } from "jsr:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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
Отвечай на языке: ${lang}. Будь дружелюбным и конкретным.

В конце КАЖДОГО ответа добавляй JSON блок с рекомендациями в точно таком формате:
<recommendations>
[{"type":"tour","id":"ID","title":"НАЗВАНИЕ","price":ЦЕНА,"rating":РЕЙТИНГ},{"type":"guide","id":"ID","title":"ИМЯ","rating":РЕЙТИНГ},{"type":"place","id":"ID","title":"НАЗВАНИЕ","category":"КАТЕГОРИЯ"},{"type":"article","id":"ID","title":"НАЗВАНИЕ","slug":"SLUG"}]
</recommendations>

Максимум 4 релевантных рекомендации из базы.

НАШИ ТУРЫ:
${tours.map((t: any) => `ID:${t.id} | ${t.title_ru || t.title_en}: ${t.short_description_ru || t.short_description_en || ""} | $${t.price_from} | ${t.duration_hours}ч | Языки: ${(t.languages || []).join(", ")} | ★${t.rating}`).join("\n")}

НАШИ ГИДЫ:
${guides.map((g: any) => `ID:${g.id} | ${g.name}: ${g.tagline || ""} | Языки: ${(g.languages || []).join(", ")} | Специализация: ${(g.specialties || []).join(", ")} | ★${g.rating}`).join("\n")}

МЕСТА:
${places.map((p: any) => `ID:${p.id} | ${p.name} (${p.category}): ${p.short_description || ""} | Теги: ${(p.tags || []).join(", ")}`).join("\n")}

СТАТЬИ:
${articles.map((a: any) => `ID:${a.id} | ${a.title}: ${a.excerpt || ""} | slug:${a.slug}`).join("\n")}`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "custom",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Кредиты Lovable AI закончились. Пополните баланс." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gateway ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content || "";

    const recMatch = fullText.match(/<recommendations>([\s\S]*?)<\/recommendations>/);
    let recommendations = [];
    const text = fullText.replace(/<recommendations>[\s\S]*?<\/recommendations>/g, "").trim();

    if (recMatch) {
      try {
        recommendations = JSON.parse(recMatch[1].trim());
      } catch (_e) {}
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
