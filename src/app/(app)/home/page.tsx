import { createClient } from "@/lib/supabase/server";
import { formatStructuredAddress, normalizeCountry } from "@/lib/address";
import { formatEnumLabel } from "@/lib/pay";
import HomeContent from "./home-content";
import OnboardingChecklist from "@/components/onboarding-checklist";

export type ShiftRow = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  caregiver_id: string | null;
  caregiver_name: string | null;
  client_name: string | null;
  client_address: string | null;
  client_lat: number | null;
  client_lng: number | null;
  geofence_radius_meters: number;
  shift_type_name: string | null;
  shift_type_color: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  todo_total: number;
  todo_done: number;
  assignment_status: "pending" | "accepted" | "declined" | null;
};

export type AssignedClient = {
  id: string;
  full_name: string;
  address: string | null;
  formatted_address: string | null;
  street_address_1: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  state_or_region: string | null;
  postal_code: string | null;
  country: string | null;
};

export type CareActivityItem = {
  id: string;
  occurred_at: string;
  client_name: string | null;
  title: string;
  body: string | null;
  href: string;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, organization_id, onboarding_checklist_dismissed")
    .eq("id", user.id)
    .single<{ id: string; role: "admin" | "client" | "caregiver" | "family"; full_name: string; organization_id: string; onboarding_checklist_dismissed: boolean | null }>();

  if (!profile) return null;

  // Find this user's relevant shifts (today + future, ordered by start)
  // For caregivers: only their assigned shifts. Admin/client: all org shifts.
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const lookback = new Date(now);
  lookback.setDate(lookback.getDate() - 14);

  const shiftSelect = `
    id,
    scheduled_start,
    scheduled_end,
    caregiver_id,
    assignment_status,
    profiles:caregiver_id ( full_name ),
    clients ( full_name, address, formatted_address, street_address_1, street_address_2, city, state, state_or_region, postal_code, country, latitude, longitude, geofence_radius_meters ),
    shift_types ( name, color ),
    check_ins ( check_in_time, check_out_time ),
    shift_todos ( id, is_completed )
  `;

  let query = supabase
    .from("shifts")
    .select(shiftSelect)
    .lte("scheduled_start", horizon.toISOString())
    .order("scheduled_start", { ascending: true });

  if (profile.role === "caregiver") {
    query = query
      .eq("caregiver_id", profile.id)
      .gte("scheduled_start", lookback.toISOString());
  } else {
    query = query.gte("scheduled_end", now.toISOString());
  }

  const { data: rows } = await query;

  type ShiftQueryRow = {
    id: string;
    scheduled_start: string;
    scheduled_end: string;
    caregiver_id: string | null;
    assignment_status: "pending" | "accepted" | "declined" | null;
    profiles: { full_name: string } | null;
    clients: {
      full_name: string;
      address: string | null;
      formatted_address: string | null;
      street_address_1: string | null;
      street_address_2: string | null;
      city: string | null;
      state: string | null;
      state_or_region: string | null;
      postal_code: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
      geofence_radius_meters: number;
    } | null;
    shift_types: { name: string; color: string } | null;
    check_ins:
      | Array<{ check_in_time: string | null; check_out_time: string | null }>
      | { check_in_time: string | null; check_out_time: string | null }
      | null;
    shift_todos: Array<{ id: string; is_completed: boolean }>;
  };

  const mergedRows = new Map<string, ShiftQueryRow>();
  for (const row of (rows ?? []) as unknown as ShiftQueryRow[]) {
    mergedRows.set(row.id, row);
  }

  if (profile.role === "caregiver") {
    const { data: activeRows } = await supabase
      .from("shifts")
      .select(
        shiftSelect.replace(
          "check_ins ( check_in_time, check_out_time )",
          "check_ins!inner ( check_in_time, check_out_time )"
        )
      )
      .eq("caregiver_id", profile.id)
      .not("check_ins.check_in_time", "is", null)
      .is("check_ins.check_out_time", null);

    for (const row of (activeRows ?? []) as unknown as ShiftQueryRow[]) {
      mergedRows.set(row.id, row);
    }
  }

  const shifts: ShiftRow[] = Array.from(mergedRows.values())
    .map(mapShiftRow)
    .sort(
      (a, b) =>
        new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime()
    );

  let assignedClients: AssignedClient[] = [];
  if (profile.role === "caregiver" || profile.role === "family" || profile.role === "client") {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("id, full_name, address, formatted_address, street_address_1, street_address_2, city, state, state_or_region, postal_code, country")
      .order("full_name");

    assignedClients = (clientRows ?? []) as AssignedClient[];
  }

  let careActivity: CareActivityItem[] = [];
  if (profile.role !== "caregiver") {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const { data: visibleClients } = await supabase
      .from("clients")
      .select("id, full_name");
    const clientNames = new Map(
      ((visibleClients ?? []) as Array<{ id: string; full_name: string }>).map(
        (client) => [client.id, client.full_name]
      )
    );

    const { data: activityRows } = await supabase
      .from("shift_events")
      .select("id, event_type, event_time, shift_id, client_id, metadata")
      .gte("event_time", startOfToday.toISOString())
      .order("event_time", { ascending: false })
      .limit(30);

    const { data: medicationRows } = await supabase
      .from("medication_reminder_events")
      .select("id, status, marked_at, scheduled_for, shift_id, client_id, note")
      .gte("scheduled_for", startOfToday.toISOString())
      .order("scheduled_for", { ascending: false })
      .limit(30);

    const shiftActivity = ((activityRows ?? []) as Array<{
      id: string;
      event_type: string;
      event_time: string;
      shift_id: string | null;
      client_id: string | null;
      metadata: Record<string, unknown> | null;
    }>).map((event) => ({
      id: `shift:${event.id}`,
      occurred_at: event.event_time,
      client_name: event.client_id ? clientNames.get(event.client_id) ?? null : null,
      title: formatCareActivityTitle(event.event_type, event.metadata),
      body: formatCareActivityBody(event.event_type, event.metadata),
      href: event.shift_id ? `/schedule/${event.shift_id}` : "/schedule",
    }));

    const medicationActivity = ((medicationRows ?? []) as Array<{
      id: string;
      status: string;
      marked_at: string | null;
      scheduled_for: string;
      shift_id: string | null;
      client_id: string | null;
      note: string | null;
    }>).map((event) => ({
      id: `med:${event.id}`,
      occurred_at: event.marked_at ?? event.scheduled_for,
      client_name: event.client_id ? clientNames.get(event.client_id) ?? null : null,
      title: `Medication reminder ${formatMedicationStatus(event.status)}`,
      body: event.note,
      href: event.shift_id ? `/schedule/${event.shift_id}` : "/clients",
    }));

    careActivity = [...shiftActivity, ...medicationActivity]
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )
      .slice(0, 8);
  }

  // For admin/client: list of caregivers currently on shift
  let activeShifts: ActiveShift[] = [];
  if (profile.role !== "caregiver") {
    type ActiveQueryRow = {
      shift_id: string;
      caregiver_name: string | null;
      client_name: string | null;
      check_in_time: string;
      scheduled_end: string;
      past_scheduled_end: boolean;
      flagged_outside_geofence: boolean | null;
      shift_type_color: string | null;
    };

    const { data: activeRows } = await supabase
      .from("currently_on_shift")
      .select(
        "shift_id, caregiver_name, client_name, check_in_time, scheduled_end, past_scheduled_end, flagged_outside_geofence, shift_type_color"
      )
      .order("check_in_time", { ascending: true })
      .returns<ActiveQueryRow[]>();

    activeShifts = (activeRows ?? []).map((r) => ({
      shift_id: r.shift_id,
      caregiver_name: r.caregiver_name ?? "Caregiver",
      client_name: r.client_name ?? null,
      check_in_time: r.check_in_time,
      scheduled_end: r.scheduled_end,
      past_scheduled_end: r.past_scheduled_end,
      flagged: r.flagged_outside_geofence ?? false,
      shift_type_color: r.shift_type_color ?? null,
    }));
  }

  return (
    <>
      <OnboardingChecklist
        role={profile.role}
        dismissed={!!profile.onboarding_checklist_dismissed}
      />
      <HomeContent
        role={profile.role}
        shifts={shifts}
        activeShifts={activeShifts}
        assignedClients={assignedClients}
        careActivity={careActivity}
      />
    </>
  );
}

