import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMessageThreads } from "@/lib/messages.functions";
import { MessageSquare, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Hamroh" }] }),
  component: MessagesLayout,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-sm text-destructive p-4 text-center">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function MessagesLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const fetchThreads = useServerFn(listMessageThreads);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/login", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const q = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => fetchThreads(),
    enabled: ready,
    refetchInterval: 15000,
  });

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  const threads = q.data ?? [];

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-semibold inline-flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Messages
          </h1>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden">
            {q.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
            {!q.isLoading && threads.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet. Once you book a guide, a chat will open here.</p>
            )}
            <ul className="divide-y divide-border/60">
              {threads.map((t) => (
                <li key={t.booking_id}>
                  <Link
                    to="/messages/$bookingId"
                    params={{ bookingId: t.booking_id }}
                    className="flex gap-3 p-3 hover:bg-secondary/50 transition-colors"
                    activeProps={{ className: "flex gap-3 p-3 bg-secondary" }}
                  >
                    {t.counterpart_photo ? (
                      <img src={t.counterpart_photo} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-secondary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{t.counterpart_name}</p>
                        {t.unread > 0 && (
                          <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.experience} · {t.date}</p>
                      {t.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message.body}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <section className="rounded-2xl bg-card ring-1 ring-border/60 min-h-[60vh] flex flex-col">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
