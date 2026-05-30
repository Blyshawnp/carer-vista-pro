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

  // Compute shift pay and client charges
  let computedSubtotal = 0;
  let computedHours = 0;
  
  const shiftBreakdown = (shiftsRaw || []).map((s) => {
    const checkIn = Array.isArray(s.check_ins) ? s.check_ins[0] : s.check_ins;
    let minutes = 0;
    if (checkIn && checkIn.total_minutes !== null) {
      minutes = Number(checkIn.total_minutes);
    } else if (checkIn?.check_in_time && checkIn?.check_out_time) {
      minutes = (new Date(checkIn.check_out_time).getTime() - new Date(checkIn.check_in_time).getTime()) / 60000;
    } else {
      minutes = (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / 60000;
    }
    const hours = roundUpToQuarter(minutes / 60);

    // Compute caregiver rate
    const cgRate = caregiverRates?.find(
      (r) => r.caregiver_id === s.caregiver_id && new Date(r.effective_from) <= new Date(s.scheduled_start)
    )?.base_hourly_rate || 20.00;
    const cgPay = roundUpToQuarter(hours * Number(cgRate));

    // Compute client charge rate
    const billingRate = Number(s.billing_rate_override || client.hourly_billing_rate || 40.00);
    const clientCharge = roundUpToQuarter(hours * billingRate);

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
    // Bootstrap the invoice row
    const { data: newInv, error: bootstrapErr } = await supabase
      .from("client_invoices")
      .insert({
        organization_id: profile.organization_id,
        client_id: clientId,
        pay_period_id: periodId,
        subtotal: invoiceSubtotal,
        total_amount: invoiceSubtotal,
        balance_due: invoiceSubtotal,
        status: invoiceSubtotal === 0 ? "paid" : "unpaid",
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
      />
    </main>
  );
}
