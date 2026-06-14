import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { markInvitationOpened } from "@/lib/guide-invitations.functions";
import { useI18n } from "@/lib/i18n";

const COPY = {
  title: { ru: "Приглашение — Hamroh", uz: "Taklif — Hamroh", en: "Invitation — Hamroh" },
  notFound: {
    ru: "Приглашение не найдено или истекло.",
    uz: "Taklif topilmadi yoki muddati o‘tgan.",
    en: "Invitation not found or expired.",
  },
  opening: {
    ru: "Открываем ваше приглашение…",
    uz: "Taklifingizni ochmoqdamiz…",
    en: "Opening your invitation…",
  },
  error: { ru: "Ошибка", uz: "Xato", en: "Error" },
} as const;

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [{ title: "Приглашение — Hamroh" }],
  }),
  component: InviteLanding,
});

function InviteLanding() {
  const { token } = Route.useParams();
  const { lang } = useI18n();
  const markOpened = useServerFn(markInvitationOpened);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await markOpened({ data: { token } });
        if (!res.ok || !res.invitation) {
          setError(COPY.notFound[lang]);
          return;
        }
        const params = new URLSearchParams({ invite: token });
        if (res.invitation.email) params.set("email", res.invitation.email);
        if (res.invitation.name) params.set("name", res.invitation.name);
        if (res.invitation.city) params.set("city", res.invitation.city);
        window.location.replace(`/become-a-guide?${params.toString()}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : COPY.error[lang]);
      }
    })();
  }, [token, markOpened, lang]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{COPY.opening[lang]}</p>
          </>
        )}
      </div>
    </div>
  );
}
