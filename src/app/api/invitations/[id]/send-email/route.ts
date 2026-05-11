import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendInvitationEmail } from "@/lib/email";
import type { Role } from "@/lib/db-types";

type ActorProfile = {
  id: string;
  organization_id: string;
  role: Role;
  is_owner: boolean | null;
  full_name: string | null;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string | null;
  full_name: string;
  role: Role;
  token: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: actor } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_owner, full_name")
      .eq("id", user.id)
      .maybeSingle<ActorProfile>();

    if (!actor?.organization_id || !canInvite(actor)) {
      return NextResponse.json(
        { error: "Admin or client-family admin access required." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: invitation } = await admin
      .from("invitations")
      .select("id, organization_id, email, full_name, role, token")
      .eq("id", id)
      .maybeSingle<InvitationRow>();

    if (!invitation || invitation.organization_id !== actor.organization_id) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({
        ok: false,
        configured: false,
        sent: false,
        skipped: true,
        reason: "not_configured",
      });
    }

    if (!invitation.email) {
      return NextResponse.json({
        ok: false,
        configured: true,
        sent: false,
        skipped: true,
        reason: "missing_recipient",
      });
    }

    const { data: organization } = await admin
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .maybeSingle<{ name: string }>();

    const inviteLink = buildInviteLink(request, invitation.token);

    try {
      const result = await sendInvitationEmail({
        recipientEmail: invitation.email,
        recipientName: invitation.full_name,
        senderName: actor.full_name ?? "A teammate",
        inviteLink,
        organizationName: organization?.name ?? null,
        role: invitation.role,
      });

      return NextResponse.json({
        ok: true,
        configured: true,
        sent: result.sent,
        skipped: result.skipped,
        reason: result.reason ?? null,
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        configured: true,
        sent: false,
        skipped: false,
        reason: "failed",
        error: error instanceof Error ? error.message : "Email delivery failed.",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send invitation email." },
      { status: 500 }
    );
  }
}

function canInvite(actor: ActorProfile) {
  return actor.role === "admin" || actor.is_owner === true;
}

function buildInviteLink(request: Request, token: string) {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}
