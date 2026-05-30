import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
    invoice_id,
    amount,
    payment_date,
    payment_method,
    note = "",
  } = payload;

  const numericAmount = Number(amount);
  if (!invoice_id || isNaN(numericAmount) || numericAmount < 0 || !payment_method) {
    return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
  }

  // Fetch current invoice state
  const { data: inv, error: fetchErr } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("id", invoice_id)
    .single();

  if (fetchErr || !inv) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Record the payment record
  const { data: pay, error: payErr } = await supabase
    .from("invoice_payments")
    .insert({
      invoice_id,
      amount: numericAmount,
      payment_date: payment_date || new Date().toISOString().split("T")[0],
      payment_method,
      note,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (payErr) {
    return NextResponse.json({ error: payErr.message }, { status: 400 });
  }

  // Recalculate totals
  const newPaymentsApplied = Number(inv.payments_applied) + numericAmount;
  const newBalanceDue = Math.max(0, Number(inv.total_amount) - newPaymentsApplied);
  const newStatus = newBalanceDue === 0 ? "paid" : newPaymentsApplied > 0 ? "partial" : "unpaid";

  const { data: updatedInv, error: updateErr } = await supabase
    .from("client_invoices")
    .update({
      payments_applied: newPaymentsApplied,
      balance_due: newBalanceDue,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Record the audit log
  await supabase
    .from("invoice_audit_logs")
    .insert({
      invoice_id,
      action: "payment_added",
      user_id: user.id,
      note: `Recorded ${payment_method.toUpperCase()} payment of $${numericAmount.toFixed(2)}. New balance: $${newBalanceDue.toFixed(2)}.`,
    });

  return NextResponse.json({ ok: true, invoice: updatedInv, payment: pay });
}

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
    invoice_id,
    adjustments,
    adjustments_reason,
    status,
    release,
  } = payload;

  if (!invoice_id) {
    return NextResponse.json({ error: "Invoice ID required." }, { status: 400 });
  }

  // Fetch current invoice state
  const { data: inv, error: fetchErr } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("id", invoice_id)
    .single();

  if (fetchErr || !inv) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  let actionNote = "";

  if (adjustments !== undefined) {
    const numericAdj = Number(adjustments);
    updateData.adjustments = numericAdj;
    updateData.adjustments_reason = adjustments_reason || "";
    
    // Recalculate total amount and balance due
    const newTotal = Number(inv.subtotal) + numericAdj;
    const newBalance = Math.max(0, newTotal - Number(inv.payments_applied));
    updateData.total_amount = newTotal;
    updateData.balance_due = newBalance;
    updateData.status = newBalance === 0 ? "paid" : Number(inv.payments_applied) > 0 ? "partial" : "unpaid";

    actionNote += `Adjusted invoice total by $${numericAdj.toFixed(2)} (Reason: ${adjustments_reason || "None"}). `;
  }

  if (status !== undefined) {
    updateData.status = status;
    actionNote += `Status changed manually to ${status.toUpperCase()}. `;
  }

  if (release) {
    updateData.released_at = new Date().toISOString();
    updateData.released_by = user.id;
    actionNote += "Invoice released and sent to client. ";
  }

  updateData.updated_at = new Date().toISOString();

  const { data: updatedInv, error: updateErr } = await supabase
    .from("client_invoices")
    .update(updateData)
    .eq("id", invoice_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Record audit log
  await supabase
    .from("invoice_audit_logs")
    .insert({
      invoice_id,
      action: release ? "invoice_released" : "invoice_edited",
      user_id: user.id,
      note: actionNote.trim(),
    });

  return NextResponse.json({ ok: true, invoice: updatedInv });
}
