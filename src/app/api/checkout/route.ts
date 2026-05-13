import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushForNotifications } from "@/lib/web-push";
import type { Role } from "@/lib/db-types";

type CheckoutRequest = {
  shiftId: string;
  checkInId: string;
  allowIncomplete?: boolean;
  location:
    | {
        kind: "located";
        latitude: number;
        longitude: number;
        withinFence: boolean;
        distanceMeters: number | null;
      }
    | { kind: "denied" }
    | { kind: "unavailable" };
};

type CallerProfile = {
  id: string;
  role: Role;
  full_name: string;
  organization_id: string;
};

type ShiftRecord = {
  id: string;
  caregiver_id: string | null;
  organization_id: string;
  scheduled_start: string;
  scheduled_end: string;
  clients: { full_name: string | null } | null;
  profiles: { full_name: string | null } | null;
  shift_todos: Array<{
    id: string;
    task_name: string;
    is_completed: boolean;
  }> | null;
};

type CheckInRecord = {
  id: string;
  shift_id: string;
  caregiver_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

type NotificationInsert = {
  organization_id: string;
  recipient_id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  related_shift_id: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check
    const { data: canAct } = await supabase.rpc("check_rate_limit", { 
      p_user_id: user.id,
      p_seconds: 5
    });

    if (canAct === false) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const payload = (await request.json()) as CheckoutRequest;
    if (!payload.shiftId || !payload.checkInId || !payload.location) {
      return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("id, role, full_name, organization_id")
      .eq("id", user.id)
      .maybeSingle<CallerProfile>();

    if (!caller || caller.role !== "caregiver") {
      return NextResponse.json({ error: "Only caregivers can check out here" }, { status: 403 });
    }

    const { data: shiftRaw } = await supabase
      .from("shifts")
      .select(
        `
        id,
        caregiver_id,
        organization_id,
        scheduled_start,
        scheduled_end,
        clients ( full_name ),
        profiles:caregiver_id ( full_name ),
        shift_todos ( id, task_name, is_completed )
      `
      )
      .eq("id", payload.shiftId)
      .maybeSingle();

    if (!shiftRaw) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const shift = shiftRaw as unknown as ShiftRecord;
    if (shift.caregiver_id !== caller.id) {
      return NextResponse.json({ error: "Not your shift" }, { status: 403 });
    }

    const { data: checkIn } = await supabase
      .from("check_ins")
      .select("id, shift_id, caregiver_id, check_in_time, check_out_time")
      .eq("id", payload.checkInId)
      .eq("shift_id", payload.shiftId)
      .maybeSingle<CheckInRecord>();

    if (!checkIn?.check_in_time) {
      return NextResponse.json({ error: "This shift is not checked in" }, { status: 409 });
    }
    if (checkIn.check_out_time) {
      return NextResponse.json({ error: "This shift is already checked out" }, { status: 409 });
    }

    const incompleteTasks = (shift.shift_todos ?? []).filter(
      (todo) => !todo.is_completed
    );
    if (incompleteTasks.length > 0 && !payload.allowIncomplete) {
      return NextResponse.json(
        {
          error: "Incomplete tasks require confirmation",
          incompleteWount: incompleteTasks.length,
        },
        { status: 409 }
      );
    }

    const checkoutTime = new Date().toISOString();
    const flagged =
      payload.location.kind === "denied" ||
      (payload.location.kind === "located" && !payload.location.withinFence);
    
    const update: any = {
      check_out_time: checkoutTime,
      check_out_within_geofence:
        payload.location.kind === "located" ? payload.location.withinFence : false,
      check_out_method: "caregiver_self",
      check_out_by: caller.id,
    };

    if (payload.location.kind === "located") {
      update.check_out_latitude = payload.location.latitude;
      update.check_out_longitude = payload.location.longitude;
    }
    if (flagged) {
      update.flagged_outside_geofence = true;
      update.flag_reason = payload.location.kind === "denied" ? "Location denied" : "Outside fence";
    }

    const { data: checkedOut, error: updateError } = await supabase
      .from("check_ins")
      .update(update)
      .eq("id", checkIn.id)
      .is("check_out_time", null)
      .select("id, check_out_time")
      .maybeSingle<{ id: string; check_out_time: string | null }>();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const admin = createAdminClient();
    if (incompleteTasks.length > 0) {
      // Background logic...
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function formatShiftTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

function formatDistance(meters: number) {
  return `${meters}m`;
}
