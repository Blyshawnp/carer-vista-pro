import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendInvitationEmail } from "@/lib/email";
import type { Role } from "@/lib/db-types";

type CreateInvitationRequest = {
  fullName?: string;
  email?: string | null;
  role?: Role;
  hourlyRate?: number | null;
};

type ActorProfile = {
  id: string;
  organization_id: string;
  role: Role;
  is_owner: boolean | null;
  owner_role: string | null;
  owner_role_label: string | null;
  full_name: string | null;
};

const INVITE_ROLES: Role[] = ["admin", "caregiver", "client", "family"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_owner, owner_role, owner_role_label, full_name")
      .eq("id", user.id)
      .maybeSingle<ActorProfile>();

    if (!actor?.organization_id || !canInvite(actor)) {
      return NextResponse.json(
        { error: "Admin or client-family admin access required." },
        { status: 403 }
      );
    }

    const payload = (await request.json()) as CreateInvitationRequest;
    const fullName = payload.fullName?.trim() ?? "";
    const email = normalizeEmail(payload.email);
    const role = payload.role;
    const hourlyRate = normalizeHourlyRate(payload.hourlyRate);

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!role || !INVITE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role is invalid." }, { status: 400 });
    }

    if (role !== "caregiver" && hourlyRate !== null) {
      return NextResponse.json(
        { error: "Only caregivers can have an hourly rate." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: invitation, error: invitationError } = await admin
      .from("invitations")
      .insert({
        organization_id: actor.organization_id,
        full_name: fullName,
        email,
        role,
        invited_by: actor.id,
        created_by: actor.id,
        caregiver_hourly_rate: role === "caregiver" ? hourlyRate : null,
        status: "pending",
      })
      .select("id, token, email, full_name, role, expires_at, organization_id")
      .single<{
        id: string;
        token: string;
        email: string | null;
        full_name: string;
        role: Role;
        expires_at: string;
        organization_id: string;
      }>();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: invitationError?.message ?? "Could not create invitation." },
        { status: 400 }
      );
    }

    const inviteLink = buildInviteLink(request, invitation.token);
    const emailDelivery = await maybeSendInviteEmail({
      admin,
      actor,
      invitation,
      inviteLink,
      allowEmailSend: isEmailConfigured(),
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        token: invitation.token,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
      inviteLink,
      emailDelivery,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create invitation." },
      { status: 500 }
    );
  }
}

function canInvite(actor: ActorProfile) {
  return actor.role === "admin" || actor.is_owner === true;
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase();
  if (!email) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function normalizeHourlyRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0) {
    throw new Error("Hourly rate cannot be negative.");
  }
  return value;
}

function buildInviteLink(request: Request, token: string) {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}

async function maybeSendInviteEmail({
  admin,
  actor,
  invitation,
  inviteLink,
  allowEmailSend,
}: {
  admin: ReturnType<typeof createAdminClient>;
  actor: ActorProfile;
  invitation: {
    email: string | null;
    full_name: string;
    role: Role;
    organization_id: string;
  };
  inviteLink: string;
  allowEmailSend: boolean;
}) {
  if (!allowEmailSend) {
    return {
      configured: false,
      sent: false,
      skipped: true,
      reason: "not_configured" as const,
    };
  }

  if (!invitation.email) {
    return {
      configured: true,
      sent: false,
      skipped: true,
      reason: "missing_recipient" as const,
    };
  }

  const { data: organization } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .maybeSingle<{ name: string }>();

  try {
    const result = await sendInvitationEmail({
      recipientEmail: invitation.email,
      recipientName: invitation.full_name,
      senderName: actor.full_name ?? "A teammate",
      inviteLink,
      organizationName: organization?.name ?? null,
      role: invitation.role,
    });

    return {
      configured: true,
      sent: result.sent,
      skipped: result.skipped,
      reason: result.reason ?? null,
    };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      skipped: false,
      reason: "failed" as const,
      error: error instanceof Error ? error.message : "Email delivery failed.",
    };
  }
}
