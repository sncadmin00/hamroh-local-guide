import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const LANG_LABEL: Record<"ru" | "uz" | "en", string> = {
  ru: "Russian",
  uz: "Uzbek (Latin script)",
  en: "English",
};

const Input = z.object({
  sourceLang: z.enum(["ru", "uz", "en"]),
  title: z.string().max(500).default(""),
  short_description: z.string().max(2000).default(""),
  description_md: z.string().max(20000).default(""),
});

export const translateTourContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const targets = (["ru", "uz", "en"] as const).filter((l) => l !== data.sourceLang);
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const result = await generateText({
      model,
      output: Output.object({
        schema: z.object({
          translations: z.array(
            z.object({
              lang: z.enum(["ru", "uz", "en"]),
              title: z.string(),
              short_description: z.string(),
              description_md: z.string(),
            }),
          ),
        }),
      }),
      prompt: `You are translating a tour listing for a guided-tours marketplace in Uzbekistan.

Source language: ${LANG_LABEL[data.sourceLang]}.
Translate the fields below into: ${targets.map((t) => LANG_LABEL[t]).join(", ")}.

Rules:
- Keep proper nouns (place names, food names, people) recognizable; transliterate only when natural.
- Keep tone friendly and concise; do not add new information.
- Preserve markdown formatting in description_md (line breaks, lists).
- If a source field is empty, return an empty string for that field.

SOURCE:
title: ${JSON.stringify(data.title)}
short_description: ${JSON.stringify(data.short_description)}
description_md: ${JSON.stringify(data.description_md)}

Return one translations entry per target language (${targets.join(", ")}).`,
    });

    const out: Record<string, { title: string; short_description: string; description_md: string }> = {};
    for (const t of result.output.translations) {
      if (targets.includes(t.lang as any)) {
        out[t.lang] = {
          title: t.title,
          short_description: t.short_description,
          description_md: t.description_md,
        };
      }
    }
    return out;
  });
