import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatPay, roundUpToQuarter } from "@/lib/pay";
import { formatShortDateInTz, formatTimeInTz } from "@/lib/datetime";
import InvoiceDetailsForm from "./details-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientInvoicePage({
  params,
}: {
  params: Promise<{ periodId: string; clientId: string }>;
}) {
  const { periodId, clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.organization_id) {
    redirect("/me");
  }

  // Fetch client details
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, address, hourly_billing_rate")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  // Fetch pay period details
  const { data: period } = await supabase
    .from("pay_periods")
    .select("id, period_start, period_end, released_at, is_locked")
    .eq("id", periodId)
    .single();

  if (!period) notFound();

  // Fetch all shifts for this client during this period
  // Filter by check-in time or scheduled start falling within pay period boundaries
  const { data: shiftsRaw } = await supabase
    .from("shifts")
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      caregiver_id,
      billing_rate_override,
      profiles:caregiver_id ( full_name ),
      check_ins ( check_in_time, check_out_time, total_minutes )
    `)
    .eq("client_id", clientId)
    .eq("organization_id", profile.organization_id)
    .gte("scheduled_start", period.period_start)
    .lte("scheduled_start", period.period_end)
    .order("scheduled_start");

  // Fetch active caregiver rates to compute shift costs
  const { data: caregiverRates } = await supabase
    .from("caregiver_rates")
    .select("caregiver_id, base_hourly_rate, effective_from")
    .order("effective_from", { ascending: false });

  // Fetch org settings for breaks & pay deductions
  const { data: org } = await supabase
    .from("organizations")
    .select("enable_break_tracking, enable_pay_deductions, deduction_label, deduction_type, deduction_amount, deduction_applies_to, deduction_active")
    .eq("id", profile.organization_id)
    .single();

  const enableBreakTracking = org?.enable_break_tracking !== false;
  const enablePayDeductions = !!org?.enable_pay_deductions;
  const deductionActive = !!org?.deduction_active;
  const deductionLabel = org?.deduction_label;
  const deductionType = org?.deduction_type;
  const deductionAmount = org?.deduction_amount;
  const deductionAppliesTo = org?.deduction_applies_to;

  // Fetch breaks for all shifts
  const shiftIds = (shiftsRaw || []).map((s) => s.id);
  let allBreaks: any[] = [];
  if (shiftIds.length > 0) {
    const { data: bData } = await supabase
      .from("shift_breaks")
      .select("*")
      .in("shift_id", shiftIds);
    allBreaks = bData || [];
  }

  // Fetch active holidays
  const { data: holidays } = await supabase
    .from("holidays")
    .select("*")
    .eq("is_active", true)
    .or(`organization_id.eq.${profile.organization_id},organization_id.is.null`);

  // Compute shift pay and client charges
  let computedSubtotal = 0;
  let computedHours = 0;
  
  const shiftBreakdown = (shiftsRaw || []).map((s) => {
    const checkIn = Array.isArray(s.check_ins) ? s.check_ins[0] : s.check_ins;
    let rawMinutes = 0;
    if (checkIn && checkIn.total_minutes !== null) {
      rawMinutes = Number(checkIn.total_minutes);
    } else if (checkIn?.check_in_time && checkIn?.check_out_time) {
      rawMinutes = (new Date(checkIn.check_out_time).getTime() - new Date(checkIn.check_in_time).getTime()) / 60000;
    } else {
      rawMinutes = (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / 60000;
    }

    // Deduct unpaid breaks if enabled
    const shiftBreaks = allBreaks.filter((b) => b.shift_id === s.id);
    const unpaidBreakMinutes = shiftBreaks
      .filter((b) => !b.is_paid)
      .reduce((sum, b) => {
        if (b.duration_minutes != null) return sum + b.duration_minutes;
        if (b.start_time && b.end_time) {
          const diffMs = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
          return sum + Math.max(0, Math.round(diffMs / 60000));
        }
        return sum;
      }, 0);

    const minutes = Math.max(0, rawMinutes - (enableBreakTracking ? unpaidBreakMinutes : 0));
    const hours = roundUpToQuarter(minutes / 60);

    // Compute holiday multiplier & bonus for caregiver
    const shiftDateStr = s.scheduled_start.split("T")[0];
    const sDate = new Date(s.scheduled_start);
    const shiftMonthDay = `${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;

    const matchingHoliday = holidays?.find((h) => {
      if (h.applies_every_year) {
        const holidayMD = h.holiday_date.split("-").slice(1).join("-");
        return holidayMD === shiftMonthDay;
      }
      return h.holiday_date === shiftDateStr;
    });

    const cgRate = caregiverRates?.find(
      (r) => r.caregiver_id === s.caregiver_id && new Date(r.effective_from) <= new Date(s.scheduled_start)
    )?.base_hourly_rate || 20.00;

    let payMultiplier = 1.0;
    let flatCgBonus = 0;
    if (matchingHoliday) {
      payMultiplier = matchingHoliday.pay_multiplier ? Number(matchingHoliday.pay_multiplier) : 1.0;
      flatCgBonus = matchingHoliday.flat_caregiver_bonus ? Number(matchingHoliday.flat_caregiver_bonus) : 0;
      
      if (flatCgBonus > 0 && (matchingHoliday.bonus_applied_mode === "instead_of" || matchingHoliday.bonus_applied_mode === "bonus_only")) {
        payMultiplier = 1.0;
      }
    }

    const cgPay = roundUpToQuarter(hours * Number(cgRate) * payMultiplier) + flatCgBonus;

    // Compute client charge rate & surcharges
    let clientChargeMultiplier = 1.0;
    let clientHourlySurcharge = 0;
    let flatClientSurcharge = 0;

    if (matchingHoliday) {
      clientChargeMultiplier = matchingHoliday.client_charge_multiplier ? Number(matchingHoliday.client_charge_multiplier) : 1.0;
      clientHourlySurcharge = matchingHoliday.client_hourly_surcharge ? Number(matchingHoliday.client_hourly_surcharge) : 0;
      flatClientSurcharge = matchingHoliday.flat_client_surcharge ? Number(matchingHoliday.flat_client_surcharge) : 0;
    }

    const billingRate = Number(s.billing_rate_override || client.hourly_billing_rate || 40.00);
    const clientCharge = roundUpToQuarter(hours * (billingRate * clientChargeMultiplier + clientHourlySurcharge)) + flatClientSurcharge;

    computedHours += hours;
    computedSubtotal += clientCharge;

    return {
      id: s.id,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end,
      caregiver_name: (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles)?.full_name || "Unassigned Caregiver",
      hours,
      cgRate,
      cgPay,
      billingRate,
      clientCharge,
    };
  });

  // Fetch approved bonuses for this client & period to append to the subtotal
  const { data: bonuses } = await supabase
    .from("client_caregiver_bonuses")
    .select("id, amount, bonus_type, caregiver_id, profiles:caregiver_id ( full_name )")
    .eq("client_id", clientId)
    .eq("pay_period_id", periodId)
    .eq("status", "approved");

  const totalBonuses = (bonuses || []).reduce((sum, b) => sum + Number(b.amount), 0);
  const invoiceSubtotal = computedSubtotal + totalBonuses;

  // Calculate optional pay deductions applied to the client invoice total
  let invoiceDeduction = 0;
  if (enablePayDeductions && deductionActive && deductionAppliesTo === "invoice_record" && deductionAmount != null) {
    if (deductionType === "flat_amount") {
      invoiceDeduction = Number(deductionAmount);
    } else if (deductionType === "percentage") {
      invoiceDeduction = invoiceSubtotal * (Number(deductionAmount) / 100);
    }
  }

  const invoiceTotalWithDeductions = Math.max(0, invoiceSubtotal - invoiceDeduction);

  // Retrieve or bootstrap the client_invoices row
  let invoice: any = null;
  const { data: invData } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("client_id", clientId)
    .eq("pay_period_id", periodId)
    .maybeSingle();

  if (invData) {
    invoice = invData;
  } else {
    // Bootstrap the invoice row with deductions subtracted if applicable
    const { data: newInv, error: bootstrapErr } = await supabase
      .from("client_invoices")
      .insert({
        organization_id: profile.organization_id,
        client_id: clientId,
        pay_period_id: periodId,
        subtotal: invoiceSubtotal,
        total_amount: invoiceTotalWithDeductions,
        balance_due: invoiceTotalWithDeductions,
        status: invoiceTotalWithDeductions === 0 ? "paid" : "unpaid",
      })
      .select()
      .single();

    if (newInv) {
      invoice = newInv;
    }
  }

  // Fetch invoice payments
  const { data: payments } = await supabase
    .from("invoice_payments")
    .select(`
      id, amount, payment_date, payment_method, note,
      recorded_by_profile:recorded_by ( full_name )
    `)
    .eq("invoice_id", invoice?.id)
    .order("created_at", { ascending: false });

  // Fetch invoice audit logs
  const { data: auditLogs } = await supabase
    .from("invoice_audit_logs")
    .select(`
      id, action, note, created_at,
      recorded_by_profile:user_id ( full_name )
    `)
    .eq("invoice_id", invoice?.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-5 py-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <Link
          href={`/payroll/${periodId}`}
          className="text-sm text-forest-600 hover:underline mb-2 inline-block font-semibold"
        >
          ← Back to payroll period
        </Link>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">
          Manage Invoice: {client.full_name}
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Review caregiver shift payouts, client billing charges, log manual payments, and release invoices.
        </p>
      </header>

      <InvoiceDetailsForm
        invoice={invoice}
        shifts={shiftBreakdown}
        bonuses={bonuses || []}
        payments={payments || []}
        auditLogs={auditLogs || []}
        client={client}
        period={period}
        subtotal={computedSubtotal}
        totalBonuses={totalBonuses}
        totalHours={computedHours}
        enablePayDeductions={enablePayDeductions}
        deductionLabel={deductionLabel}
        deductionType={deductionType}
        deductionAmount={deductionAmount != null ? Number(deductionAmount) : null}
        deductionAppliesTo={deductionAppliesTo}
      />
    </main>
  );
}
