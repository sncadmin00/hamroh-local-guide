import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const BioInput = z.object({
  name: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  years: z.union([z.string(), z.number()]).optional().default(""),
  languages: z.array(z.string()).max(20).optional().default([]),
  specializations: z.array(z.string()).max(20).optional().default([]),
  specialization: z.string().trim().max(200).optional().default(""),
  highlight: z.string().trim().max(600).optional().default(""),
  style: z.string().trim().max(600).optional().default(""),
  why: z.string().trim().max(600).optional().default(""),
  language_hint: z.string().trim().max(20).optional().default("auto"),
});

export const generateGuideBio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BioInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const langLine =
      data.language_hint && data.language_hint !== "auto"
        ? `Write the bio in this language: ${data.language_hint}.`
        : `Detect the language of the user's answers (Russian, Uzbek, or English) and write the bio in that same language.`;

    const system = `You write warm, honest, first-person "About me" bios for local tour guides in Uzbekistan. 3-5 sentences, friendly but not cheesy, no emojis, no bullet points, no quotes. Mention the city, what they show travelers, and why they love it. Sound like a real person, not marketing copy. ${langLine}`;

    const facts = [
      data.name && `Name: ${data.name}`,
      data.city && `City: ${data.city}`,
      data.years !== "" && `Years of experience: ${data.years}`,
      data.languages.length && `Languages: ${data.languages.join(", ")}`,
      data.specializations.length && `Categories: ${data.specializations.join(", ")}`,
      data.specialization && `Specialization: ${data.specialization}`,
      data.highlight && `What they always show: ${data.highlight}`,
      data.style && `How they lead tours: ${data.style}`,
      data.why && `Why they love it: ${data.why}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Here is what the guide told me:\n\n${facts}\n\nWrite their About me text now.`,
    });

    return { bio: text.trim() };
  });
