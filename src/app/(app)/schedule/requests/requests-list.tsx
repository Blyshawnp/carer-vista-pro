"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RequestsList({
  initialRequests,
  caregivers,
  isAdmin,
  userId,
}: {
  initialRequests: any[];
  caregivers: Array<{ id: string; full_name: string }>;
  isAdmin: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "resolved">("all");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [declineReasonMap, setDeclineReasonMap] = useState<Record<string, string>>({});
  const [showDeclineFormId, setShowDeclineFormId] = useState<string | null>(null);
  const [showScheduleFormId, setShowScheduleFormId] = useState<string | null>(null);
  const [selectedCaregiverMap, setSelectedCaregiverMap] = useState<Record<string, string>>({});

  // Status mapping to pretty labels
  const statusLabels: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending Review", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800" },
    declined: { label: "Declined", cls: "bg-rose-100 text-rose-800" },
    scheduled: { label: "Scheduled", cls: "bg-indigo-100 text-indigo-800" },
    cancelled: { label: "Cancelled", cls: "bg-cream-200 text-ink-600" },
  };

  const recurrenceLabels: Record<string, string> = {
    none: "One-time",
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
  };

  // Filter requests based on tab
  const filteredRequests = requests.filter((r) => {
    if (activeTab === "pending") return r.status === "pending";
    if (activeTab === "resolved") return r.status !== "pending";
    return true;
  });

  async function handleStatusChange(requestId: string, status: string, additional = {}) {
    setSubmittingId(requestId);
    try {
      const response = await fetch("/api/schedule/requests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          status,
          ...additional,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update request.");
      }

      // Update state locally
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...result.data } : r))
      );
      setShowDeclineFormId(null);
      setShowScheduleFormId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Could not update request status.");
    } finally {
      setSubmittingId(null);
    }
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-cream-50/70 p-1 rounded-2xl border border-cream-200">
        {(["all", "pending", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize rounded-xl transition ${
              activeTab === tab
                ? "bg-white text-ink-900 shadow-soft"
                : "text-ink-500 hover:text-ink-950"
            }`}
          >
            {tab === "all" ? "All Requests" : tab === "pending" ? "Pending" : "Resolved"}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-cream-200 text-center text-ink-500 text-sm">
          No coverage requests found in this section.
        </div>
      ) : (
        filteredRequests.map((r) => {
          const clientName = r.clients?.full_name || "Care Recipient";
          const requesterName = r.profiles?.full_name || "Caregiver/Client";
          const isOwner = r.requested_by === userId;
          const statusConfig = statusLabels[r.status] || {
            label: r.status,
            cls: "bg-cream-200 text-ink-700",
          };

          return (
            <div
              key={r.id}
              className="bg-white rounded-3xl p-5 border border-cream-200 shadow-soft hover:shadow-medium transition relative overflow-hidden grain-overlay"
            >
              {/* Header Info */}
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                  <h3 className="font-display text-lg text-ink-900 leading-tight">
                    {clientName}
                  </h3>
                  <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider font-semibold">
                    Requested by {requesterName} · {formatDate(r.created_at)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${statusConfig.cls}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              {/* Time Details */}
              <div className="bg-cream-50/50 rounded-2xl p-3 grid grid-cols-2 gap-3 text-xs mb-3 border border-cream-200/50">
                <div>
                  <p className="text-ink-400 font-medium">Date Needed</p>
                  <p className="text-ink-800 font-semibold">{formatDate(r.requested_date)}</p>
                </div>
                <div>
                  <p className="text-ink-400 font-medium">Time Window</p>
                  <p className="text-ink-800 font-semibold">
                    {formatTime(r.start_time)} – {formatTime(r.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-ink-400 font-medium">Schedule Option</p>
                  <p className="text-ink-800 font-semibold">
                    {recurrenceLabels[r.recurring_option] || r.recurring_option}
                  </p>
                </div>
                <div>
                  <p className="text-ink-400 font-medium">Caregivers Requested</p>
                  <p className="text-ink-800 font-semibold truncate">
                    {r.caregiver_preferences || "No preferences"}
                  </p>
                </div>
              </div>

              {/* Reason / Notes */}
              {r.notes && (
                <div className="text-xs text-ink-600 mb-4 bg-cream-50/20 p-3 rounded-2xl border border-cream-100">
                  <p className="font-medium text-ink-400 mb-0.5">Notes / Reason</p>
                  <p className="leading-relaxed">{r.notes}</p>
                </div>
              )}

              {/* Decline Reason display */}
              {r.status === "declined" && r.decline_reason && (
                <div className="text-xs text-rose-800 bg-rose-50 p-3 rounded-2xl border border-rose-100 mb-4">
                  <p className="font-semibold mb-0.5">Decline Reason</p>
                  <p>{r.decline_reason}</p>
                </div>
              )}

              {/* Active Forms */}
              {showDeclineFormId === r.id && (
                <div className="bg-cream-50 rounded-2xl p-3.5 border border-cream-200 mb-3 text-xs space-y-2">
                  <p className="font-semibold text-ink-800">Specify reason to decline:</p>
                  <input
                    className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500/25"
                    placeholder="Enter reason..."
                    value={declineReasonMap[r.id] || ""}
                    onChange={(e) =>
                      setDeclineReasonMap((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1.5 rounded-lg font-medium text-ink-600 hover:bg-cream-200 transition"
                      onClick={() => setShowDeclineFormId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg font-medium bg-rose-600 text-cream-50 hover:bg-rose-700 transition"
                      onClick={() =>
                        handleStatusChange(r.id, "declined", {
                          decline_reason: declineReasonMap[r.id],
                        })
                      }
                      disabled={submittingId === r.id}
                    >
                      Decline Request
                    </button>
                  </div>
                </div>
              )}

              {showScheduleFormId === r.id && (
                <div className="bg-cream-50 rounded-2xl p-3.5 border border-cream-200 mb-3 text-xs space-y-2.5">
                  <p className="font-semibold text-ink-800">Assign a caregiver to this shift:</p>
                  <select
                    className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500/25"
                    value={selectedCaregiverMap[r.id] || ""}
                    onChange={(e) =>
                      setSelectedCaregiverMap((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  >
                    <option value="">Unassigned / Open Shift</option>
                    {caregivers.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.full_name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1.5 rounded-lg font-medium text-ink-600 hover:bg-cream-200 transition"
                      onClick={() => setShowScheduleFormId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-cream-50 hover:bg-indigo-700 transition"
                      onClick={() =>
                        handleStatusChange(r.id, "scheduled", {
                          assigned_caregiver_id: selectedCaregiverMap[r.id],
                        })
                      }
                      disabled={submittingId === r.id}
                    >
                      Create &amp; Schedule Shift
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {r.status === "pending" && !showDeclineFormId && !showScheduleFormId && (
                <div className="flex gap-2 justify-end border-t border-cream-100 pt-3 text-xs">
                  {isAdmin ? (
                    <>
                      <button
                        className="px-3 py-1.5 rounded-lg font-semibold border border-rose-200 hover:bg-rose-50 text-rose-700 transition"
                        onClick={() => setShowDeclineFormId(r.id)}
                        disabled={submittingId === r.id}
                      >
                        Decline
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-cream-50 transition"
                        onClick={() => handleStatusChange(r.id, "approved")}
                        disabled={submittingId === r.id}
                      >
                        Approve
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-cream-50 transition"
                        onClick={() => setShowScheduleFormId(r.id)}
                        disabled={submittingId === r.id}
                      >
                        Schedule Shift
                      </button>
                    </>
                  ) : (
                    isOwner && (
                      <button
                        className="px-3 py-1.5 rounded-lg font-semibold border border-cream-300 hover:bg-cream-100 text-ink-600 transition"
                        onClick={() => handleStatusChange(r.id, "cancelled")}
                        disabled={submittingId === r.id}
                      >
                        Cancel Request
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
