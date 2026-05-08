"use client";

import { useState } from "react";

export default function AccountDeletionForm({
  email,
  organizationId,
}: {
  email: string;
  organizationId: string | null;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!confirm) {
      setError("Confirm that you want to request account deletion.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/account-deletion-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not submit request.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <section className="bg-white rounded-3xl shadow-soft p-6 grain-overlay">
        <div className="relative">
          <h2 className="font-display text-xl text-ink-900 mb-2">
            Request received
          </h2>
          <p className="text-sm text-ink-700">
            Your deletion request has been recorded. An administrator should review and
            process it according to your published data deletion policy.
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
        <div className="relative space-y-3">
          <ReadOnly label="Account" value={email || "Current signed-in account"} />
          <ReadOnly label="Organization" value={organizationId ?? "Not set"} />
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
              Notes (optional)
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition resize-none"
              placeholder="Anything you want the administrator to know"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(event) => setConfirm(event.target.checked)}
              className="mt-1"
            />
            <span>
              I want to request deletion of my account and associated app data.
            </span>
          </label>
        </div>
      </section>

      {error && (
        <div className="bg-terracotta-400/10 border border-terracotta-400/30 text-terracotta-600 rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 py-3.5 rounded-2xl font-medium transition disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit deletion request"}
      </button>
    </form>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide font-medium text-ink-500 mb-1.5">
        {label}
      </p>
      <p className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-sm text-ink-900 break-all">
        {value}
      </p>
    </div>
  );
}
