import { Compass } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold">Hamroh</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hamroh · Trusted local guides in Uzbekistan
        </p>
      </div>
    </footer>
  );
}
