import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WishlistType = "guide" | "tour" | "city";
export type WishlistItem = { type: WishlistType; id: string };

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
  const [ready, setReady] = useState(false);

  // Track auth
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      // Migrate guest wishlist on sign-in
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

  // Load items when auth state resolves
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (userId) {
        const { data } = await supabase
          .from("wishlists" as any)
          .select("item_type, item_id")
          .eq("user_id", userId);
        if (cancelled) return;
        setItems(((data as any[]) ?? []).map((r) => ({ type: r.item_type, id: r.item_id })));
      } else {
        setItems(readGuest());
      }
      setReady(true);
    };
    load();
    const onChange = () => load();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [userId]);

  const isWishlisted = useCallback(
    (type: WishlistType, id: string) =>
      items.some((i) => i.type === type && i.id === id),
    [items],
  );

  const toggle = useCallback(
    async (type: WishlistType, id: string) => {
      const has = items.some((i) => i.type === type && i.id === id);
      const next = has
        ? items.filter((i) => !(i.type === type && i.id === id))
        : [...items, { type, id }];
      setItems(next); // optimistic

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
      } else {
        writeGuest(next);
      }
      return !has; // new state
    },
    [items, userId],
  );

  return {
    items,
    ready,
    isWishlisted,
    toggle,
    keyOf,
  };
}
