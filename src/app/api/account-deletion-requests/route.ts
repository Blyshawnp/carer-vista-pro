import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
    .select("organization_id, email")
    .eq("id", user.id)
    .maybeSingle<{ organization_id: string | null; email: string | null }>();

  const { error } = await admin.from("account_deletion_requests").insert({
    user_id: user.id,
    organization_id: profile?.organization_id ?? null,
    email: profile?.email ?? user.email ?? null,
    reason: payload.reason?.trim() || null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
