import { createFileRoute, Outlet, useNavigate, useParams, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/ai-threads.functions";
import { Compass, Plus, Trash2, MessageSquare, LogOut, ArrowLeft, Calendar } from "lucide-react";

export const Route = createFileRoute("/ai")({
  head: () => ({ meta: [{ title: "Sancho AI — Find your guide" }] }),
  component: AiLayout,
});

function AiLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false }) as { threadId?: string };
  const qc = useQueryClient();
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-secondary/20">
      <aside className="hidden md:flex w-72 flex-col border-r border-border/60 bg-background">
        <div className="p-4 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">Sancho AI</span>
          </Link>
        </div>
        <div className="p-3">
          <button
            onClick={newThread}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New search
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent</p>
          <ul className="space-y-1">
            {(threads.data ?? []).map((t) => {
              const active = params.threadId === t.id;
              return (
                <li key={t.id} className="group flex items-center gap-1">
                  <Link
                    to="/ai/$threadId"
                    params={{ threadId: t.id }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm truncate transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    onClick={() => removeThread(t.id)}
                    aria-label="Delete thread"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            {threads.data?.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No searches yet</li>
            )}
          </ul>
        </div>
        <div className="border-t border-border/60 p-3 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">{userEmail}</div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
