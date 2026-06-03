import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SetupWizard from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<{
      organization_id: string | null;
    }>();

  if (profile?.organization_id) {
    const { data: organization } = await admin
      .from("organizations")
      .select("onboarding_complete")
      .eq("id", profile.organization_id)
      .maybeSingle<{ onboarding_complete: boolean | null }>();

    if (organization?.onboarding_complete !== false) {
      redirect("/home");
    }
  }

  const defaultName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return <SetupWizard defaultName={defaultName} email={user.email ?? ""} />;
}
