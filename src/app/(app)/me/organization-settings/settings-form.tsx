"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