export type ActiveShift = {
  shift_id: string;
  caregiver_name: string;
  client_name: string | null;
  check_in_time: string;
  scheduled_end: string;
  past_scheduled_end: boolean;
  flagged: boolean;
  shift_type_color: string | null;
};

function mapShiftRow(r: {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  caregiver_id: string | null;
  assignment_status: "pending" | "accepted" | "declined" | null;
  profiles: { full_name: string } | null;
  clients: {
    full_name: string;
    address: string | null;
    formatted_address: string | null;
    street_address_1: string | null;
    street_address_2: string | null;
    city: string | null;
    state: string | null;
    state_or_region: string | null;
    postal_code: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
  } | null;
  shift_types: { name: string; color: string } | null;
  check_ins:
    | Array<{ check_in_time: string | null; check_out_time: string | null }>
    | { check_in_time: string | null; check_out_time: string | null }
    | null;
  shift_todos: Array<{ id: string; is_completed: boolean }>;
}): ShiftRow {
  const todos = r.shift_todos ?? [];
  const checkIns = normalizeRows(r.check_ins);
  const activeCheckIn =
    checkIns.find((row) => row.check_in_time && !row.check_out_time) ??
    checkIns[0] ??
    null;
  return {
    id: r.id,
    scheduled_start: r.scheduled_start,
    scheduled_end: r.scheduled_end,
    caregiver_id: r.caregiver_id,
    caregiver_name: r.profiles?.full_name ?? null,
    client_name: r.clients?.full_name ?? null,
    client_address: r.clients ? displayAddress(r.clients) : null,
    client_lat: r.clients?.latitude ?? null,
    client_lng: r.clients?.longitude ?? null,
    geofence_radius_meters: r.clients?.geofence_radius_meters ?? 150,
    shift_type_name: r.shift_types?.name ?? null,
    shift_type_color: r.shift_types?.color ?? null,
    check_in_time: activeCheckIn?.check_in_time ?? null,
    check_out_time: activeCheckIn?.check_out_time ?? null,
    todo_total: todos.length,
    todo_done: todos.filter((t) => t.is_completed).length,
    assignment_status: r.assignment_status ?? null,
  };
}

