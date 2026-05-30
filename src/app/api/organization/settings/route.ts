import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (!profile || profile.role !== "admin" || !profile.organization_id) {
    return NextResponse.json({ error: "Forbidden: Admins only." }, { status: 403 });
  }

  const payload = await request.json();
  const {
    organization_mode,
    allow_client_admin_for_personal_use,
    client_can_request_shifts,
    client_can_request_preferred_caregivers,
    client_can_view_invoices,
    family_can_view_invoices,
    client_can_manage_family_access,
    client_can_submit_feedback,
    family_can_submit_feedback,
    invoice_frequency,
    invoice_period_start_date,
    invoice_period_end_rule,
    invoice_release_day,
    invoice_release_time,
    invoice_timezone,
    allow_client_caregiver_bonuses,
    bonus_requires_admin_approval,
    bonus_visible_to_caregiver_before_approval,
    bonus_added_to_client_invoice,
    bonus_included_in_year_end_summary,
  } = payload;

  // Validate organization mode
  const validModes = ["personal_family", "agency_company", "solo_caregiver", "client_directed_care"];
  if (organization_mode && !validModes.includes(organization_mode)) {
    return NextResponse.json({ error: "Invalid organization mode." }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (organization_mode !== undefined) updateData.organization_mode = organization_mode;
  if (allow_client_admin_for_personal_use !== undefined) updateData.allow_client_admin_for_personal_use = !!allow_client_admin_for_personal_use;
  if (client_can_request_shifts !== undefined) updateData.client_can_request_shifts = !!client_can_request_shifts;
  if (client_can_request_preferred_caregivers !== undefined) updateData.client_can_request_preferred_caregivers = !!client_can_request_preferred_caregivers;
  if (client_can_view_invoices !== undefined) updateData.client_can_view_invoices = !!client_can_view_invoices;
  if (family_can_view_invoices !== undefined) updateData.family_can_view_invoices = !!family_can_view_invoices;
  if (client_can_manage_family_access !== undefined) updateData.client_can_manage_family_access = !!client_can_manage_family_access;
  if (client_can_submit_feedback !== undefined) updateData.client_can_submit_feedback = !!client_can_submit_feedback;
  if (family_can_submit_feedback !== undefined) updateData.family_can_submit_feedback = !!family_can_submit_feedback;

  // Custom Invoice Schedule Toggles
  if (invoice_frequency !== undefined) updateData.invoice_frequency = invoice_frequency;
  if (invoice_period_start_date !== undefined) updateData.invoice_period_start_date = invoice_period_start_date || null;
  if (invoice_period_end_rule !== undefined) updateData.invoice_period_end_rule = invoice_period_end_rule || null;
  if (invoice_release_day !== undefined) updateData.invoice_release_day = invoice_release_day;
  if (invoice_release_time !== undefined) updateData.invoice_release_time = invoice_release_time;
  if (invoice_timezone !== undefined) updateData.invoice_timezone = invoice_timezone;

  // Caregiver Appreciation Bonuses Toggles
  if (allow_client_caregiver_bonuses !== undefined) updateData.allow_client_caregiver_bonuses = !!allow_client_caregiver_bonuses;
  if (bonus_requires_admin_approval !== undefined) updateData.bonus_requires_admin_approval = !!bonus_requires_admin_approval;
  if (bonus_visible_to_caregiver_before_approval !== undefined) updateData.bonus_visible_to_caregiver_before_approval = !!bonus_visible_to_caregiver_before_approval;
  if (bonus_added_to_client_invoice !== undefined) updateData.bonus_added_to_client_invoice = !!bonus_added_to_client_invoice;
  if (bonus_included_in_year_end_summary !== undefined) updateData.bonus_included_in_year_end_summary = !!bonus_included_in_year_end_summary;

  const { data, error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", profile.organization_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
