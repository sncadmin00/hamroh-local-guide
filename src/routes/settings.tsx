import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import hamrohLogo from "@/assets/hamroh-logo.png";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { getMyTelegramAccount, updateMyTelegramEmail } from "@/lib/telegram.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Account settings — Hamroh" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const fetchTelegram = useServerFn(getMyTelegramAccount);
  const saveTelegramEmail = useServerFn(updateMyTelegramEmail);
  const [checking, setChecking] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [telegramEmail, setTelegramEmail] = useState("");
  const [telegramLabel, setTelegramLabel] = useState<string | null>(null);
  const [savingTelegramEmail, setSavingTelegramEmail] = useState(false);

  const loadTelegram = async () => {
    try {
      const result = await fetchTelegram();
      const account = result.account;
      setTelegramLabel(account ? (account.telegram_username ? `@${account.telegram_username}` : String(account.telegram_user_id)) : null);
      setTelegramEmail(account?.email ?? result.authEmail ?? "");
    } catch {
      setTelegramLabel(null);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setCurrentEmail(data.user.email ?? "");
      setEmail(data.user.email ?? "");
      setChecking(false);
      loadTelegram();
    });
  }, [navigate]);

  const updateTelegramEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTelegramEmail(true);
    try {
      await saveTelegramEmail({ data: { email: telegramEmail } });
      toast.success("Telegram email saved");
      await loadTelegram();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save email");
    } finally {
      setSavingTelegramEmail(false);
    }
  };

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email === currentEmail) {
      toast.error("Enter a different email address");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else toast.success("Confirmation link sent to your new email");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPassword("");
      setConfirm("");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <img src={hamrohLogo} alt="Hamroh" className="h-12 w-auto object-contain" />
        </Link>

        <h1 className="font-display text-3xl font-semibold">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {currentEmail || telegramLabel || "—"}
        </p>

        <section className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-border/60">
          <h2 className="font-display text-lg font-semibold">Telegram</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {telegramLabel ? `Linked: ${telegramLabel}` : "Link Telegram to receive booking updates there."}
          </p>
          {!telegramLabel && <div className="mt-4"><TelegramLoginButton mode="link" onLinked={loadTelegram} /></div>}
          {telegramLabel && (
            <form onSubmit={updateTelegramEmail} className="mt-5">
              <label className="text-sm font-medium">Optional email for duplicate booking notifications</label>
              <input
                type="email"
                value={telegramEmail}
                onChange={(e) => setTelegramEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-2 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={savingTelegramEmail}
                className="mt-4 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {savingTelegramEmail ? "Saving…" : "Save email"}
              </button>
            </form>
          )}
        </section>

        <form onSubmit={updateEmail} className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60">
          <h2 className="font-display text-lg font-semibold">Email address</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll send a confirmation link to the new address.</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={savingEmail}
            className="mt-4 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {savingEmail ? "Saving…" : "Update email"}
          </button>
        </form>

        <form onSubmit={updatePassword} className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60">
          <h2 className="font-display text-lg font-semibold">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">At least 8 characters.</p>
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-3 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={savingPassword}
            className="mt-4 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {savingPassword ? "Saving…" : "Update password"}
          </button>
        </form>

        <div className="mt-8 flex justify-end">
          <button
            onClick={signOut}
            className="h-10 px-5 rounded-full border border-input text-sm font-medium hover:bg-secondary"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
