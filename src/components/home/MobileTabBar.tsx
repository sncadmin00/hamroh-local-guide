import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Bookmark, User } from "lucide-react";

const isActive = (path: string, current: string) =>
  path === "/" ? current === "/" : current.startsWith(path);

export function MobileTabBar() {
  const { location } = useRouterState();
  const current = location.pathname;

  const item = (to: string, Icon: typeof Home, label: string) => {
    const active = isActive(to, current);
    return (
      <Link
        to={to}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
        style={{ color: active ? "#C9A84C" : "var(--muted-foreground)" }}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
        <span className="text-[10px] font-semibold">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Spacer so bottom content is not covered */}
      <div className="md:hidden h-20" aria-hidden />
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
          borderTop: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="relative flex items-stretch max-w-[520px] mx-auto px-2">
          {item("/", Home, "Home")}
          {item("/explore", Compass, "Explore")}

          {/* Center AI button */}
          <div className="flex-1 flex items-start justify-center relative">
            <Link
              to="/ai"
              aria-label="Ask AI"
              className="absolute -top-6 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #D4B45E 0%, #B39038 100%)",
                boxShadow: "0 8px 24px color-mix(in srgb, #C9A84C 40%, transparent)",
                border: "3px solid var(--background)",
              }}
            >
              <span className="text-xl" style={{ color: "#fff" }}>✦</span>
            </Link>
          </div>

          {item("/wishlist", Bookmark, "Saved")}
          {item("/account", User, "Account")}
        </div>
      </nav>
    </>
  );
}
