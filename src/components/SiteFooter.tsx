import { Instagram, Youtube, Music2, Twitter, Send } from "lucide-react";
import hamrohLogo from "@/assets/hamroh-logo.png";



export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <img src={hamrohLogo} alt="Hamroh" className="h-8 w-auto object-contain" />
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hamroh · Trusted local guides
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://instagram.com/yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://tiktok.com/@yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Music2 className="h-5 w-5" />
          </a>
          <a
            href="https://youtube.com/@yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Youtube className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Twitter className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
