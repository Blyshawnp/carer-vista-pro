"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/app-logo";

type SetupType = "personal_family" | "organization";
type FirstRole = "client" | "family" | "admin";

export default function SetupWizard({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultName);
  const [organizationName, setOrganizationName] = useState("");
  const [setupType, setSetupType] = useState<SetupType>("personal_family");
  const [firstRole, setFirstRole] = useState<FirstRole>("admin");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [homeNotes, setHomeNotes] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        organizationName,
        setupType,
        firstRole,
        clientName,
        clientAddress,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
        homeNotes,
        inviteEmails,
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not complete setup.");
      setSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-cream-100 px-5 py-8">
      <form onSubmit={submit} className="max-w-2xl mx-auto space-y-5">
        <header className="text-center sm:text-left">
          <div className="mb-5 flex justify-center sm:justify-start">
            <AppLogo
              href="/setup"
              variant="auth"
              showText={false}
              className="justify-center"
            />
          </div>
          <p className="font-display text-3xl text-ink-900 leading-none mb-3">
            Carer Vista Pro
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-forest-600 font-bold mb-2">
            First-run setup
          </p>
          <h1 className="font-display text-4xl text-ink-900">
            Set up your care circle
          </h1>
          <p className="text-sm text-ink-500 mt-2">
            Signed in as {email}. Create a blank organization and add the first care recipient.
          </p>
        </header>

        <Card title="Your account">
          <Field label="Your full name">
            <input
              className={inputCls}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
            />
          </Field>
          <Field label="First user role">
            <select
              className={inputCls}
              value={firstRole}
              onChange={(event) => setFirstRole(event.target.value as FirstRole)}
            >
              <option value="admin">Admin/coordinator</option>
              <option value="client">Client</option>
              <option value="family">Family member</option>
            </select>
            {(firstRole === "client" || firstRole === "family") && (
              <p className="text-xs text-ink-500 mt-1.5">
                You will have owner permissions and display as Client/Family Admin.
              </p>
            )}
          </Field>
        </Card>

        <Card title="Organization">
          <Field label="Setup type">
            <select
              className={inputCls}
              value={setupType}
              onChange={(event) => setSetupType(event.target.value as SetupType)}
            >
              <option value="personal_family">Personal/family</option>
              <option value="organization">Organization</option>
            </select>
          </Field>
          <Field label="Care circle or organization name">
            <input
              className={inputCls}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Care circle name"
              required
            />
          </Field>
        </Card>

        <Card title="First care recipient">
          <Field label="Name">
            <input
              className={inputCls}
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Care recipient name"
              required
            />
          </Field>
          <Field label="Home address (optional)">
            <input
              className={inputCls}
              value={clientAddress}
              onChange={(event) => setClientAddress(event.target.value)}
              placeholder="Home address"
            />
          </Field>
        </Card>

        <Card title="Emergency and home info">
          <Field label="Emergency contact name (optional)">
            <input
              className={inputCls}
              value={emergencyName}
              onChange={(event) => setEmergencyName(event.target.value)}
              placeholder="Emergency contact name"
            />
          </Field>
          <Field label="Emergency contact phone (optional)">
            <input
              className={inputCls}
              value={emergencyPhone}
              onChange={(event) => setEmergencyPhone(event.target.value)}
              placeholder="Phone number"
              type="tel"
            />
          </Field>
          <Field label="Relationship (optional)">
            <input
              className={inputCls}
              value={emergencyRelationship}
              onChange={(event) => setEmergencyRelationship(event.target.value)}
              placeholder="Relationship"
            />
          </Field>
          <Field label="Home notes (optional)">
            <textarea
              className={`${inputCls} min-h-24 resize-none`}
              value={homeNotes}
              onChange={(event) => setHomeNotes(event.target.value)}
              placeholder="Access instructions, safety notes, or caregiver reminders"
            />
          </Field>
        </Card>

        <Card title="Invite others">
          <Field label="Email addresses (optional)">
            <textarea
              className={`${inputCls} min-h-24 resize-none`}
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              placeholder="one@example.com, two@example.com"
            />
            <p className="text-xs text-ink-500 mt-1.5">
              These create pending caregiver invitations. You can invite caregivers, family, and admins later from Team.
            </p>
          </Field>
        </Card>

        {error && (
          <div className="bg-terracotta-400/10 border border-terracotta-400/30 text-terracotta-600 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3.5 rounded-2xl font-medium transition disabled:opacity-50"
        >
          {submitting ? "Finishing setup..." : "Finish setup"}
        </button>
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
