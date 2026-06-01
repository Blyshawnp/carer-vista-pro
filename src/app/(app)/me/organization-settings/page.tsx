import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrganizationSettingsForm from "./settings-form";

export default async function OrganizationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.organization_id) {
    redirect("/me");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
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
      plan_allows_custom_branding
    `)
    .eq("id", profile.organization_id)
    .single();

  if (!org) {
    redirect("/me");
  }

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/me"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to account
        </Link>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">
          Organization Settings
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Customize your usage mode, coordinator permissions, billing transparency, and family privileges.
        </p>
      </header>

      <OrganizationSettingsForm initialOrg={org} />
    </main>
  );
}
