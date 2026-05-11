"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import EmergencyPanel from "@/components/emergency-panel";
import { XIcon } from "@/components/icons";

type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  notes: string | null;
  priority_order: number;
};

type Medication = {
  id: string;
  medication_name: string;
  dose: string | null;
  schedule_instructions: string | null;
  notes: string | null;
};

type Allergy = {
  id: string;
  name: string;
  reaction: string | null;
  severity: "critical" | "mild" | "minor" | null;
  notes: string | null;
};

type SafetyItem = {
  id: string;
  label: string;
  value_location: string;
  notes: string | null;
};

type ClientEmergencyData = {
  id: string;
  full_name: string;
  address: string | null;
  preferred_hospital_name: string | null;
  preferred_hospital_address: string | null;
  preferred_hospital_phone: string | null;
  primary_physician_name: string | null;
  primary_physician_address: string | null;
  primary_physician_phone: string | null;
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
};

export default function IncidentReportModal({
  clients,
  defaultClientId,
  currentShiftId,
  openByDefault,
  canFile,
}: {
  clients: ClientEmergencyData[];
  defaultClientId: string | null;
  currentShiftId: string | null;
  openByDefault: boolean;
  canFile: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openByDefault);
  const [selectedClientId, setSelectedClientId] = useState(
    defaultClientId ?? clients[0]?.id ?? ""
  );
  const [category, setCategory] = useState("safety");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(openByDefault);
  }, [openByDefault]);

  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
    }
  }, [defaultClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/incident-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId: currentShiftId ?? null,
        clientId: currentShiftId ? null : selectedClient?.id ?? null,
        category,
        description,
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? "Could not submit incident report.");
      setSaving(false);
      return;
    }

    setCategory("safety");
    setDescription("");
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!canFile || clients.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 bg-terracotta-600 hover:bg-terracotta-500 text-cream-50 px-4 py-3 rounded-2xl shadow-soft transition active:scale-[0.99]"
      >
        <span className="text-left">
          <span className="block font-medium">Report an incident</span>
          <span className="block text-xs text-cream-50/80">
            {currentShiftId ? "Uses the current shift client" : "Choose an assigned client"}
          </span>
        </span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Open
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-report-title"
          className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3 sm:p-6"
        >
          <div className="w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-2xl border border-cream-200 flex flex-col">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-cream-200 bg-white">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold mb-1">
                  Incident report
                </p>
                <h2 id="incident-report-title" className="font-display text-2xl text-ink-900">
                  {currentShiftId ? "Current shift client" : "Select a client"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close incident report"
                className="w-10 h-10 rounded-full bg-cream-100 hover:bg-cream-200 grid place-items-center text-ink-600 transition"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {!currentShiftId && clients.length > 1 && (
                <label className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1.5 uppercase tracking-wide">
                    Client
                  </span>
                  <select
                    value={selectedClient?.id ?? ""}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    className={inputCls}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedClient && (
                <div className="rounded-3xl border border-cream-200 bg-white p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold mb-1">
                        Selected client
                      </p>
                      <h3 className="font-display text-xl text-ink-900">
                        {selectedClient.full_name}
                      </h3>
                    </div>
                    {currentShiftId && (
                      <span className="text-[10px] uppercase tracking-[0.18em] bg-forest-100 text-forest-700 px-2.5 py-1 rounded-full font-bold">
                        Current shift
                      </span>
                    )}
                  </div>

                  <EmergencyPanel
                    info={selectedClient}
                    contacts={selectedClient.contacts}
                    medications={selectedClient.medications}
                    allergies={selectedClient.allergies}
                    safetyItems={selectedClient.safetyItems}
                  />
                </div>
              )}

              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1.5 uppercase tracking-wide">
                    Category
                  </span>
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={inputCls}
                    placeholder="Fall, medication, injury, safety, other"
                    maxLength={80}
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1.5 uppercase tracking-wide">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className={`${inputCls} min-h-32 resize-none`}
                    placeholder="Describe what happened and any immediate actions taken."
                    rows={5}
                  />
                </label>

                <p className="text-xs text-ink-500">
                  Do not use this for life-threatening emergencies. Call local emergency services first.
                </p>

                {error && <p className="text-sm text-terracotta-600">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-cream-200 hover:bg-cream-300 text-ink-700 py-3 rounded-2xl text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition disabled:opacity-60"
                  >
                    {saving ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-2xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition text-sm";
