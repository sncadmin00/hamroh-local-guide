// Server-only helpers for Google Calendar 2-way sync.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function getRedirectUri(origin: string): string {
  return `${origin}/api/public/hooks/google-oauth-callback`;
}

function getEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }
  return { clientId, clientSecret };
}

// Sign / verify state so OAuth callback can trust the encoded payload.
export function signState(payload: Record<string, string>): string {
  const { clientSecret } = getEnv();
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = crypto
    .createHmac("sha256", clientSecret)
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState(state: string): Record<string, string> | null {
  const { clientSecret } = getEnv();
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto
    .createHmac("sha256", clientSecret)
    .update(b64)
    .digest("base64url");
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function buildAuthUrl(opts: { redirectUri: string; state: string }): string {
  const { clientId } = getEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getEnv();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getEnv();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { email?: string };
    return j.email ?? null;
  } catch {
    return null;
  }
}

type GoogleLink = {
  guide_id: string;
  calendar_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function getValidLink(guideId: string): Promise<GoogleLink | null> {
  const { data } = await supabaseAdmin
    .from("guide_google_calendar")
    .select("guide_id, calendar_id, access_token, refresh_token, expires_at")
    .eq("guide_id", guideId)
    .maybeSingle();
  if (!data) return null;
  const link = data as unknown as GoogleLink;

  const expiresAt = new Date(link.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return link;

  // Refresh
  const refreshed = await refreshAccessToken(link.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("guide_google_calendar")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
    } as never)
    .eq("guide_id", guideId);
  return { ...link, access_token: refreshed.access_token, expires_at: newExpiresAt };
}

type EventInput = {
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  notes?: string;
};

function toGoogleEvent(ev: EventInput) {
  return {
    summary: ev.title,
    description: ev.notes || "",
    location: ev.location || "",
    start: { dateTime: ev.starts_at },
    end: { dateTime: ev.ends_at },
  };
}

export async function pushEventToGoogle(
  guideId: string,
  ev: EventInput,
): Promise<string | null> {
  const link = await getValidLink(guideId);
  if (!link) return null;
  const res = await fetch(
    `${API_BASE}/calendars/${encodeURIComponent(link.calendar_id)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${link.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGoogleEvent(ev)),
    },
  );
  if (!res.ok) {
    console.error("[google-calendar] push failed:", res.status, await res.text());
    return null;
  }
  const j = (await res.json()) as { id?: string };
  return j.id ?? null;
}

export async function updateEventOnGoogle(
  guideId: string,
  googleEventId: string,
  ev: EventInput,
): Promise<void> {
  const link = await getValidLink(guideId);
  if (!link) return;
  const res = await fetch(
    `${API_BASE}/calendars/${encodeURIComponent(link.calendar_id)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${link.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGoogleEvent(ev)),
    },
  );
  if (!res.ok) {
    console.error("[google-calendar] update failed:", res.status, await res.text());
  }
}

export async function deleteEventOnGoogle(
  guideId: string,
  googleEventId: string,
): Promise<void> {
  const link = await getValidLink(guideId);
  if (!link) return;
  const res = await fetch(
    `${API_BASE}/calendars/${encodeURIComponent(link.calendar_id)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${link.access_token}` },
    },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error("[google-calendar] delete failed:", res.status, await res.text());
  }
}

/**
 * Mirror a booking-derived calendar_events row to Google Calendar.
 * - If the local event exists and has no google_event_id → create it on Google.
 * - If it exists and has a google_event_id → update on Google.
 * - If the local event no longer exists (booking cancelled/declined) → delete on Google.
 *
 * Uses the most recent google_event_id stored on any row for this booking,
 * falling back to a tracking map in `guide_google_calendar_bookings` if needed.
 */
export async function mirrorBookingToGoogle(bookingId: string): Promise<void> {
  // Lookup the calendar_events row (created by DB trigger sync_booking_to_calendar)
  const { data: evRow } = await supabaseAdmin
    .from("calendar_events")
    .select("id, guide_id, title, starts_at, ends_at, location, notes, google_event_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  // Lookup any previously stored google_event_id for this booking
  const { data: track } = await supabaseAdmin
    .from("booking_google_events")
    .select("guide_id, google_event_id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  const tracked = track as unknown as
    | { guide_id: string; google_event_id: string }
    | null;

  if (!evRow) {
    // Booking event was removed → delete on Google if we have a mapping
    if (tracked?.google_event_id && tracked.guide_id) {
      await deleteEventOnGoogle(tracked.guide_id, tracked.google_event_id);
      await supabaseAdmin
        .from("booking_google_events")
        .delete()
        .eq("booking_id", bookingId);
    }
    return;
  }

  const ev = evRow as unknown as {
    id: string;
    guide_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
    notes: string | null;
    google_event_id: string | null;
  };

  const payload = {
    title: ev.title,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    location: ev.location ?? "",
    notes: ev.notes ?? "",
  };

  const existingGoogleId = ev.google_event_id ?? tracked?.google_event_id ?? null;

  if (existingGoogleId) {
    await updateEventOnGoogle(ev.guide_id, existingGoogleId, payload);
    if (!ev.google_event_id) {
      await supabaseAdmin
        .from("calendar_events")
        .update({ google_event_id: existingGoogleId } as never)
        .eq("id", ev.id);
    }
  } else {
    const googleId = await pushEventToGoogle(ev.guide_id, payload);
    if (googleId) {
      await supabaseAdmin
        .from("calendar_events")
        .update({ google_event_id: googleId } as never)
        .eq("id", ev.id);
      await supabaseAdmin
        .from("booking_google_events")
        .upsert(
          {
            booking_id: bookingId,
            guide_id: ev.guide_id,
            google_event_id: googleId,
          } as never,
          { onConflict: "booking_id" },
        );
    }
  }
}
