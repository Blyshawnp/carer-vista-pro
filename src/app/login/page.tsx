"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLogo from "@/components/app-logo";

export default function LoginPage() {
  const router = useRouter();
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
        setError("Full name is required.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
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

      setMessage("Check your email to confirm your account, then return to finish setup.");
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
      {/* Decorative warm gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full bg-terracotta-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-forest-400/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex">
            <AppLogo
              href="/login"
              variant="auth"
              showText={false}
              className="justify-center"
            />
          </div>
          <h1 className="font-display text-4xl text-ink-900 mb-1.5">Carer Vista Pro</h1>
          <p className="text-ink-500 text-sm">
            {mode === "signin" ? "Sign in to your account" : "Create your public deployment account"}
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur rounded-3xl shadow-soft p-7 grain-overlay"
        >
          <div className="space-y-4 relative">
            {mode === "signup" && (
              <Field
                label="Full name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />

            {error && (
              <div className="text-sm text-terracotta-600 bg-terracotta-400/10 border border-terracotta-400/20 px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-forest-700 bg-forest-400/10 border border-forest-400/20 px-3 py-2.5 rounded-xl">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-medium tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed shadow-soft active:scale-[0.99]"
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
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
          className="block w-full text-center text-xs text-forest-600 hover:underline mt-6"
        >
          {mode === "signin"
            ? "New deployment? Create the first account"
            : "Already have an account? Sign in"}
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
        className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition"
      />
    </label>
  );
}
