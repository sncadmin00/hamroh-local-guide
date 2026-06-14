import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { markInvitationOpened } from "@/lib/guide-invitations.functions";


export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [{ title: "Приглашение — Hamroh" }],
  }),
  component: InviteLanding,
});

function InviteLanding() {
  const { token } = Route.useParams();
  const markOpened = useServerFn(markInvitationOpened);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await markOpened({ data: { token } });
        if (!res.ok || !res.invitation) {
          setError("Приглашение не найдено или истекло.");
          return;
        }
        const params = new URLSearchParams({ invite: token });
        if (res.invitation.email) params.set("email", res.invitation.email);
        if (res.invitation.name) params.set("name", res.invitation.name);
        if (res.invitation.city) params.set("city", res.invitation.city);
        window.location.replace(`/become-a-guide?${params.toString()}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [token, markOpened]);


  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Открываем ваше приглашение…</p>
          </>
        )}
      </div>
    </div>
  );
}
