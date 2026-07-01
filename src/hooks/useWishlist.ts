import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WishlistType = "guide" | "tour" | "city" | "place" | "article" | "spotlight";
export type WishlistItem = {
  type: WishlistType;
  id: string;
  dbId?: string;
  collectionId?: string | null;
};
export type WishlistCollection = {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
};

const STORAGE_KEY = "hamroh:wishlist";
const EVENT = "hamroh:wishlist:change";

function readGuest(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeGuest(items: WishlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

function keyOf(type: WishlistType, id: string) {
  return `${type}:${id}`;
}

export function useWishlist() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [collections, setCollections] = useState<WishlistCollection[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const guest = readGuest();
        if (guest.length > 0) {
          await supabase
            .from("wishlists" as any)
            .upsert(
              guest.map((g) => ({ user_id: uid, item_type: g.type, item_id: g.id })),
              { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
            );
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const reload = useCallback(async () => {
    if (userId) {
      const [w, c] = await Promise.all([
        supabase
          .from("wishlists" as any)
          .select("id, item_type, item_id, collection_id")
          .eq("user_id", userId),
        supabase
          .from("wishlist_collections" as any)
          .select("id, name, emoji, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
      ]);
      setItems(
        ((w.data as any[]) ?? []).map((r) => ({
          type: r.item_type,
          id: r.item_id,
          dbId: r.id,
          collectionId: r.collection_id,
        })),
      );
      setCollections(((c.data as any[]) ?? []) as WishlistCollection[]);
    } else {
      setItems(readGuest());
      setCollections([]);
    }
    setReady(true);
  }, [userId]);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [reload]);

  const isWishlisted = useCallback(
    (type: WishlistType, id: string) => items.some((i) => i.type === type && i.id === id),
    [items],
  );

  const toggle = useCallback(
    async (type: WishlistType, id: string) => {
      const has = items.some((i) => i.type === type && i.id === id);
      const next = has
        ? items.filter((i) => !(i.type === type && i.id === id))
        : [...items, { type, id }];
      setItems(next);

      if (userId) {
        if (has) {
          await supabase
            .from("wishlists" as any)
            .delete()
            .eq("user_id", userId)
            .eq("item_type", type)
            .eq("item_id", id);
        } else {
          await supabase
            .from("wishlists" as any)
            .insert({ user_id: userId, item_type: type, item_id: id });
        }
        reload();
      } else {
        writeGuest(next);
      }
      return !has;
    },
    [items, userId, reload],
  );

  const createCollection = useCallback(
    async (name: string, emoji: string) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("wishlist_collections" as any)
        .insert({ user_id: userId, name: name.trim().slice(0, 80), emoji: emoji || "❤️" })
        .select()
        .single();
      if (error) throw error;
      await reload();
      return data as unknown as WishlistCollection;
    },
    [userId, reload],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      if (!userId) return;
      await supabase
        .from("wishlist_collections" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      await reload();
    },
    [userId, reload],
  );

  const moveItem = useCallback(
    async (dbId: string, collectionId: string | null) => {
      if (!userId) return;
      await supabase
        .from("wishlists" as any)
        .update({ collection_id: collectionId })
        .eq("id", dbId)
        .eq("user_id", userId);
      await reload();
    },
    [userId, reload],
  );

  return {
    items,
    collections,
    ready,
    userId,
    isWishlisted,
    toggle,
    createCollection,
    deleteCollection,
    moveItem,
    keyOf,
  };
}
