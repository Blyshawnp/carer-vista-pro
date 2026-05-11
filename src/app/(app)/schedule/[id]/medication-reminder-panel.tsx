"use client";

import { useState } from "react";

export type ShiftMedicationReminder = {
  id: string;
  reminder_time: string;
  label: string | null;
};

export type ShiftMedication = {
  id: string;
  medication_name: string;
  dose: string | null;
  schedule_instructions: string | null;
  reminder_frequency: string | null;
  reminders: ShiftMedicationReminder[];
};

const ACTIONS = [
  { status: "reminded", label: "Reminded" },
  { status: "taken", label: "Marked taken" },
  { status: "skipped", label: "Skipped" },
  { status: "refused", label: "Client declined" },
  { status: "needs_follow_up", label: "Needs follow-up" },
];

export default function MedicationReminderPanel({
  shiftId,
  clientId,
  medications,
  canMark,
}: {
  shiftId: string;
  clientId: string;
  medications: ShiftMedication[];
  canMark: boolean;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (medications.length === 0) return null;

  async function markReminder(
    medication: ShiftMedication,
    reminder: ShiftMedicationReminder | null,
    status: string
  ) {
    const key = `${medication.id}:${reminder?.id ?? "prn"}:${status}`;
    setPendingKey(key);
    setMessage(null);
    try {
      const response = await fetch("/api/medication-reminder-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          medicationId: medication.id,
          reminderId: reminder?.id ?? null,
          shiftId,
          scheduledFor: new Date().toISOString(),
          status,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Could not update reminder.");
      }
      setMessage("Medication reminder updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update reminder.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 mt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-xl text-ink-900">
            Medication reminders
          </h2>
          <p className="text-xs text-ink-500">
            Mark reminder status only. This does not record clinical administration.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {medications.map((medication) => {
          const reminders =
            medication.reminders.length > 0
              ? medication.reminders
              : [{ id: "", reminder_time: "", label: "As needed" }];
          return (
            <div
              key={medication.id}
              className="rounded-2xl border border-cream-200 p-4"
            >
              <p className="font-medium text-ink-900">
                {medication.medication_name}
                {medication.dose ? (
                  <span className="font-normal text-ink-500"> · {medication.dose}</span>
                ) : null}
              </p>
              {medication.schedule_instructions ? (
                <p className="text-sm text-ink-500 mt-1">
                  {medication.schedule_instructions}
                </p>
              ) : null}
              <div className="mt-3 space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id || "as-needed"}
                    className="rounded-xl bg-cream-50 p-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      {reminder.label || formatReminderTime(reminder.reminder_time)}
                      {reminder.reminder_time ? ` · ${formatReminderTime(reminder.reminder_time)}` : ""}
                    </p>
                    {canMark ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ACTIONS.map((action) => {
                          const key = `${medication.id}:${reminder.id || "prn"}:${action.status}`;
                          return (
                            <button
                              key={action.status}
                              type="button"
                              onClick={() =>
                                markReminder(
                                  medication,
                                  reminder.id ? reminder : null,
                                  action.status
                                )
                              }
                              disabled={pendingKey === key}
                              className="rounded-xl border border-cream-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-forest-50 disabled:opacity-60"
                            >
                              {pendingKey === key ? "Saving..." : action.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {message ? <p className="text-xs text-ink-500 mt-3">{message}</p> : null}
    </section>
  );
}

function formatReminderTime(value: string) {
  if (!value) return "Reminder";
  const [hourText, minuteText] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
