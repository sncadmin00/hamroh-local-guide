import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Calendar, MessageSquare, Star, Briefcase, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  link: string | null;
  type: string | null;
  entity_id: string | null;
  entity_type: string | null;
  category: string | null;
  read: boolean;
  created_at: string;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Hamroh" },
      { name: "description", content: "Your Hamroh notifications: bookings, messages, reviews and more." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function iconFor(type: string | null, category: string | null, custom: string | null) {
  if (custom) return <span className="text-lg leading-none">{custom}</span>;
  if (type === "chat_message") return <MessageSquare className="h-5 w-5" />;
  if (type?.startsWith("booking_")) return <Calendar className="h-5 w-5" />;
  if (type?.startsWith("guide_")) return <Briefcase className="h-5 w-5" />;
  if (category === "reviews") return <Star className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

function targetFor(n: Notif): string | null {
  if (n.link) return n.link;
  if (n.entity_type === "booking" && n.entity_id) {
    if (n.type === "chat_message") return `/messages/${n.entity_id}`;
    return `/my-bookings`;
  }
  if (n.entity_type === "guide_application") return `/guide`;
  return null;
}

function NotificationsPage() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(false);

  const T = {
    title: { en: "Notifications", ru: "Уведомления", uz: "Bildirishnomalar" }[lang],
    empty: { en: "No notifications yet", ru: "Уведомлений пока нет", uz: "Hozircha bildirishnomalar yo'q" }[lang],
    emptyDesc: {
      en: "You'll see booking updates, messages and important events here.",
      ru: "Здесь появятся обновления бронирований, сообщения и важные события.",
      uz: "Bu yerda bronlar, xabarlar va muhim voqealar paydo bo'ladi.",
    }[lang],
    markAll: { en: "Mark all as read", ru: "Прочитать все", uz: "Hammasini o'qilgan deb belgilash" }[lang],
    unread: { en: "Unread", ru: "Непрочитано", uz: "O'qilmagan" }[lang],
  };

  const load = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { navigate({ to: "/login", replace: true }); return; }
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,icon,link,type,entity_id,entity_type,category,read,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Notif[]);
    setReady(true);
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setBusy(false); return; }
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setBusy(false);
  };

  const openOne = async (n: Notif) => {
    if (!n.read) {
      await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const to = targetFor(n);
    if (to) {
      if (to.startsWith("http")) window.location.href = to;
      else navigate({ to });
    }
  };

  if (!ready) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </>
    );
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-secondary/20">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold">{T.title}</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {unreadCount} {T.unread.toLowerCase()}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full ring-1 ring-border/70 bg-card text-sm font-medium hover:shadow-sm disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" /> {T.markAll}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl bg-card ring-1 ring-border/60 p-10 text-center">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">{T.empty}</p>
              <p className="text-sm text-muted-foreground mt-1">{T.emptyDesc}</p>
              <Link
                to="/account"
                className="inline-flex items-center gap-1 mt-4 h-9 px-4 rounded-full bg-foreground text-background text-sm font-medium"
              >
                {{ en: "Back to account", ru: "К личному кабинету", uz: "Kabinetga qaytish" }[lang]}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const to = targetFor(n);
                const clickable = !!to || !n.read;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openOne(n)}
                      disabled={!clickable}
                      className={`w-full text-left rounded-2xl ring-1 p-4 flex items-start gap-3 transition-all ${
                        n.read
                          ? "bg-card ring-border/50"
                          : "bg-[#C9A84C]/8 ring-[#C9A84C]/40"
                      } ${clickable ? "hover:shadow-sm hover:ring-[#C9A84C]/60" : ""}`}
                    >
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          n.read ? "bg-secondary text-muted-foreground" : "bg-[#C9A84C]/15 text-[#C9A84C]"
                        }`}
                      >
                        {iconFor(n.type, n.category, n.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${n.read ? "font-medium" : "font-semibold"}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "#1F9BB4" }} />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString(lang)}
                        </p>
                      </div>
                      {n.read && <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
