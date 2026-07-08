import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  seed: z.string().trim().min(1).max(1000),
  city: z.string().trim().max(120).optional().default(""),
  categories: z.array(z.string()).max(20).optional().default([]),
  duration_hours: z.number().min(0).max(48).optional().default(0),
  transport_included: z.boolean().optional().default(false),
  language_hint: z.enum(["ru", "uz", "en", "auto"]).optional().default("auto"),
});

export const generateTourDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const langMap: Record<string, string> = {
      ru: "Russian",
      uz: "Uzbek (Latin script)",
      en: "English",
    };
    const langLine =
      data.language_hint && data.language_hint !== "auto"
        ? `Write in ${langMap[data.language_hint]}.`
        : "Detect the language of the guide's seed text (Russian, Uzbek, or English) and write in that same language.";

    const system = `You help local tour guides in Uzbekistan write attractive tour listings for a marketplace. Given a short seed idea from the guide, produce a punchy title, a friendly 1–2 sentence short description shown on the card, and 4–6 concrete highlights of what travelers will actually see and do. Sound human and specific, not markety. No emojis. No quotes. ${langLine}`;

    const facts = [
      data.city && `City: ${data.city}`,
      data.categories.length && `Categories: ${data.categories.join(", ")}`,
      data.duration_hours > 0 && `Duration: ${data.duration_hours} hours`,
      data.transport_included && `Transport is included`,
      `Guide's idea: ${data.seed}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model,
      system,
      prompt: facts,
      output: Output.object({
        schema: z.object({
          title: z.string(),
          short_description: z.string(),
          highlights: z.array(z.string()),
        }),
      }),
    });

    return {
      title: output.title.trim(),
      short_description: output.short_description.trim(),
      highlights: (output.highlights ?? []).map((h) => h.trim()).filter(Boolean).slice(0, 8),
    };
  });
