import { Link } from "@tanstack/react-router";
import { Compass, Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">Hamroh</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link to="/guides" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Find a guide
          </Link>
          <a href="/#cities" className="text-muted-foreground transition-colors hover:text-foreground">Cities</a>
          <a href="/#how" className="text-muted-foreground transition-colors hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/ai"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" /> Ask AI
          </Link>
          <Link
            to="/guides"
            className="hidden sm:inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Explore
          </Link>
        </div>
      </div>
    </header>
  );
}
