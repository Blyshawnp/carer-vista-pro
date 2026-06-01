"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BreakItem = {
  id: string;
  break_type: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_paid: boolean;
  note: string | null;
};

type BreakAdjusterProps = {
  breakItem: BreakItem;
  shiftId: string;
};

export default function BreakAdjuster({ breakItem, shiftId }: BreakAdjusterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(breakItem.duration_minutes?.toString() ?? "30");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || isNaN(Number(duration))) {
      alert("Please enter a valid duration in minutes.");
      return;
    }
    if (!note.trim()) {
      alert("Please provide an adjustment reason.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedule/breaks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: shiftId,
          break_id: breakItem.id,
          duration_minutes: Number(duration),
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to adjust break time.");
      } else {
        setIsOpen(false);
        setNote("");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[10px] bg-cream-100 hover:bg-cream-200 text-ink-600 px-2 py-1 rounded transition font-medium"
        >
          Adjust Time
        </button>
      ) : (
        <form onSubmit={handleAdjust} className="mt-2 bg-cream-50 p-3 rounded-xl border border-cream-200 space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-semibold text-ink-700">Duration (mins):</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-16 text-xs border border-cream-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-forest-500 outline-none"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-700 mb-0.5">Adjustment Reason:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. caregiver forgot to check out of lunch"
              className="w-full text-xs border border-cream-300 rounded p-1.5 focus:ring-1 focus:ring-forest-500 outline-none h-12 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] bg-cream-200 hover:bg-cream-300 text-ink-700 px-2 py-1 rounded transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-[10px] bg-forest-600 hover:bg-forest-700 text-cream-50 px-2 py-1 rounded transition font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Adjust"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
