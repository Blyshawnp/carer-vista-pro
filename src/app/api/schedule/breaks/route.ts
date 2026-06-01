import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.organization_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const payload = await request.json();
  const { shift_id, break_type } = payload;

  if (!shift_id || !["lunch", "break"].includes(break_type)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch organization settings to determine is_paid
  const { data: org } = await supabase
    .from("organizations")
    .select("lunch_paid_or_unpaid, break_paid_or_unpaid")
    .eq("id", profile.organization_id)
    .single();

  const isPaid = break_type === "lunch"
    ? org?.lunch_paid_or_unpaid === "paid"
    : org?.break_paid_or_unpaid === "paid";

  // Check for any existing active break of this type
  const { data: active } = await supabase
    .from("shift_breaks")
    .select("id")
    .eq("shift_id", shift_id)
    .eq("break_type", break_type)
    .is("end_time", null)
    .maybeSingle();

  if (active) {
    return NextResponse.json({ error: "An active break of this type is already running." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shift_breaks")
    .insert({
      organization_id: profile.organization_id,
      shift_id,
      break_type,
      start_time: new Date().toISOString(),
      is_paid: isPaid,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { shift_id, break_type, duration_minutes, start_time, end_time, note } = payload;

  if (!shift_id) {
    return NextResponse.json({ error: "Shift ID is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // If admin manually adjusts break/lunch times
  if (isAdmin && (duration_minutes !== undefined || start_time !== undefined)) {
    const { break_id } = payload;
    if (!break_id) {
      return NextResponse.json({ error: "Break ID is required for administrative updates" }, { status: 400 });
    }

    const { data: oldBreak } = await supabase
      .from("shift_breaks")
      .select("*")
      .eq("id", break_id)
      .single();

    const updateData: Record<string, any> = {
      note: note || "Adjusted by administrator",
    };

    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    
    if (duration_minutes !== undefined) {
      updateData.duration_minutes = Number(duration_minutes);
    } else if (start_time && end_time) {
      const diffMs = new Date(end_time).getTime() - new Date(start_time).getTime();
      updateData.duration_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    const { data, error } = await supabase
      .from("shift_breaks")
      .update(updateData)
      .eq("id", break_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Write structured audit log
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: "adjust_break_time",
      affected_record_id: break_id,
      affected_record_type: "shift_breaks",
      note: `Adjusted ${oldBreak?.break_type} duration from ${oldBreak?.duration_minutes}m to ${data.duration_minutes}m (Reason: ${note || "None"}).`,
    });

    return NextResponse.json({ ok: true, data });
  }

  // Caregiver ending break
  if (!break_type) {
    return NextResponse.json({ error: "Break type is required" }, { status: 400 });
  }

  // Find the running break
  const { data: running, error: findErr } = await supabase
    .from("shift_breaks")
    .select("*")
    .eq("shift_id", shift_id)
    .eq("break_type", break_type)
    .is("end_time", null)
    .maybeSingle();

  if (findErr || !running) {
    return NextResponse.json({ error: "No running break found to end." }, { status: 404 });
  }

  const finishedAt = new Date().toISOString();
  const diffMs = new Date(finishedAt).getTime() - new Date(running.start_time).getTime();
  const finalMinutes = Math.max(0, Math.round(diffMs / 60000));

  const { data, error } = await supabase
    .from("shift_breaks")
    .update({
      end_time: finishedAt,
      duration_minutes: finalMinutes,
      note: note || "",
    })
    .eq("id", running.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
