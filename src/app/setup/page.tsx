import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupWizard from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(onboarding_complete)")
    .eq("id", user.id)
    .maybeSingle<{
      organization_id: string | null;
      organizations: { onboarding_complete: boolean | null } | null;
    }>();

  if (profile?.organization_id && profile.organizations?.onboarding_complete !== false) {
    redirect("/home");
  }

  const defaultName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return <SetupWizard defaultName={defaultName} email={user.email ?? ""} />;
}
