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
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("organization_mode, allow_client_caregiver_bonuses, bonus_requires_admin_approval")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.allow_client_caregiver_bonuses) {
    return NextResponse.json({ error: "Client-funded caregiver bonuses are disabled for this organization." }, { status: 403 });
  }

  const payload = await request.json();
  const {
    client_id,
    caregiver_id,
    amount,
    bonus_type = "appreciation_bonus",
    notes = "",
  } = payload;

  const numericAmount = Number(amount);
  if (!client_id || !caregiver_id || isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "Invalid client, caregiver, or bonus amount." }, { status: 400 });
  }

  // Determine initial status based on organization mode & settings
  const mode = org.organization_mode;
  let status = "pending_review";

  if (profile.role === "admin") {
    status = "approved";
  } else if (mode === "personal_family" || mode === "client_directed_care") {
    status = "approved"; // directly approved in private/personal use modes
  } else if (mode === "solo_caregiver" && user.id === caregiver_id) {
    status = "approved"; // directly approved if solo caregiver records it
  } else if (!org.bonus_requires_admin_approval) {
    status = "approved"; // no admin review required
  }

  // Fetch the latest active pay period to associate the bonus
  const { data: periods } = await supabase
    .from("pay_periods")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("is_locked", false)
    .order("period_start", { ascending: false })
    .limit(1);

  const pay_period_id = periods && periods.length > 0 ? periods[0].id : null;

  const { data, error } = await supabase
    .from("client_caregiver_bonuses")
    .insert({
      organization_id: profile.organization_id,
      client_id,
      caregiver_id,
      pay_period_id,
      amount: numericAmount,
      bonus_type,
      status,
      submitted_by: user.id,
      notes,
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

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admins only." }, { status: 403 });
  }

  const payload = await request.json();
  const {
    bonus_id,
    status,
    admin_notes = "",
  } = payload;

  const validStatuses = ["approved", "declined", "paid", "voided"];
  if (!bonus_id || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_caregiver_bonuses")
    .update({
      status,
      admin_notes,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bonus_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
