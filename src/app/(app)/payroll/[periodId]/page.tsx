import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roundUpToQuarter, formatPayPeriod, formatCurrency } from "@/lib/pay";
import PayrollPeriodDetails from "./payroll-details";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PayrollPeriodPage({
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
    .select("role, organization_id")
    .eq("id", user.id)
    .single<{ role: "admin" | "client" | "caregiver" | "family"; organization_id: string }>();

  if (!profile || profile.role === "caregiver") redirect("/me");

  const { data: period } = await supabase
    .from("pay_periods")
    .select(
      "id, period_start, period_end, total_amount, total_hours, released_at, is_locked"
    )
    .eq("id", periodId)
    .eq("organization_id", profile.organization_id)
    .single<{
      id: string;
      period_start: string;
      period_end: string;
      total_amount: number | null;
      total_hours: number | null;
      released_at: string | null;
      is_locked: boolean;
    }>();

  if (!period) notFound();

  // All caregiver snapshots for this period
  const { data: snapsRaw } = await supabase
    .from("pay_period_snapshots")
    .select(
      `
      id,
      caregiver_id,
      total_hours,
      total_amount,
      shift_count,
      pay_period_id,
      profiles:caregiver_id ( full_name )
    `
    )
    .eq("pay_period_id", periodId)
    .order("total_amount", { ascending: false });

  type SnapRow = {
    id: string;
    caregiver_id: string;
    total_hours: number;
    total_amount: number;
    shift_count: number;
    pay_period_id: string;
    profiles: { full_name: string } | null;
  };

  const snapshots = (snapsRaw ?? []) as unknown as SnapRow[];

  // Fetch client invoices bootstrapped for this period
  const { data: clientInvoicesRaw } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("pay_period_id", periodId);

  const clientInvoices = clientInvoicesRaw || [];

  // Fetch pending caregiver bonuses for this period
  const { data: pendingBonusesRaw } = await supabase
    .from("client_caregiver_bonuses")
    .select(`
      id, amount, notes, bonus_type,
      clients:client_id ( id, full_name ),
      profiles:caregiver_id ( id, full_name )
    `)
    .eq("pay_period_id", periodId)
    .eq("status", "pending_review");

  const pendingBonuses = (pendingBonusesRaw || []) as any[];

  // Fetch shifts for this period to compile a billing estimation per client
  const { data: shiftsRaw } = await supabase
    .from("shifts")
    .select(`
      id,
      client_id,
      scheduled_start,
      scheduled_end,
      billing_rate_override,
      clients:client_id ( id, full_name, hourly_billing_rate ),
      check_ins ( total_minutes, check_in_time, check_out_time )
    `)
    .eq("organization_id", profile.organization_id)
    .gte("scheduled_start", period.period_start)
    .lte("scheduled_start", period.period_end);

  const clientMap = new Map<string, { id: string; full_name: string; chargeSubtotal: number; totalHours: number }>();
  
  for (const s of shiftsRaw || []) {
    if (!s.client_id || !s.clients) continue;
    const c = Array.isArray(s.clients) ? s.clients[0] : s.clients;
    if (!c) continue;

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

    const billingRate = Number(s.billing_rate_override || c.hourly_billing_rate || 40.00);
    const clientCharge = roundUpToQuarter(hours * billingRate);

    const existing = clientMap.get(s.client_id) || { id: s.client_id, full_name: c.full_name, chargeSubtotal: 0, totalHours: 0 };
    existing.chargeSubtotal += clientCharge;
    existing.totalHours += hours;
    clientMap.set(s.client_id, existing);
  }

  const clientList = Array.from(clientMap.values());

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/payroll"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block font-semibold"
        >
          ← All payroll
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          {formatPayPeriod({
            start: new Date(period.period_start),
            end: new Date(period.period_end),
          })}
        </h1>
        <p className="text-ink-500 text-sm">
          Locked{" "}
          {period.released_at &&
            new Date(period.released_at).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
            })}
        </p>
      </header>

      {/* Org total */}
      <section className="bg-forest-600 text-cream-50 rounded-3xl p-5 mb-4 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cream-50/10 blur-2xl"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-cream-50/70 mb-1">
            Total payroll
          </p>
          <p className="font-display text-4xl">
            {formatCurrency(period.total_amount)}
          </p>
          <p className="text-xs text-cream-50/80 mt-1">
            {Number(period.total_hours ?? 0).toFixed(1)} hours ·{" "}
            {snapshots.length} caregiver{snapshots.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      {/* Dynamic Payroll details dashboard */}
      <PayrollPeriodDetails
        periodId={periodId}
        snapshots={snapshots}
        initialClientInvoices={clientInvoices}
        initialPendingBonuses={pendingBonuses}
        clientList={clientList}
      />

      <p className="text-[10px] text-ink-400 text-center mt-4 pt-4 border-t border-cream-200">
        All amounts rounded up to nearest $0.25. Official statement for recordkeeping only.
      </p>
    </main>
  );
}
