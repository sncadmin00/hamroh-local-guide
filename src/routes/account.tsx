import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Calendar, Heart, MessageSquare, Settings as SettingsIcon,
  Briefcase, Shield, User as UserIcon, ChevronRight, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { listMyBookings } from "@/lib/my-bookings.functions";
import { useWishlist } from "@/hooks/useWishlist";
import { SiteHeader } from "@/components/SiteHeader";
import { ContinueInAppBanner } from "@/components/ContinueInAppBanner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Hamroh" },
      { name: "description", content: "Your Hamroh account: bookings, wishlist, messages, settings." },
    ],
  }),
  component: AccountPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function AccountPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ email?: string | null; name?: string | null; avatar?: string | null } | null>(null);
  const [isGuide, setIsGuide] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const { items: wishlistItems } = useWishlist();

  const fetchBookings = useServerFn(listMyBookings);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { navigate({ to: "/login", replace: true }); return; }
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      setUser({
        email: u.email,
        name: (meta.full_name as string) || (meta.name as string) || u.email || null,
        avatar: (meta.avatar_url as string) || (meta.picture as string) || null,
      });
      const [{ data: roles }, { data: guideRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.id),
        supabase.from("guides").select("id").eq("user_id", u.id).maybeSingle(),
      ]);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setIsGuide(!!guideRow);
      setReady(true);
    });
  }, [navigate]);

  const bookingsQ = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings(),
    enabled: ready,
  });

  // Unread messages count
  useEffect(() => {
    if (!ready) return;
    let cancel = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data: rows } = await supabase
        .from("booking_messages")
        .select("id, read_at, sender_role, booking_id")
        .is("read_at", null)
        .neq("sender_role", "client")
        .limit(200);
      if (cancel) return;
      // Limit to bookings of this user
      const bIds = Array.from(new Set((rows ?? []).map((r) => r.booking_id)));
      if (bIds.length === 0) { setUnread(0); return; }
      const { data: mine } = await supabase
        .from("bookings")
        .select("id")
        .in("id", bIds)
        .eq("user_id", uid);
      const mineIds = new Set((mine ?? []).map((b) => b.id));
      setUnread((rows ?? []).filter((r) => mineIds.has(r.booking_id)).length);
    })();
    return () => { cancel = true; };
  }, [ready]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const bookings = bookingsQ.data ?? [];
  const now = Date.now();
  const upcoming = bookings
    .filter((b) => ["pending", "confirmed"].includes(String(b.status)) && new Date(b.date).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = upcoming[0];
  const past = bookings.filter((b) => String(b.status) === "completed").length;

  const T = {
    title: { en: "My account", ru: "Личный кабинет", uz: "Mening hisobim" }[lang],
    greet: { en: "Hello", ru: "Здравствуйте", uz: "Salom" }[lang],
    overview: { en: "Overview", ru: "Обзор", uz: "Umumiy" }[lang],
    nextTrip: { en: "Next trip", ru: "Ближайшая поездка", uz: "Yaqin sayohat" }[lang],
    noTrip: { en: "No upcoming trips", ru: "Нет предстоящих поездок", uz: "Yaqin sayohatlar yo'q" }[lang],
    findGuide: { en: "Find a guide", ru: "Найти гида", uz: "Hamroh topish" }[lang],
    quickActions: { en: "Quick actions", ru: "Быстрые действия", uz: "Tezkor amallar" }[lang],
    bookings: { en: "My bookings", ru: "Мои бронирования", uz: "Bronlarim" }[lang],
    bookingsDesc: { en: "View, cancel and download trip PDFs", ru: "Просмотр, отмена и PDF бронирований", uz: "Bronlarni ko'rish va PDF yuklab olish" }[lang],
    wishlist: { en: "Wishlist", ru: "Избранное", uz: "Saralangan" }[lang],
    wishlistDesc: { en: "Guides and tours you saved", ru: "Сохранённые гиды и туры", uz: "Saqlangan hamrohlar va sayohatlar" }[lang],
    messages: { en: "Messages", ru: "Сообщения", uz: "Xabarlar" }[lang],
    messagesDesc: { en: "Chats with your guides", ru: "Чаты с вашими гидами", uz: "Hamrohlar bilan suhbatlar" }[lang],
    settings: { en: "Settings", ru: "Настройки", uz: "Sozlamalar" }[lang],
    settingsDesc: { en: "Profile, email, language", ru: "Профиль, email, язык", uz: "Profil, email, til" }[lang],
    ai: { en: "Hamroh AI", ru: "Hamroh AI", uz: "Hamroh AI" }[lang],
    aiDesc: { en: "Plan your trip with AI", ru: "Спланируйте поездку с ИИ", uz: "AI bilan sayohat rejasini tuzing" }[lang],
    becomeGuide: { en: "Become a guide", ru: "Стать гидом", uz: "Hamroh bo'ling" }[lang],
    becomeGuideDesc: { en: "Earn by sharing your city", ru: "Зарабатывайте, показывая свой город", uz: "Shahringizni ko'rsatib daromad oling" }[lang],
    guideCabinet: { en: "Guide cabinet", ru: "Кабинет гида", uz: "Gid kabineti" }[lang],
    adminPanel: { en: "Admin panel", ru: "Админ-панель", uz: "Admin panel" }[lang],
    completed: { en: "Completed trips", ru: "Завершено поездок", uz: "Yakunlangan sayohatlar" }[lang],
    saved: { en: "Saved items", ru: "В избранном", uz: "Saralanganlar" }[lang],
    unread: { en: "Unread", ru: "Непрочитано", uz: "O'qilmagan" }[lang],
    seeAll: { en: "See all", ru: "Все", uz: "Hammasi" }[lang],
  };

  const tiles = [
    { to: "/my-bookings", icon: Calendar, title: T.bookings, desc: T.bookingsDesc, badge: upcoming.length || null },
    { to: "/wishlist", icon: Heart, title: T.wishlist, desc: T.wishlistDesc, badge: wishlistItems.length || null },
    { to: "/messages", icon: MessageSquare, title: T.messages, desc: T.messagesDesc, badge: unread || null },
    { to: "/settings", icon: SettingsIcon, title: T.settings, desc: T.settingsDesc, badge: null },
    { to: "/ai", icon: Sparkles, title: T.ai, desc: T.aiDesc, badge: null },
    !isGuide
      ? { to: "/become-a-guide", icon: Briefcase, title: T.becomeGuide, desc: T.becomeGuideDesc, badge: null }
      : { to: "/guide", icon: Briefcase, title: T.guideCabinet, desc: "", badge: null },
  ] as const;

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-secondary/20">
        <ContinueInAppBanner />
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Profile header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary ring-1 ring-border/60 shrink-0 flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{T.greet},</p>
              <h1 className="font-display text-2xl font-semibold truncate">
                {user?.name ?? user?.email ?? T.title}
              </h1>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label={T.nextTrip} value={next ? new Date(next.date).toLocaleDateString(lang) : "—"} />
            <KpiCard label={T.completed} value={String(past)} />
            <KpiCard label={T.saved} value={String(wishlistItems.length)} />
            <KpiCard label={T.unread} value={String(unread)} highlight={unread > 0} />
          </div>

          {/* Next trip banner */}
          <div className="rounded-2xl bg-card ring-1 ring-border/60 p-5 mb-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{T.nextTrip}</p>
                {next ? (
                  <>
                    <p className="font-medium truncate">{next.experience}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(next.date).toLocaleDateString(lang)}
                      {next.start_time ? ` · ${String(next.start_time).slice(0, 5)}` : ""}
                      {" · "}
                      {next.guests} {next.guests === 1 ? "guest" : "guests"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{T.noTrip}</p>
                )}
              </div>
              {next ? (
                <Link
                  to="/my-bookings"
                  className="shrink-0 inline-flex items-center gap-1 h-9 px-4 rounded-full bg-foreground text-background text-sm font-medium"
                >
                  {T.seeAll} <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  to="/ai"
                  className="shrink-0 inline-flex items-center gap-1 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                >
                  {T.findGuide}
                </Link>
              )}
            </div>
          </div>

          {/* Tiles */}
          <h2 className="font-display text-lg font-semibold mb-3">{T.quickActions}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiles.map((tile) => (
              <Link
                key={tile.to}
                to={tile.to}
                className="group rounded-2xl bg-card ring-1 ring-border/60 p-5 hover:ring-[#C9A84C]/60 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
                    <tile.icon className="h-5 w-5" />
                  </div>
                  {tile.badge ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-foreground text-background">
                      {tile.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-medium">{tile.title}</p>
                {tile.desc && (
                  <p className="text-sm text-muted-foreground mt-0.5">{tile.desc}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-[#C9A84C]">
                  {T.seeAll} <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="group rounded-2xl bg-card ring-1 ring-border/60 p-5 hover:ring-[#C9A84C]/60 hover:shadow-sm transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
                  <Shield className="h-5 w-5" />
                </div>
                <p className="mt-3 font-medium">{T.adminPanel}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-[#C9A84C]">
                  {T.seeAll} <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl ring-1 ring-border/60 p-4 ${highlight ? "bg-[#C9A84C]/10" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold truncate">{value}</p>
    </div>
  );
}
