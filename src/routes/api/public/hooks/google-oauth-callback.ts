import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  exchangeCodeForTokens,
  fetchUserEmail,
  getRedirectUri,
  verifyState,
} from "@/lib/google-calendar.server";

export const Route = createFileRoute("/api/public/hooks/google-oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const returnHtml = (msg: string, ok: boolean) =>
          new Response(
            `<!doctype html><meta charset="utf-8"><title>Google Calendar</title>
            <style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;text-align:center}a{color:#60a5fa}</style>
            <div><h1>${ok ? "✅ Connected" : "⚠️ Error"}</h1><p>${msg}</p><p><a href="/guide">← Back to portal</a></p></div>
            <script>setTimeout(()=>location.href="/guide?gcal=${ok ? "connected" : "error"}",1500)</script>`,
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );

        if (error) return returnHtml(`Google rejected the connection: ${error}`, false);
        if (!code || !state) return returnHtml("Missing OAuth parameters", false);

        const payload = verifyState(state);
        if (!payload || !payload.guideId) return returnHtml("Invalid OAuth state", false);

        try {
          const redirectUri = getRedirectUri(url.origin);
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          if (!tokens.refresh_token) {
            return returnHtml(
              "No refresh token received. Try disconnecting in Google Account → Permissions, then connect again.",
              false,
            );
          }
          const email = await fetchUserEmail(tokens.access_token);
          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

          const { error: upsertErr } = await supabaseAdmin
            .from("guide_google_calendar")
            .upsert(
              {
                guide_id: payload.guideId,
                calendar_id: "primary",
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt,
                google_email: email,
              } as never,
              { onConflict: "guide_id" },
            );
          if (upsertErr) {
            console.error("[google-oauth-callback] upsert failed:", upsertErr);
            return returnHtml(`Failed to save connection: ${upsertErr.message}`, false);
          }
          return returnHtml(`Google Calendar connected${email ? ` (${email})` : ""}.`, true);
        } catch (e) {
          console.error("[google-oauth-callback] error:", e);
          return returnHtml((e as Error).message, false);
        }
      },
    },
  },
});
