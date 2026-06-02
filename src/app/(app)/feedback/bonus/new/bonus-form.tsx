"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BonusForm({
  clients,
  caregivers,
  orgMode,
}: {
  clients: Array<{ id: string; full_name: string }>;
  caregivers: Array<{ id: string; full_name: string }>;
  orgMode: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [caregiverId, setCaregiverId] = useState(caregivers[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [bonusType, setBonusType] = useState("appreciation_bonus");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode specific disclaimer text
  const disclaimers: Record<string, string> = {
    personal_family:
      "This caregiver appreciation bonus will be logged as an approved charge. Note: This app does not process real payment transfers or credit card billing directly; all transaction balances must be coordinated manually outside the app.",
    agency_company:
      "Bonuses submitted in Agency mode are registered as pending requests. Organization administrators must review and approve this caregiver appreciation bonus before it is released to the caregiver's pay summary or added to your active billing statements.",
    solo_caregiver:
      "This caregiver appreciation bonus is logged for recordkeeping purposes. It will be credited to your caregiver's statement history once accepted and recorded manually.",
    client_directed_care:
      "This app provides recordkeeping only and does not process real financial payouts, payroll calculations, withholdings, or employment taxes. You are solely responsible for ensuring tax, legal, and employee classification compliance.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please specify a valid bonus amount greater than $0.00.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/feedback/bonus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          caregiver_id: caregiverId,
          amount: numericAmount,
          bonus_type: bonusType,
          notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit bonus.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/me");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center mx-auto text-3xl font-bold animate-bounce">
          ✓
        </div>
        <h2 className="font-display text-2xl text-ink-900">Bonus Logged!</h2>
        <p className="text-ink-500 text-sm">
          Your caregiver appreciation bonus has been successfully recorded. Redirecting you...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-terracotta-50 border border-terracotta-100 text-terracotta-800 text-sm px-4 py-3.5 rounded-2xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Care Recipient
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputCls}
            required
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Caregiver
          </label>
          <select
            value={caregiverId}
            onChange={(e) => setCaregiverId(e.target.value)}
            className={inputCls}
            required
          >
            {caregivers.map((cg) => (
              <option key={cg.id} value={cg.id}>
                {cg.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Appreciation Amount
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-sm text-ink-400 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} pl-8`}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Bonus Type
          </label>
          <select
            value={bonusType}
            onChange={(e) => setBonusType(e.target.value)}
            className={inputCls}
            required
          >
            <option value="appreciation_bonus">Appreciation Bonus</option>
            <option value="holiday_bonus">Holiday Bonus</option>
            <option value="performance_bonus">Performance Bonus</option>
            <option value="other">Other Bonus</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
          Appreciation Note (Sent to Caregiver)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Thank you for your excellent care, dedication, and support..."
          className={`${inputCls} min-h-[90px] resize-none`}
        />
      </div>

      {/* Mode-specific disclaimer card */}
      <div className="bg-cream-100/50 p-4 rounded-2xl border border-cream-200 text-xs text-ink-600 leading-relaxed">
        <p className="font-semibold text-ink-800 uppercase tracking-wider text-[9px] mb-1">
          ⚠️ Recordkeeping &amp; Compliance Notice
        </p>
        <p>{disclaimers[orgMode] || disclaimers.personal_family}</p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3.5 rounded-2xl font-semibold transition active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? "Submitting Appreciation..." : "Submit Appreciation Bonus"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-4 py-3.5 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition text-sm";
