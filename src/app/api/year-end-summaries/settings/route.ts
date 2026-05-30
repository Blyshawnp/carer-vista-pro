import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch profiles role and org
  const { data: profile } = await admin
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "client")) {
    return NextResponse.json({ error: "Only administrators can modify settings." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: "Missing payload." }, { status: 400 });
  }

  const { error } = await admin
    .from("organizations")
    .update({
      enable_year_end_summary: payload.enable_year_end_summary ?? false,
      year_end_summary_release_month: Math.max(1, Math.min(12, parseInt(payload.year_end_summary_release_month ?? "1", 10))),
      year_end_summary_release_day: Math.max(1, Math.min(31, parseInt(payload.year_end_summary_release_day ?? "5", 10))),
    })
    .eq("id", profile.organization_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
