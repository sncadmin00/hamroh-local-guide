import { useEffect } from "react";
import { captureReferral } from "@/lib/referral";

export function useCaptureReferral() {
  useEffect(() => {
    captureReferral();
  }, []);
}
