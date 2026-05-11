import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushForNotifications } from "@/lib/web-push";

type IncidentReportPayload = {
  shiftId?: string | null;
  clientId?: string | null;
  category?: string;
  description?: string;
};

type ReporterProfile = {
  id: string;
  role: "admin" | "client" | "caregiver" | "family";
  full_name: string;
  organization_id: string;
};

type ShiftRecord = {
  id: string;
  organization_id: string;
  caregiver_id: string | null;
  client_id: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as IncidentReportPayload | null;
  const category = payload?.category?.trim();
  const description = payload?.description?.trim();

  if (!category || !description) {
    return NextResponse.json(
      { error: "Category and description are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: reporter } = await admin
    .from("profiles")
    .select("id, role, full_name, organization_id")
    .eq("id", user.id)
    .maybeSingle<ReporterProfile>();

  if (!reporter?.organization_id) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  if (reporter.role === "family") {
    return NextResponse.json(
      { error: "Family members cannot file incident reports." },
      { status: 403 }
    );
  }

  let shiftId = payload?.shiftId?.trim() || null;
  let clientId = payload?.clientId?.trim() || null;

  if (shiftId) {
    const { data: shift } = await admin
      .from("shifts")
      .select("id, organization_id, caregiver_id, client_id, check_ins!inner(id, check_in_time, check_out_time)")
      .eq("id", shiftId)
      .not("check_ins.check_in_time", "is", null)
      .is("check_ins.check_out_time", null)
      .maybeSingle<ShiftRecord & { check_ins?: Array<{ id: string; check_in_time: string | null; check_out_time: string | null }> }>();

    if (!shift || shift.organization_id !== reporter.organization_id) {
      return NextResponse.json({ error: "Shift not found." }, { status: 404 });
    }

    if (reporter.role === "caregiver" && shift.caregiver_id !== reporter.id) {
      return NextResponse.json(
        { error: "You can only file incidents for your own active shift or assigned client." },
        { status: 403 }
      );
    }

    clientId = shift.client_id ?? clientId;
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "Choose a client if there is no active shift." },
      { status: 400 }
    );
  }

  if (reporter.role === "caregiver" && !shiftId) {
    const { data: assignment } = await admin
      .from("client_user_assignments")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", reporter.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "You can only file incidents for assigned clients." },
        { status: 403 }
      );
    }
  }

  const { data: inserted, error } = await admin
    .from("incident_reports")
    .insert({
      organization_id: reporter.organization_id,
      shift_id: shiftId,
      client_id: clientId,
      reported_by: reporter.id,
      category,
      description,
    })
    .select("id, organization_id, shift_id, client_id")
    .single<{
      id: string;
      organization_id: string;
      shift_id: string | null;
      client_id: string | null;
    }>();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create incident report." },
      { status: 500 }
    );
  }

  const recipientIds = new Set<string>();

  const { data: orgRecipients } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", reporter.organization_id)
    .eq("is_active", true)
    .neq("id", reporter.id)
    .in("role", ["admin", "client", "family"]);

  for (const row of orgRecipients ?? []) {
    recipientIds.add(row.id);
  }

  const { data: linkedRecipients } = await admin
    .from("client_user_assignments")
    .select("user_id")
    .eq("client_id", clientId)
    .eq("is_active", true);

  for (const row of linkedRecipients ?? []) {
    if (row.user_id !== reporter.id) recipientIds.add(row.user_id);
  }

  if (shiftId) {
    const { data: shift } = await admin
      .from("shifts")
      .select("caregiver_id")
      .eq("id", shiftId)
      .maybeSingle<{ caregiver_id: string | null }>();
    if (shift?.caregiver_id && shift.caregiver_id !== reporter.id) {
      recipientIds.add(shift.caregiver_id);
    }
  }

  const rows = Array.from(recipientIds).map((recipientId) => ({
    organization_id: reporter.organization_id,
    recipient_id: recipientId,
    kind: "incident_reported",
    title: "Incident report submitted",
    body: `${reporter.full_name} submitted an incident report in ${category}.`,
    link: "/emergency",
  }));

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
    void sendPushForNotifications(admin, rows).catch(() => {});
  }

  return NextResponse.json({ id: inserted.id });
}
