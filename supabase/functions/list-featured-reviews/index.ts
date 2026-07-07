// Supabase Edge Function: list-featured-reviews
// Public showcase reviews for the Home carousel.
// Called from mobile: supabase.functions.invoke('list-featured-reviews')
// Returns: { reviews: [...] } or { error, message }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days
const LIMIT = 12;
const MIN_RATING = 4;
const MIN_COMMENT_LEN = 40;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "ServerError", message: "Server misconfigured" }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Overfetch a bit so client-side length filter still yields ~LIMIT rows.
    const { data: rows, error } = await admin
      .from("reviews")
      .select(
        "id, rating, comment, created_at, photos, user_id, tour:tours!inner(title), guide:guides!inner(name)",
      )
      .gte("rating", MIN_RATING)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(LIMIT * 4);

    if (error) {
      return json({ error: "ServerError", message: error.message }, 500);
    }

    const filtered = (rows ?? [])
      .filter(
        (r: any) =>
          typeof r.comment === "string" &&
          r.comment.trim().length >= MIN_COMMENT_LEN,
      )
      .slice(0, LIMIT);

    // Batch-load author profiles
    const userIds = Array.from(new Set(filtered.map((r: any) => r.user_id).filter(Boolean)));
    const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id as string, {
          full_name: (p as any).full_name ?? null,
          avatar_url: (p as any).avatar_url ?? null,
        });
      }
    }

    // Fallback to auth.users metadata for names missing in profiles
    const missingIds = userIds.filter((id) => !profileMap.get(id)?.full_name);
    for (const uid of missingIds) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        const name =
          (u?.user?.user_metadata?.full_name as string | undefined) ||
          (u?.user?.user_metadata?.name as string | undefined) ||
          (u?.user?.email ? String(u.user.email).split("@")[0] : null);
        const prev = profileMap.get(uid) ?? { full_name: null, avatar_url: null };
        profileMap.set(uid, {
          full_name: prev.full_name ?? name ?? null,
          avatar_url: prev.avatar_url,
        });
      } catch {
        /* ignore */
      }
    }

    // Batch-sign photos in traveler-media
    const allPaths = Array.from(
      new Set(
        filtered.flatMap((r: any) =>
          Array.isArray(r.photos) ? (r.photos as string[]) : [],
        ),
      ),
    ).filter(Boolean);
    const signedMap = new Map<string, string>();
    if (allPaths.length > 0) {
      const { data: signed } = await admin.storage
        .from("traveler-media")
        .createSignedUrls(allPaths, SIGN_TTL);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      }
    }

    const reviews = filtered.map((r: any) => {
      const author = profileMap.get(r.user_id) ?? { full_name: null, avatar_url: null };
      const photos = (Array.isArray(r.photos) ? r.photos : [])
        .map((p: string) => signedMap.get(p) || "")
        .filter(Boolean);
      return {
        id: r.id as string,
        rating: r.rating as number,
        comment: r.comment as string,
        created_at: r.created_at as string,
        tour: { title: (r.tour?.title as string | undefined) ?? null },
        guide: { name: (r.guide?.name as string | undefined) ?? null },
        author: {
          full_name: author.full_name,
          avatar_url: author.avatar_url,
        },
        photos,
      };
    });

    return json({ reviews });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: "ServerError", message }, 500);
  }
});
