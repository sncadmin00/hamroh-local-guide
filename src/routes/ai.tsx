import { createFileRoute, Outlet, useNavigate, useParams, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/ai-threads.functions";
import { Compass, Plus, Trash2, MessageSquare, LogOut, ArrowLeft, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { signOutAndRedirect } from "@/lib/auth";

export const Route = createFileRoute("/ai")({
  head: () => ({ meta: [{ title: "Hamroh AI — Find your guide" }] }),
  component: AiLayout,
});

function AiLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false }) as { threadId?: string };
  const qc = useQueryClient();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/login", replace: true });
      } else {
        setUserEmail(data.user.email ?? null);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login", replace: true });
      else setUserEmail(session.user.email ?? null);
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, router, qc]);

  const threads = useQuery({
    queryKey: ["ai-threads"],
    queryFn: () => list(),
    enabled: ready,
  });

  // If on /ai (no threadId), create one and redirect
  useEffect(() => {
    if (!ready || params.threadId) return;
    let cancelled = false;
    (async () => {
      const t = await create();
      if (!cancelled && t?.id) {
        qc.invalidateQueries({ queryKey: ["ai-threads"] });
        navigate({ to: "/ai/$threadId", params: { threadId: t.id }, replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [ready, params.threadId, create, navigate, qc]);

  const newThread = async () => {
    const t = await create();
    if (t?.id) {
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
      navigate({ to: "/ai/$threadId", params: { threadId: t.id } });
    }
  };

  const removeThread = async (id: string) => {
    await del({ data: { threadId: id } });
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
    if (params.threadId === id) {
      navigate({ to: "/ai", replace: true });
    }
  };

  const signOut = () => signOutAndRedirect("/");

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t("ai.loading")}</div>;
  }

  return (
    <div className="min-h-screen flex bg-secondary/20">
      <aside className="hidden md:flex w-72 flex-col border-r border-border/60 bg-background">
        <div className="p-4 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">Hamroh AI</span>
          </Link>
        </div>
        <div className="p-3">
          <button
            onClick={newThread}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> {t("ai.newSearch")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("ai.recent")}</p>
          <ul className="space-y-1">
            {(threads.data ?? []).map((t2) => {
              const active = params.threadId === t2.id;
              return (
                <li key={t2.id} className="group flex items-center gap-1">
                  <Link
                    to="/ai/$threadId"
                    params={{ threadId: t2.id }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm truncate transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t2.title}</span>
                  </Link>
                  <button
                    onClick={() => removeThread(t2.id)}
                    aria-label={t("ai.deleteThread")}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            {threads.data?.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">{t("ai.noSearches")}</li>
            )}
          </ul>
        </div>
        <div className="border-t border-border/60 p-3 space-y-1">
          <Link to="/my-bookings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <Calendar className="h-4 w-4" /> {t("nav.myBookings")}
          </Link>
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("ai.backToSite")}
          </Link>
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">{userEmail}</div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <LogOut className="h-4 w-4" /> {t("common.signOut")}
          </button>
        </div>
      </aside>


      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-2 px-3 h-12 border-b border-border/60 bg-background/90 backdrop-blur">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("ai.home")}
          </Link>
          <Link to="/" className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-sm font-semibold">Hamroh AI</span>
          </Link>
          <button
            onClick={newThread}
            aria-label={t("ai.newSearch")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
