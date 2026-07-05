// Language proficiency assessment for the mobile guide application.
// Mirrors src/lib/language-test.functions.ts (assessLanguageTest) so the mobile
// app can POST audio and get back {language, level, transcript, feedback}.
//
// Request JSON:
//   {
//     language: string            // e.g. "English", "Russian", "Uzbek"
//     audio_base64: string        // raw base64 (no data: prefix)
//     mime_type: string           // e.g. "audio/webm", "audio/mp4"
//     prompt_text?: string        // what the candidate was asked to talk about
//   }
//
// Response JSON:
//   {
//     language: string
//     level: "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|"N/A"
//     transcript: string          // transcription of the audio (original language)
//     feedback: string            // 1-2 sentences, English
//     spoken_language: string     // what language the AI actually heard
//   }

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2", "N/A"] as const;
type Level = (typeof CEFR)[number];

function detectFormat(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  return "webm";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const language = String(body.language ?? "").trim().slice(0, 64);
    const audio_base64 = String(body.audio_base64 ?? "");
    const mime_type = String(body.mime_type ?? "").trim().slice(0, 60);
    const prompt_text = String(body.prompt_text ?? "").trim().slice(0, 500);

    if (!language) {
      return new Response(JSON.stringify({ error: "language is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (audio_base64.length < 100 || audio_base64.length > 15_000_000) {
      return new Response(JSON.stringify({ error: "audio_base64 missing or out of range" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mime_type) {
      return new Response(JSON.stringify({ error: "mime_type is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const format = detectFormat(mime_type);

    const system = `You are a strict language proficiency examiner. The candidate is applying to work as a tour guide and recorded a short spoken sample in ${language}. Your job:
1. Transcribe what they actually said (in the original language).
2. Assess their spoken proficiency in ${language} using the CEFR scale (A1, A2, B1, B2, C1, C2). If they spoke a different language or there is no intelligible speech, use "N/A".
3. Write a short honest comment (1–2 sentences, in English) about fluency, pronunciation, grammar, and whether they can actually guide tourists in ${language}.
Return ONLY valid JSON, no markdown, no commentary, matching exactly:
{"transcript": string, "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|"N/A", "feedback": string, "spoken_language": string}`;

    const userText = prompt_text
      ? `They were asked to speak in ${language} about: "${prompt_text}". Assess the recording.`
      : `Assess this recording in ${language}.`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "custom",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "input_audio", input_audio: { data: audio_base64, format } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gateway ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";

    let parsed: { transcript?: string; level?: string; feedback?: string; spoken_language?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned unexpected output");
      parsed = JSON.parse(m[0]);
    }

    const level: Level = (CEFR as readonly string[]).includes(parsed.level ?? "")
      ? (parsed.level as Level)
      : "N/A";

    return new Response(
      JSON.stringify({
        language,
        level,
        transcript: (parsed.transcript ?? "").slice(0, 4000),
        feedback: (parsed.feedback ?? "").slice(0, 600),
        spoken_language: (parsed.spoken_language ?? "").slice(0, 60),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
