import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeletionRequestsList from "./requests-list";

export const dynamic = "force-dynamic";

export default async function AccountDeletionRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; organization_id: string }>();

  if (!profile || profile.role !== "admin") redirect("/help");

  const { data: requests } = await supabase
    .from("account_deletion_requests")
    .select("id, user_id, email, reason, status, requested_at, reviewed_at, reviewed_by, admin_notes")
    .eq("organization_id", profile.organization_id)
    .order("requested_at", { ascending: false });

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link href="/help" className="text-sm text-forest-600 hover:underline mb-2 inline-block">
          ← Back to help
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          Data deletion requests
        </h1>
        <p className="text-ink-500 text-sm">
          Review account and data deletion requests from your care circle.
        </p>
      </header>

      <DeletionRequestsList requests={requests ?? []} reviewerId={profile.id} />
    </main>
  );
}
