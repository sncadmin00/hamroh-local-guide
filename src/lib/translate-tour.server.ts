import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export type TourLang = "ru" | "uz" | "en";

const LANG_LABEL: Record<TourLang, string> = {
  ru: "Russian",
  uz: "Uzbek (Latin script)",
  en: "English",
};

// Map "Russian"/"English"/"Uzbek" (and variants) to ru/en/uz
export function mapBaseLanguage(name: string | null | undefined): TourLang {
  const s = String(name ?? "").toLowerCase();
  if (s.startsWith("en")) return "en";
  if (s.startsWith("uz") || s.startsWith("o‘z") || s.startsWith("o'z") || s.includes("uzbek")) return "uz";
  return "ru";
}

export interface TourTranslationInput {
  sourceLang: TourLang;
  title: string;
  short_description: string;
  description_md?: string;
  highlights?: string[];
  included?: string[];
  not_included?: string[];
}

export type TourTranslationOutput = Record<
  TourLang,
  {
    title: string;
    short_description: string;
    description_md: string;
    highlights: string[];
    included: string[];
    not_included: string[];
  }
>;

export async function translateTourFields(
  input: TourTranslationInput,
): Promise<Partial<TourTranslationOutput>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.warn("[translateTourFields] Missing LOVABLE_API_KEY — skipping translation");
    return {};
  }

  const targets = (["ru", "uz", "en"] as const).filter((l) => l !== input.sourceLang);
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3-flash-preview");

  try {
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
              highlights: z.array(z.string()),
              included: z.array(z.string()),
              not_included: z.array(z.string()),
            }),
          ),
        }),
      }),
      prompt: `You are translating a tour listing for a guided-tours marketplace in Uzbekistan.

Source language: ${LANG_LABEL[input.sourceLang]}.
Translate the fields below into: ${targets.map((t) => LANG_LABEL[t]).join(", ")}.

Rules:
- Keep proper nouns (place names, food names, people) recognizable; transliterate only when natural.
- Keep tone friendly and concise; do not add new information.
- Preserve markdown formatting in description_md (line breaks, lists).
- If a source field is empty, return an empty string for that field.

SOURCE:
title: ${JSON.stringify(input.title)}
short_description: ${JSON.stringify(input.short_description)}
description_md: ${JSON.stringify(input.description_md ?? "")}
highlights: ${JSON.stringify(input.highlights ?? [])}
included: ${JSON.stringify(input.included ?? [])}
not_included: ${JSON.stringify(input.not_included ?? [])}

Return one translations entry per target language (${targets.join(", ")}). Translate every array item and keep the same array lengths/order.`,
    });

    const out: Partial<TourTranslationOutput> = {};
    for (const t of result.output.translations) {
      if (targets.includes(t.lang as TourLang)) {
        out[t.lang as TourLang] = {
          title: t.title,
          short_description: t.short_description,
          description_md: t.description_md,
          highlights: Array.isArray(t.highlights) ? t.highlights : [],
          included: Array.isArray(t.included) ? t.included : [],
          not_included: Array.isArray(t.not_included) ? t.not_included : [],
        };
      }
    }
    return out;
  } catch (e) {
    console.error("[translateTourFields] failed:", e);
    return {};
  }
}
