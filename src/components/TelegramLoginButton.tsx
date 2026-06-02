import { useEffect, useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getTelegramBotUsername,
  linkTelegramAccount,
  signInWithTelegram,
} from "@/lib/telegram.functions";

type TelegramPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    [key: `telegramAuth_${string}`]: (user: TelegramPayload) => void;
  }
}

export function TelegramLoginButton({
  mode,
  onLinked,
}: {
  mode: "signin" | "link";
  onLinked?: () => void;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const callbackName = `telegramAuth_${rawId}` as const;
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchBot = useServerFn(getTelegramBotUsername);
  const signIn = useServerFn(signInWithTelegram);
  const linkAccount = useServerFn(linkTelegramAccount);

  useEffect(() => {
    let cancelled = false;
    fetchBot()
      .then((username) => {
        if (!cancelled) setBotUsername(username);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Telegram is unavailable"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchBot]);

  useEffect(() => {
    if (!botUsername) return;
    window[callbackName] = async (user: TelegramPayload) => {
      try {
        setLoading(true);
        if (mode === "signin") {
          const { actionLink } = await signIn({ data: user });
          window.location.href = actionLink;
          return;
        }
        await linkAccount({ data: user });
        toast.success("Telegram linked");
        onLinked?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Telegram verification failed");
      } finally {
        setLoading(false);
      }
    };

    const container = document.getElementById(callbackName);
    if (!container) return;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "999");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.appendChild(script);

    return () => {
      delete window[callbackName];
      container.innerHTML = "";
    };
  }, [botUsername, callbackName, linkAccount, mode, onLinked, signIn]);

  return (
    <div className="w-full">
      {loading && (
        <button
          type="button"
          disabled
          className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-telegram text-telegram-foreground text-sm font-medium opacity-70"
        >
          Telegram…
        </button>
      )}
      <div id={callbackName} className={loading ? "hidden" : "flex justify-center"} />
    </div>
  );
}