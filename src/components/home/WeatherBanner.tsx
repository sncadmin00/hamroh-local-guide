import { useState } from "react";
import { X, Thermometer } from "lucide-react";

type Prefs = { city?: string };

export function WeatherBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem("weatherDismissed") === "1"; } catch { return false; }
  });
  const prefs: Prefs = (() => {
    try { return JSON.parse(localStorage.getItem("tripPrefs") || "{}"); } catch { return {}; }
  })();
  if (dismissed) return null;

  const city = prefs.city || "Samarkand";
  // Mock weather — replace with real API later
  const temp = 38;
  const tip = `Recommending early tours before 10:00 — cooler and fewer tourists`;

  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem("weatherDismissed", "1"); } catch {}
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-4">
      <div
        className="flex items-start gap-3 rounded-2xl p-4 pr-3"
        style={{
          background: "color-mix(in srgb, #1F9BB4 10%, var(--card))",
          border: "1px solid color-mix(in srgb, #1F9BB4 24%, transparent)",
        }}
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, #1F9BB4 22%, transparent)", color: "#1F9BB4" }}
        >
          <Thermometer className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Tomorrow in {city} +{temp}°C
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{tip}</p>
        </div>
        <button onClick={close} aria-label="Dismiss" className="p-1.5 rounded-full hover:bg-white/10 shrink-0">
          <X className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
        </button>
      </div>
    </div>
  );
}
