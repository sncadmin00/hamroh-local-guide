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

export interface TourTranslationFields {
  title: string;
  short_description: string;
  description_md: string;
  highlights: string[];
  included: string[];
  not_included: string[];
}

export type TourTranslationOutput = Record<TourLang, TourTranslationFields>;

export interface TranslationResult {
  /** Translations per target language. May be empty if all attempts failed. */
  translations: Partial<TourTranslationOutput>;
  /** True when at least one attempt succeeded and produced at least one target. */
  ok: boolean;
  /** Human-readable error info when translations failed / are incomplete. */
  error?: string;
  /** Number of AI attempts made. */
  attempts: number;
}

function buildPrompt(input: TourTranslationInput, targets: TourLang[]): string {
  return `You are translating a tour listing for a guided-tours marketplace in Uzbekistan.

Source language: ${LANG_LABEL[input.sourceLang]}.
Translate the fields below into: ${targets.map((t) => LANG_LABEL[t]).join(", ")}.

Rules:
- Detect the ACTUAL language of the source text. If it does not match the stated source language, translate from the actual language anyway.
- Keep proper nouns (place names, food names, people) recognizable; transliterate only when natural.
- Keep tone friendly and concise; do not add new information.
- Preserve markdown formatting in description_md (line breaks, lists).
- If a source field is empty, return an empty string for that field.
- Translate every array item and keep the same array lengths/order.

SOURCE:
title: ${JSON.stringify(input.title)}
short_description: ${JSON.stringify(input.short_description)}
description_md: ${JSON.stringify(input.description_md ?? "")}
highlights: ${JSON.stringify(input.highlights ?? [])}
included: ${JSON.stringify(input.included ?? [])}
not_included: ${JSON.stringify(input.not_included ?? [])}

Return one translations entry per target language (${targets.join(", ")}).`;
}

// Lenient schema — every field optional with sane defaults; array items coerced to strings.
const lenientTranslationsSchema = z.object({
  translations: z.array(
    z.object({
      lang: z.enum(["ru", "uz", "en"]),
      title: z.string().optional().default(""),
      short_description: z.string().optional().default(""),
      description_md: z.string().optional().default(""),
      highlights: z.array(z.union([z.string(), z.number()]).transform(String)).optional().default([]),
      included: z.array(z.union([z.string(), z.number()]).transform(String)).optional().default([]),
      not_included: z.array(z.union([z.string(), z.number()]).transform(String)).optional().default([]),
    }),
  ),
});

// Strict schema — used on the first attempt.
const strictTranslationsSchema = z.object({
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
});

function extractJsonObject(text: string): unknown {
  // First, direct parse
  try { return JSON.parse(text); } catch {}
  // Strip ```json ... ``` fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  // Find the first '{' and matching last '}'
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  throw new Error("No JSON object found in model output");
}

function collect(
  entries: Array<{ lang: TourLang } & TourTranslationFields>,
  targets: TourLang[],
): Partial<TourTranslationOutput> {
  const out: Partial<TourTranslationOutput> = {};
  for (const t of entries) {
    if (targets.includes(t.lang)) {
      out[t.lang] = {
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
}

export async function translateTourFields(
  input: TourTranslationInput,
): Promise<TranslationResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    const msg = "Missing LOVABLE_API_KEY — skipping translation";
    console.warn(`[translateTourFields] ${msg}`);
    return { translations: {}, ok: false, error: msg, attempts: 0 };
  }

  const targets = (["ru", "uz", "en"] as const).filter((l) => l !== input.sourceLang);
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3-flash-preview");
  const prompt = buildPrompt(input, [...targets]);

  const errors: string[] = [];

  // Attempt 1: strict structured output via ai-sdk Output.object.
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: strictTranslationsSchema }),
      prompt,
    });
    const out = collect(result.output.translations as any, [...targets]);
    if (Object.keys(out).length > 0) {
      return { translations: out, ok: true, attempts: 1 };
    }
    errors.push("attempt 1: empty translations array");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[translateTourFields] strict attempt failed:", msg);
    errors.push(`attempt 1: ${msg}`);
  }

  // Attempt 2: plain text, ask for JSON, parse leniently.
  try {
    const result = await generateText({
      model,
      prompt: `${prompt}

Reply with ONLY a JSON object of the shape:
{ "translations": [ { "lang": "ru"|"en"|"uz", "title": string, "short_description": string, "description_md": string, "highlights": string[], "included": string[], "not_included": string[] } ] }
No markdown fences, no commentary.`,
    });
    const raw = extractJsonObject(result.text);
    const parsed = lenientTranslationsSchema.parse(raw);
    const out = collect(parsed.translations as any, [...targets]);
    if (Object.keys(out).length > 0) {
      const missing = targets.filter((t) => !out[t]);
      return {
        translations: out,
        ok: true,
        attempts: 2,
        error: missing.length ? `partial: missing ${missing.join(",")}` : undefined,
      };
    }
    errors.push("attempt 2: empty translations array");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[translateTourFields] lenient retry failed:", msg);
    errors.push(`attempt 2: ${msg}`);
  }

  return {
    translations: {},
    ok: false,
    error: errors.join(" | "),
    attempts: 2,
  };
}
