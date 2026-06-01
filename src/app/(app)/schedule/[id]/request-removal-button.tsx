"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RequestRemovalButton({
  shiftId,
  clientId,
  organizationId,
  requestedBy,
  existingRequest,
}: {
  shiftId: string;
  clientId: string;
  organizationId: string;
  requestedBy: string;
  existingRequest: any;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/schedule/remove-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shiftId,
          clientId,
          organizationId,
          requestedBy,
          reason,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Failed to submit request.");
        setSubmitting(false);
        return;
      }

      setMessage("Your request has been sent to the agency/admin for review. The shift is not removed until it is approved.");
      setSubmitting(false);
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 5000);
    } catch (err: any) {
      alert(err.message || "An error occurred.");
      setSubmitting(false);
    }
  }

  if (existingRequest) {
    const status = existingRequest.status;
    let statusText = "Pending Agency Review";
    let statusColor = "bg-amber-100 text-amber-800 border-amber-300";

    if (status === "approved") {
      statusText = "Approved (Shift Cancelled)";
      statusColor = "bg-forest-100 text-forest-800 border-forest-300";
    } else if (status === "declined") {
      statusText = `Declined: ${existingRequest.admin_response || "No reason provided"}`;
      statusColor = "bg-terracotta-100 text-terracotta-800 border-terracotta-300";
    } else if (status === "cancelled") {
      statusText = "Request Cancelled";
      statusColor = "bg-cream-200 text-ink-600 border-cream-300";
    }

    return (
      <div className={`p-4 rounded-2xl border text-xs font-semibold ${statusColor}`}>
        <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Shift Cancellation Request</p>
        <p>{statusText}</p>
        {existingRequest.cancellation_fee_applies && (
          <p className="mt-1.5 font-bold text-terracotta-700">
            Cancellation Fee Applied: ${Number(existingRequest.cancellation_fee_amount || 0).toFixed(2)}
            {existingRequest.cancellation_fee_waived && " (Waived by Admin)"}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="block w-full bg-terracotta-500 hover:bg-terracotta-600 text-cream-50 py-3.5 rounded-2xl font-medium text-center transition"
      >
        Request shift cancellation
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="font-display text-lg text-ink-900 mb-2">Request Shift Cancellation</h3>
            <p className="text-xs text-ink-500 mb-4">
              In agency/company mode, shifts cannot be deleted directly. You must submit a request explaining the reason.
            </p>

            {message ? (
              <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 text-xs text-forest-800 font-semibold mb-4">
                {message}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-750 mb-1">Reason for cancellation</label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a clear reason for why this shift needs to be cancelled..."
                    className="w-full bg-cream-50 border border-cream-200 rounded-2xl px-3.5 py-2.5 text-xs text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 min-h-[90px] resize-none"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsOpen(false)}
                    className="flex-1 bg-cream-50 hover:bg-cream-100 border border-cream-200 text-ink-700 py-2.5 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !reason.trim()}
                    className="flex-1 bg-terracotta-500 hover:bg-terracotta-600 text-cream-50 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
