/**
 * GET /api/public/hooks/support-contacts
 * Public. Returns configured support channels for the mobile app.
 *
 * Currently returns Telegram support handle. Configure in the `app_settings`
 * table with key `support_telegram_username` (value: string). Missing key
 * yields `telegram_username: null` and `telegram_url: null`.
 */
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function extractUsername(value: unknown): string | null {
  if (typeof value === "string") return value.trim().replace(/^@/, "") || null;
  if (value && typeof value === "object") {
    const v = (value as Record<string, unknown>).username;
    if (typeof v === "string") return v.trim().replace(/^@/, "") || null;
  }
  return null;
}

export const Route = createFileRoute("/api/public/hooks/support-contacts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "support_telegram_username")
          .maybeSingle();
        const username = extractUsername(data?.value);
        return Response.json(
          {
            telegram_username: username,
            telegram_url: username ? `https://t.me/${username}` : null,
          },
          { headers: cors },
        );
      },
    },
  },
});
