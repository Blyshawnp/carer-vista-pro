"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRequestForm({
  clients,
}: {
  clients: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [requestedDate, setRequestedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurringOption, setRecurringOption] = useState("none");
  const [caregiverPreferences, setCaregiverPreferences] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/schedule/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          requested_date: requestedDate,
          start_time: startTime + ":00",
          end_time: endTime + ":00",
          recurring_option: recurringOption,
          caregiver_preferences: caregiverPreferences,
          notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit request.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/schedule/requests");
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
        <h2 className="font-display text-2xl text-ink-900">Request Submitted!</h2>
        <p className="text-ink-500 text-sm">
          Your care coverage request has been successfully saved. Redirecting you...
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Requested Date
          </label>
          <input
            type="date"
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
            End Time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
          Recurring Schedule Option
        </label>
        <select
          value={recurringOption}
          onChange={(e) => setRecurringOption(e.target.value)}
          className={inputCls}
        >
          <option value="none">One-time shift</option>
          <option value="daily">Daily recurrence</option>
          <option value="weekly">Weekly recurrence</option>
          <option value="biweekly">Bi-weekly recurrence</option>
          <option value="monthly">Monthly recurrence</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
          Preferred Caregivers (Optional)
        </label>
        <input
          type="text"
          value={caregiverPreferences}
          onChange={(e) => setCaregiverPreferences(e.target.value)}
          placeholder="E.g., Mary Sue, John Smith"
          className={inputCls}
        />
        <p className="text-[10px] text-ink-400 mt-1">
          Specify any preferred or requested caregivers. Administrative staff will try to match them.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
          Reason / Care Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Specify any special tasks, transport requirements, medication reminders, or reasons for this request..."
          className={`${inputCls} min-h-[100px] resize-none`}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3.5 rounded-2xl font-medium transition active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? "Submitting Care Request..." : "Submit Coverage Request"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition text-sm";
