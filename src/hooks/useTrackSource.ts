import { useEffect } from "react";

const VALID_SOURCES = ["web", "instagram", "facebook", "telegram", "whatsapp", "other"] as const;
export type BookingSource = (typeof VALID_SOURCES)[number];
const STORAGE_KEY = "bookingSource";

export function useTrackSource() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const src = params.get("src")?.toLowerCase();
      if (!src) return;
      if (!VALID_SOURCES.includes(src as BookingSource)) return;
      // Don't overwrite — first touch wins for the session
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, src);
    } catch {
      // sessionStorage unavailable (private mode etc.) — silently ignore
    }
  }, []);
}

export function getBookingSource(): BookingSource {
  if (typeof window === "undefined") return "web";
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v && VALID_SOURCES.includes(v as BookingSource)) return v as BookingSource;
  } catch {
    /* noop */
  }
  return "web";
}
