import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BonusForm from "./bonus-form";

export default async function NewBonusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id, organization_id")
    .eq("id", user.id)
    .single<{ role: string; id: string; organization_id: string | null }>();

  if (!profile || !profile.organization_id) redirect("/me");

  // Fetch organization settings
  const { data: org } = await supabase
    .from("organizations")
    .select("organization_mode, allow_client_caregiver_bonuses")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.allow_client_caregiver_bonuses) {
    redirect("/me");
  }

  // Fetch clients based on user role and assignments
  let clients: Array<{ id: string; full_name: string }> = [];
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("clients")
      .select("id, full_name")
      .order("full_name");
    clients = data ?? [];
  } else {
    const { data: assignments } = await supabase
      .from("client_user_assignments")
      .select(`
        client_id,
        clients:client_id ( id, full_name )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true);

    const clientMap = new Map<string, string>();
    for (const a of assignments ?? []) {
      const c = Array.isArray(a.clients) ? a.clients[0] : a.clients;
      if (c && typeof c === "object" && "id" in c && "full_name" in c) {
        clientMap.set(c.id as string, c.full_name as string);
      }
    }
    clients = Array.from(clientMap.entries()).map(([id, full_name]) => ({
      id,
      full_name,
    }));
  }

  // Fetch caregivers in this organization
  const { data: cgData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", profile.organization_id)
    .eq("role", "caregiver")
    .eq("is_active", true)
    .order("full_name");

  const caregivers = cgData || [];

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/me"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to account
        </Link>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">
          Caregiver Appreciation Bonus
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Record caregiver appreciation bonuses, holiday bonuses, or performance recognitions.
        </p>
      </header>

      <section className="bg-white rounded-3xl p-6 shadow-soft grain-overlay border border-cream-200">
        {clients.length === 0 || caregivers.length === 0 ? (
          <div className="text-center py-8 text-ink-600">
            <p className="font-medium">No assigned clients or active caregivers found.</p>
            <p className="text-sm text-ink-400 mt-2">
              Ensure you have active client assignments and caregivers configured in your care circle.
            </p>
          </div>
        ) : (
          <BonusForm
            clients={clients}
            caregivers={caregivers}
            orgMode={org.organization_mode}
          />
        )}
      </section>
    </main>
  );
}
