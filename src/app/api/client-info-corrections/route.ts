import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushForNotifications } from "@/lib/web-push";
import type { Role } from "@/lib/db-types";

const CATEGORIES = new Set([
  "emergency_contact",
  "medication",
  "allergy",
  "safety_item",
  "address",
  "home_note",
  "other",
]);

type CorrectionPayload = {
  clientId?: string;
  category?: string;
  message?: string;
};

type CallerProfile = {
  id: string;
  full_name: string;
  role: Role;
  organization_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CorrectionPayload;
  const clientId = payload.clientId;
  const category = payload.category ?? "other";
  const message = payload.message?.trim();

  if (!clientId || !message || !CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "Client, category, and message are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("profiles")
    .select("id, full_name, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<CallerProfile>();

  if (!caller) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: client } = await admin
    .from("clients")
    .select("id, full_name, organization_id")
    .eq("id", clientId)
    .maybeSingle<{ id: string; full_name: string; organization_id: string }>();

  if (!client || client.organization_id !== caller.organization_id) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  if (caller.role !== "admin" && caller.role !== "client") {
    const { data: assignment } = await admin
      .from("client_user_assignments")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "You can only suggest corrections for linked clients." },
        { status: 403 }
      );
    }
  }

  const { data: requestRow, error } = await admin
    .from("client_info_correction_requests")
    .insert({
      organization_id: caller.organization_id,
      client_id: clientId,
      submitted_by: caller.id,
      category,
      message,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !requestRow) {
    return NextResponse.json(
      { error: error?.message ?? "Could not submit correction request." },
      { status: 500 }
    );
  }

  const { data: orgAdmins } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", caller.organization_id)
    .eq("is_active", true)
    .in("role", ["admin", "client"])
    .neq("id", caller.id);

  const { data: linkedManagers } = await admin
    .from("client_user_assignments")
    .select("user_id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .in("relationship_role", ["admin", "client", "family"])
    .neq("user_id", caller.id);

  const recipientIds = new Set<string>();
  for (const recipient of orgAdmins ?? []) recipientIds.add(recipient.id);
  for (const recipient of linkedManagers ?? []) recipientIds.add(recipient.user_id);

  const rows = Array.from(recipientIds).map((recipientId) => ({
    organization_id: caller.organization_id,
    recipient_id: recipientId,
    kind: "client_info_correction",
    title: "Client info correction suggested",
    body: `${caller.full_name} suggested a ${category.replaceAll("_", " ")} update for ${client.full_name}.`,
    link: `/clients/${clientId}/home-info`,
  }));

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
    void sendPushForNotifications(admin, rows).catch(() => {});
  }

  return NextResponse.json({ id: requestRow.id });
}
