import { Smartphone, Apple } from "lucide-react";

export function DownloadAppBanner() {

  return (
    <section className="px-6 md:px-12 py-14 md:py-[72px]">
      <div
        className="relative max-w-[1280px] mx-auto rounded-3xl overflow-hidden px-8 py-10 md:px-14 md:py-14"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,31,92,0.95) 0%, rgba(30,50,120,0.92) 100%)",
          color: "#fff",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
      >
        <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <p
              className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] mb-3"
              style={{ color: "#C9A84C" }}
            >
              Hamroh app
            </p>
            <h2
              className="text-[1.6rem] md:text-[2.4rem] leading-[1.15] tracking-tight"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Take Hamroh with you across Uzbekistan
            </h2>
            <p className="mt-3 text-sm md:text-base opacity-80 max-w-xl">
              Offline maps, weather, budget tracker, travel diary and chat with your guide — all in your pocket.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://apps.apple.com/app/id6791028497"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-xl px-5 py-3 bg-black/40 hover:bg-black/60 transition-colors ring-1 ring-white/15"
              >
                <Apple className="h-6 w-6" />
                <span className="leading-tight text-left">
                  <span className="block text-[0.65rem] uppercase tracking-widest opacity-70">
                    Download on the
                  </span>
                  <span className="block text-base font-semibold">App Store</span>
                </span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.arklabs.hamroh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-xl px-5 py-3 bg-black/40 hover:bg-black/60 transition-colors ring-1 ring-white/15"
              >
                <Smartphone className="h-6 w-6" />
                <span className="leading-tight text-left">
                  <span className="block text-[0.65rem] uppercase tracking-widest opacity-70">
                    Get it on
                  </span>
                  <span className="block text-base font-semibold">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-3 shrink-0">
            <div
              className="h-32 w-32 rounded-2xl bg-white flex items-center justify-center"
              aria-label="QR code placeholder"
            >
              <span className="text-xs text-black/40">QR</span>
            </div>
            <span className="text-xs opacity-70">Scan to download</span>
          </div>
        </div>
      </div>
    </section>
  );
}
