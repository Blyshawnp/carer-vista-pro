import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AssignmentRequest = {
  userId?: string;
  clientIds?: string[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as AssignmentRequest;
  const userId = payload.userId;
  const clientIds = Array.from(new Set(payload.clientIds ?? []));

  if (!userId) {
    return NextResponse.json({ error: "User is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: viewer } = await admin
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; organization_id: string }>();

  if (!viewer || viewer.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", userId)
    .maybeSingle<{ id: string; role: string; organization_id: string }>();

  if (!target || target.organization_id !== viewer.organization_id) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { data: validClients } = await admin
    .from("clients")
    .select("id")
    .eq("organization_id", viewer.organization_id)
    .in("id", clientIds.length > 0 ? clientIds : ["00000000-0000-0000-0000-000000000000"]);

  const validClientIds = new Set((validClients ?? []).map((client) => client.id));

  await admin
    .from("client_user_assignments")
    .delete()
    .eq("organization_id", viewer.organization_id)
    .eq("user_id", userId);

  const rows = Array.from(validClientIds).map((clientId) => ({
    organization_id: viewer.organization_id,
    client_id: clientId,
    user_id: userId,
    relationship_role: normalizeRelationshipRole(target.role),
    assigned_by: viewer.id,
    is_active: true,
  }));

  if (rows.length > 0) {
    const { error } = await admin
      .from("client_user_assignments")
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

function normalizeRelationshipRole(role: string) {
  if (role === "caregiver" || role === "client" || role === "family" || role === "admin") {
    return role;
  }
  return "viewer";
}
