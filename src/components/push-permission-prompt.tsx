"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { enablePushNotifications, isPushSupported } from "@/lib/push-client";

const PROMPT_KEY = "caregiver-push-prompt";
const SNOOZE_DAYS = 7;

type PromptState = "hidden" | "ready" | "saving" | "denied" | "unsupported";

export default function PushPermissionPrompt() {
  const pathname = usePathname();
  const [state, setState] = useState<PromptState>("hidden");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      setState("hidden");
      return;
    }
    if (recentlyPrompted()) {
      setState("hidden");
      return;
    }
    // Suppress on notifications pages
    if (
      pathname === "/me/notifications" ||
      pathname === "/notifications" ||
      pathname?.endsWith("/notifications")
    ) {
      setState("hidden");
      return;
    }

    // Guard: do not show if install prompt is already showing
    const isInstallPromptActive = document.body?.innerHTML?.includes("Install Carer Vista Pro");
    if (isInstallPromptActive) {
      setState("hidden");
      return;
    }

    const t = setTimeout(() => setState("ready"), 1800);
    return () => clearTimeout(t);
  }, [pathname]);

  async function enable() {
    markPrompted();
    setState("saving");
    setError(null);
    try {
      await enablePushNotifications();
      setState("hidden");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("push-prompt-dismissed"));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not enable notifications.";
      setError(message);
      setState(Notification.permission === "denied" ? "denied" : "ready");
    } finally {
      setState((current) => (current === "saving" ? "ready" : current));
    }
  }

  function dismiss() {
    markPrompted();
    setState("hidden");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("push-prompt-dismissed"));
    }
  }

  if (state === "hidden" || state === "unsupported") return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-cream-200 rounded-3xl shadow-lifted p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <p className="font-display text-2xl text-ink-900 mb-2">
          Get important alerts
        </p>
        <p className="text-sm text-ink-500 mb-5 leading-relaxed">
          Carer Vista Pro can send native notifications for messages, shift
          updates, trades, and urgent incidents.
        </p>
        {error && (
          <p className="text-xs text-terracotta-600 mb-3">{error}</p>
        )}
        {state === "denied" ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-terracotta-600">
              Notifications are blocked in this browser. You can enable them in
              browser or device settings, then manage options here.
            </p>
            <Link
              href="/me/notifications"
              className="w-full text-center bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition"
            >
              Notification settings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={dismiss}
              className="flex-1 bg-cream-200 hover:bg-cream-300 text-ink-700 py-3 rounded-2xl text-sm font-medium transition"
            >
              Not now
            </button>
            <button
              onClick={enable}
              disabled={state === "saving"}
              className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition disabled:opacity-60"
            >
              {state === "saving" ? "Enabling..." : "Enable alerts"}
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function recentlyPrompted() {
  try {
    const raw = localStorage.getItem(PROMPT_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / 86_400_000;
    return days < SNOOZE_DAYS;
  } catch {
    return false;
  }
}

function markPrompted() {
  try {
    localStorage.setItem(PROMPT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

