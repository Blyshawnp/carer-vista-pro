import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, organization_id, full_name")
      .eq("id", user.id)
      .single<{ id: string; role: string; organization_id: string; full_name: string }>();

    if (!profile || profile.role !== "client") {
      return NextResponse.json(
        { error: "Only clients can submit shift cancellation requests." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      shiftId: string;
      clientId: string;
      organizationId: string;
      reason: string;
    } | null;

    if (!body || !body.shiftId || !body.clientId || !body.reason.trim()) {
      return NextResponse.json(
        { error: "Missing required request parameters." },
        { status: 400 }
      );
    }

    // Insert request
    const { data: newRequest, error: insertError } = await admin
      .from("shift_removal_requests")
      .insert({
        organization_id: profile.organization_id,
        client_id: body.clientId,
        shift_id: body.shiftId,
        requested_by: profile.id,
        reason: body.reason.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Notify all admins of the new request
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((adm) => ({
        organization_id: profile.organization_id,
        recipient_id: adm.id,
        kind: "shift_removal_request_pending",
        title: "Shift cancellation request",
        body: `${profile.full_name} has requested cancellation of a shift. Reason: "${body.reason.trim()}"`,
        link: `/schedule/${body.shiftId}`,
      }));

      await admin.from("notifications").insert(notifications);
    }

    // Log the request to activity logs
    await admin.from("activity_logs").insert({
      organization_id: profile.organization_id,
      actor_id: user.id,
      action_type: "request_shift_removal",
      reason: body.reason.trim(),
      metadata: { shift_id: body.shiftId },
    });

    return NextResponse.json({ ok: true, data: newRequest });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, organization_id, full_name")
      .eq("id", user.id)
      .single<{ id: string; role: string; organization_id: string; full_name: string }>();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only agency administrators can review cancellation requests." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      requestId: string;
      status: "approved" | "declined";
      adminResponse?: string;
      reviewedBy: string;
      cancellationFeeApplies?: boolean;
      cancellationFeeAmount?: number;
      cancellationFeeReason?: string;
      cancellationFeeWaived?: boolean;
    } | null;

    if (!body || !body.requestId || !body.status) {
      return NextResponse.json(
        { error: "Missing required request parameters." },
        { status: 400 }
      );
    }

    // Get the request details
    const { data: req, error: reqError } = await admin
      .from("shift_removal_requests")
      .select("*, shifts(*)")
      .eq("id", body.requestId)
      .single();

    if (reqError || !req) {
      return NextResponse.json(
        { error: "Shift removal request not found." },
        { status: 404 }
      );
    }

    // Update request status
    const updatePayload: any = {
      status: body.status,
      admin_response: body.adminResponse || null,
      reviewed_by: body.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (body.status === "approved") {
      updatePayload.cancellation_fee_applies = !!body.cancellationFeeApplies;
      updatePayload.cancellation_fee_amount = body.cancellationFeeApplies ? body.cancellationFeeAmount : null;
      updatePayload.cancellation_fee_reason = body.cancellationFeeApplies ? body.cancellationFeeReason : null;
      updatePayload.cancellation_fee_waived = !!body.cancellationFeeWaived;
    }

    const { error: updateError } = await admin
      .from("shift_removal_requests")
      .update(updatePayload)
      .eq("id", body.requestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Load related shift details for notification purposes
    const shift = req.shifts;

    if (body.status === "approved") {
      // 1. Delete the shift
      if (shift) {
        const { error: deleteError } = await admin
          .from("shifts")
          .delete()
          .eq("id", shift.id);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 2. Notify assigned caregiver (if any)
        if (shift.caregiver_id) {
          const date = new Date(shift.scheduled_start);
          const dateStr = date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          
          await admin.from("notifications").insert({
            organization_id: profile.organization_id,
            recipient_id: shift.caregiver_id,
            kind: "shift_cancelled_by_agency",
            title: "Assigned shift cancelled",
            body: `Your assigned shift on ${dateStr} has been cancelled by the agency.`,
            link: "/schedule",
          });
        }
      }

      // 3. Notify client
      await admin.from("notifications").insert({
        organization_id: profile.organization_id,
        recipient_id: req.requested_by,
        kind: "shift_removal_approved",
        title: "Cancellation request approved",
        body: `Your shift cancellation request has been approved. ${
          body.cancellationFeeApplies 
            ? `A cancellation fee of $${Number(body.cancellationFeeAmount).toFixed(2)} applies${body.cancellationFeeWaived ? " (waived)" : ""}.` 
            : ""
        }`,
        link: "/schedule",
      });

      // 4. Log the deletion to activity_logs
      await admin.from("activity_logs").insert({
        organization_id: profile.organization_id,
        actor_id: user.id,
        action_type: "delete_shift_approved_request",
        reason: body.adminResponse || null,
        metadata: {
          shift_id: req.shift_id,
          request_id: req.id,
          cancellation_fee: body.cancellationFeeApplies ? body.cancellationFeeAmount : null,
          cancellation_fee_waived: body.cancellationFeeWaived,
        },
      });

    } else if (body.status === "declined") {
      // Notify client
      await admin.from("notifications").insert({
        organization_id: profile.organization_id,
        recipient_id: req.requested_by,
        kind: "shift_removal_declined",
        title: "Cancellation request declined",
        body: `Your shift cancellation request was declined. Reason: "${body.adminResponse || "No reason specified"}"`,
        link: `/schedule/${req.shift_id}`,
      });

      // Log the decline to activity_logs
      await admin.from("activity_logs").insert({
        organization_id: profile.organization_id,
        actor_id: user.id,
        action_type: "decline_shift_removal_request",
        reason: body.adminResponse || null,
        metadata: { shift_id: req.shift_id, request_id: req.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
