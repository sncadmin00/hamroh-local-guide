import { Smartphone, X } from "lucide-react";
import { useState } from "react";

export function ContinueInAppBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-4">
      <div
        className="relative flex items-center gap-4 rounded-2xl px-4 py-3 md:px-5 md:py-4"
        style={{
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
      >
        <Smartphone className="h-5 w-5 shrink-0" style={{ color: "#C9A84C" }} />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-semibold text-[var(--foreground)]">
            Continue in the Hamroh app
          </span>
          <span className="text-[var(--muted-foreground)] hidden md:inline">
            {" — offline access, push notifications and travel tools."}
          </span>
        </div>
        <a
          href="#"
          className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: "#C9A84C", color: "#0B1430" }}
        >
          Get the app
        </a>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

