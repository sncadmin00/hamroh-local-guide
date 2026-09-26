import appStoreBadge from "@/assets/badges/app-store.svg";
import googlePlayBadge from "@/assets/badges/google-play.png";

const APP_STORE_URL = "https://apps.apple.com/app/id6791028497";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.arklabs.hamroh";

export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download Hamroh on the App Store"
        className="inline-flex h-11 shrink-0 items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={appStoreBadge}
          alt="Download on the App Store"
          className="h-11 w-auto"
          width={120}
          height={40}
          loading="lazy"
          decoding="async"
        />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get Hamroh on Google Play"
        className="inline-flex h-11 shrink-0 items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={googlePlayBadge}
          alt="Get it on Google Play"
          className="h-11 w-auto"
          width={564}
          height={168}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}
