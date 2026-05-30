import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/db-types";

type CheckoutRequest = {
  shiftId?: string;
  checkInId?: string;
  allowIncomplete?: boolean;
  location?:
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
};

type ShiftRecord = {
  id: string;
  caregiver_id: string | null;
  shift_todos: Array<{
    id: string;
    task_name: string;
    is_completed: boolean;
    is_optional: boolean;
    is_prn: boolean;
  }> | null;
};

type CheckInRecord = {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
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

    const payload = (await request.json()) as CheckoutRequest;
    if (!payload.shiftId || !payload.checkInId || !payload.location) {
      return NextResponse.json(
        { error: "Invalid checkout request" },
        { status: 400 }
      );
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle<CallerProfile>();

    if (!caller || caller.role !== "caregiver") {
      return NextResponse.json(
        { error: "Only caregivers can check out here" },
        { status: 403 }
      );
    }

    const { data: shiftRaw } = await supabase
      .from("shifts")
      .select("id, caregiver_id, shift_todos ( id, task_name, is_completed, is_optional, is_prn )")
      .eq("id", payload.shiftId)
      .maybeSingle();

    const shift = shiftRaw as unknown as ShiftRecord | null;
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.caregiver_id !== caller.id) {
      return NextResponse.json({ error: "Not your shift" }, { status: 403 });
    }

    const { data: checkIn } = await supabase
      .from("check_ins")
      .select("id, check_in_time, check_out_time")
      .eq("id", payload.checkInId)
      .eq("shift_id", payload.shiftId)
      .maybeSingle<CheckInRecord>();

    if (!checkIn?.check_in_time) {
      return NextResponse.json(
        { error: "This shift is not checked in" },
        { status: 409 }
      );
    }

    if (checkIn.check_out_time) {
      return NextResponse.json(
        { error: "This shift is already checked out" },
        { status: 409 }
      );
    }

    const incompleteTasks = (shift.shift_todos ?? []).filter(
      (todo) => !todo.is_completed && !todo.is_optional && !todo.is_prn
    );
    const incompleteCount = incompleteTasks.length;
    if (incompleteCount > 0 && !payload.allowIncomplete) {
      return NextResponse.json(
        {
          error: "Incomplete tasks require confirmation",
          incompleteCount,
        },
        { status: 409 }
      );
    }

    const checkoutTime = new Date().toISOString();
    const flaggedOutsideGeofence =
      payload.location.kind === "denied" ||
      (payload.location.kind === "located" && !payload.location.withinFence);

    const update: Record<string, string | number | boolean | null> = {
      check_out_time: checkoutTime,
      check_out_method: "caregiver_self",
      check_out_by: caller.id,
      check_out_within_geofence:
        payload.location.kind === "located" ? payload.location.withinFence : false,
      flagged_outside_geofence: flaggedOutsideGeofence,
      flag_reason: flaggedOutsideGeofence
        ? payload.location.kind === "denied"
          ? "Location denied"
          : "Outside geofence"
        : null,
    };

    if (payload.location.kind === "located") {
      update.check_out_latitude = payload.location.latitude;
      update.check_out_longitude = payload.location.longitude;
      update.check_out_distance_meters = payload.location.distanceMeters;
    }

    const { error: updateError } = await supabase
      .from("check_ins")
      .update(update)
      .eq("id", checkIn.id)
      .is("check_out_time", null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
