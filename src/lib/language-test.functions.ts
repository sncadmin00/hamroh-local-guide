import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  language: z.string().trim().min(1).max(64),
  audio_base64: z.string().min(100).max(15_000_000), // ~10 MB base64
  mime_type: z.string().trim().min(3).max(60),
  prompt_text: z.string().trim().max(500).optional().default(""),
});

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2", "N/A"] as const;

export const assessLanguageTest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const format = (() => {
      const m = data.mime_type.toLowerCase();
      if (m.includes("webm")) return "webm";
      if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
      if (m.includes("wav")) return "wav";
      if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
      if (m.includes("ogg")) return "ogg";
      return "webm";
    })();

    const system = `You are a strict language proficiency examiner. The candidate is applying to work as a tour guide and recorded a short spoken sample in ${data.language}. Your job:
1. Transcribe what they actually said (in the original language).
2. Assess their spoken proficiency in ${data.language} using the CEFR scale (A1, A2, B1, B2, C1, C2). If they spoke a different language or there is no intelligible speech, use "N/A".
3. Write a short honest comment (1–2 sentences, in English) about fluency, pronunciation, grammar, and whether they can actually guide tourists in ${data.language}.
Return ONLY valid JSON, no markdown, no commentary, matching exactly:
{"transcript": string, "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|"N/A", "feedback": string, "spoken_language": string}`;

    const userText = data.prompt_text
      ? `They were asked to speak in ${data.language} about: "${data.prompt_text}". Assess the recording.`
      : `Assess this recording in ${data.language}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              {
                type: "input_audio",
                input_audio: { data: data.audio_base64, format },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please contact admin.");
      throw new Error(`AI assessment failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";

    let parsed: { transcript?: string; level?: string; feedback?: string; spoken_language?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned unexpected output");
      parsed = JSON.parse(m[0]);
    }

    const level = (CEFR as readonly string[]).includes(parsed.level ?? "")
      ? (parsed.level as (typeof CEFR)[number])
      : "N/A";

    return {
      language: data.language,
      transcript: (parsed.transcript ?? "").slice(0, 4000),
      level,
      feedback: (parsed.feedback ?? "").slice(0, 600),
      spoken_language: (parsed.spoken_language ?? "").slice(0, 60),
    };
  });
