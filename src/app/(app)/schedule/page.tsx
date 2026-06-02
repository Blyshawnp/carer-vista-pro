import { createClient } from "@/lib/supabase/server";
import ScheduleView from "./schedule-view";

export type ScheduleShift = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  caregiver_id: string | null;
  caregiver_profile_id: string | null;
  caregiver_name: string | null;
  caregiver_avatar_url: string | null;
  caregiver_avatar_color: string | null;
  client_name: string | null;
  shift_type_name: string | null;
  shift_type_color: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  has_check_in: boolean;
  is_complete: boolean;
  is_released: boolean;
  is_open: boolean;
  assignment_status: "pending" | "accepted" | "declined" | null;
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const { view } = (await searchParams) ?? {};
  const archiveMode = view === "archive";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id, organization_id")
    .eq("id", user.id)
    .single<{ role: "admin" | "client" | "caregiver" | "family"; id: string; organization_id: string | null }>();

  let organizationMode = "personal_family";
  let clientCanRequestShifts = true;
  let canClientManage = true;

  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("organization_mode, client_can_request_shifts, allow_client_admin_for_personal_use")
      .eq("id", profile.organization_id)
      .single();
    if (org) {
      organizationMode = org.organization_mode;
      clientCanRequestShifts = org.client_can_request_shifts;
      const isPersonalFamily = org.organization_mode === "personal_family";
      const isClientDirected = org.organization_mode === "client_directed_care";
      canClientManage = (isPersonalFamily && org.allow_client_admin_for_personal_use) || isClientDirected;
    }
  }

  const canCreateShifts = profile?.role === "admin" || (profile?.role === "client" && canClientManage);
  const canRequestShifts = (profile?.role === "client" || profile?.role === "family") && clientCanRequestShifts;

  if (canCreateShifts) {
    try {
      await supabase.rpc("generate_recurring_shifts");
    } catch {
      // Ignore until the migration is applied.
    }
  }

  const start = new Date();
  start.setDate(start.getDate() + (archiveMode ? -180 : -1));
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + (archiveMode ? 0 : 60));
  end.setHours(23, 59, 59, 999);

  const { data: rows } = await supabase
    .from("shifts")
    .select(
      `
      id,
      scheduled_start,
      scheduled_end,
      caregiver_id,
      assignment_status,
      is_released,
      profiles:caregiver_id ( full_name, avatar_url, avatar_color ),
      clients ( full_name ),
      shift_types ( name, color ),
      check_ins ( check_in_time, check_out_time )
    `
    )
    .gte("scheduled_start", start.toISOString())
    .lte("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true });

  type ScheduleQueryRow = {
    id: string;
    scheduled_start: string;
    scheduled_end: string;
    caregiver_id: string | null;
    assignment_status: "pending" | "accepted" | "declined" | null;
    is_released: boolean | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      avatar_color: string | null;
    } | null;
    clients: { full_name: string } | null;
    shift_types: { name: string; color: string } | null;
    check_ins:
      | Array<{
          check_in_time: string | null;
          check_out_time: string | null;
        }>
      | {
          check_in_time: string | null;
          check_out_time: string | null;
        }
      | null;
  };

  const viewerRole = profile?.role ?? "caregiver";
  let assignedClientCount = 0;
  if (viewerRole === "caregiver" || viewerRole === "family") {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true });
    assignedClientCount = count ?? 0;
  }

  const shifts: ScheduleShift[] = (
    (rows ?? []) as unknown as ScheduleQueryRow[]
  ).map((r) => {
    const checkIns = normalizeRows(r.check_ins);
    const activeCheckIn =
      checkIns.find((row) => row.check_in_time && !row.check_out_time) ??
      checkIns[0] ??
      null;
    const canShowClientDetails =
      viewerRole !== "caregiver" || r.caregiver_id === profile?.id;

    return {
      id: r.id,
      scheduled_start: r.scheduled_start,
      scheduled_end: r.scheduled_end,
      caregiver_id: r.caregiver_id,
      caregiver_profile_id: r.caregiver_id,
      caregiver_name: r.profiles?.full_name ?? null,
      caregiver_avatar_url: r.profiles?.avatar_url ?? null,
      caregiver_avatar_color: r.profiles?.avatar_color ?? null,
      client_name: canShowClientDetails ? r.clients?.full_name ?? null : null,
      shift_type_name: r.shift_types?.name ?? null,
      shift_type_color: r.shift_types?.color ?? null,
      check_in_time: activeCheckIn?.check_in_time ?? null,
      check_out_time: activeCheckIn?.check_out_time ?? null,
      has_check_in: !!activeCheckIn?.check_in_time,
      is_complete: !!activeCheckIn?.check_out_time,
      is_released: !!r.is_released,
      is_open: !r.caregiver_id && !r.is_released && !activeCheckIn?.check_in_time,
      assignment_status: r.assignment_status ?? null,
    };
  }).filter((shift) => {
    if (!archiveMode) return new Date(shift.scheduled_end) >= new Date() || (!!shift.check_in_time && !shift.check_out_time);
    return new Date(shift.scheduled_end) < new Date() || !!shift.check_out_time;
  });

  return (
    <ScheduleView
      shifts={shifts}
      role={viewerRole}
      archiveMode={archiveMode}
      assignedClientCount={assignedClientCount}
      canCreateShifts={canCreateShifts}
      canRequestShifts={canRequestShifts}
      organizationMode={organizationMode}
    />
  );
}

function normalizeRows<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
