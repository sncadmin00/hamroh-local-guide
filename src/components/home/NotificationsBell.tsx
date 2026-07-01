import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsBell({ transparent = false }: { transparent?: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { setCount(0); return; }
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("read", false);
      if (!cancelled) setCount(c ?? 0);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
  return (
    <Link
      to="/account"
      aria-label="Notifications"
      className={`relative inline-flex items-center justify-center h-10 w-10 rounded-full ring-1 transition-shadow hover:shadow-md ${
        transparent
          ? "ring-[rgba(255,255,255,0.4)] bg-[rgba(10,15,30,0.35)] backdrop-blur-[8px] text-[var(--foreground)]"
          : "ring-border/70 bg-card/80 text-foreground/70"
      }`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center"
          style={{ background: "#1F9BB4", color: "#fff" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
