import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPayPeriod, formatPayPeriod, formatCurrency, formatPay } from "@/lib/pay";
import { ArrowRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PolymorphicInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single<{
      id: string;
      role: "admin" | "client" | "caregiver" | "family";
      organization_id: string;
    }>();

  if (!profile) redirect("/login");

  const isCaregiver = profile.role === "caregiver";
  const isClient = profile.role === "client";
  const isFamily = profile.role === "family";
  const isAdmin = profile.role === "admin";

  // Check organization settings
  const { data: org } = await supabase
    .from("organizations")
    .select("client_can_view_invoices, family_can_view_invoices")
    .eq("id", profile.organization_id)
    .single();

  if (isClient && !org?.client_can_view_invoices) redirect("/me");
  if (isFamily && !org?.family_can_view_invoices) redirect("/me");

  let caregiverSnapshots: any[] = [];
  let clientInvoices: any[] = [];

  if (isCaregiver) {
    // Pull snapshots for this caregiver
    const { data } = await supabase
      .from("pay_period_snapshots")
      .select(`
        id,
        total_hours,
        total_amount,
        shift_count,
        created_at,
        pay_period_id,
        pay_periods ( period_start, period_end, is_locked, released_at )
      `)
      .eq("caregiver_id", profile.id)
      .order("created_at", { ascending: false });

    caregiverSnapshots = data || [];
  } else {
    // Query client assignments
    const { data: assignments } = await supabase
      .from("client_user_assignments")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const clientIds = (assignments || []).map((a) => a.client_id);

    // Pull client invoices
    const { data: clientInvs } = await supabase
      .from("client_invoices")
      .select(`
        id,
        subtotal,
        adjustments,
        total_amount,
        payments_applied,
        balance_due,
        status,
        released_at,
        pay_period_id,
        clients:client_id ( id, full_name ),
        pay_periods ( period_start, period_end, released_at )
      `)
      .in("client_id", clientIds)
      .not("released_at", "is", null) // only released invoices visible
      .order("created_at", { ascending: false });

    clientInvoices = clientInvs || [];
  }

  // Also compute the CURRENT open period (live estimate) for caregivers
  let currentHours = 0;
  let currentTotal = 0;
  let currentShifts = 0;
  let currentPeriod = null;

  if (isCaregiver) {
    currentPeriod = getCurrentPayPeriod(new Date());
    const { data: currentRows } = await supabase
      .from("shift_pay_details")
      .select("hours_worked, total_pay, scheduled_start, check_in_time, shift_id")
      .eq("caregiver_id", profile.id)
      .gte("scheduled_start", currentPeriod.start.toISOString())
      .lte("scheduled_start", currentPeriod.end.toISOString())
      .not("hours_worked", "is", null);

    for (const r of (currentRows || []) as any[]) {
      const ref = new Date(r.check_in_time ?? r.scheduled_start);
      if (ref >= currentPeriod.start && ref < currentPeriod.end) {
        currentHours += Number(r.hours_worked ?? 0);
        currentTotal += Number(r.total_pay ?? 0);
        currentShifts += 1;
      }
    }
  }

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/me"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block font-semibold"
        >
          ← Back
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          {isCaregiver ? "Payout Statements" : "Billing Invoices"}
        </h1>
        <p className="text-ink-500 text-sm">
          {isCaregiver
            ? "Pay periods run Friday – Friday, locking at 9 PM."
            : "Review statement history, manual payments recorded, and balances due."}
        </p>
      </header>

      {/* Live running estimate card (Caregiver only) */}
      {isCaregiver && currentShifts > 0 && currentPeriod && (
        <section className="bg-forest-600 text-cream-50 rounded-3xl p-5 mb-4 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cream-50/10 blur-2xl"
          />
          <div className="relative">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs uppercase tracking-[0.2em] text-cream-50/70">
                Current period (running)
              </p>
              <span className="text-[10px] uppercase tracking-wider bg-cream-50/15 px-1.5 py-0.5 rounded font-medium">
                In progress
              </span>
            </div>
            <p className="font-display text-3xl">
              {formatPay(currentTotal)}
            </p>
            <p className="text-xs text-cream-50/80 mt-0.5">
              {currentHours.toFixed(1)} hrs · {currentShifts} shift
              {currentShifts === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-cream-50/70 mt-2">
              {formatPayPeriod(currentPeriod)}. Locks Friday at 9 PM.
            </p>
          </div>
        </section>
      )}

      {/* caregiver pay statements list */}
      {isCaregiver && (
        <div className="space-y-3">
          {caregiverSnapshots.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-cream-200 text-center grain-overlay">
              <p className="font-display text-lg mb-1">No payout statements released yet</p>
              <p className="text-xs text-ink-500">
                Once a pay period ends, your statement will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {caregiverSnapshots.map((s) => {
                const periodStart = s.pay_periods?.period_start ? new Date(s.pay_periods.period_start) : null;
                const periodEnd = s.pay_periods?.period_end ? new Date(s.pay_periods.period_end) : null;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/me/invoices/${s.pay_period_id}`}
                      className="flex items-center gap-3 bg-white hover:bg-cream-50 px-4 py-3 rounded-2xl shadow-soft transition active:scale-[0.99] border border-cream-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-950 text-sm">
                          {formatCurrency(s.total_amount)}
                        </p>
                        <p className="text-[11px] text-ink-400 mt-0.5">
                          {periodStart && periodEnd
                            ? formatPayPeriod({ start: periodStart, end: periodEnd })
                            : "Period"}{" "}
                          · {s.shift_count} shift{s.shift_count === 1 ? "" : "s"} · {Number(s.total_hours).toFixed(1)} hrs
                        </p>
                      </div>
                      <ArrowRightIcon size={14} className="text-ink-300 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* client billing invoices list */}
      {!isCaregiver && (
        <div className="space-y-3">
          {clientInvoices.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-cream-200 text-center grain-overlay">
              <p className="font-display text-lg mb-1">No released invoices yet</p>
              <p className="text-xs text-ink-500">
                Once administrative billing releases your statement, it will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {clientInvoices.map((inv) => {
                const periodStart = inv.pay_periods?.period_start ? new Date(inv.pay_periods.period_start) : null;
                const periodEnd = inv.pay_periods?.period_end ? new Date(inv.pay_periods.period_end) : null;
                
                const statusLabels: Record<string, string> = {
                  unpaid: "Unpaid",
                  partial: "Partially Paid",
                  paid: "Paid",
                  voided: "Voided",
                };

                return (
                  <li key={inv.id}>
                    <Link
                      href={`/me/invoices/${inv.pay_period_id}`}
                      className="flex items-center gap-3 bg-white hover:bg-cream-50 px-4 py-3.5 rounded-2xl shadow-soft transition active:scale-[0.99] border border-cream-100"
                    >
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="font-semibold text-sm text-ink-950">
                            {formatCurrency(inv.total_amount)}
                          </p>
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                            inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "partial" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {statusLabels[inv.status] || inv.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-400 mt-1">
                          Period: {periodStart && periodEnd ? `${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}` : "Billing Cycle"}
                        </p>
                        <p className="text-[10px] text-forest-600 font-semibold mt-0.5">
                          Balance Due: {formatCurrency(inv.balance_due)}
                        </p>
                      </div>
                      <ArrowRightIcon size={14} className="text-ink-300 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
