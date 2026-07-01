// Supabase Edge Function: wishlist
// Handles user wishlists and collections for the mobile app.
// Actions (POST body): get | add | move | remove | create_collection | delete_collection
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const ALLOWED_TYPES = new Set([
  "guide",
  "tour",
  "city",
  "place",
  "article",
  "spotlight",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  // Authenticate via JWT
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = body?.action as string;

  try {
    switch (action) {
      case "get": {
        const [items, collections] = await Promise.all([
          admin
            .from("wishlists")
            .select("id, item_type, item_id, collection_id, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          admin
            .from("wishlist_collections")
            .select("id, name, emoji, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
        ]);
        if (items.error) throw items.error;
        if (collections.error) throw collections.error;
        return json({ items: items.data, collections: collections.data });
      }

      case "add": {
        const { item_type, item_id, collection_id } = body;
        if (!item_type || !item_id) return json({ error: "Missing item_type/item_id" }, 400);
        if (!ALLOWED_TYPES.has(item_type)) return json({ error: "Invalid item_type" }, 400);
        const { data, error } = await admin
          .from("wishlists")
          .upsert(
            { user_id: userId, item_type, item_id, collection_id: collection_id ?? null },
            { onConflict: "user_id,item_type,item_id" },
          )
          .select()
          .single();
        if (error) throw error;
        return json({ item: data });
      }

      case "move": {
        const { id, collection_id } = body;
        if (!id) return json({ error: "Missing id" }, 400);
        const { data, error } = await admin
          .from("wishlists")
          .update({ collection_id: collection_id ?? null })
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        return json({ item: data });
      }

      case "remove": {
        const { id, item_type, item_id } = body;
        let q = admin.from("wishlists").delete().eq("user_id", userId);
        if (id) q = q.eq("id", id);
        else if (item_type && item_id) q = q.eq("item_type", item_type).eq("item_id", item_id);
        else return json({ error: "Missing id or item_type+item_id" }, 400);
        const { error } = await q;
        if (error) throw error;
        return json({ ok: true });
      }

      case "create_collection": {
        const { name, emoji } = body;
        if (!name || typeof name !== "string") return json({ error: "Missing name" }, 400);
        const { data, error } = await admin
          .from("wishlist_collections")
          .insert({ user_id: userId, name: name.trim().slice(0, 80), emoji: emoji || "❤️" })
          .select()
          .single();
        if (error) throw error;
        return json({ collection: data });
      }

      case "delete_collection": {
        const { id } = body;
        if (!id) return json({ error: "Missing id" }, 400);
        const { error } = await admin
          .from("wishlist_collections")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("[wishlist]", action, e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
