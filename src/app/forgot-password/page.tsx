"use client";

import { useState } from "react";
import Link from "next/link";
import AppLogo from "@/components/app-logo";
import { buildBrowserAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_RATE_LIMIT_SHORT_MESSAGE, isEmailRateLimitError } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: buildBrowserAppUrl("/auth/reset-password"),
      }
    );

    setSubmitting(false);

    if (resetError) {
      if (isEmailRateLimitError(resetError.message)) {
        setError(EMAIL_RATE_LIMIT_SHORT_MESSAGE);
        return;
      }

      setError(
        "We could not send the reset email right now. Check your connection and try again."
      );
      return;
    }

    setMessage("If an account exists, a reset link has been sent.");
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 bg-cream-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex">
            <AppLogo href="/forgot-password" variant="auth" showText={false} className="justify-center" />
          </div>
          <h1 className="font-display text-4xl text-ink-900 mb-1.5">Reset password</h1>
          <p className="text-sm text-ink-500">
            Enter the email address for your account.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white/90 backdrop-blur rounded-3xl shadow-soft p-7 grain-overlay">
          <div className="space-y-4 relative">
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 bg-white border border-forest-500/25 rounded-xl text-ink-900 placeholder:text-ink-400 shadow-sm focus:outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-500/20 transition"
                required
              />
            </label>

            {error && (
              <div className="text-sm text-terracotta-600 bg-terracotta-400/10 border border-terracotta-400/20 px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-navy-700 bg-navy-400/10 border border-navy-400/20 px-3 py-2.5 rounded-xl">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-forest-700 hover:bg-forest-800 text-white border border-forest-800 py-3 rounded-2xl font-semibold tracking-wide transition disabled:bg-forest-700/70 disabled:text-white/80 disabled:cursor-not-allowed shadow-lifted active:scale-[0.99]"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-xs text-ink-500 leading-snug">
              No-email accounts must ask an admin to reset their password.
            </p>
          </div>
        </form>

        <Link href="/login" className="block w-full text-center text-xs text-navy-600 hover:underline mt-6">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