function normalizeRows<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function displayAddress(client: {
  address: string | null;
  formatted_address: string | null;
  street_address_1: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  state_or_region: string | null;
  postal_code: string | null;
  country: string | null;
}) {
  const fallback = client.formatted_address ?? client.address;
  const country = normalizeCountry(client.country);
  if (fallback?.trim() && fallback.trim() !== country) return fallback;

  return formatStructuredAddress({
    street_address_1: client.street_address_1,
    street_address_2: client.street_address_2,
    city: client.city,
    state_or_region: client.state_or_region ?? client.state,
    postal_code: client.postal_code,
    country: client.country,
  });
}

function formatCareActivityTitle(
  eventType: string,
  metadata: Record<string, unknown> | null
) {
  switch (eventType) {
    case "caregiver_checked_in":
      return "Caregiver checked in";
    case "caregiver_checked_out":
      return "Caregiver checked out";
    case "task_completed":
      return "Task completed";
    case "task_reopened":
      return "Task reopened";
    case "medication_reminder_marked":
      return "Medication reminder updated";
    case "incident_reported":
      return "Incident report submitted";
    case "shift_released":
      return "Shift released";
    case "shift_removed":
      return "Shift removed";
    default:
      return formatEnumLabel(eventType);
  }
}

function formatCareActivityBody(
  eventType: string,
  metadata: Record<string, unknown> | null
) {
  if (!metadata) return null;
  const taskName = metadata.task_name;
  if (
    (eventType === "task_completed" || eventType === "task_reopened") &&
    typeof taskName === "string"
  ) {
    return taskName;
  }
  const medicationName = metadata.medication_name;
  const label = metadata.label;
  if (eventType === "medication_reminder_marked") {
    return [medicationName, label].filter((value) => typeof value === "string").join(" · ") || null;
  }
  return null;
}

function formatMedicationStatus(status: string) {
  switch (status) {
    case "taken":
      return "marked taken";
    case "skipped":
      return "skipped";
    case "refused":
      return "client declined";
    case "needs_follow_up":
      return "Needs follow-up";
    case "reminded":
      return "reminded";
    default:
      return formatEnumLabel(status);
  }
}
