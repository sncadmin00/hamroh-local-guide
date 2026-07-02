import { Link } from "@tanstack/react-router";
import { Menu, Settings, Shield, LogIn, LogOut, Mail, Phone, MessageSquare, User, Heart, Briefcase, Calendar } from "lucide-react";

import hamrohLogo from "@/assets/hamroh-logo.png";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/home/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function SiteHeader({ transparent = false, sticky = true }: { transparent?: boolean; sticky?: boolean } = {}) {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuide, setIsGuide] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const checkAdmin = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      setIsAdmin((data ?? []).some((r) => r.role === "admin"));
    };
    const checkGuide = async (userId: string | undefined) => {
      if (!userId) { setIsGuide(false); return; }
      const { data } = await supabase.from("guides").select("id, verified").eq("user_id", userId).maybeSingle();
      setIsGuide(!!data);
    };
    const applyUser = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined) => {
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const pic = (meta.avatar_url as string) || (meta.picture as string) || null;
      const name = (meta.full_name as string) || (meta.name as string) || user?.email || null;
      setAvatarUrl(pic ?? null);
      setDisplayName(name ?? null);
    };
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      checkAdmin(data.session?.user.id);
      checkGuide(data.session?.user.id);
      applyUser(data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      checkAdmin(session?.user.id);
      checkGuide(session?.user.id);
      applyUser(session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const signOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignedIn(false);
    setIsAdmin(false);
    setIsGuide(false);
    setAvatarUrl(null);
    setDisplayName(null);
    setMenuOpen(false);
    signOutAndRedirect("/");
  };
  const menuLinks = [
    { to: "/tours", label: t("nav.tours") },
    { to: "/guides", label: t("nav.findGuide") },
    ...(!isGuide ? [{ to: "/become-a-guide", label: t("nav.becomeGuide") }] : []),
    { to: "/faq", label: t("nav.faq") },
  ] as const;

  return (
    <header className={`sticky top-0 z-40 transition-colors ${transparent && !scrolled ? "bg-transparent" : "bg-background/85 backdrop-blur-md"}`}>
      <div className={`${transparent ? "max-w-6xl mx-auto" : "container mx-auto"} flex h-16 items-center justify-between gap-4 px-4`}>
        {/* Left: logo */}
        <Link to="/" className="flex items-center shrink-0 leading-none">
          <img
            src={hamrohLogo}
            alt="Hamroh"
            className="h-[3.25rem] w-auto object-contain"
          />
        </Link>



        {/* Right: language, user pill */}
        <div className="flex items-center gap-1.5 shrink-0">


          <ThemeToggle transparent={transparent} />
          <NotificationsBell transparent={transparent} />


          <LanguageSwitcher
            className={
              transparent
                ? "text-[var(--foreground)] ring-[rgba(255,255,255,0.4)] bg-[rgba(10,15,30,0.35)] backdrop-blur-[8px] hover:bg-white/10"
                : undefined
            }
          />

          {/* Airbnb-style avatar+menu pill */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className={`inline-flex items-center gap-2 h-10 pl-2.5 pr-1.5 rounded-full ring-1 hover:shadow-md transition-shadow ${
                  transparent
                    ? "ring-[rgba(255,255,255,0.4)] bg-[rgba(10,15,30,0.35)] backdrop-blur-[8px]"
                    : "ring-border/70 bg-card/80"
                }`}
              >
                <Menu className={`h-4 w-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${transparent ? "text-[var(--foreground)]" : "text-foreground/70"}`} />
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full overflow-hidden border-2 border-[rgba(255,255,255,0.3)] ${
                  transparent ? "bg-white/10 text-[var(--foreground)]" : "bg-secondary text-foreground/70"
                }`}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : displayName ? (
                    <span className={`text-xs font-semibold ${transparent ? "text-[var(--foreground)]" : "text-foreground/80"}`}>
                      {displayName.trim().charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className={`h-4 w-4 ${transparent ? "text-[var(--foreground)]" : ""}`} />
                  )}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-[var(--card)] border-[var(--border)] p-0">
              <SheetHeader className="px-6 pt-8 pb-2">
                <SheetTitle className="text-left font-['DM_Serif_Display',serif] text-[var(--foreground)] text-2xl tracking-wide">
                  {t("common.menu")}
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col px-6">
                <Link
                  to="/wishlist"
                  className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                  activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                >
                  <Heart className="h-5 w-5 text-[#C9A84C]" /> {t("nav.wishlist")}
                </Link>
                {menuLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    {link.label}
                  </Link>
                ))}
                {signedIn && (
                  <Link
                    to="/messages"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <MessageSquare className="h-5 w-5 text-[#C9A84C]" /> {t("common.messages")}
                  </Link>
                )}
                {signedIn && (
                  <Link
                    to="/account"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <User className="h-5 w-5 text-[#C9A84C]" /> {t("nav.myAccount")}
                  </Link>
                )}
                {signedIn && (
                  <Link
                    to="/my-bookings"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <Calendar className="h-5 w-5 text-[#C9A84C]" /> {t("nav.myBookings")}
                  </Link>
                )}
                {signedIn && (
                  <Link
                    to="/settings"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <Settings className="h-5 w-5 text-[#C9A84C]" /> {t("common.settings")}
                  </Link>
                )}
                {isGuide && (
                  <Link
                    to="/guide"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <Briefcase className="h-5 w-5 text-[#C9A84C]" /> {t("nav.guideDashboard")}
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="py-[14px] text-[1.1rem] text-[var(--foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1"
                    activeProps={{ className: "py-[14px] text-[1.1rem] text-[#C9A84C] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#C9A84C] hover:translate-x-1" }}
                  >
                    <Shield className="h-5 w-5 text-[#C9A84C]" /> {t("common.admin")}
                  </Link>
                )}
                {signedIn ? (
                  <button
                    onClick={signOut}
                    disabled={signingOut}
                    className="py-[14px] text-[1.1rem] text-[var(--muted-foreground)] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:text-[#ef4444] hover:translate-x-1 text-left"
                  >
                    <LogOut className="h-5 w-5" /> {t("common.signOut")}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="py-[14px] text-[1.1rem] font-semibold text-[#0B1430] inline-flex items-center gap-3 border-b border-[var(--border)] transition-all duration-200 hover:translate-x-1 bg-[#C9A84C] rounded-lg px-3 mt-2"
                  >
                    <LogIn className="h-5 w-5" /> {t("common.signIn")}
                  </Link>
                )}
              </nav>
              <div className="mt-6 flex items-center gap-3 px-6">
                <span className="text-sm text-[var(--muted-foreground)]">{t("common.contactUs")}</span>
                <a
                  href="https://t.me/yourtelegram"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join Telegram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[#C9A84C] transition-colors"
                >
                  <TelegramIcon className="h-5 w-5" />
                </a>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[#C9A84C] transition-colors"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
                <a
                  href="mailto:hello@hamroh.com"
                  aria-label="Email us"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[#C9A84C] transition-colors"
                >
                  <Mail className="h-5 w-5" />
                </a>
                <a
                  href="tel:+1234567890"
                  aria-label="Call us"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[#C9A84C] transition-colors"
                >
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
