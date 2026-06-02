import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./invite-form";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, id, is_owner")
    .eq("id", user.id)
    .single<{
      role: "admin" | "client" | "caregiver" | "family";
      organization_id: string;
      id: string;
      is_owner: boolean;
    }>();

  let canClientManage = false;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("organization_mode, allow_client_admin_for_personal_use")
      .eq("id", profile.organization_id)
      .single();
    if (org) {
      const isPersonalFamily = org.organization_mode === "personal_family";
      const isClientDirected = org.organization_mode === "client_directed_care";
      canClientManage = (isPersonalFamily && org.allow_client_admin_for_personal_use) || isClientDirected;
    }
  }

  const isAllowed = profile?.role === "admin" || profile?.is_owner || (profile?.role === "client" && canClientManage);

  if (!profile || !isAllowed) redirect("/team");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", profile.organization_id)
    .order("full_name");

  return <InviteForm clients={clients ?? []} />;
}
