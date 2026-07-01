import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Notif = { id: string; title: string; body: string | null; icon: string | null; link: string | null };

export function NotificationBanner() {
  const [notif, setNotif] = useState<Notif | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dismissedNotifs") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,icon,link")
        .eq("user_id", uid)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      const first = (data ?? []).find((n) => !dismissed.has(n.id));
      setNotif(first ?? null);
    };
    load();
  }, [dismissed]);

  if (!notif) return null;
  const dismiss = () => {
    const next = new Set(dismissed); next.add(notif.id);
    setDismissed(next);
    try { localStorage.setItem("dismissedNotifs", JSON.stringify([...next])); } catch {}
  };
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-4">
      <div
        className="flex items-start gap-3 rounded-2xl p-4 pr-3"
        style={{
          background: "color-mix(in srgb, #1F9BB4 12%, transparent)",
          border: "1px solid color-mix(in srgb, #1F9BB4 30%, transparent)",
        }}
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, #1F9BB4 22%, transparent)", color: "#1F9BB4" }}
        >
          <span className="text-lg">{notif.icon || <Bell className="h-5 w-5" />}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{notif.title}</p>
          {notif.body && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{notif.body}</p>}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="p-1.5 rounded-full hover:bg-white/10 shrink-0">
          <X className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
        </button>
      </div>
    </div>
  );
}
