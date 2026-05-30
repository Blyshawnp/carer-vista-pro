import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RequestsList from "./requests-list";

export default async function ScheduleRequestsPage() {
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

  const isAdmin = profile.role === "admin";

  // Query coverage requests
  let q = supabase
    .from("schedule_coverage_requests")
    .select(`
      *,
      clients:client_id ( id, full_name ),
      profiles:requested_by ( id, full_name )
    `);

  if (!isAdmin) {
    // Clients and family only see their own requests or requests for clients they are assigned to
    // Let's filter in TS or simple subquery for security
    q = q.eq("requested_by", user.id);
  }

  const { data: requestsRaw } = await q.order("created_at", { ascending: false });
  const requests = requestsRaw || [];

  // If admin, fetch active caregivers to allow direct shift conversion/assignment
  let caregivers: Array<{ id: string; full_name: string }> = [];
  if (isAdmin) {
    const { data: cgData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "caregiver")
      .eq("is_active", true)
      .order("full_name");
    caregivers = cgData || [];
  }

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6 flex justify-between items-start gap-4">
        <div>
          <Link
            href="/schedule"
            className="text-sm text-forest-600 hover:underline mb-2 inline-block"
          >
            ← Back to schedule
          </Link>
          <h1 className="font-display text-3xl text-ink-900 leading-tight">
            Coverage Requests
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            {isAdmin
              ? "Approve, decline, or convert care coverage requests into shifts."
              : "Track the status of your care coverage and shift requests."}
          </p>
        </div>
        {!isAdmin && (
          <Link
            href="/schedule/requests/new"
            className="bg-forest-600 hover:bg-forest-700 text-cream-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition shrink-0"
          >
            Request care
          </Link>
        )}
      </header>

      <section className="space-y-4">
        <RequestsList
          initialRequests={requests}
          caregivers={caregivers}
          isAdmin={isAdmin}
          userId={user.id}
        />
      </section>
    </main>
  );
}
