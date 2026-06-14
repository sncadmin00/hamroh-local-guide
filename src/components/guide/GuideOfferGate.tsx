import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ScrollText } from "lucide-react";
import { getMyGuideOfferStatus, acceptOfferAsGuide } from "@/lib/legal-offer.functions";

/**
 * Modal that blocks the guide cabinet until the current public offer is accepted.
 * Renders nothing once accepted.
 */
export function GuideOfferGate() {
  const statusFn = useServerFn(getMyGuideOfferStatus);
  const acceptFn = useServerFn(acceptOfferAsGuide);

  const [needsAccept, setNeedsAccept] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    statusFn()
      .then((s: any) => {
        if (s?.isGuide && !s.accepted && s.version) {
          setVersion(s.version);
          setNeedsAccept(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [statusFn]);

  if (!checked || !needsAccept || !version) return null;

  async function accept() {
    if (!agree || !version) return;
    setSubmitting(true);
    try {
      await acceptFn({ data: { version } });
      toast.success("Оферта принята");
      setNeedsAccept(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Публичная оферта Hamroh</h2>
            <p className="text-xs text-muted-foreground">Версия {version}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Чтобы продолжить работу с кабинетом гида, пожалуйста ознакомьтесь с условиями публичной оферты и подтвердите согласие. Это требуется один раз для каждой новой версии.
        </p>

        <Link
          to="/offer"
          target="_blank"
          className="inline-flex h-9 px-4 items-center rounded-full bg-secondary text-sm font-medium"
        >
          Открыть текст оферты ↗
        </Link>

        <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-border">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm">
            Я ознакомился и принимаю условия публичной оферты Hamroh (версия {version}).
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!agree || submitting}
          className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Принять и продолжить
        </button>
      </div>
    </div>
  );
}
