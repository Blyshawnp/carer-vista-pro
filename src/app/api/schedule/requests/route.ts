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

  const { data: org } = await supabase
    .from("organizations")
    .select("client_can_request_shifts")
    .eq("id", profile.organization_id)
    .single();

  if ((profile.role === "client" || profile.role === "family") && !org?.client_can_request_shifts) {
    return NextResponse.json({ error: "Care coverage requests are disabled for this organization." }, { status: 403 });
  }

  const payload = await request.json();
  const {
    client_id,
    requested_date,
    start_time,
    end_time,
    recurring_option = "none",
    caregiver_preferences = "",
    notes = "",
  } = payload;

  if (!client_id || !requested_date || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Insert the schedule coverage request
  const { data, error } = await supabase
    .from("schedule_coverage_requests")
    .insert({
      organization_id: profile.organization_id,
      client_id,
      requested_by: user.id,
      requested_date,
      start_time,
      end_time,
      recurring_option,
      caregiver_preferences,
      notes,
      status: "pending",
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.organization_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const payload = await request.json();
  const {
    request_id,
    status,
    decline_reason,
    assigned_caregiver_id,
  } = payload;

  if (!request_id || !status) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Fetch the existing request
  const { data: req, error: fetchErr } = await supabase
    .from("schedule_coverage_requests")
    .select("*")
    .eq("id", request_id)
    .single();

  if (fetchErr || !req) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  let canClientManage = false;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("organization_mode, allow_client_admin_for_personal_use")
      .eq("id", profile.organization_id)
      .single();
    if (org) {
      const isPersonalFamily = org.organization_mode === "personal_family";
      const isClientDirected = org.organization_mode === "client_directed_care";
      canClientManage = (isPersonalFamily && org.allow_client_admin_for_personal_use) || isClientDirected;
    }
  }

  const isAdmin = profile.role === "admin" || (profile.role === "client" && canClientManage);
  const isOwner = req.requested_by === user.id;

  // Permissions validation
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Unauthorized to update this request." }, { status: 403 });
  }

  // Client/family can only cancel a pending request
  if (!isAdmin) {
    if (status !== "cancelled") {
      return NextResponse.json({ error: "Clients/family can only cancel requests." }, { status: 403 });
    }
    if (req.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending requests." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("schedule_coverage_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data });
  }

  // Admin handles approval, decline, conversion to shift
  const updateData: Record<string, any> = {
    status,
    decline_reason: status === "declined" ? decline_reason || "Declined by administrator" : null,
    assigned_caregiver_id: assigned_caregiver_id || null,
    resolved_at: new Date().toISOString(),
    resolved_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (status === "scheduled") {
    // Convert coverage request into shift
    // Parse scheduled_start and scheduled_end from date + start_time/end_time
    const startStr = `${req.requested_date}T${req.start_time}`;
    const endStr = `${req.requested_date}T${req.end_time}`;
    const scheduled_start = new Date(startStr).toISOString();
    const scheduled_end = new Date(endStr).toISOString();

    // Create a new shift in database
    const { data: newShift, error: shiftErr } = await supabase
      .from("shifts")
      .insert({
        organization_id: req.organization_id,
        client_id: req.client_id,
        caregiver_id: assigned_caregiver_id || null,
        scheduled_start,
        scheduled_end,
        notes: `Converted from Schedule Request: ${req.notes || "No notes"}`,
        is_released: !!assigned_caregiver_id, // automatically release if assigned
        created_by: user.id,
      })
      .select()
      .single();

    if (shiftErr) {
      return NextResponse.json({ error: `Failed to create shift: ${shiftErr.message}` }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("schedule_coverage_requests")
    .update(updateData)
    .eq("id", request_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
