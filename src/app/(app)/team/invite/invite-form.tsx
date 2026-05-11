"use client";

import { useState } from "react";
import Link from "next/link";
import InviteLinkActions from "@/components/invite-link-actions";

type CreatedInvitation = {
  id: string;
  token: string;
  email: string | null;
  full_name: string;
  role: "admin" | "client" | "caregiver" | "family";
  expires_at: string;
};

type InviteResponse = {
  invitation?: CreatedInvitation;
  inviteLink?: string;
  emailDelivery?: {
    configured: boolean;
    sent: boolean;
    skipped: boolean;
    reason?: string | null;
    error?: string;
  };
  error?: string;
};

export default function InviteForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"caregiver" | "client" | "admin" | "family">("caregiver");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<InviteResponse["emailDelivery"] | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          role,
          hourlyRate: role === "caregiver" && hourlyRate ? Number(hourlyRate) : null,
        }),
      });

      const result = (await response.json()) as InviteResponse;

      if (!response.ok || !result.invitation || !result.inviteLink) {
        setError(result.error ?? "Could not create invitation.");
        return;
      }

      setCreatedInvitation(result.invitation);
      setInviteLink(result.inviteLink);
      setEmailDelivery(result.emailDelivery ?? null);
    } catch {
      setError("Could not create invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdInvitation && inviteLink) {
    return (
      <main className="px-5 py-6 max-w-2xl mx-auto">
        <header className="mb-6">
          <Link
            href="/team"
            className="text-sm text-forest-600 hover:underline mb-2 inline-block"
          >
            ← Back to team
          </Link>
          <h1 className="font-display text-3xl text-ink-900">Invite ready</h1>
          <p className="text-ink-500 text-sm">
            Share this link with {createdInvitation.full_name}.
          </p>
        </header>

        <section className="bg-white rounded-3xl shadow-soft p-5 mb-4 grain-overlay">
          <div className="relative space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-medium text-ink-500 mb-2">
                Invitation link
              </p>
              <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 font-mono text-sm break-all">
                {inviteLink}
              </div>
            </div>

            <InviteLinkActions
              inviteLink={inviteLink}
              sendEmailEndpoint={`/api/invitations/${createdInvitation.id}/send-email`}
              emailConfigured={!!emailDelivery?.configured}
              hasRecipientEmail={!!createdInvitation.email}
            />

            <div className="text-xs text-ink-500 space-y-1">
              <p>
                Role: <span className="font-medium text-ink-700">{createdInvitation.role}</span>
              </p>
              <p>
                Expires:{" "}
                <span className="font-medium text-ink-700">
                  {new Date(createdInvitation.expires_at).toLocaleDateString()}
                </span>
              </p>
              {createdInvitation.email ? (
                <p>
                  Recipient email:{" "}
                  <span className="font-medium text-ink-700">{createdInvitation.email}</span>
                </p>
              ) : (
                <p>No email address was attached. Share the invite link manually.</p>
              )}
            </div>
          </div>
        </section>

        {emailDelivery && emailDelivery.reason === "not_configured" && (
          <div className="bg-cream-100 border border-cream-200 rounded-2xl px-4 py-3 text-sm text-ink-700 mb-4">
            Email sending is not configured yet. Copy or share this invite link.
          </div>
        )}

        <Link
          href="/team"
          className="block w-full bg-white hover:bg-cream-50 text-ink-700 py-3.5 rounded-2xl font-medium text-center shadow-soft transition"
        >
          Done
        </Link>
      </main>
    );
  }

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/team"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to team
        </Link>
        <h1 className="font-display text-3xl text-ink-900">Invite someone</h1>
        <p className="text-ink-500 text-sm">
          Create a shareable invite link now. Add email if you want the app to send it later.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card title="About them">
          <Field label="Full name">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className={inputCls}
            >
              <option value="caregiver">Caregiver</option>
              <option value="family">Family member</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </Card>

        <Card title="Invite link and email">
          <Field label="Email (optional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputCls}
              autoComplete="off"
            />
            <p className="text-xs text-ink-500 mt-1.5">
              Leave this blank to create a manual invite link only.
            </p>
          </Field>
        </Card>

        {role === "caregiver" && (
          <Card title="Pay (optional)">
            <Field label="Hourly rate $">
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="20.00"
                className={inputCls}
              />
            </Field>
            <p className="text-xs text-ink-500">
              Can be set or changed later from the team page.
            </p>
          </Card>
        )}

        {error && (
          <div className="bg-terracotta-400/10 border border-terracotta-400/30 text-terracotta-600 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2.5">
          <Link
            href="/team"
            className="flex-1 bg-cream-200 hover:bg-cream-200/70 text-ink-700 py-3.5 rounded-2xl font-medium text-center transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-3.5 rounded-2xl font-medium transition disabled:opacity-50 active:scale-[0.99]"
          >
            {submitting ? "Creating..." : "Create invitation"}
          </button>
        </div>
      </form>
    </main>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <div className="relative">
        <h2 className="font-display text-base text-ink-900 mb-3">{title}</h2>
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
