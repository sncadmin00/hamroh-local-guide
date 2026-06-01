import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Account settings — Sancho" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setCurrentEmail(data.user.email ?? "");
      setCurrentPhone(data.user.phone ?? "");
      setEmail(data.user.email ?? "");
      setPhone(data.user.phone ? `+${data.user.phone}` : "");
      setChecking(false);
    });
  }, [navigate]);

  const sendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.startsWith("+")) {
      toast.error("Enter phone in international format (e.g. +998 90 123 45 67)");
      return;
    }
    setSavingPhone(true);
    const { error } = await supabase.auth.updateUser({ phone });
    setSavingPhone(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Code sent to your phone");
      setOtpSent(true);
    }
  };

  const verifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error("Enter the code from SMS");
      return;
    }
    setSavingPhone(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otp,
      type: "phone_change",
    });
    setSavingPhone(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Phone number linked");
      setOtp("");
      setOtpSent(false);
      const { data } = await supabase.auth.getUser();
      setCurrentPhone(data.user?.phone ?? "");
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Sancho</span>
        </Link>

        <h1 className="font-display text-3xl font-semibold">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {currentEmail || (currentPhone ? `+${currentPhone}` : "—")}
        </p>

        <form onSubmit={otpSent ? verifyPhoneOtp : sendPhoneOtp} className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-border/60">
          <h2 className="font-display text-lg font-semibold">Phone number</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentPhone
              ? `Linked: +${currentPhone}. Link a new number to replace it.`
              : "Link a phone so you can also sign in via SMS. Use international format."}
          </p>
          <input
            type="tel"
            required
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={otpSent}
            className="mt-4 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          {otpSent && (
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="SMS code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-3 w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={savingPhone}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {savingPhone ? "Saving…" : otpSent ? "Confirm code" : "Send code"}
            </button>
            {otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(""); }}
                className="h-11 px-5 rounded-full border border-input text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
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
