import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roundUpToQuarter, formatCurrency, formatPay } from "@/lib/pay";
import { formatTimeInTz, formatShortDateInTz } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BreakdownItem = {
  shift_id: string;
  scheduled_start: string;
  scheduled_end: string;
  check_in_time: string | null;
  check_out_time: string | null;
  client_name: string | null;
  hours: number | string;
  rate: number | string;
  amount: number | string;
  bonus_amount: number | string | null;
  bonus_reason: string | null;
  is_overridden: boolean;
  override_reason: string | null;
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single<{ id: string; role: "admin" | "client" | "caregiver" | "family"; organization_id: string }>();

  if (!profile) redirect("/login");

  const isCaregiver = profile.role === "caregiver";
  const isClient = profile.role === "client";
  const isFamily = profile.role === "family";

  // Check organization settings for billing visibility
  const { data: org } = await supabase
    .from("organizations")
    .select("client_can_view_invoices, family_can_view_invoices")
    .eq("id", profile.organization_id)
    .single();

  if (isClient && !org?.client_can_view_invoices) redirect("/me");
  if (isFamily && !org?.family_can_view_invoices) redirect("/me");

  let caregiverSnap: any = null;
  let clientInvoice: any = null;
  let clientShifts: any[] = [];
  let clientPayments: any[] = [];
  let clientBonuses: any[] = [];
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let releasedAt: string | null = null;

  if (isCaregiver) {
    // Caregiver statement snapshot
    const { data: snapRaw } = await supabase
      .from("pay_period_snapshots")
      .select(`
        id,
        total_hours,
        total_amount,
        shift_count,
        breakdown,
        caregiver_id,
        pay_periods ( period_start, period_end, released_at )
      `)
      .eq("pay_period_id", periodId)
      .eq("caregiver_id", profile.id)
      .maybeSingle();

    if (!snapRaw) notFound();

    caregiverSnap = snapRaw;
    const snapPayPeriod = Array.isArray(snapRaw.pay_periods) ? snapRaw.pay_periods[0] : snapRaw.pay_periods;
    periodStart = snapPayPeriod?.period_start ? new Date(snapPayPeriod.period_start) : null;
    periodEnd = snapPayPeriod?.period_end ? new Date(snapPayPeriod.period_end) : null;
    releasedAt = snapPayPeriod?.released_at || null;
  } else {
    // Client assignment lookup
    const { data: assignments } = await supabase
      .from("client_user_assignments")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const clientIds = (assignments || []).map((a) => a.client_id);

    // Client/family invoice
    const { data: invData } = await supabase
      .from("client_invoices")
      .select(`
        *,
        clients:client_id ( id, full_name, address, hourly_billing_rate ),
        pay_periods ( period_start, period_end, released_at )
      `)
      .eq("pay_period_id", periodId)
      .in("client_id", clientIds)
      .not("released_at", "is", null) // only released invoices
      .maybeSingle();

    if (!invData) notFound();

    clientInvoice = invData;
    const invPayPeriod = Array.isArray(invData.pay_periods) ? invData.pay_periods[0] : invData.pay_periods;
    periodStart = invPayPeriod?.period_start ? new Date(invPayPeriod.period_start) : null;
    periodEnd = invPayPeriod?.period_end ? new Date(invPayPeriod.period_end) : null;
    releasedAt = invData.released_at;

    // Fetch payments logged for this invoice
    const { data: payments } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", clientInvoice.id)
      .order("payment_date", { ascending: false });

    clientPayments = payments || [];

    // Fetch approved bonuses added to this invoice
    const { data: bonuses } = await supabase
      .from("client_caregiver_bonuses")
      .select("id, amount, bonus_type")
      .eq("client_id", clientInvoice.client_id)
      .eq("pay_period_id", periodId)
      .eq("status", "approved");

    clientBonuses = bonuses || [];

    // Fetch client shifts worked in this period to estimate detailed charges
    const { data: shifts } = await supabase
      .from("shifts")
      .select(`
        id,
        scheduled_start,
        scheduled_end,
        billing_rate_override,
        check_ins ( total_minutes, check_in_time, check_out_time )
      `)
      .eq("client_id", clientInvoice.client_id)
      .gte("scheduled_start", invPayPeriod?.period_start)
      .lte("scheduled_start", invPayPeriod?.period_end)
      .order("scheduled_start");

    clientShifts = (shifts || []).map((s) => {
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
      const billingRate = Number(s.billing_rate_override || clientInvoice.clients?.hourly_billing_rate || 40.00);
      const clientCharge = roundUpToQuarter(hours * billingRate);

      return {
        id: s.id,
        scheduled_start: s.scheduled_start,
        scheduled_end: s.scheduled_end,
        hours,
        rate: billingRate,
        amount: clientCharge,
      };
    });
  }

  const statusLabels: Record<string, string> = {
    unpaid: "Unpaid",
    partial: "Partially Paid",
    paid: "Paid In Full",
    voided: "Voided",
  };

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/me/invoices"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block font-semibold"
        >
          ← All invoices
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          {periodStart && periodEnd ? (
            <>
              {formatShortDateInTz(periodStart).split(", ").slice(1).join(", ")} –{" "}
              {formatShortDateInTz(periodEnd).split(", ").slice(1).join(", ")}
            </>
          ) : (
            "Invoice Detail"
          )}
        </h1>
        <p className="text-ink-500 text-sm">
          Released{" "}
          {releasedAt &&
            new Date(releasedAt).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
            })}
        </p>
        <Link
          href={`/print?type=invoice&id=${periodId}`}
          target="_blank"
          className="text-xs bg-cream-100 hover:bg-cream-200 text-ink-700 px-3.5 py-1.5 rounded-lg font-medium transition inline-block mt-2 no-print"
        >
          🖨️ Print Invoice
        </Link>
      </header>

      {/* 1. RENDER CAREGIVER PAYOUT */}
      {isCaregiver && caregiverSnap && (
        <div className="space-y-6">
          <section className="bg-forest-600 text-cream-50 rounded-3xl p-5 mb-4 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cream-50/10 blur-2xl"
            />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-cream-50/70 mb-1">
                Total pay
              </p>
              <p className="font-display text-4xl">
                {formatCurrency(caregiverSnap.total_amount)}
              </p>
              <p className="text-xs text-cream-50/80 mt-1">
                {Number(caregiverSnap.total_hours).toFixed(1)} hours · {caregiverSnap.shift_count}{" "}
                shift{caregiverSnap.shift_count === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
            <h2 className="font-display text-base text-ink-900 mb-3">Shift Earnings</h2>
            <ul className="divide-y divide-cream-200">
              {(caregiverSnap.breakdown || []).map((item: BreakdownItem, idx: number) => {
                const start = new Date(item.scheduled_start);
                const end = new Date(item.scheduled_end);
                const amount = Number(item.amount);
                const hours = Number(item.hours);
                const rate = Number(item.rate);
                return (
                  <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <p className="font-medium text-ink-900">
                        {formatShortDateInTz(start)}
                      </p>
                      <p className="font-display text-sm font-bold">
                        {formatPay(amount)}
                      </p>
                    </div>
                    <p className="text-xs text-ink-500">
                      {formatTimeInTz(start)} – {formatTimeInTz(end)}
                      {item.client_name && ` · ${item.client_name}`}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {hours.toFixed(1)} hrs × {formatCurrency(rate)}/hr
                      {Number(item.bonus_amount) > 0 && (
                        <>
                          {" "}
                          + {formatCurrency(Number(item.bonus_amount))} bonus
                          {item.bonus_reason && ` (${item.bonus_reason})`}
                        </>
                      )}
                    </p>
                    {item.is_overridden && item.override_reason && (
                      <p className="text-[11px] text-terracotta-600 mt-1 italic">
                        Adjusted: {item.override_reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {/* 2. RENDER CLIENT INVOICE */}
      {!isCaregiver && clientInvoice && (
        <div className="space-y-6">
          <section className="bg-forest-600 text-cream-50 rounded-3xl p-5 mb-4 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cream-50/10 blur-2xl"
            />
            <div className="relative">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cream-50/70 mb-1">
                    Balance Due
                  </p>
                  <p className="font-display text-4xl font-extrabold">
                    {formatCurrency(clientInvoice.balance_due)}
                  </p>
                  <p className="text-xs text-cream-50/80 mt-1">
                    Total Statement: {formatCurrency(clientInvoice.total_amount)} · Payments Applied: {formatCurrency(clientInvoice.payments_applied)}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-cream-50/20 px-2 py-0.5 rounded">
                  {statusLabels[clientInvoice.status] || clientInvoice.status}
                </span>
              </div>
            </div>
          </section>

          {/* Charged shift logs */}
          <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
            <h2 className="font-display text-base text-ink-900 mb-3">Shift Billing Breakdown</h2>
            <ul className="divide-y divide-cream-200">
              {clientShifts.map((s, idx) => (
                <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3 mb-0.5">
                    <p className="font-medium text-ink-900">
                      {formatShortDateInTz(new Date(s.scheduled_start))}
                    </p>
                    <p className="font-display font-bold text-sm">
                      {formatPay(s.amount)}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">
                    {formatTimeInTz(new Date(s.scheduled_start))} – {formatTimeInTz(new Date(s.scheduled_end))}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {s.hours.toFixed(1)} hrs × {formatCurrency(s.rate)}/hr (Billing Rate)
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Client Bonuses section */}
          {clientBonuses.length > 0 && (
            <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay">
              <h2 className="font-display text-base text-ink-900 mb-3">Appreciation Bonuses funded</h2>
              <ul className="divide-y divide-cream-150 text-xs">
                {clientBonuses.map((b) => (
                  <li key={b.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-ink-900">Caregiver appreciation bonus</p>
                      <p className="text-[10px] text-ink-400">Type: {b.bonus_type.replace(/_/g, " ")}</p>
                    </div>
                    <p className="font-display font-semibold text-forest-700">{formatCurrency(b.amount)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Statement adjustments details */}
          <section className="bg-white rounded-3xl shadow-soft p-5 border border-cream-200 grain-overlay space-y-3">
            <h2 className="font-display text-base text-ink-900 font-bold">Statement Adjustments &amp; Payments</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-cream-100">
                <span className="text-ink-500">Adjustments</span>
                <div className="text-right">
                  <span className="font-semibold">{formatCurrency(clientInvoice.adjustments)}</span>
                  {clientInvoice.adjustments_reason && (
                    <p className="text-[9px] text-ink-400">Reason: {clientInvoice.adjustments_reason}</p>
                  )}
                </div>
              </div>

              {clientPayments.length > 0 && (
                <div className="pt-2">
                  <p className="font-semibold text-ink-800 mb-1.5">Recorded Payment Entries</p>
                  <ul className="space-y-1.5">
                    {clientPayments.map((p) => (
                      <li key={p.id} className="flex justify-between text-[11px] text-ink-600 bg-cream-50/50 p-2 rounded-xl border border-cream-100">
                        <span>
                          {new Date(p.payment_date + "T00:00:00").toLocaleDateString()} &middot; {p.payment_method.toUpperCase()}
                        </span>
                        <span className="font-bold text-forest-700">{formatCurrency(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <p className="text-[10px] text-ink-400 text-center mt-4 border-t border-cream-100 pt-4">
        All entries are for recordkeeping only. App does not process real payment payouts.
      </p>
    </main>
  );
}
