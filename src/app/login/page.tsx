"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppLogo from "@/components/app-logo";
import { buildBrowserAppUrl } from "@/lib/app-url";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      if (!fullName.trim()) {
        setError(t("auth.errors.fullNameRequired"));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: buildBrowserAppUrl("/auth/callback?next=/setup"),
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/setup");
        router.refresh();
        return;
      }

      setMessage(t("auth.checkEmail"));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
        setLoading(false);
       return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-navy-400/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex">
            <AppLogo
              href="/login"
              variant="auth"
              showText={false}
              className="justify-center"
            />
          </div>
          <h1 className="font-display text-4xl text-ink-900 mb-1.5">{t("auth.title")}</h1>
          <p className="text-ink-500 text-sm">
            {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur rounded-3xl shadow-soft p-7 grain-overlay"
        >
          <div className="space-y-4 relative">
            {mode === "signup" && (
              <Field
                label={t("auth.fullName")}
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              label={t("auth.email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label={t("auth.password")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />
            {mode === "signin" && (
              <div className="-mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-navy-600 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            )}

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
              disabled={loading}
              className="w-full bg-forest-700 hover:bg-forest-800 text-white border border-forest-800 py-3 rounded-2xl font-semibold tracking-wide transition disabled:bg-forest-700/70 disabled:text-white/80 disabled:cursor-not-allowed shadow-lifted active:scale-[0.99]"
            >
              {loading
                ? mode === "signin"
                  ? t("auth.signingIn")
                  : t("auth.creating")
                : mode === "signin"
                  ? t("auth.signIn")
                  : t("auth.createAccount")}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setError(null);
            setMessage(null);
          }}
          className="block w-full text-center text-xs text-navy-600 hover:underline mt-6"
        >
          {mode === "signin"
            ? t("auth.newDeployment")
            : t("auth.alreadyHaveAccount")}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 transition"
      />
    </label>
  );
}
