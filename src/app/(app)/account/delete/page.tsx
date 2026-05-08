import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountDeletionForm from "./request-form";

export const dynamic = "force-dynamic";

export default async function AccountDeletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, organization_id")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string;
      organization_id: string | null;
    }>();

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/help"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to Help
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          Request account deletion
        </h1>
        <p className="text-ink-500 text-sm">
          Submit a deletion request for your Carer Vista Pro account and app data.
        </p>
      </header>

      <AccountDeletionForm
        email={profile?.email ?? user.email ?? ""}
        organizationId={profile?.organization_id ?? null}
      />
    </main>
  );
}
