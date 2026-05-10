import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushForNotifications } from "@/lib/web-push";

type RequestBody = {
  reason?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as RequestBody;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, organization_id, email")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      full_name: string | null;
      organization_id: string | null;
      email: string | null;
    }>();

  const { data: deletionRequest, error } = await admin
    .from("account_deletion_requests")
    .insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      email: profile?.email ?? user.email ?? null,
      reason: payload.reason?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (profile?.organization_id && deletionRequest) {
    const { data: recipients } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .eq("role", "admin")
      .neq("id", user.id);

    const rows = (recipients ?? []).map((recipient) => ({
      organization_id: profile.organization_id,
      recipient_id: recipient.id,
      kind: "account_deletion_request",
      title: "Account deletion requested",
      body: `${profile.full_name || profile.email || "A team member"} requested account deletion.`,
      link: "/account/deletion-requests",
    }));

    if (rows.length > 0) {
      await admin.from("notifications").insert(rows);
      void sendPushForNotifications(admin, rows).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
