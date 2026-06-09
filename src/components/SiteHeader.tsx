import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Settings, Shield, LogIn, LogOut, Mail, Phone, MessageSquare, User, Heart, Briefcase } from "lucide-react";
import hamrohLogo from "@/assets/hamroh-logo.png";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";

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

export function SiteHeader() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuide, setIsGuide] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
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
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  const menuLinks = [
    { to: "/tours", label: t("nav.tours") },
    { to: "/guides", label: t("nav.findGuide") },
    { to: "/book", label: t("book.cta") },
    ...(!isGuide ? [{ to: "/become-a-guide", label: t("nav.becomeGuide") }] : []),
    { to: "/faq", label: t("nav.faq") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Left: logo */}
        <Link to="/" className="flex items-center shrink-0 leading-none">
          <img src={hamrohLogo} alt="Hamroh" className="h-[3.25rem] w-auto object-contain" />
        </Link>



        {/* Right: wishlist, language, user pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/wishlist"
            aria-label={t("nav.wishlist")}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-secondary/70 transition-colors"
          >
            <Heart className="h-[18px] w-[18px]" />
          </Link>

          <LanguageSwitcher />

          {/* Airbnb-style avatar+menu pill */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="inline-flex items-center gap-2 h-10 pl-2.5 pr-1.5 rounded-full ring-1 ring-border/70 bg-card/80 hover:shadow-md transition-shadow"
              >
                <Menu className="h-4 w-4 text-foreground/70" />
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground/70 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : displayName ? (
                    <span className="text-xs font-semibold text-foreground/80">
                      {displayName.trim().charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">{t("common.menu")}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col">
                <Link
                  to="/wishlist"
                  className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2"
                  activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground inline-flex items-center gap-2" }}
                >
                  <Heart className="h-4 w-4" /> {t("nav.wishlist")}
                </Link>
                {menuLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60"
                    activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground" }}
                  >
                    {link.label}
                  </Link>
                ))}
                {signedIn && (
                  <Link
                    to="/messages"
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2"
                    activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground inline-flex items-center gap-2" }}
                  >
                    <MessageSquare className="h-4 w-4" /> {t("common.messages")}
                  </Link>
                )}
                {signedIn && (
                  <Link
                    to="/settings"
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2"
                    activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground inline-flex items-center gap-2" }}
                  >
                    <Settings className="h-4 w-4" /> {t("common.settings")}
                  </Link>
                )}
                {isGuide && (
                  <Link
                    to="/guide"
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2"
                    activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground inline-flex items-center gap-2" }}
                  >
                    <Briefcase className="h-4 w-4" /> {t("nav.guideDashboard")}
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2"
                    activeProps={{ className: "px-3 py-3 rounded-lg text-base font-medium bg-secondary text-foreground inline-flex items-center gap-2" }}
                  >
                    <Shield className="h-4 w-4" /> {t("common.admin")}
                  </Link>
                )}
                {signedIn ? (
                  <button
                    onClick={signOut}
                    className="mt-2 px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-secondary/60 inline-flex items-center gap-2 text-left"
                  >
                    <LogOut className="h-4 w-4" /> {t("common.signOut")}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="mt-2 px-3 py-3 rounded-lg text-base font-semibold bg-primary text-primary-foreground inline-flex items-center gap-2"
                  >
                    <LogIn className="h-4 w-4" /> {t("common.signIn")}
                  </Link>
                )}
              </nav>
              <div className="mt-6 flex items-center gap-3 px-3">
                <span className="text-sm text-muted-foreground">{t("common.contactUs")}</span>
                <a
                  href="https://t.me/yourtelegram"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join Telegram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 transition-colors"
                >
                  <TelegramIcon className="h-5 w-5" />
                </a>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
                <a
                  href="mailto:hello@hamroh.com"
                  aria-label="Email us"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Mail className="h-5 w-5" />
                </a>
                <a
                  href="tel:+1234567890"
                  aria-label="Call us"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
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
