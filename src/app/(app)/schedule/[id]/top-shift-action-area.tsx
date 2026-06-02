"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StarOfLifeIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/pay";
import AcceptDeclineButtons from "./accept-decline-buttons";
import ClaimShiftButton from "./claim-shift-button";
import CancelReleaseButton from "./cancel-release-button";

type TopShiftActionAreaProps = {
  shiftId: string;
  clientName: string;
  shiftDateTime: string;
  shiftStatusLabel: string;
  shiftStatusTone: string;
  role: string;
  isAssignedCaregiver: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  canClaim: boolean;
  iReleasedThis: boolean;
  assignmentStatus: string | null;
  isReleased: boolean;
  computedPayAmount: number;
  isPayOverridden: boolean;
  hourlyRate: number | null;
  caregiverId: string;
  showPay: boolean;
  enableBreakTracking?: boolean;
  holidayName?: string | null;
  holidayMultiplier?: number | null;
  holidayBonus?: number | null;
  deductionLabel?: string | null;
  deductionAmount?: number | null;
  deductionType?: string | null;
};

export default function TopShiftActionArea({
  shiftId,
  clientName,
  shiftDateTime,
  shiftStatusLabel,
  shiftStatusTone,
  role,
  isAssignedCaregiver,
  canCheckIn,
  canCheckOut,
  canClaim,
  iReleasedThis,
  assignmentStatus,
  isReleased,
  computedPayAmount,
  isPayOverridden,
  hourlyRate,
  caregiverId,
  showPay,
  enableBreakTracking = true,
  holidayName = null,
  holidayMultiplier = null,
  holidayBonus = null,
  deductionLabel = null,
  deductionAmount = null,
  deductionType = null,
}: TopShiftActionAreaProps) {
  const [lunchActive, setLunchActive] = useState(false);
  const [lunchStart, setLunchStart] = useState<string | null>(null);
  const [lunchElapsed, setLunchElapsed] = useState("");

  const [breakActive, setBreakActive] = useState(false);
  const [breakStart, setBreakStart] = useState<string | null>(null);
  const [breakElapsed, setBreakElapsed] = useState("");

  // Load break/lunch state from localStorage
  useEffect(() => {
    const lActive = localStorage.getItem(`lunch_active_${shiftId}`) === "true";
    const lStart = localStorage.getItem(`lunch_start_${shiftId}`);
    setLunchActive(lActive);
    setLunchStart(lStart);

    const bActive = localStorage.getItem(`break_active_${shiftId}`) === "true";
    const bStart = localStorage.getItem(`break_start_${shiftId}`);
    setBreakActive(bActive);
    setBreakStart(bStart);
  }, [shiftId]);

  // Stopwatch effect for lunch/break
  useEffect(() => {
    const t = setInterval(() => {
      if (lunchActive && lunchStart) {
        const diffMs = new Date().getTime() - new Date(lunchStart).getTime();
        const diffMin = Math.max(0, Math.floor(diffMs / 60000));
        const diffSec = Math.max(0, Math.floor((diffMs % 60000) / 1000));
        setLunchElapsed(`${diffMin}m ${diffSec}s`);
      }
      if (breakActive && breakStart) {
        const diffMs = new Date().getTime() - new Date(breakStart).getTime();
        const diffMin = Math.max(0, Math.floor(diffMs / 60000));
        const diffSec = Math.max(0, Math.floor((diffMs % 60000) / 1000));
        setBreakElapsed(`${diffMin}m ${diffSec}s`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lunchActive, lunchStart, breakActive, breakStart]);

  const endRunningBreak = async (type: "lunch" | "break") => {
    try {
      const res = await fetch("/api/schedule/breaks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift_id: shiftId, break_type: type }),
      });
      if (res.ok) {
        localStorage.removeItem(`${type}_active_${shiftId}`);
        localStorage.removeItem(`${type}_start_${shiftId}`);
        if (type === "lunch") {
          setLunchActive(false);
          setLunchStart(null);
        } else {
          setBreakActive(false);
          setBreakStart(null);
        }
      }
    } catch (e) {
      console.error("Failed to auto-end previous break", e);
    }
  };

  const toggleLunch = async () => {
    try {
      if (lunchActive) {
        const res = await fetch("/api/schedule/breaks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shift_id: shiftId, break_type: "lunch" }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to end lunch");
          return;
        }
        localStorage.removeItem(`lunch_active_${shiftId}`);
        localStorage.removeItem(`lunch_start_${shiftId}`);
        setLunchActive(false);
        setLunchStart(null);
      } else {
        const res = await fetch("/api/schedule/breaks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shift_id: shiftId, break_type: "lunch" }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to start lunch");
          return;
        }
        const data = await res.json();
        const startTime = data.data?.start_time || new Date().toISOString();
        localStorage.setItem(`lunch_active_${shiftId}`, "true");
        localStorage.setItem(`lunch_start_${shiftId}`, startTime);
        setLunchActive(true);
        setLunchStart(startTime);
        if (breakActive) {
          await endRunningBreak("break");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Network error occurred");
    }
  };

  const toggleBreak = async () => {
    try {
      if (breakActive) {
        const res = await fetch("/api/schedule/breaks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shift_id: shiftId, break_type: "break" }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to end break");
          return;
        }
        localStorage.removeItem(`break_active_${shiftId}`);
        localStorage.removeItem(`break_start_${shiftId}`);
        setBreakActive(false);
        setBreakStart(null);
      } else {
        const res = await fetch("/api/schedule/breaks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shift_id: shiftId, break_type: "break" }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to start break");
          return;
        }
        const data = await res.json();
        const startTime = data.data?.start_time || new Date().toISOString();
        localStorage.setItem(`break_active_${shiftId}`, "true");
        localStorage.setItem(`break_start_${shiftId}`, startTime);
        setBreakActive(true);
        setBreakStart(startTime);
        if (lunchActive) {
          await endRunningBreak("lunch");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Network error occurred");
    }
  };

  let deductionVal = 0;
  if (deductionAmount != null) {
    if (deductionType === "flat_amount") {
      deductionVal = deductionAmount;
    } else if (deductionType === "percentage") {
      deductionVal = computedPayAmount * (deductionAmount / 100);
    }
  }
  const netPay = Math.max(0, computedPayAmount - deductionVal);

  const paySummary = showPay ? (
    <div className="text-xs font-semibold text-forest-700 bg-forest-50 border border-forest-200/50 px-3 py-2 rounded-xl inline-flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span>Est. Pay: {formatCurrency(computedPayAmount)}</span>
        {isPayOverridden && <span className="text-[10px] text-terracotta-600 font-normal">(Adjusted)</span>}
        {hourlyRate && (
          <span className="text-ink-500 font-normal">
            {" · "}
            {holidayMultiplier && holidayMultiplier > 1
              ? `${formatCurrency(hourlyRate * holidayMultiplier)}/hr`
              : `${formatCurrency(hourlyRate)}/hr`}
          </span>
        )}
      </div>
      {holidayName && (
        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
          <span>Holiday rate: {holidayMultiplier ? `${holidayMultiplier}x` : "1.0x"}</span>
          <span className="font-normal opacity-85">({holidayName})</span>
        </span>
      )}
      {holidayBonus && holidayBonus > 0 ? (
        <span className="text-[10px] text-forest-700 font-semibold flex items-center gap-1">
          <span>Holiday Bonus: +{formatCurrency(holidayBonus)}</span>
        </span>
      ) : null}
      {deductionAmount != null && deductionAmount > 0 && (
        <div className="border-t border-forest-200/40 pt-1 mt-0.5 space-y-0.5">
          <div className="text-[10px] text-terracotta-600 font-semibold flex items-center justify-between gap-4">
            <span>Deduction ({deductionLabel || "Estimate"}):</span>
            <span>-{formatCurrency(deductionVal)}</span>
          </div>
          <div className="text-[10.5px] text-forest-800 font-bold flex items-center justify-between gap-4">
            <span>Est. Net Pay:</span>
            <span>{formatCurrency(netPay)}</span>
          </div>
          <p className="text-[9px] text-ink-400 font-normal leading-tight">
            * Estimate only. Not official payroll advice.
          </p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <section className="bg-white border-2 border-cream-200 rounded-3xl p-5 mb-5 shadow-soft grain-overlay relative">
      <div className="relative">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div>
            <h2 className="font-display text-lg text-ink-900 leading-tight">
              {clientName}
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">{shiftDateTime}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
            shiftStatusTone === "forest"
              ? "bg-forest-100 text-forest-700"
              : shiftStatusTone === "terracotta"
                ? "bg-terracotta-100 text-terracotta-700"
                : "bg-cream-200 text-ink-600"
          }`}>
            {shiftStatusLabel}
          </span>
        </div>

        {paySummary}

        {/* Emergency shortcut button */}
        <div className="mt-3 flex gap-2">
          <Link
            href="/emergency"
            className="flex-1 max-w-[150px] flex items-center justify-center gap-1 text-[11px] font-semibold text-terracotta-700 bg-terracotta-400/10 hover:bg-terracotta-400/20 border border-terracotta-400/30 px-3 py-2 rounded-xl transition"
          >
            <StarOfLifeIcon size={12} className="text-terracotta-600 shrink-0" />
            <span>Emergency Info</span>
          </Link>
        </div>

        {/* Action Button Section */}
        <div className="mt-4 space-y-2.5">
          {/* Claim Shift Button */}
          {canClaim && caregiverId && role === "caregiver" && (
            <ClaimShiftButton shiftId={shiftId} caregiverId={caregiverId} />
          )}

          {/* Cancel Release Button */}
          {iReleasedThis && caregiverId && (
            <CancelReleaseButton shiftId={shiftId} caregiverId={caregiverId} />
          )}

          {/* Accept / Decline Shift Buttons */}
          {!isReleased && isAssignedCaregiver && assignmentStatus === "pending" && (
            <AcceptDeclineButtons shiftId={shiftId} />
          )}

          {/* Check In Button */}
          {!isReleased && isAssignedCaregiver && assignmentStatus === "accepted" && canCheckIn && (
            <Link
              href={`/schedule/${shiftId}/check-in`}
              className="block w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-semibold text-center text-sm transition active:scale-[0.99] shadow-soft"
            >
              Check in
            </Link>
          )}

          {/* Active Shift Checkout and Break / Lunch buttons */}
          {!isReleased && isAssignedCaregiver && canCheckOut && (
            <div className="space-y-3">
              {/* Check Out Button */}
              <Link
                href={`/schedule/${shiftId}/check-out`}
                className="block w-full bg-terracotta-500 hover:bg-terracotta-600 text-cream-50 py-3 rounded-2xl font-semibold text-center text-sm transition active:scale-[0.99] shadow-soft"
              >
                Check out
              </Link>

              {/* Lunch and Break Action Buttons */}
              {enableBreakTracking && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={toggleLunch}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
                      lunchActive
                        ? "bg-amber-100 border-amber-300 text-amber-800 ring-2 ring-amber-400"
                        : "bg-cream-50 hover:bg-cream-100 border-cream-200 text-ink-700"
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {lunchActive ? "End Lunch" : "Start Lunch"}
                    </span>
                    {lunchActive && (
                      <span className="text-[10px] text-amber-700 font-mono mt-0.5 animate-pulse">
                        {lunchElapsed} elapsed
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleBreak}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
                      breakActive
                        ? "bg-blue-100 border-blue-300 text-blue-800 ring-2 ring-blue-400"
                        : "bg-cream-50 hover:bg-cream-100 border-cream-200 text-ink-700"
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {breakActive ? "End Break" : "Start Break"}
                    </span>
                    {breakActive && (
                      <span className="text-[10px] text-blue-700 font-mono mt-0.5 animate-pulse">
                        {breakElapsed} elapsed
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
