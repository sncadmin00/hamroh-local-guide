/**
 * Public hook: generate a tour description with AI.
 *
 * Auth: Authorization: Bearer <supabase user JWT>. Caller must be linked
 * to a guide profile.
 *
 * POST body:
 *   {
 *     title: string (1..200),
 *     city?: string (0..120),
 *     language?: "ru" | "uz" | "en" | "auto",   // default "auto"
 *     context?: string (0..1000),
 *     length?: "short" | "medium" | "long",     // default "medium"
 *   }
 *
 * 200: { description: string }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const InputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).optional().default(""),
  language: z.enum(["ru", "uz", "en", "auto"]).optional().default("auto"),
  context: z.string().trim().max(1000).optional().default(""),
  length: z.enum(["short", "medium", "long"]).optional().default("medium"),
  categories: z.array(z.string().trim().max(80)).max(20).optional().default([]),
  highlights: z.array(z.string().trim().max(200)).max(20).optional().default([]),
  included: z.array(z.string().trim().max(200)).max(20).optional().default([]),
});

const LENGTH_HINTS: Record<"short" | "medium" | "long", string> = {
  short: "1–2 sentences, roughly 200–350 characters. Fits a card preview.",
  medium: "3–5 sentences, roughly 400–700 characters. A well-rounded overview.",
  long: "Two short paragraphs, roughly 800–1200 characters. A rich page description.",
};

const LANG_MAP: Record<string, string> = {
  ru: "Russian",
  uz: "Uzbek (Latin script)",
  en: "English",
};

export const Route = createFileRoute("/api/public/hooks/generate-tour-description")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json(
            { error: "Unauthorized", message: "Missing bearer token" },
            { status: 401, headers: corsHeaders() },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: corsHeaders() },
          );
        }

        const authClient = createClient(url, pk, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json(
            { error: "Unauthorized", message: "Invalid or expired token" },
            { status: 401, headers: corsHeaders() },
          );
        }
        const userId = userRes.user.id;

        // Require guide profile (same rule as other guide-only hooks).
        const userClient = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: guide } = await userClient
          .from("guides")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "Forbidden", message: "Guide profile required" },
            { status: 403, headers: corsHeaders() },
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json(
            { error: "ValidationError", message: "Invalid JSON" },
            { status: 400, headers: corsHeaders() },
          );
        }
        const parsed = InputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            {
              error: "ValidationError",
              message: parsed.error.issues[0]?.message ?? "Invalid input",
              issues: parsed.error.issues,
            },
            { status: 400, headers: corsHeaders() },
          );
        }
        const { title, city, language, context, length, categories, highlights, included } = parsed.data;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json(
            { error: "ServerError", message: "AI is not configured" },
            { status: 500, headers: corsHeaders() },
          );
        }

        const langLine =
          language !== "auto"
            ? `Write in ${LANG_MAP[language]}.`
            : "Detect the language of the guide's title and context (Russian, Uzbek, or English) and write in that same language.";

        const system = `You help local tour guides in Uzbekistan write attractive tour descriptions for a marketplace. Given a tour title and optional context, produce ONLY a friendly, specific description of the tour: what travelers will see, do, and feel. Sound human and concrete, not markety. No emojis. No quotes. No headings or lists — plain prose. Do not repeat the title verbatim as the first line. ${langLine}
Length: ${LENGTH_HINTS[length]}`;

        const facts = [
          `Tour title: ${title}`,
          city && `City: ${city}`,
          categories.length && `Categories: ${categories.join(", ")}`,
          highlights.length && `Highlights: ${highlights.join("; ")}`,
          included.length && `Included: ${included.join("; ")}`,
          context && `Extra context from the guide: ${context}`,
        ]
          .filter(Boolean)
          .join("\n");

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");
          const { output } = await generateText({
            model,
            system,
            prompt: facts,
            output: Output.object({
              schema: z.object({ description: z.string() }),
            }),
          });
          const description = (output.description ?? "").trim();
          if (!description) {
            return Response.json(
              { error: "ServerError", message: "AI returned empty description" },
              { status: 500, headers: corsHeaders() },
            );
          }
          return Response.json({ description }, { status: 200, headers: corsHeaders() });
        } catch (e: any) {
          const message = e?.message ?? "AI error";
          const status = /rate|429/i.test(message)
            ? 429
            : /credit|402/i.test(message)
              ? 402
              : 500;
          console.error("[generate-tour-description]", message);
          return Response.json(
            { error: status === 429 ? "RateLimited" : status === 402 ? "PaymentRequired" : "ServerError", message },
            { status, headers: corsHeaders() },
          );
        }
      },
    },
  },
});
