"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewClientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [homeNotes, setHomeNotes] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Client name is required.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        address,
        homeNotes,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
      }),
    });

    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !result.id) {
      setError(result.error ?? "Could not add client.");
      setSaving(false);
      return;
    }

    router.push(`/clients/${result.id}/home-info`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <div className="relative space-y-4">
        <Field label="Client name">
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputCls}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Address">
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={inputCls}
            placeholder="Home address"
          />
        </Field>

        <Field label="Emergency contact name">
          <input
            type="text"
            value={emergencyName}
            onChange={(event) => setEmergencyName(event.target.value)}
            className={inputCls}
            placeholder="Name"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Emergency phone">
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(event) => setEmergencyPhone(event.target.value)}
              className={inputCls}
              placeholder="Phone"
            />
          </Field>
          <Field label="Relationship">
            <input
              type="text"
              value={emergencyRelationship}
              onChange={(event) => setEmergencyRelationship(event.target.value)}
              className={inputCls}
              placeholder="Relationship"
            />
          </Field>
        </div>

        <Field label="Home notes">
          <textarea
            value={homeNotes}
            onChange={(event) => setHomeNotes(event.target.value)}
            className={`${inputCls} min-h-28 resize-none`}
            placeholder="Access notes, routines, or other care context"
          />
        </Field>

        {error && <p className="text-sm text-terracotta-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add client"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
