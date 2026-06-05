"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OrganizationSettingsForm({
  initialOrg,
}: {
  initialOrg: any;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialOrg.organization_mode || "personal_family");
  const [allowClientAdmin, setAllowClientAdmin] = useState(!!initialOrg.allow_client_admin_for_personal_use);
  const [clientCanRequestShifts, setClientCanRequestShifts] = useState(!!initialOrg.client_can_request_shifts);
  const [clientCanRequestPreferredCaregivers, setClientCanRequestPreferredCaregivers] = useState(!!initialOrg.client_can_request_preferred_caregivers);
  const [clientCanViewInvoices, setClientCanViewInvoices] = useState(!!initialOrg.client_can_view_invoices);
  const [familyCanViewInvoices, setFamilyCanViewInvoices] = useState(!!initialOrg.family_can_view_invoices);
  const [clientCanManageFamilyAccess, setClientCanManageFamilyAccess] = useState(!!initialOrg.client_can_manage_family_access);
  const [clientCanSubmitFeedback, setClientCanSubmitFeedback] = useState(!!initialOrg.client_can_submit_feedback);
  const [familyCanSubmitFeedback, setFamilyCanSubmitFeedback] = useState(!!initialOrg.family_can_submit_feedback);

  // Custom Invoice Schedule Toggles
  const [invoiceFrequency, setInvoiceFrequency] = useState(initialOrg.invoice_frequency || "weekly");
  const [invoicePeriodStartDate, setInvoicePeriodStartDate] = useState(initialOrg.invoice_period_start_date || "");
  const [invoicePeriodEndRule, setInvoicePeriodEndRule] = useState(initialOrg.invoice_period_end_rule || "");
  const [invoiceReleaseDay, setInvoiceReleaseDay] = useState(initialOrg.invoice_release_day || "Friday");
  const [invoiceReleaseTime, setInvoiceReleaseTime] = useState(initialOrg.invoice_release_time || "09:00");
  const [invoiceTimezone, setInvoiceTimezone] = useState(initialOrg.invoice_timezone || "America/New_York");

  // Caregiver Appreciation Bonuses Toggles
  const [allowClientBonuses, setAllowClientBonuses] = useState(!!initialOrg.allow_client_caregiver_bonuses);
  const [bonusRequiresApproval, setBonusRequiresApproval] = useState(!!initialOrg.bonus_requires_admin_approval);
  const [bonusVisibleBeforeApproval, setBonusVisibleBeforeApproval] = useState(!!initialOrg.bonus_visible_to_caregiver_before_approval);
  const [bonusAddedToInvoice, setBonusAddedToInvoice] = useState(!!initialOrg.bonus_added_to_client_invoice);
  const [bonusIncludedInEoy, setBonusIncludedInEoy] = useState(!!initialOrg.bonus_included_in_year_end_summary);

  // Optional Break / Lunch Tracking
  const [enableBreakTracking, setEnableBreakTracking] = useState(!!initialOrg.enable_break_tracking);
  const [requireLunchCheckInOut, setRequireLunchCheckInOut] = useState(!!initialOrg.require_lunch_check_in_out);
  const [requireBreakCheckInOut, setRequireBreakCheckInOut] = useState(!!initialOrg.require_break_check_in_out);
  const [lunchPaidOrUnpaid, setLunchPaidOrUnpaid] = useState(initialOrg.lunch_paid_or_unpaid || "unpaid");
  const [breakPaidOrUnpaid, setBreakPaidOrUnpaid] = useState(initialOrg.break_paid_or_unpaid || "paid");
  const [defaultLunchMinutes, setDefaultLunchMinutes] = useState(Number(initialOrg.default_lunch_minutes ?? 30));
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(Number(initialOrg.default_break_minutes ?? 15));

  // Optional Pay Deductions / Tax Estimates
  const [enablePayDeductions, setEnablePayDeductions] = useState(!!initialOrg.enable_pay_deductions);
  const [deductionLabel, setDeductionLabel] = useState(initialOrg.deduction_label || "");
  const [deductionType, setDeductionType] = useState(initialOrg.deduction_type || "flat_amount");
  const [deductionAmount, setDeductionAmount] = useState(initialOrg.deduction_amount?.toString() || "");
  const [deductionAppliesTo, setDeductionAppliesTo] = useState(initialOrg.deduction_applies_to || "caregiver_pay_summary");
  const [deductionActive, setDeductionActive] = useState(!!initialOrg.deduction_active);
  const [deductionRequiresAcceptance, setDeductionRequiresAcceptance] = useState(!!initialOrg.deduction_requires_acceptance);

  // Modal / Acknowledgment warning popup state
  const [showDeductionAckPopup, setShowDeductionAckPopup] = useState(false);
  const [hasAcknowledgedDeductions, setHasAcknowledgedDeductions] = useState(!!initialOrg.enable_pay_deductions);

  // Custom Branding Support
  const [enableCustomBranding, setEnableCustomBranding] = useState(!!initialOrg.enable_custom_branding);
  const [customLogoUrl, setCustomLogoUrl] = useState(initialOrg.custom_logo_url || "");
  const [customIconUrl, setCustomIconUrl] = useState(initialOrg.custom_icon_url || "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(initialOrg.brand_primary_color || "#0D6587");
  const [brandAccentColor, setBrandAccentColor] = useState(initialOrg.brand_accent_color || "#D27D2D");
  const [customBrandName, setCustomBrandName] = useState(initialOrg.custom_brand_name || "");
  const [planAllowsCustomBranding, setPlanAllowsCustomBranding] = useState(initialOrg.plan_allows_custom_branding !== false);

  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleDeductions = (checked: boolean) => {
    if (checked) {
      if (!hasAcknowledgedDeductions) {
        setShowDeductionAckPopup(true);
      } else {
        setEnablePayDeductions(true);
      }
    } else {
      setEnablePayDeductions(false);
    }
  };

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `organization-branding/${initialOrg.id}/logo-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "image/png",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("app-assets").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("Logo uploaded, but no public URL was returned.");
      setCustomLogoUrl(data.publicUrl);
    } catch (err: any) {
      setError(err.message || "Could not upload logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError(null);

    try {
      const response = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_mode: mode,
          allow_client_admin_for_personal_use: allowClientAdmin,
          client_can_request_shifts: clientCanRequestShifts,
          client_can_request_preferred_caregivers: clientCanRequestPreferredCaregivers,
          client_can_view_invoices: clientCanViewInvoices,
          family_can_view_invoices: familyCanViewInvoices,
          client_can_manage_family_access: clientCanManageFamilyAccess,
          client_can_submit_feedback: clientCanSubmitFeedback,
          family_can_submit_feedback: familyCanSubmitFeedback,
          invoice_frequency: invoiceFrequency,
          invoice_period_start_date: invoicePeriodStartDate,
          invoice_period_end_rule: invoicePeriodEndRule,
          invoice_release_day: invoiceReleaseDay,
          invoice_release_time: invoiceReleaseTime,
          invoice_timezone: invoiceTimezone,
          allow_client_caregiver_bonuses: allowClientBonuses,
          bonus_requires_admin_approval: bonusRequiresApproval,
          bonus_visible_to_caregiver_before_approval: bonusVisibleBeforeApproval,
          bonus_added_to_client_invoice: bonusAddedToInvoice,
          bonus_included_in_year_end_summary: bonusIncludedInEoy,
          enable_break_tracking: enableBreakTracking,
          require_lunch_check_in_out: requireLunchCheckInOut,
          require_break_check_in_out: requireBreakCheckInOut,
          lunch_paid_or_unpaid: lunchPaidOrUnpaid,
          break_paid_or_unpaid: breakPaidOrUnpaid,
          default_lunch_minutes: defaultLunchMinutes,
          default_break_minutes: defaultBreakMinutes,
          enable_pay_deductions: enablePayDeductions,
          deduction_label: deductionLabel,
          deduction_type: deductionType,
          deduction_amount: deductionAmount ? Number(deductionAmount) : null,
          deduction_applies_to: deductionAppliesTo,
          deduction_active: deductionActive,
          deduction_requires_acceptance: deductionRequiresAcceptance,
          enable_custom_branding: enableCustomBranding,
          custom_logo_url: customLogoUrl,
          custom_icon_url: customIconUrl,
          brand_primary_color: brandPrimaryColor,
          brand_accent_color: brandAccentColor,
          custom_brand_name: customBrandName,
          plan_allows_custom_branding: planAllowsCustomBranding,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings.");
      }

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm px-4 py-3.5 rounded-2xl">
          ✓ Organization settings saved successfully.
        </div>
      )}

      {error && (
        <div className="bg-terracotta-50 border border-terracotta-100 text-terracotta-800 text-sm px-4 py-3.5 rounded-2xl">
          {error}
        </div>
      )}

      {/* Organization Usage Mode */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay">
        <h2 className="font-display text-lg text-ink-900 mb-1">Usage Mode</h2>
        <p className="text-xs text-ink-400 mb-4">
          Changing the mode adjusts global user permissions and client visibility rules.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {/* Personal/Family */}
          <label
            className={`border rounded-2xl p-4 flex flex-col cursor-pointer transition relative ${
              mode === "personal_family"
                ? "border-forest-500 bg-forest-50/20 ring-1 ring-forest-500"
                : "border-cream-200 hover:border-cream-300 bg-cream-50/10"
            }`}
          >
            <input
              type="radio"
              name="org_mode"
              value="personal_family"
              checked={mode === "personal_family"}
              onChange={() => setMode("personal_family")}
              className="absolute top-4 right-4 text-forest-600 focus:ring-forest-500"
            />
            <span className="font-semibold text-sm text-ink-950 pr-6">
              Personal / Family Care
            </span>
            <span className="text-xs text-ink-500 mt-1 leading-relaxed">
              For a family, client, or household coordinating care for one or more loved ones. Client or designated family members can act as administrators if configured.
            </span>
          </label>

          {/* Agency/Company */}
          <label
            className={`border rounded-2xl p-4 flex flex-col cursor-pointer transition relative ${
              mode === "agency_company"
                ? "border-forest-500 bg-forest-50/20 ring-1 ring-forest-500"
                : "border-cream-200 hover:border-cream-300 bg-cream-50/10"
            }`}
          >
            <input
              type="radio"
              name="org_mode"
              value="agency_company"
              checked={mode === "agency_company"}
              onChange={() => setMode("agency_company")}
              className="absolute top-4 right-4 text-forest-600 focus:ring-forest-500"
            />
            <span className="font-semibold text-sm text-ink-950 pr-6">
              Agency / Company
            </span>
            <span className="text-xs text-ink-500 mt-1 leading-relaxed">
              For professional care agencies or business operations. Clients have structured, request-only access to schedules, communication, and invoices, but cannot edit settings or view all client records.
            </span>
          </label>

          {/* Solo Caregiver */}
          <label
            className={`border rounded-2xl p-4 flex flex-col cursor-pointer transition relative ${
              mode === "solo_caregiver"
                ? "border-forest-500 bg-forest-50/20 ring-1 ring-forest-500"
                : "border-cream-200 hover:border-cream-300 bg-cream-50/10"
            }`}
          >
            <input
              type="radio"
              name="org_mode"
              value="solo_caregiver"
              checked={mode === "solo_caregiver"}
              onChange={() => setMode("solo_caregiver")}
              className="absolute top-4 right-4 text-forest-600 focus:ring-forest-500"
            />
            <span className="font-semibold text-sm text-ink-950 pr-6">
              Solo Caregiver
            </span>
            <span className="text-xs text-ink-500 mt-1 leading-relaxed">
              For independent care providers who act as the administrator for their own personal care practices, managing invoicing and records independently.
            </span>
          </label>

          {/* Client Directed Care */}
          <label
            className={`border rounded-2xl p-4 flex flex-col cursor-pointer transition relative ${
              mode === "client_directed_care"
                ? "border-forest-500 bg-forest-50/20 ring-1 ring-forest-500"
                : "border-cream-200 hover:border-cream-300 bg-cream-50/10"
            }`}
          >
            <input
              type="radio"
              name="org_mode"
              value="client_directed_care"
              checked={mode === "client_directed_care"}
              onChange={() => setMode("client_directed_care")}
              className="absolute top-4 right-4 text-forest-600 focus:ring-forest-500"
            />
            <span className="font-semibold text-sm text-ink-950 pr-6">
              Client-Directed Care
            </span>
            <span className="text-xs text-ink-500 mt-1 leading-relaxed">
              For client-directed or self-directed care models where the client or representative acts as the coordinator with expanded scheduling and management permissions.
            </span>
          </label>
        </div>
      </section>

      {/* Permissions Toggles */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-lg text-ink-900 mb-1">User Permissions</h2>
        <p className="text-xs text-ink-400 mb-4">
          Toggle granular feature permissions for client and family accounts.
        </p>

        <div className="space-y-3.5 divide-y divide-cream-100 text-xs">
          {mode === "personal_family" && (
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-ink-900">Allow Client Admin Status</p>
                <p className="text-ink-400 mt-0.5">Let client/family members act as fully privileged admins.</p>
              </div>
              <input
                type="checkbox"
                checked={allowClientAdmin}
                onChange={(e) => setAllowClientAdmin(e.target.checked)}
                className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
              />
            </div>
          )}

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Allow Schedule / Care Requests</p>
              <p className="text-ink-400 mt-0.5">Allow clients/family to submit shift coverage and schedule requests.</p>
            </div>
            <input
              type="checkbox"
              checked={clientCanRequestShifts}
              onChange={(e) => setClientCanRequestShifts(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Allow Preferred Caregiver Choice</p>
              <p className="text-ink-400 mt-0.5">Allow specifying caregiver preferences on shift requests.</p>
            </div>
            <input
              type="checkbox"
              checked={clientCanRequestPreferredCaregivers}
              onChange={(e) => setClientCanRequestPreferredCaregivers(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Allow Client Invoice View</p>
              <p className="text-ink-400 mt-0.5">Allow care recipients to view shift invoices and payment history.</p>
            </div>
            <input
              type="checkbox"
              checked={clientCanViewInvoices}
              onChange={(e) => setClientCanViewInvoices(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Allow Family Invoice View</p>
              <p className="text-ink-400 mt-0.5">Allow connected family accounts to view invoices and balances.</p>
            </div>
            <input
              type="checkbox"
              checked={familyCanViewInvoices}
              onChange={(e) => setFamilyCanViewInvoices(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Client Managed Family Access</p>
              <p className="text-ink-400 mt-0.5">Allow clients to add/invite or remove family access to their circle.</p>
            </div>
            <input
              type="checkbox"
              checked={clientCanManageFamilyAccess}
              onChange={(e) => setClientCanManageFamilyAccess(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Client Feedback Submission</p>
              <p className="text-ink-400 mt-0.5">Allow clients to submit positive feedback or concerns about caregivers.</p>
            </div>
            <input
              type="checkbox"
              checked={clientCanSubmitFeedback}
              onChange={(e) => setClientCanSubmitFeedback(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-ink-900">Family Feedback Submission</p>
              <p className="text-ink-400 mt-0.5">Allow family members to submit appreciation notes or report issues.</p>
            </div>
            <input
              type="checkbox"
              checked={familyCanSubmitFeedback}
              onChange={(e) => setFamilyCanSubmitFeedback(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>
        </div>
      </section>

      {/* Custom Invoice Schedules */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-lg text-ink-900 mb-1">Billing &amp; Invoice Schedule</h2>
        <p className="text-xs text-ink-400 mb-4">
          Define how frequently pay periods and invoices are generated, released, and locked.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Invoice Frequency</label>
            <select
              value={invoiceFrequency}
              onChange={(e) => setInvoiceFrequency(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            >
              <option value="weekly">Weekly</option>
              <option value="every_other_week">Every Other Week</option>
              <option value="twice_monthly">Twice Monthly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Schedule</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Release Day / Date</label>
            <input
              type="text"
              value={invoiceReleaseDay}
              onChange={(e) => setInvoiceReleaseDay(e.target.value)}
              placeholder="E.g., Friday, 1st, 15th"
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Release Time</label>
            <input
              type="time"
              value={invoiceReleaseTime}
              onChange={(e) => setInvoiceReleaseTime(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Release Timezone</label>
            <select
              value={invoiceTimezone}
              onChange={(e) => setInvoiceTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            >
              <option value="America/New_York">Eastern Time (US &amp; Canada)</option>
              <option value="America/Chicago">Central Time (US &amp; Canada)</option>
              <option value="America/Denver">Mountain Time (US &amp; Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US &amp; Canada)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Invoice Start Date (Optional)</label>
            <input
              type="date"
              value={invoicePeriodStartDate}
              onChange={(e) => setInvoicePeriodStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">End Date / Recurrence Rules</label>
            <input
              type="text"
              value={invoicePeriodEndRule}
              onChange={(e) => setInvoicePeriodEndRule(e.target.value)}
              placeholder="E.g., Lock after 7 days, monthly on 30th"
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
            />
          </div>
        </div>
      </section>

      {/* Client-Funded Caregiver Appreciation Bonuses */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-lg text-ink-900 mb-1">Caregiver Appreciation Bonuses</h2>
        <p className="text-xs text-ink-400 mb-4">
          Allow clients and family members to fund caregiver bonuses, appreciation tips, or holiday adjustments.
        </p>

        <div className="space-y-3 divide-y divide-cream-100 text-xs">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-ink-900">Allow Client-Funded Bonuses</p>
              <p className="text-ink-400 mt-0.5">Let clients/family submit appreciation bonuses in the app.</p>
            </div>
            <input
              type="checkbox"
              checked={allowClientBonuses}
              onChange={(e) => setAllowClientBonuses(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Requires Administrative Approval</p>
              <p className="text-ink-400 mt-0.5">Agency/admins must review and approve bonuses before release.</p>
            </div>
            <input
              type="checkbox"
              checked={bonusRequiresApproval}
              onChange={(e) => setBonusRequiresApproval(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Visible to Caregiver Before Approval</p>
              <p className="text-ink-400 mt-0.5">Show pending bonuses in the caregiver's live pay estimate.</p>
            </div>
            <input
              type="checkbox"
              checked={bonusVisibleBeforeApproval}
              onChange={(e) => setBonusVisibleBeforeApproval(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Add Bonus to Client Invoice</p>
              <p className="text-ink-400 mt-0.5">Automatically list the approved bonus as an invoice subtotal item.</p>
            </div>
            <input
              type="checkbox"
              checked={bonusAddedToInvoice}
              onChange={(e) => setBonusAddedToInvoice(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Include in Year-End Summaries</p>
              <p className="text-ink-400 mt-0.5">Count client bonuses towards caregiver's annual pay summary records.</p>
            </div>
            <input
              type="checkbox"
              checked={bonusIncludedInEoy}
              onChange={(e) => setBonusIncludedInEoy(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>
        </div>
      </section>

      {/* Optional Break & Lunch Tracking Settings */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <h2 className="font-display text-lg text-ink-900 mb-1">Break &amp; Lunch Tracking</h2>
        <p className="text-xs text-ink-400 mb-4">
          Enable and configure optional caregiver break and lunch stopwatch tracking during shifts.
        </p>

        <div className="space-y-3.5 divide-y divide-cream-100 text-xs">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Enable Break &amp; Lunch Tracking</p>
              <p className="text-ink-400 mt-0.5">Let caregivers track lunch and rest breaks during their shifts.</p>
            </div>
            <input
              type="checkbox"
              checked={enableBreakTracking}
              onChange={(e) => setEnableBreakTracking(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          {enableBreakTracking && (
            <>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-ink-900">Require Lunch Check-In / Check-Out</p>
                  <p className="text-ink-400 mt-0.5">Force caregivers to clock in and out for lunch periods.</p>
                </div>
                <input
                  type="checkbox"
                  checked={requireLunchCheckInOut}
                  onChange={(e) => setRequireLunchCheckInOut(e.target.checked)}
                  className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-ink-900">Require Rest Break Check-In / Check-Out</p>
                  <p className="text-ink-400 mt-0.5">Force caregivers to clock in and out for standard rest breaks.</p>
                </div>
                <input
                  type="checkbox"
                  checked={requireBreakCheckInOut}
                  onChange={(e) => setRequireBreakCheckInOut(e.target.checked)}
                  className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Lunch Status</label>
                  <select
                    value={lunchPaidOrUnpaid}
                    onChange={(e) => setLunchPaidOrUnpaid(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  >
                    <option value="unpaid">Unpaid (Deducted from Shift Hours)</option>
                    <option value="paid">Paid (Counts towards Billable/Payable Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Default Lunch Duration (Minutes)</label>
                  <input
                    type="number"
                    value={defaultLunchMinutes}
                    onChange={(e) => setDefaultLunchMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Rest Break Status</label>
                  <select
                    value={breakPaidOrUnpaid}
                    onChange={(e) => setBreakPaidOrUnpaid(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  >
                    <option value="paid">Paid (Standard Practice)</option>
                    <option value="unpaid">Unpaid (Custom Rest Policy)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Default Break Duration (Minutes)</label>
                  <input
                    type="number"
                    value={defaultBreakMinutes}
                    onChange={(e) => setDefaultBreakMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Pay Deductions & Tax Estimates Settings */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display text-lg text-ink-900 mb-1">Pay Deductions &amp; Tax Estimates</h2>
            <p className="text-xs text-ink-400">
              Configure optional flat or percentage caregiver pay deductions for manual recordkeeping.
            </p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-forest-600/10 text-forest-700 px-2 py-0.5 rounded">
            Public App Only
          </span>
        </div>

        <div className="space-y-3.5 divide-y divide-cream-100 text-xs">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold text-ink-900">Enable Pay Deductions / Tax Estimates</p>
              <p className="text-ink-400 mt-0.5">Enable optional payroll estimates and deductions logging.</p>
            </div>
            <input
              type="checkbox"
              checked={enablePayDeductions}
              onChange={(e) => handleToggleDeductions(e.target.checked)}
              className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
            />
          </div>

          {enablePayDeductions && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Deduction Label</label>
                  <input
                    type="text"
                    value={deductionLabel}
                    onChange={(e) => setDeductionLabel(e.target.value)}
                    placeholder="E.g., Tax Withholding, Uniform Fee"
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Deduction Type</label>
                  <select
                    value={deductionType}
                    onChange={(e) => setDeductionType(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  >
                    <option value="flat_amount">Flat Amount ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Amount / Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    placeholder="E.g. 15.00 or 20"
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Applies To</label>
                  <select
                    value={deductionAppliesTo}
                    onChange={(e) => setDeductionAppliesTo(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                  >
                    <option value="caregiver_pay_summary">Caregiver Pay Summary (Earnings estimate only)</option>
                    <option value="invoice_record">Client Invoice Record (Billing statement only)</option>
                    <option value="custom">Both (Recordkeeping only)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-ink-900">Mark Deduction as Active</p>
                  <p className="text-ink-400 mt-0.5">Apply this deduction to pay period calculations immediately.</p>
                </div>
                <input
                  type="checkbox"
                  checked={deductionActive}
                  onChange={(e) => setDeductionActive(e.target.checked)}
                  className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-ink-900">Requires Caregiver/Client Acceptance</p>
                  <p className="text-ink-400 mt-0.5">Show deduction details for review or agreement on statements.</p>
                </div>
                <input
                  type="checkbox"
                  checked={deductionRequiresAcceptance}
                  onChange={(e) => setDeductionRequiresAcceptance(e.target.checked)}
                  className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Payroll and Tax Responsibility Notice Popup */}
      {showDeductionAckPopup && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-white rounded-3xl shadow-lg border border-cream-200 max-w-lg w-full p-6 space-y-4 grain-overlay overflow-y-auto max-h-[90vh]">
            <h3 className="font-display text-xl text-ink-900 leading-tight font-bold">
              Important payroll and tax responsibility notice
            </h3>
            
            <div className="text-xs text-ink-700 space-y-3 leading-relaxed">
              <p>
                Carer Vista Pro does not provide tax, payroll, legal, accounting, or employment classification advice.
              </p>
              <p>
                Any deductions, tax estimates, bonuses, holiday pay, surcharges, invoice charges, or caregiver pay calculations entered in this app are for recordkeeping and estimate purposes only unless your organization has separately verified them with a qualified professional.
              </p>
              <p className="font-bold text-ink-950">
                Your organization is responsible for:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 font-medium">
                <li>determining whether caregivers are employees or independent contractors</li>
                <li>complying with wage, hour, tax, payroll, overtime, and worker classification laws</li>
                <li>preparing and sending any required W-2, 1099, or other tax forms</li>
                <li>maintaining accurate business, payroll, and tax records</li>
                <li>confirming that any deduction from caregiver pay is lawful and authorized</li>
              </ul>
              <p className="text-ink-500 mt-2">
                Do not use this feature unless you understand and accept these responsibilities.
              </p>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeductionAckPopup(false);
                  setEnablePayDeductions(false);
                }}
                className="flex-1 bg-cream-100 hover:bg-cream-200 text-ink-800 font-semibold py-3 rounded-2xl transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasAcknowledgedDeductions(true);
                  setEnablePayDeductions(true);
                  setShowDeductionAckPopup(false);
                }}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 font-semibold py-3 rounded-2xl transition text-xs"
              >
                I understand and accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Branding & White-Label Settings */}
      <section className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft grain-overlay space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display text-lg text-ink-900 mb-1">Organization Branding</h2>
            <p className="text-xs text-ink-400">
              Upload organization branding if your plan includes it. Personal appearance settings remain free for every user under Account & Settings.
            </p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-forest-600/10 text-forest-700 px-2 py-0.5 rounded">
            Enterprise / Plan Feature
          </span>
        </div>

        {/* Plan gating / upgrade banner */}
        {!planAllowsCustomBranding ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <p className="font-bold">Custom Branding is locked on your current plan</p>
            </div>
            <p className="leading-relaxed">
              Custom organization branding is available on upgraded plans. Personal color theme, font size, high contrast, reduce motion, and larger buttons are free for all users.
            </p>
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-cream-100 text-xs">
            {/* Toggle support */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-ink-900">Enable Custom Branding &amp; White-Label</p>
                <p className="text-ink-400 mt-0.5">Activate company logo, customized branding names, and brand colors.</p>
              </div>
              <input
                type="checkbox"
                checked={enableCustomBranding}
                onChange={(e) => setEnableCustomBranding(e.target.checked)}
                className="text-forest-600 focus:ring-forest-500 h-4 w-4 rounded"
              />
            </div>

            {enableCustomBranding && (
              <div className="space-y-4 pt-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-ink-700 mb-1">Custom Brand Name</label>
                    <input
                      type="text"
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      placeholder="e.g. Acme Care Services"
                      className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-700 mb-1">Organization logo</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition"
                      />
                      {customLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomLogoUrl("")}
                          className="bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-700 px-3 py-2 rounded-xl border border-terracotta-200 transition font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="inline-flex items-center justify-center rounded-xl bg-forest-600 hover:bg-forest-700 text-cream-50 px-3 py-2 font-semibold cursor-pointer transition">
                        {logoUploading ? "Uploading..." : "Upload logo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(event) => {
                            void handleLogoUpload(event.currentTarget.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <p className="mt-1 text-[10px] text-ink-400">
                        Logo files are stored in the public app-assets bucket for non-sensitive branding assets.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-ink-700 mb-1">Brand Primary Color (HEX)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandPrimaryColor}
                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-cream-300 cursor-pointer overflow-hidden bg-transparent"
                      />
                      <input
                        type="text"
                        value={brandPrimaryColor}
                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-700 mb-1">Brand Accent Color (HEX)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandAccentColor}
                        onChange={(e) => setBrandAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-cream-300 cursor-pointer overflow-hidden bg-transparent"
                      />
                      <input
                        type="text"
                        value={brandAccentColor}
                        onChange={(e) => setBrandAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Area */}
                <div className="bg-cream-50/55 border border-cream-200 rounded-2xl p-4 mt-2">
                  <p className="font-semibold text-ink-900 mb-2">Live Custom Branding Preview</p>
                  <div className="border border-cream-200 bg-white rounded-xl p-3 flex items-center justify-between shadow-soft">
                    <div className="flex items-center gap-3">
                      {customLogoUrl ? (
                        <img
                          src={customLogoUrl}
                          alt="Custom logo preview"
                          className="h-7 w-auto object-contain max-w-[120px]"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/120x30?text=Invalid+Logo";
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1 text-sm font-bold text-forest-700">
                          <span className="w-5 h-5 bg-forest-600 rounded-lg flex items-center justify-center text-white text-[10px]">C</span>
                          <span>{customBrandName || "Carer Vista Pro"}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-cream-300"
                        style={{ backgroundColor: brandPrimaryColor }}
                        title="Primary Color"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-cream-300"
                        style={{ backgroundColor: brandAccentColor }}
                        title="Accent Color"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEnableCustomBranding(false);
                        setCustomLogoUrl("");
                        setCustomIconUrl("");
                        setBrandPrimaryColor("#0D6587");
                        setBrandAccentColor("#D27D2D");
                        setCustomBrandName("");
                      }}
                      className="text-[10px] bg-white hover:bg-cream-100 text-ink-700 px-3 py-1.5 rounded-xl border border-cream-200 transition font-medium"
                    >
                      Restore Carer Vista Pro Defaults
                    </button>
                  </div>
                </div>

                {/* Legal and compliance text */}
                <div className="bg-cream-50/20 border-l-2 border-forest-500/40 p-3 rounded-r-xl space-y-1.5 leading-relaxed text-ink-500 text-[10px]">
                  <p className="font-semibold text-ink-700">Custom Branding Legal Terms</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Organization custom branding does not transfer ownership of the app or underlying software platform.</li>
                    <li>Using organizations do not own or claim ownership of Carer Vista Pro or the underlying platform.</li>
                    <li>Organization is fully responsible for having appropriate copyright and usage rights to upload and display its logo.</li>
                    <li>Carer Vista Pro remains the sole platform and software provider.</li>
                    <li>Powered by Carer Vista Pro remains present in help, legal, footer, and platform identity areas.</li>
                    <li>Application store and PWA installer identity remains Carer Vista Pro unless separately and explicitly configured.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3.5 rounded-2xl font-semibold transition active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? "Saving Configuration..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
