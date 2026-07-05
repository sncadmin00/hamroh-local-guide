import { createClient } from "jsr:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp<T>(val: T | undefined, fallback: T): T {
  return val !== undefined ? val : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    const name = String(clamp(body.name, "")).trim().slice(0, 120);
    const city = String(clamp(body.city, "")).trim().slice(0, 80);
    const years = body.years !== undefined && body.years !== null ? String(body.years) : "";
    const languages = Array.isArray(body.languages) ? body.languages.map(String).filter(Boolean).slice(0, 20) : [];
    const specializations = Array.isArray(body.specializations)
      ? body.specializations.map(String).filter(Boolean).slice(0, 20)
      : [];
    const specialization = String(clamp(body.specialization, "")).trim().slice(0, 200);
    const highlight = String(clamp(body.highlight, "")).trim().slice(0, 600);
    const style = String(clamp(body.style, "")).trim().slice(0, 600);
    const why = String(clamp(body.why, "")).trim().slice(0, 600);
    const language_hint = String(clamp(body.language_hint, "auto")).trim().slice(0, 20);

    const langLine =
      language_hint && language_hint !== "auto"
        ? `Write the bio in this language: ${language_hint}.`
        : `Detect the language of the user's answers (Russian, Uzbek, or English) and write the bio in that same language.`;

    const system = `You write warm, honest, first-person "About me" bios for local tour guides in Uzbekistan. 3-5 sentences, friendly but not cheesy, no emojis, no bullet points, no quotes. Mention the city, what they show travelers, and why they love it. Sound like a real person, not marketing copy. ${langLine}`;

    const facts = [
      name && `Name: ${name}`,
      city && `City: ${city}`,
      years !== "" && `Years of experience: ${years}`,
      languages.length && `Languages: ${languages.join(", ")}`,
      specializations.length && `Categories: ${specializations.join(", ")}`,
      specialization && `Specialization: ${specialization}`,
      highlight && `What they always show: ${highlight}`,
      style && `How they lead tours: ${style}`,
      why && `Why they love it: ${why}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!facts.trim()) {
      return new Response(JSON.stringify({ error: "No guide data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "custom",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Here is what the guide told me:\n\n${facts}\n\nWrite their About me text now.` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI credits exhausted. Please top up your balance." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gateway ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const bio = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ bio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
