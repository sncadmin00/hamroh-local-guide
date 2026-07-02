import { supabase } from "@/integrations/supabase/client";

export function signOutAndRedirect(to = "/") {
  if (typeof window === "undefined") return;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    Object.keys(storage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        storage.removeItem(key);
      }
    });
  }

  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name?.startsWith("sb-") || name?.includes("auth-token")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  });

  void supabase.auth.signOut({ scope: "local" }).catch((error) => {
    console.warn("Sign out request failed after local cleanup", error);
  });

  window.location.replace(to);
}