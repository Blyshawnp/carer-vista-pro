"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRemovalReview({
  request,
  shiftId,
  actorId,
}: {
  request: any;
  shiftId: string;
  actorId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeReason, setFeeReason] = useState("");
  const [waiveFee, setWaiveFee] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  async function handleDecline(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/schedule/remove-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          status: "declined",
          adminResponse: response,
          reviewedBy: actorId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Failed to decline request.");
        setSubmitting(false);
        return;
      }

      alert("Request declined successfully.");
      setSubmitting(false);
      setShowDeclineForm(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
      setSubmitting(false);
    }
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const feeApplied = parseFloat(feeAmount) > 0;

    try {
      const res = await fetch("/api/schedule/remove-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          status: "approved",
          adminResponse: response || "Cancellation approved.",
          reviewedBy: actorId,
          cancellationFeeApplies: feeApplied,
          cancellationFeeAmount: feeApplied ? parseFloat(feeAmount) : null,
          cancellationFeeReason: feeApplied ? feeReason : null,
          cancellationFeeWaived: waiveFee,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Failed to approve request.");
        setSubmitting(false);
        return;
      }

      alert("Request approved and shift cancelled/deleted successfully.");
      setSubmitting(false);
      setShowApproveForm(false);
      router.push("/schedule");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
      setSubmitting(false);
    }
  }

  if (request.status !== "pending") {
    return null;
  }

  return (
    <section className="bg-amber-50 border border-amber-300 rounded-3xl p-5 mt-4 space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-amber-900">Shift Cancellation Request</h3>
        <p className="text-xs text-ink-600 mt-1">
          The client has requested to cancel/remove this shift.
        </p>
        <div className="bg-white rounded-xl p-3 border border-amber-200 mt-2 text-xs">
          <p className="text-ink-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Reason for request:</p>
          <p className="text-ink-900 italic">"{request.reason}"</p>
        </div>
      </div>

      {!showApproveForm && !showDeclineForm && (
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowDeclineForm(true)}
            className="flex-1 bg-white hover:bg-cream-50 border border-terracotta-300 text-terracotta-700 py-2 rounded-xl text-xs font-semibold transition"
          >
            Decline Request
          </button>
          <button
            onClick={() => setShowApproveForm(true)}
            className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-2 rounded-xl text-xs font-semibold transition"
          >
            Approve & Cancel
          </button>
        </div>
      )}

      {showDeclineForm && (
        <form onSubmit={handleDecline} className="space-y-3 pt-2 border-t border-amber-200">
          <div>
            <label className="block text-xs font-semibold text-ink-750 mb-1">Reason for decline</label>
            <textarea
              required
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Provide a reason to the client for declining this request..."
              className="w-full bg-white border border-cream-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-forest-500 min-h-[60px] resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowDeclineForm(false)}
              className="bg-white hover:bg-cream-50 border border-cream-200 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-terracotta-500 hover:bg-terracotta-600 text-cream-50 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            >
              Confirm Decline
            </button>
          </div>
        </form>
      )}

      {showApproveForm && (
        <form onSubmit={handleApprove} className="space-y-3 pt-2 border-t border-amber-200">
          <div>
            <label className="block text-xs font-semibold text-ink-750 mb-1">Admin Notes / Response (optional)</label>
            <input
              type="text"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="e.g. Approved per phone call."
              className="w-full bg-white border border-cream-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-forest-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="waiveFee"
                checked={waiveFee}
                onChange={(e) => setWaiveFee(e.target.checked)}
                className="w-4 h-4 rounded text-forest-600"
              />
              <label htmlFor="waiveFee" className="text-xs font-semibold text-ink-700">
                Waive cancellation fee policy
              </label>
            </div>

            {!waiveFee && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-750 mb-1">Fee Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-cream-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-forest-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-750 mb-1">Fee Reason (optional)</label>
                  <input
                    type="text"
                    value={feeReason}
                    onChange={(e) => setFeeReason(e.target.value)}
                    placeholder="Late cancellation notice"
                    className="w-full bg-white border border-cream-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-forest-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowApproveForm(false)}
              className="bg-white hover:bg-cream-50 border border-cream-200 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-forest-600 hover:bg-forest-700 text-cream-50 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            >
              Confirm Approve & Delete
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
