import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewRequestForm from "./new-request-form";

export default async function NewScheduleRequestPage() {
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

  if (!profile) redirect("/me");

  // Check settings for schedule requests
  let clientCanRequestShifts = true;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("client_can_request_shifts")
      .eq("id", profile.organization_id)
      .single();
    if (org) {
      clientCanRequestShifts = org.client_can_request_shifts;
    }
  }

  const isClientOrFamily = profile.role === "client" || profile.role === "family";
  if (isClientOrFamily && !clientCanRequestShifts) {
    redirect("/schedule");
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
    // Query client assignments
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

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/schedule"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to schedule
        </Link>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">
          Request Care Coverage
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Submit a new request for scheduling shifts, emergency coverage, or hours updates.
        </p>
      </header>

      <section className="bg-white rounded-3xl shadow-soft p-6 grain-overlay border border-cream-200">
        {clients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ink-600 font-medium">No assigned clients found.</p>
            <p className="text-sm text-ink-400 mt-2">
              You must be assigned to at least one care recipient to submit requests.
            </p>
            <Link
              href="/help"
              className="mt-4 inline-block text-xs bg-cream-200 hover:bg-cream-300 text-ink-700 px-4 py-2 rounded-xl font-medium transition"
            >
              Contact Support
            </Link>
          </div>
        ) : (
          <NewRequestForm clients={clients} />
        )}
      </section>
    </main>
  );
}
