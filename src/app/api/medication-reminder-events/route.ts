import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushForNotifications } from "@/lib/web-push";
import type { Role } from "@/lib/db-types";

const STATUSES = new Set([
  "reminded",
  "taken",
  "skipped",
  "refused",
  "needs_follow_up",
  "not_available",
]);

const STATUS_LABELS: Record<string, string> = {
  reminded: "Reminded",
  taken: "Marked taken",
  skipped: "Skipped",
  refused: "Client declined",
  needs_follow_up: "Needs follow-up",
  not_available: "Not available",
};

type EventPayload = {
  clientId?: string;
  medicationId?: string;
  reminderId?: string | null;
  shiftId?: string | null;
  scheduledFor?: string | null;
  status?: string;
  note?: string | null;
};

type CallerProfile = {
  id: string;
  full_name: string;
  role: Role;
  organization_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as EventPayload;
  const status = payload.status ?? "";
  const scheduledFor = payload.scheduledFor ?? new Date().toISOString();

  if (!payload.clientId || !payload.medicationId || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Client, medication, and status are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("profiles")
    .select("id, full_name, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<CallerProfile>();

  if (!caller) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: medication } = await admin
    .from("client_medications")
    .select(
      "id, organization_id, client_id, medication_name, notify_client_family_when_marked"
    )
    .eq("id", payload.medicationId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      client_id: string;
      medication_name: string;
      notify_client_family_when_marked: boolean;
    }>();

  if (
    !medication ||
    medication.organization_id !== caller.organization_id ||
    medication.client_id !== payload.clientId
  ) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  let shiftAllowsMarking = false;
  if (payload.shiftId) {
    const { data: shift } = await admin
      .from("shifts")
      .select("id, organization_id, client_id, caregiver_id")
      .eq("id", payload.shiftId)
      .maybeSingle<{
        id: string;
        organization_id: string;
        client_id: string | null;
        caregiver_id: string | null;
      }>();

    if (
      !shift ||
      shift.organization_id !== caller.organization_id ||
      shift.client_id !== payload.clientId
    ) {
      return NextResponse.json({ error: "Shift not found." }, { status: 404 });
    }
    shiftAllowsMarking = shift.caregiver_id === caller.id;
  }

  let assignmentAllowsMarking = caller.role === "admin" || caller.role === "client";
  if (!assignmentAllowsMarking) {
    const { data: assignment } = await admin
      .from("client_user_assignments")
      .select("id, relationship_role")
      .eq("client_id", payload.clientId)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle<{ id: string; relationship_role: string }>();
    assignmentAllowsMarking =
      assignment?.relationship_role === "caregiver" ||
      assignment?.relationship_role === "admin";
  }

  if (!assignmentAllowsMarking && !shiftAllowsMarking) {
    return NextResponse.json(
      { error: "You can only mark reminders for assigned clients or shifts." },
      { status: 403 }
    );
  }

  const { data: event, error } = await admin
    .from("medication_reminder_events")
    .insert({
      organization_id: caller.organization_id,
      client_id: payload.clientId,
      medication_id: payload.medicationId,
      reminder_id: payload.reminderId ?? null,
      shift_id: payload.shiftId ?? null,
      scheduled_for: scheduledFor,
      status,
      marked_by: caller.id,
      marked_at: new Date().toISOString(),
      note: payload.note?.trim() || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !event) {
    return NextResponse.json(
      { error: error?.message ?? "Could not mark medication reminder." },
      { status: 500 }
    );
  }

  if (payload.shiftId) {
    await admin.from("shift_events").insert({
      organization_id: caller.organization_id,
      shift_id: payload.shiftId,
      caregiver_id: caller.role === "caregiver" ? caller.id : null,
      client_id: payload.clientId,
      event_type: "medication_reminder_marked",
      event_time: new Date().toISOString(),
      metadata: {
        medication_id: medication.id,
        medication_name: medication.medication_name,
        reminder_id: payload.reminderId ?? null,
        status,
        label: STATUS_LABELS[status],
      },
      created_by: caller.id,
    });
  }

  let notifyFamily = medication.notify_client_family_when_marked;
  if (payload.reminderId) {
    const { data: reminder } = await admin
      .from("client_medication_reminders")
      .select("notify_client_family")
      .eq("id", payload.reminderId)
      .maybeSingle<{ notify_client_family: boolean }>();
    notifyFamily = notifyFamily || !!reminder?.notify_client_family;
  }

  if (notifyFamily) {
    const { data: linkedRecipients } = await admin
      .from("client_user_assignments")
      .select("user_id")
      .eq("client_id", payload.clientId)
      .eq("is_active", true)
      .in("relationship_role", ["family", "client", "admin"])
      .neq("user_id", caller.id);

    const rows = (linkedRecipients ?? []).map((recipient) => ({
      organization_id: caller.organization_id,
      recipient_id: recipient.user_id,
      kind: "medication_reminder_marked",
      title: "Medication reminder updated",
      body: `${caller.full_name}: ${STATUS_LABELS[status]} for ${medication.medication_name}.`,
      link: payload.shiftId
        ? `/schedule/${payload.shiftId}`
        : `/clients/${payload.clientId}/home-info`,
      related_shift_id: payload.shiftId ?? undefined,
    }));

    if (rows.length > 0) {
      await admin.from("notifications").insert(rows);
      void sendPushForNotifications(admin, rows).catch(() => {});
    }
  }

  return NextResponse.json({ id: event.id });
}
