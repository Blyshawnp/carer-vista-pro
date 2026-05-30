"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPay } from "@/lib/pay";
import Link from "next/link";

export default function PayrollPeriodDetails({
  periodId,
  snapshots,
  initialClientInvoices,
  initialPendingBonuses,
  clientList,
}: {
  periodId: string;
  snapshots: any[];
  initialClientInvoices: any[];
  initialPendingBonuses: any[];
  clientList: Array<{ id: string; full_name: string; chargeSubtotal: number; totalHours: number }>;
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialClientInvoices);
  const [pendingBonuses, setPendingBonuses] = useState(initialPendingBonuses);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const statusLabels: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "Unpaid", cls: "bg-rose-100 text-rose-800" },
    partial: { label: "Partial", cls: "bg-amber-100 text-amber-800" },
    paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
    voided: { label: "Voided", cls: "bg-cream-200 text-ink-600" },
  };

  async function handleBonusReview(bonusId: string, status: string) {
    setSubmittingId(bonusId);
    try {
      const response = await fetch("/api/feedback/bonus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonus_id: bonusId,
          status,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to review bonus.");
      }

      // Remove from pending locally
      setPendingBonuses((prev) => prev.filter((b) => b.id !== bonusId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Caregivers Pay breakdown */}
      <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
        <h2 className="font-display text-base text-ink-900 mb-3 font-bold">Caregiver Payouts (Payroll)</h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-4">
            No caregiver activity in this period.
          </p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {snapshots.map((s) => (
              <li key={s.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">
                    {s.profiles?.full_name ?? "Caregiver"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {Number(s.total_hours).toFixed(1)} hrs ·{" "}
                    {s.shift_count} shift{s.shift_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-display font-bold text-sm mr-1">
                    {formatCurrency(s.total_amount)}
                  </p>
                  <Link
                    href={`/print?type=invoice&id=${s.pay_period_id}`}
                    target="_blank"
                    className="bg-cream-100 hover:bg-cream-200 text-ink-700 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition"
                  >
                    🖨️ Invoice
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Clients Billing & Invoices Ledger */}
      <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
        <h2 className="font-display text-base text-ink-900 mb-1 font-bold">Client Invoices &amp; Billing</h2>
        <p className="text-xs text-ink-400 mb-3">
          Manage invoices and recorded client charges for shift work.
        </p>

        {clientList.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-4">
            No client activity recorded in this period.
          </p>
        ) : (
          <ul className="divide-y divide-cream-150 text-xs">
            {clientList.map((c) => {
              // Find matching bootsrapped invoice
              const inv = invoices.find((i) => i.client_id === c.id);
              const statusCfg = inv ? statusLabels[inv.status] : { label: "Draft", cls: "bg-amber-50 text-amber-700" };

              return (
                <li key={c.id} className="py-3.5 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 text-sm">{c.full_name}</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      {c.totalHours.toFixed(1)} hours · Est: {formatCurrency(c.chargeSubtotal)}
                    </p>
                    {inv && (
                      <p className="text-[10px] text-forest-700 font-semibold mt-0.5">
                        Balance due: {formatCurrency(inv.balance_due)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-lg ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <Link
                      href={`/payroll/${periodId}/client-invoice/${c.id}`}
                      className="bg-forest-600 hover:bg-forest-700 text-cream-50 text-[10px] px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      {inv ? "Manage" : "Generate"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 3. Pending Caregiver Appreciation Bonuses */}
      {pendingBonuses.length > 0 && (
        <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
          <h2 className="font-display text-base text-ink-900 mb-1 font-bold">Pending Caregiver Bonuses</h2>
          <p className="text-xs text-ink-400 mb-3">
            Review client-funded caregiver appreciation bonuses.
          </p>

          <ul className="divide-y divide-cream-150 text-xs space-y-2.5">
            {pendingBonuses.map((b) => (
              <li key={b.id} className="py-2 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold text-ink-950">
                      {formatCurrency(b.amount)} appreciation bonus
                    </p>
                    <p className="text-[10px] text-ink-400">
                      From {b.clients?.full_name || "Client"} to {b.profiles?.full_name || "Caregiver"}
                    </p>
                    {b.notes && <p className="text-[10px] text-ink-500 italic mt-0.5">Note: &ldquo;{b.notes}&rdquo;</p>}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    disabled={submittingId === b.id}
                    onClick={() => handleBonusReview(b.id, "declined")}
                    className="px-2.5 py-1 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 font-semibold"
                  >
                    Decline
                  </button>
                  <button
                    disabled={submittingId === b.id}
                    onClick={() => handleBonusReview(b.id, "approved")}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-cream-50 rounded-lg font-semibold"
                  >
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
