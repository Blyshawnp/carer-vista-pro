"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildBrowserAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { getFirstName } from "@/lib/name";
import { mapAuthErrorMessage } from "@/lib/auth-errors";
import type { User } from "@supabase/supabase-js";

type Invitation = {
  id: string;
  email: string | null;
  full_name: string;
  role: "admin" | "client" | "caregiver" | "family";
  organization_id: string;
  caregiver_hourly_rate: number | null;
  organization_name: string | null;
};

export default function AcceptInviteForm({
  invitation,
  token,
  currentUser = null,
}: {
  invitation: Invitation;
  token: string;
  currentUser?: User | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState(invitation.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required to accept this invitation.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("Invalid login credentials.");
        setSubmitting(false);
        return;
      }
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: buildBrowserAppUrl(`/auth/callback?next=/accept-invite?token=${encodeURIComponent(token)}`),
        },
      });

      if (signUpError) {
        setError(mapAuthErrorMessage(signUpError.message));
        setSubmitting(false);
        return;
      }

      if (!signUpData.user) {
        setError("Could not create account. Try again.");
        setSubmitting(false);
        return;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Check your email to confirm your account, then sign in to finish accepting this invitation.");
      setSubmitting(false);
      return;
    }

    // Finalize the invitation server-side so profile creation, acceptance
    // metadata, and caregiver pay rate all come from the stored invitation.
    const { data: accepted, error: acceptError } = await supabase.rpc(
      "accept_invitation",
      {
        invitation_token: token,
        invited_phone: phone.trim() || null,
      }
    );

    if (acceptError || accepted === false) {
      setError(
        acceptError?.message ??
          "Could not finalize this invitation. Sign in and try the invite link again."
      );
      setSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function handleAcceptExisting(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { data: accepted, error: acceptError } = await supabase.rpc(
      "accept_invitation",
      {
        invitation_token: token,
        invited_phone: phone.trim() || null,
      }
    );

    if (acceptError || accepted === false) {
      setError(
        acceptError?.message ??
          "Could not finalize this invitation. Contact your admin."
      );
      setSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const orgName = invitation.organization_name ?? "the team";
  const roleCopy: Record<string, string> = {
    admin: "administrator",
    client: "client",
    caregiver: "caregiver",
    family: "family member",
  };

  if (currentUser) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5 py-10 bg-cream-100 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full bg-terracotta-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-forest-400/15 blur-3xl"
        />

        <div className="relative w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-2">
              Accept Invitation
            </p>
            <h1 className="font-display text-3xl text-ink-900 mb-1">
              Welcome,{" "}
              <span className="italic text-forest-600">
                {getFirstName(invitation.full_name)}
              </span>
            </h1>
            <p className="text-ink-500 text-sm">
              You are signed in as <strong className="text-ink-800">{currentUser.email}</strong>.
            </p>
            <p className="text-ink-500 text-xs mt-1">
              Join {orgName} as a {roleCopy[invitation.role]}
            </p>
          </div>

          <form
            onSubmit={handleAcceptExisting}
            className="bg-white/95 backdrop-blur rounded-3xl shadow-soft p-6 grain-overlay"
          >
            <div className="space-y-4 relative">
              <Field
                label="Phone (optional)"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="Phone number"
                autoComplete="tel"
              />

              {error && (
                <div className="text-sm text-terracotta-600 bg-terracotta-400/10 border border-terracotta-400/20 px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-medium tracking-wide transition disabled:opacity-60 shadow-soft active:scale-[0.99]"
              >
                {submitting ? "Accepting..." : "Accept Invitation"}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-center text-xs text-ink-500 hover:underline mt-2"
              >
                Sign in with a different account
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10 bg-cream-100 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full bg-terracotta-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-forest-400/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-2">
            You're invited
          </p>
          <h1 className="font-display text-3xl text-ink-900 mb-1">
            Welcome,{" "}
            <span className="italic text-forest-600">
              {getFirstName(invitation.full_name)}
            </span>
          </h1>
          <p className="text-ink-500 text-sm">
            Join {orgName} as a {roleCopy[invitation.role]}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur rounded-3xl shadow-soft p-6 grain-overlay"
        >
          <div className="space-y-4 relative">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === "signup" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
                }`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === "signin" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
                }`}
              >
                Sign in
              </button>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                Email
              </p>
              {invitation.email ? (
                <p className="px-4 py-3 bg-cream-100 rounded-xl text-ink-900 text-sm">
                  {invitation.email}
                </p>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition"
                  required
                />
              )}
            </div>

            <Field
              label="Phone (optional)"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="Phone number"
              autoComplete="tel"
            />

            <Field
              label="Create password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
            {mode === "signup" && (
              <Field
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                required
              />
            )}

            {error && (
              <div className="text-sm text-terracotta-600 bg-terracotta-400/10 border border-terracotta-400/20 px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-medium tracking-wide transition disabled:opacity-60 shadow-soft active:scale-[0.99]"
            >
              {submitting
                ? "Setting up..."
                : mode === "signin"
                  ? "Sign in and accept"
                  : "Create my account"}
            </button>
          </div>
        </form>
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
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition"
      />
    </label>
  );
}
