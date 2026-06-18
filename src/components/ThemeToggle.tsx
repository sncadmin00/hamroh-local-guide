import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ transparent = false }: { transparent?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 transition-all hover:scale-105 ${
        transparent
          ? "ring-[rgba(255,255,255,0.4)] bg-[rgba(10,15,30,0.35)] backdrop-blur-[8px] text-[var(--foreground)]"
          : "ring-border bg-card text-foreground/80"
      }`}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Moon
          className={`absolute h-4 w-4 transition-all duration-300 ${
            isDark ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
          }`}
        />
        <Sun
          className={`absolute h-4 w-4 transition-all duration-300 ${
            isDark ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
          }`}
        />
      </span>
    </button>
  );
}
