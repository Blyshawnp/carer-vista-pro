import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { buildAppUrlFromOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email";
import InviteLinkActions from "@/components/invite-link-actions";
import type { Role } from "@/lib/db-types";

type ActorProfile = {
  id: string;
  organization_id: string;
  role: Role;
  is_owner: boolean;
};

type Invitation = {
  id: string;
  organization_id: string;
  email: string | null;
  full_name: string;
  role: Role;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  token: string;
  invited_by: string | null;
  created_by: string | null;
};

export default async function InviteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: actor } = await supabase
    .from("profiles")
    .select("id, organization_id, role, is_owner")
    .eq("id", user.id)
    .maybeSingle<ActorProfile>();

  if (!actor || (actor.role !== "admin" && !actor.is_owner)) redirect("/team");

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organization_id, email, full_name, role, status, expires_at, accepted_at, token, invited_by, created_by")
    .eq("id", id)
    .maybeSingle<Invitation>();

  if (!invitation || invitation.organization_id !== actor.organization_id) {
    notFound();
  }

  const acceptLink = buildAppUrlFromOrigin(
    `/accept-invite?token=${encodeURIComponent(invitation.token)}`,
    await getFallbackOrigin()
  );

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/team"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to team
        </Link>
        <h1 className="font-display text-3xl text-ink-900">Invite details</h1>
        <p className="text-ink-500 text-sm">
          Manage the link and send a message if email is configured.
        </p>
      </header>

      <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay mb-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide font-medium text-ink-500 mb-1.5">
              Invite link
            </p>
            <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 font-mono text-sm break-all">
              {acceptLink}
            </div>
          </div>

          <InviteLinkActions
            inviteLink={acceptLink}
            sendEmailEndpoint={`/api/invitations/${invitation.id}/send-email`}
            emailConfigured={isEmailConfigured()}
            hasRecipientEmail={!!invitation.email}
          />

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Detail label="Name" value={invitation.full_name} />
            <Detail label="Role" value={invitation.role} />
            <Detail label="Email" value={invitation.email ?? "No email provided"} />
            <Detail label="Status" value={invitation.status} />
            <Detail label="Expires" value={new Date(invitation.expires_at).toLocaleDateString()} />
            <Detail label="Accepted" value={invitation.accepted_at ? new Date(invitation.accepted_at).toLocaleString() : "Not yet"} />
          </dl>
        </div>
      </section>
    </main>
  );
}

async function getFallbackOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-1">{label}</dt>
      <dd className="text-ink-900 break-words">{value}</dd>
    </div>
  );
}
