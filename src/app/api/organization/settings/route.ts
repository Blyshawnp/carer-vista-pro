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

  const isAllowed = profile?.role === "admin" || (profile?.role === "client" && canClientManage);

  if (!profile || !isAllowed || !profile.organization_id) {
    return NextResponse.json({ error: "Forbidden: Admins or coordinators only." }, { status: 403 });
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
    enable_break_tracking,
    require_lunch_check_in_out,
    require_break_check_in_out,
    lunch_paid_or_unpaid,
    break_paid_or_unpaid,
    default_lunch_minutes,
    default_break_minutes,
    enable_pay_deductions,
    deduction_label,
    deduction_type,
    deduction_amount,
    deduction_applies_to,
    deduction_active,
    deduction_requires_acceptance,
    enable_custom_branding,
    custom_logo_url,
    custom_icon_url,
    brand_primary_color,
    brand_accent_color,
    custom_brand_name,
    plan_allows_custom_branding,
  } = payload;

  // Validate organization mode
  const validModes = ["personal_family", "agency_company", "solo_caregiver", "client_directed_care"];
  if (organization_mode && !validModes.includes(organization_mode)) {
    return NextResponse.json({ error: "Invalid organization mode." }, { status: 400 });
  }

  // Retrieve current settings for auditing
  const { data: oldOrg } = await supabase
    .from("organizations")
    .select("enable_pay_deductions, deduction_label, deduction_amount, deduction_type, enable_break_tracking, enable_custom_branding, custom_logo_url, brand_primary_color, brand_accent_color, custom_brand_name, plan_allows_custom_branding")
    .eq("id", profile.organization_id)
    .single();

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

  // Custom Invoice Schedules Toggles
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

  // Optional Breaks Toggles
  if (enable_break_tracking !== undefined) updateData.enable_break_tracking = !!enable_break_tracking;
  if (require_lunch_check_in_out !== undefined) updateData.require_lunch_check_in_out = !!require_lunch_check_in_out;
  if (require_break_check_in_out !== undefined) updateData.require_break_check_in_out = !!require_break_check_in_out;
  if (lunch_paid_or_unpaid !== undefined) updateData.lunch_paid_or_unpaid = lunch_paid_or_unpaid;
  if (break_paid_or_unpaid !== undefined) updateData.break_paid_or_unpaid = break_paid_or_unpaid;
  if (default_lunch_minutes !== undefined) updateData.default_lunch_minutes = Number(default_lunch_minutes);
  if (default_break_minutes !== undefined) updateData.default_break_minutes = Number(default_break_minutes);

  // Optional Pay Deductions Toggles
  if (enable_pay_deductions !== undefined) updateData.enable_pay_deductions = !!enable_pay_deductions;
  if (deduction_label !== undefined) updateData.deduction_label = deduction_label || null;
  if (deduction_type !== undefined) updateData.deduction_type = deduction_type || null;
  if (deduction_amount !== undefined) updateData.deduction_amount = deduction_amount !== null ? Number(deduction_amount) : null;
  if (deduction_applies_to !== undefined) updateData.deduction_applies_to = deduction_applies_to || null;
  if (deduction_active !== undefined) updateData.deduction_active = !!deduction_active;
  if (deduction_requires_acceptance !== undefined) updateData.deduction_requires_acceptance = !!deduction_requires_acceptance;

  // Insert structured Financial Audit Logs for deductions modifications
  if (enable_pay_deductions !== undefined && !!enable_pay_deductions !== !!oldOrg?.enable_pay_deductions) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: "toggle_deductions",
      note: `Pay deductions enabled status changed to: ${enable_pay_deductions}.`,
    });

    // Save acknowledgment inside DB if enabling for the first time
    if (enable_pay_deductions) {
      await supabase.from("deduction_acknowledgments").upsert(
        {
          organization_id: profile.organization_id,
          accepted_by: user.id,
          warning_version: "1.0",
        },
        { onConflict: "organization_id,accepted_by" }
      );
    }
  }

  if (enable_pay_deductions && (
    (deduction_label !== undefined && deduction_label !== oldOrg?.deduction_label) ||
    (deduction_amount !== undefined && Number(deduction_amount) !== Number(oldOrg?.deduction_amount)) ||
    (deduction_type !== undefined && deduction_type !== oldOrg?.deduction_type)
  )) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: "change_deduction_settings",
      note: `Deduction settings updated. Label: ${deduction_label}, Type: ${deduction_type}, Amount: ${deduction_amount}.`,
    });
  }

  // Custom Branding Updates
  if (enable_custom_branding !== undefined) {
    updateData.enable_custom_branding = !!enable_custom_branding;
    if (enable_custom_branding) {
      updateData.custom_branding_enabled_by = user.id;
      updateData.custom_branding_enabled_at = new Date().toISOString();
    } else {
      updateData.custom_branding_enabled_by = null;
      updateData.custom_branding_enabled_at = null;
    }
  }
  if (custom_logo_url !== undefined) updateData.custom_logo_url = custom_logo_url || null;
  if (custom_icon_url !== undefined) updateData.custom_icon_url = custom_icon_url || null;
  if (brand_primary_color !== undefined) updateData.brand_primary_color = brand_primary_color || null;
  if (brand_accent_color !== undefined) updateData.brand_accent_color = brand_accent_color || null;
  if (custom_brand_name !== undefined) updateData.custom_brand_name = custom_brand_name || null;
  if (plan_allows_custom_branding !== undefined) updateData.plan_allows_custom_branding = !!plan_allows_custom_branding;

  // Custom Branding Audit Logs
  if (enable_custom_branding !== undefined && !!enable_custom_branding !== !!oldOrg?.enable_custom_branding) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: enable_custom_branding ? "enable_custom_branding" : "disable_custom_branding",
      note: `Custom branding was ${enable_custom_branding ? "enabled" : "disabled"}.`,
    });
  }

  if (custom_logo_url !== undefined && custom_logo_url !== oldOrg?.custom_logo_url) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: custom_logo_url ? "upload_logo" : "remove_logo",
      note: custom_logo_url ? `Uploaded new company logo: ${custom_logo_url}` : "Removed company logo.",
    });
  }

  if (
    (brand_primary_color !== undefined && brand_primary_color !== oldOrg?.brand_primary_color) ||
    (brand_accent_color !== undefined && brand_accent_color !== oldOrg?.brand_accent_color)
  ) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: "change_brand_colors",
      note: `Updated brand colors. Primary: ${brand_primary_color || "None"}, Accent: ${brand_accent_color || "None"}.`,
    });
  }

  if (custom_brand_name !== undefined && custom_brand_name !== oldOrg?.custom_brand_name) {
    await supabase.from("financial_audit_logs").insert({
      organization_id: profile.organization_id,
      actor_user_id: user.id,
      action_type: "change_custom_branding_settings",
      note: `Custom brand name changed to: ${custom_brand_name || "None"}.`,
    });
  }

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
