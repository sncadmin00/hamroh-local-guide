/**
 * POST /api/public/hooks/telegram-signin-poll
 * No auth required.
 * Body: { nonce: string }
 * Response:
 *   - { status: "pending" }
 *   - { status: "ready", action_link: string }   // open in browser to sign in
 *   - { status: "expired" } / { status: "unknown" }
 *
 * Once returned as "ready", the nonce is marked consumed and can't be polled again.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({ nonce: z.string().min(8).max(128) });

export const Route = createFileRoute("/api/public/hooks/telegram-signin-poll")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors });
        }
        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Validation error" }, { status: 400, headers: cors });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("telegram_signin_nonces")
          .select("nonce, expires_at, consumed_at, action_link")
          .eq("nonce", parsed.data.nonce)
          .maybeSingle();
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: cors });
        }
        if (!data) {
          return Response.json({ status: "unknown" }, { headers: cors });
        }
        if (data.consumed_at) {
          return Response.json({ status: "expired" }, { headers: cors });
        }
        if (new Date(data.expires_at).getTime() < Date.now()) {
          return Response.json({ status: "expired" }, { headers: cors });
        }
        if (!data.action_link) {
          return Response.json({ status: "pending" }, { headers: cors });
        }
        // Ready: consume the nonce so it can be used only once.
        await supabaseAdmin
          .from("telegram_signin_nonces")
          .update({ consumed_at: new Date().toISOString() })
          .eq("nonce", parsed.data.nonce)
          .is("consumed_at", null);
        return Response.json(
          { status: "ready", action_link: data.action_link },
          { headers: cors },
        );
      },
    },
  },
});
