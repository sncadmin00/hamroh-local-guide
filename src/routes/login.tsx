import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Apple, X } from "lucide-react";
import hamrohLogo from "@/assets/hamroh-logo.png";
import { useI18n } from "@/lib/i18n";
import { subscribeToNewsletter } from "@/lib/newsletter.functions";
import { sendWelcomeEmail } from "@/lib/lifecycle-emails.functions";
import { trackEvent } from "@/lib/analytics";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Hamroh" }] }),
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { lang } = useI18n();
  const subscribe = useServerFn(subscribeToNewsletter);
  const sendWelcome = useServerFn(sendWelcomeEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const safeRedirect = (value: string | undefined | null) => {
      if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
      return value;
    };
    const waitForOAuthUser = async (): Promise<{ id: string } | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) return sessionData.session.user;
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) return userData.user;
      return await new Promise<{ id: string } | null>((resolve) => {
        let unsubscribe = () => {};
        const timeout = window.setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 3000);
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
          if (!session?.user) return;
          window.clearTimeout(timeout);
          unsubscribe();
          resolve(session.user);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      });
    };
    const resolveAndGo = async (userId: string) => {
      const pendingRedirect =
        safeRedirect(sessionStorage.getItem("authRedirect")) ?? safeRedirect(redirect);
      if (pendingRedirect) sessionStorage.removeItem("authRedirect");
      let target = "/";
      try {
        const [{ data: guide }, { data: roles }] = await Promise.all([
          supabase.from("guides").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        const isAdmin = roles?.some((r) => r.role === "admin");
        target = pendingRedirect ?? (guide ? "/guide" : isAdmin ? "/admin" : "/");
      } catch (e) {
        console.error("resolveAndGo failed, falling back to /", e);
        target = pendingRedirect ?? "/";
      }
      try {
        if (pendingRedirect) {
          navigate({ href: target, replace: true });
        } else {
          navigate({ to: target, replace: true });
        }
      } catch (e) {
        console.error("navigate failed, hard redirect", e);
      }
      // Hard fallback: if still on /login shortly after, force a real navigation.
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/login")) {
          window.location.replace(target);
        }
      }, 400);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setTimeout(() => {
          resolveAndGo(session.user.id);
        }, 0);
      }
    });
    waitForOAuthUser().then((user) => {
      if (user) resolveAndGo(user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);


  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/login",
            data: { locale: lang },
          },
        });
        if (error) throw error;
        try {
          await sendWelcome({ data: { email, locale: lang as "ru" | "uz" | "en" } });
        } catch (e) {
          console.error("Welcome email failed", e);
        }
        trackEvent("signup", { locale: lang });
        if (newsletterOptIn) {
          try {
            await subscribe({
              data: { email, locale: lang as "ru" | "uz" | "en", source: "signup" },
            });
          } catch (e) {
            console.error("Newsletter opt-in failed", e);
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    if (redirect) sessionStorage.setItem("authRedirect", redirect);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/login",
    });
    if (result.error) setError(result.error.message);
  };

  const apple = async () => {
    setError(null);
    if (redirect) sessionStorage.setItem("authRedirect", redirect);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + "/login",
    });
    if (result.error) setError(result.error.message);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4 py-8 relative">
      <Link
        to="/"
        aria-label="Close"
        className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="h-5 w-5" />
      </Link>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src={hamrohLogo} alt="Hamroh" className="h-14 w-auto object-contain" />
        </Link>
        <div className="rounded-3xl bg-card p-8 ring-1 ring-border/60 shadow-[var(--shadow-elegant)]">
          <h1 className="font-display text-2xl font-semibold">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to ask Hamroh AI about guides.</p>

          <div className="mt-6 space-y-2">
            <TelegramLoginButton mode="signin" />
            <button
              onClick={google}
              type="button"
              className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button
              onClick={apple}
              type="button"
              className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Apple className="h-4 w-4" />
              Continue with Apple
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border"></div>OR<div className="h-px flex-1 bg-border"></div>
          </div>

          <form onSubmit={submitEmail} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  />
                  <span>
                    Send me new articles and travel tips from Hamroh.
                    You can unsubscribe anytime.
                  </span>
                </label>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to Hamroh? " : "Already have an account? "}
                <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
          </form>
        </div>
      </div>
    </div>
  );
}
