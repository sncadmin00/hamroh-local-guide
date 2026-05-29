import { Link } from "@tanstack/react-router";
import { Compass, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const menuLinks = [
  { to: "/guides", label: "Find a guide" },
  { to: "/cities", label: "Cities" },
  { to: "/how-it-works", label: "How it works" },
] as const;

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

        <Sheet>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-border/60 text-foreground hover:bg-secondary/60"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col">
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
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
