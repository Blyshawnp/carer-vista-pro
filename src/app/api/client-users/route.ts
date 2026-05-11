import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ClientUsersRequest = {
  clientId?: string;
  userIds?: string[];
  userRoles?: Record<string, string>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ClientUsersRequest;
  const clientId = payload.clientId;
  const userIds = Array.from(new Set(payload.userIds ?? []));

  if (!clientId) {
    return NextResponse.json({ error: "Client is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: viewer } = await admin
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; organization_id: string | null }>();

  if (!viewer?.organization_id || (viewer.role !== "admin" && viewer.role !== "client")) {
    return NextResponse.json({ error: "Admin or client-family admin access required." }, { status: 403 });
  }

  const { data: client } = await admin
    .from("clients")
    .select("id, organization_id")
    .eq("id", clientId)
    .maybeSingle<{ id: string; organization_id: string }>();

  if (!client || client.organization_id !== viewer.organization_id) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const { data: users } = await admin
    .from("profiles")
    .select("id, role")
    .eq("organization_id", viewer.organization_id)
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const rows = (users ?? []).map((profile) => ({
    organization_id: viewer.organization_id,
    client_id: client.id,
    user_id: profile.id,
    relationship_role: normalizeRelationshipRole(profile.role),
    role: normalizeAssignmentRole(profile.role, payload.userRoles?.[profile.id]),
    assigned_by: viewer.id,
    is_active: true,
  }));

  await admin
    .from("client_user_assignments")
    .delete()
    .eq("organization_id", viewer.organization_id)
    .eq("client_id", client.id);

  if (rows.length > 0) {
    const { error } = await admin.from("client_user_assignments").insert(rows);

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

function normalizeAssignmentRole(
  profileRole: string,
  role: string | undefined
) {
  if (profileRole === "family") {
    return role === "client-like" ? "client-like" : "viewer";
  }
  if (profileRole === "caregiver") return "caregiver";
  if (profileRole === "client") return "client";
  if (profileRole === "admin") return "admin";
  return "viewer";
}
