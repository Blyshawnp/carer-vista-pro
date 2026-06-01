"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatPay } from "@/lib/pay";
import { formatShortDateInTz, formatTimeInTz } from "@/lib/datetime";

export default function InvoiceDetailsForm({
  invoice,
  shifts,
  bonuses,
  payments,
  auditLogs,
  client,
  period,
  subtotal,
  totalBonuses,
  totalHours,
  enablePayDeductions = false,
  deductionLabel = null,
  deductionType = null,
  deductionAmount = null,
  deductionAppliesTo = null,
}: {
  invoice: any;
  shifts: any[];
  bonuses: any[];
  payments: any[];
  auditLogs: any[];
  client: any;
  period: any;
  subtotal: number;
  totalBonuses: number;
  totalHours: number;
  enablePayDeductions?: boolean;
  deductionLabel?: string | null;
  deductionType?: string | null;
  deductionAmount?: number | null;
  deductionAppliesTo?: string | null;
}) {
  const router = useRouter();

  // Invoice state adjustments
  const [adjustmentAmount, setAdjustmentAmount] = useState(invoice?.adjustments?.toString() || "0");
  const [adjustmentReason, setAdjustmentReason] = useState(invoice?.adjustments_reason || "");
  const [editingAdjustment, setEditingAdjustment] = useState(false);

  // Manual payment states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("check");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed total cost metrics
  let deductionVal = 0;
  if (enablePayDeductions && deductionAmount != null && deductionAppliesTo === "invoice_record") {
    const baseForDeduction = subtotal + totalBonuses;
    if (deductionType === "flat_amount") {
      deductionVal = deductionAmount;
    } else if (deductionType === "percentage") {
      deductionVal = baseForDeduction * (deductionAmount / 100);
    }
  }

  const caregiverCost = shifts.reduce((sum, s) => sum + s.cgPay, 0);
  const margin = invoice.total_amount - caregiverCost;

  const statusLabels: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "Unpaid", cls: "bg-rose-100 text-rose-800" },
    partial: { label: "Partially Paid", cls: "bg-amber-100 text-amber-800" },
    paid: { label: "Paid In Full", cls: "bg-emerald-100 text-emerald-800" },
    voided: { label: "Voided", cls: "bg-cream-200 text-ink-600" },
  };

  const statusConfig = statusLabels[invoice.status] || {
    label: invoice.status,
    cls: "bg-cream-200 text-ink-700",
  };

  async function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const numericAdj = parseFloat(adjustmentAmount);
    if (isNaN(numericAdj)) {
      setError("Please specify a valid numeric adjustment.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/payroll/client-invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          adjustments: numericAdj,
          adjustments_reason: adjustmentReason,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save adjustments.");

      setEditingAdjustment(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const numericAmt = parseFloat(paymentAmount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      setError("Please specify a valid payment amount greater than $0.00.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/payroll/client-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: numericAmt,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          note: paymentNote,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to record payment.");

      setPaymentAmount("");
      setPaymentNote("");
      setShowPaymentForm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReleaseInvoice() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payroll/client-invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          release: true,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to release invoice.");

      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-terracotta-50 border border-terracotta-100 text-terracotta-800 text-xs px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Invoice Overview Card */}
      <section className="bg-forest-600 text-cream-50 rounded-3xl p-6 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-cream-50/10 blur-2xl"
        />
        <div className="relative">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cream-50/70 mb-1">
                Balance Due
              </p>
              <p className="font-display text-4xl font-extrabold">
                {formatCurrency(invoice.balance_due)}
              </p>
              <p className="text-xs text-cream-50/80 mt-1.5">
                Total Billed: {formatCurrency(invoice.total_amount)} · Payments: {formatCurrency(invoice.payments_applied)}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shrink-0 ${statusConfig.cls}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-cream-50/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-cream-50/70">
              Released:{" "}
              {invoice.released_at
                ? `Yes (${new Date(invoice.released_at).toLocaleDateString()})`
                : "No (Draft)"}
            </p>
            <div className="flex gap-2">
              {!invoice.released_at && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReleaseInvoice}
                  className="bg-cream-50 text-forest-700 px-4 py-1.5 rounded-xl font-bold hover:bg-cream-100 transition disabled:opacity-50"
                >
                  ✉ Release Invoice
                </button>
              )}
              <Link
                href={`/print?type=invoice&id=${period.id}`}
                target="_blank"
                className="bg-cream-50/15 text-cream-50 px-4 py-1.5 rounded-xl font-semibold hover:bg-cream-50/25 transition"
              >
                🖨️ Print Preview
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Shifts Breakdown (Role-Based Visible) */}
      <section className="bg-white rounded-3xl border border-cream-200 p-5 shadow-soft grain-overlay">
        <h2 className="font-display text-base text-ink-900 mb-1">Shifts &amp; Margin Breakdown</h2>
        <p className="text-[11px] text-ink-400 mb-4 uppercase tracking-wider font-semibold">
          Admins only: margin = Client Charge - Caregiver Pay
        </p>

        {shifts.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-6">No shift logs found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-cream-300 text-ink-500 bg-cream-50/50">
                  <th className="py-2.5 px-2">Shift / Caregiver</th>
                  <th className="py-2.5 px-2 text-right">Hours</th>
                  <th className="py-2.5 px-2 text-right">Caregiver Pay</th>
                  <th className="py-2.5 px-2 text-right">Client Charge</th>
                  <th className="py-2.5 px-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {shifts.map((s, idx) => (
                  <tr key={idx} className="hover:bg-cream-50/40">
                    <td className="py-3 px-2">
                      <p className="font-medium text-ink-900">{s.caregiver_name}</p>
                      <p className="text-[10px] text-ink-400">
                        {formatShortDateInTz(new Date(s.scheduled_start))} · {formatTimeInTz(new Date(s.scheduled_start))} – {formatTimeInTz(new Date(s.scheduled_end))}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right">{s.hours.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">
                      <p className="font-semibold text-ink-800">{formatPay(s.cgPay)}</p>
                      <p className="text-[9px] text-ink-400">{formatCurrency(s.cgRate)}/hr</p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="font-semibold text-forest-800">{formatPay(s.clientCharge)}</p>
                      <p className="text-[9px] text-ink-400">{formatCurrency(s.billingRate)}/hr</p>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-indigo-700">
                      {formatPay(s.clientCharge - s.cgPay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bonuses Section */}
      {bonuses.length > 0 && (
        <section className="bg-white rounded-3xl border border-cream-200 p-5 shadow-soft grain-overlay">
          <h2 className="font-display text-base text-ink-900 mb-3">Client-Funded Bonuses</h2>
          <ul className="divide-y divide-cream-150 text-xs">
            {bonuses.map((b) => (
              <li key={b.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-ink-900">
                    Appreciation Bonus to {b.profiles?.full_name || "Caregiver"}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    Type: {b.bonus_type.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="font-display font-semibold text-forest-700">{formatCurrency(b.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Adjustments & Totals */}
      <section className="bg-white rounded-3xl border border-cream-200 p-5 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-base text-ink-900 mb-1">Invoice Statement Summary</h2>
        
        <div className="space-y-2 text-xs divide-y divide-cream-100">
          <div className="flex justify-between py-2.5">
            <span className="text-ink-500">Shifts Billing Subtotal</span>
            <span className="font-medium text-ink-950">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between py-2.5">
            <span className="text-ink-500">Appreciation Bonuses Added</span>
            <span className="font-medium text-ink-950">{formatCurrency(totalBonuses)}</span>
          </div>

          {enablePayDeductions && deductionVal > 0 && (
            <div className="flex justify-between py-2.5 bg-terracotta-50/50 px-2 rounded-lg text-terracotta-700 font-semibold">
              <span>Pay Deduction ({deductionLabel || "Estimate"})</span>
              <span>-{formatCurrency(deductionVal)}</span>
            </div>
          )}

          <div className="flex justify-between py-2.5">
            <span className="text-ink-500">Manual Adjustments</span>
            <div className="text-right">
              <span className="font-medium text-ink-950">{formatCurrency(invoice.adjustments)}</span>
              {invoice.adjustments_reason && (
                <p className="text-[10px] text-ink-400 mt-0.5">Note: {invoice.adjustments_reason}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between py-3 font-display font-bold text-sm text-ink-950">
            <span>Total Statement Amount</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>

        {/* Edit Adjustments */}
        {!editingAdjustment ? (
          <button
            type="button"
            onClick={() => setEditingAdjustment(true)}
            className="text-xs bg-cream-200/60 hover:bg-cream-200 text-ink-700 px-3.5 py-1.5 rounded-xl font-medium transition"
          >
            ⚙ Adjust Statement Total
          </button>
        ) : (
          <form onSubmit={handleSaveAdjustment} className="bg-cream-50/70 p-4 rounded-2xl border border-cream-200 text-xs space-y-3">
            <p className="font-semibold text-ink-900">Adjust Invoice Balance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Adjustment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                  placeholder="E.g., Holiday discount, manual fee"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-ink-600 hover:bg-cream-200"
                onClick={() => setEditingAdjustment(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-forest-600 hover:bg-forest-700 text-cream-50 rounded-lg font-medium"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Manual Payment Log Form */}
      <section className="bg-white rounded-3xl border border-cream-200 p-5 shadow-soft grain-overlay space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-base text-ink-900">Payments Applied</h2>
          {!showPaymentForm && (
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="text-xs bg-forest-600 hover:bg-forest-700 text-cream-50 px-3.5 py-1.5 rounded-xl font-medium transition"
            >
              + Log Payment
            </button>
          )}
        </div>

        {showPaymentForm && (
          <form onSubmit={handleAddPayment} className="bg-cream-50/70 p-4 rounded-2xl border border-cream-200 text-xs space-y-3">
            <p className="font-semibold text-ink-900">Log Manual Payment Entry</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Payment Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-ink-500 mb-1">Internal Notes</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl"
                placeholder="E.g. Check number, depositor info"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-ink-600 hover:bg-cream-200"
                onClick={() => setShowPaymentForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-forest-600 hover:bg-forest-700 text-cream-50 rounded-lg font-medium"
              >
                Log Entry
              </button>
            </div>
          </form>
        )}

        {payments.length === 0 ? (
          <p className="text-xs text-ink-500 text-center py-4">No manual payments logged yet.</p>
        ) : (
          <ul className="divide-y divide-cream-150 text-xs">
            {payments.map((p) => (
              <li key={p.id} className="py-2.5 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <p className="font-semibold text-ink-900">
                    {formatCurrency(p.amount)} &ndash; {p.payment_method.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    Logged: {new Date(p.payment_date + "T00:00:00").toLocaleDateString()} · By {p.recorded_by_profile?.full_name || "Admin"}
                  </p>
                  {p.note && <p className="text-[10px] text-ink-500 italic mt-0.5">Note: {p.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invoice Audit Trail */}
      <section className="bg-white rounded-3xl border border-cream-200 p-5 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-base text-ink-900">Invoice Audit Trail</h2>
        <div className="overflow-y-auto max-h-[200px] divide-y divide-cream-100 text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-ink-400 py-2">No logging entries recorded.</p>
          ) : (
            auditLogs.map((l) => (
              <div key={l.id} className="py-2">
                <p className="font-semibold text-ink-800">
                  {l.action.replace(/_/g, " ").toUpperCase()} &middot; {new Date(l.created_at).toLocaleString()}
                </p>
                <p className="text-ink-600 leading-tight mt-0.5">{l.note}</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Logged by {l.recorded_by_profile?.full_name || "System"}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
