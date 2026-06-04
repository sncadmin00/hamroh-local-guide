import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Music2, Twitter, Send } from "lucide-react";
import hamrohLogo from "@/assets/hamroh-logo.png";
import { useI18n } from "@/lib/i18n";


export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <img src={hamrohLogo} alt="Hamroh" className="h-12 w-auto object-contain" />
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground">{t("footer.about")}</Link>
            <Link to="/faq" className="hover:text-foreground">{t("nav.faq")}</Link>
            <Link to="/contact" className="hover:text-foreground">{t("footer.contact")}</Link>
            <Link to="/terms" className="hover:text-foreground">{t("footer.terms")}</Link>
            <Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
            <Link to="/refund-policy" className="hover:text-foreground">{t("footer.refunds")}</Link>
          </nav>

          <div className="flex items-center gap-2">
            <a href="https://instagram.com/yourhandle" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://tiktok.com/@yourhandle" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Music2 className="h-5 w-5" />
            </a>
            <a href="https://youtube.com/@yourhandle" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Youtube className="h-5 w-5" />
            </a>
            <a href="https://x.com/yourhandle" target="_blank" rel="noopener noreferrer" aria-label="X"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="https://t.me/hamroh" target="_blank" rel="noopener noreferrer" aria-label="Telegram channel"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Send className="h-5 w-5" />
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hamroh · {t("footer.tagline")}
        </p>
      </div>
    </footer>
  );
}
