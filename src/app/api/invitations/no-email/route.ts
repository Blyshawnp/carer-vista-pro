import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/db-types";

type AdminProfile = {
  id: string;
  organization_id: string;
  role: Role;
  is_owner: boolean | null;
};

type NoEmailInviteRequest = {
  fullName?: string;
  role?: Role;
  usernamePart?: string;
  password?: string;
  phone?: string | null;
  hourlyRate?: number | null;
  clientIds?: string[];
};

const NO_EMAIL_ROLES: Role[] = ["admin", "caregiver", "client", "family"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_owner")
      .eq("id", user.id)
      .maybeSingle<AdminProfile>();

    if (!profile?.organization_id || !canCreateNoEmailUser(profile)) {
      return NextResponse.json(
        { error: "Admin or client-family admin access required." },
        { status: 403 }
      );
    }

    const payload = (await request.json()) as NoEmailInviteRequest;
    const fullName = payload.fullName?.trim() ?? "";
    const usernamePart = payload.usernamePart?.trim().toLowerCase() ?? "";
    const password = payload.password?.trim() || generateTemporaryPassword();
    const phone = payload.phone?.trim() || null;
    const role = payload.role;
    const hourlyRate = normalizeHourlyRate(payload.hourlyRate);
    const clientIds = Array.from(new Set(payload.clientIds ?? []));

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!role || !NO_EMAIL_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role is invalid." }, { status: 400 });
    }
    if (role !== "caregiver" && hourlyRate !== null) {
      return NextResponse.json(
        { error: "Only caregivers can have an hourly rate." },
        { status: 400 }
      );
    }

    const cleanUser = usernamePart.replace(/[^a-z0-9]/g, "");
    if (cleanUser.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 letters or numbers." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existingUsername } = await admin
      .from("profiles")
      .select("id")
      .eq("username", cleanUser)
      .eq("has_real_email", false)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingUsername) {
      return NextResponse.json(
        { error: "That username is taken. Pick another." },
        { status: 400 }
      );
    }

    const placeholderEmail = `${cleanUser}+${profile.organization_id.slice(0, 8)}@noemail.local`;

    const { data: invitation, error: invitationError } = await admin
      .from("invitations")
      .insert({
        organization_id: profile.organization_id,
        full_name: fullName,
        email: null,
        role,
        invited_by: profile.id,
        created_by: profile.id,
        caregiver_hourly_rate: role === "caregiver" ? hourlyRate : null,
        status: "pending",
      })
      .select("id")
      .single<{ id: string }>();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: invitationError?.message ?? "Could not create invitation." },
        { status: 400 }
      );
    }

    const createdUser = await admin.auth.admin.createUser({
        email: placeholderEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username: cleanUser,
          has_real_email: false,
        },
      });

    if (createdUser.error || !createdUser.data.user) {
      await admin.from("invitations").delete().eq("id", invitation.id);
      return NextResponse.json(
        {
          error: mapAuthCreationError(
            createdUser.error?.message ?? "Could not create account."
          ),
        },
        { status: 400 }
      );
    }

    const invitedUserId = createdUser.data.user.id;
    const acceptedAt = new Date().toISOString();

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: invitedUserId,
        organization_id: profile.organization_id,
        role,
        full_name: fullName,
        email: placeholderEmail,
        phone,
        username: cleanUser,
        has_real_email: false,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      await rollbackNoEmailInvite(admin, invitation.id, invitedUserId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (role === "caregiver" && hourlyRate !== null) {
      const today = new Date().toISOString().split("T")[0];
      const { data: existingRate, error: rateLookupError } = await admin
        .from("caregiver_rates")
        .select("id")
        .eq("caregiver_id", invitedUserId)
        .eq("effective_from", today)
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (rateLookupError) {
        await rollbackNoEmailInvite(admin, invitation.id, invitedUserId);
        return NextResponse.json({ error: rateLookupError.message }, { status: 500 });
      }

      if (!existingRate) {
        const { error: rateInsertError } = await admin.from("caregiver_rates").insert({
          caregiver_id: invitedUserId,
          base_hourly_rate: hourlyRate,
          effective_from: today,
        });

        if (rateInsertError) {
          await rollbackNoEmailInvite(admin, invitation.id, invitedUserId);
          return NextResponse.json({ error: rateInsertError.message }, { status: 500 });
        }
      }
    }

    if (clientIds.length > 0) {
      const { assignmentError } = await assignClients({
        admin,
        actorId: profile.id,
        organizationId: profile.organization_id,
        userId: invitedUserId,
        role,
        clientIds,
      });

      if (assignmentError) {
        await rollbackNoEmailInvite(admin, invitation.id, invitedUserId);
        return NextResponse.json({ error: assignmentError }, { status: 400 });
      }
    }

    const { error: updateInvitationError } = await admin
      .from("invitations")
      .update({
        status: "accepted",
        accepted_by: invitedUserId,
        accepted_at: acceptedAt,
      })
      .eq("id", invitation.id);

    if (updateInvitationError) {
      await rollbackNoEmailInvite(admin, invitation.id, invitedUserId);
      return NextResponse.json(
        { error: updateInvitationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      username: cleanUser,
      password,
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function canCreateNoEmailUser(profile: AdminProfile) {
  return profile.role === "admin" || profile.is_owner === true;
}

function normalizeHourlyRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0) {
    throw new Error("Hourly rate cannot be negative.");
  }
  return value;
}

function mapAuthCreationError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("duplicate")
    ? "That username is taken. Pick another."
    : message;
}

function generateTemporaryPassword() {
  return `Cv${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;
}

async function assignClients({
  admin,
  actorId,
  organizationId,
  userId,
  role,
  clientIds,
}: {
  admin: ReturnType<typeof createAdminClient>;
  actorId: string;
  organizationId: string;
  userId: string;
  role: Role;
  clientIds: string[];
}) {
  const { data: clients, error: clientError } = await admin
    .from("clients")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", clientIds);

  if (clientError) return { assignmentError: clientError.message };
  if ((clients ?? []).length !== clientIds.length) {
    return { assignmentError: "One or more selected clients were not found." };
  }

  const rows = (clients ?? []).map((client) => ({
    organization_id: organizationId,
    client_id: client.id,
    user_id: userId,
    relationship_role: role,
    role: normalizeAssignmentRole(role),
    assigned_by: actorId,
    is_active: true,
  }));

  const { error } = await admin.from("client_user_assignments").insert(rows);

  return { assignmentError: error?.message };
}

function normalizeAssignmentRole(role: Role) {
  if (role === "family") return "viewer";
  return role;
}

async function rollbackNoEmailInvite(
  admin: ReturnType<typeof createAdminClient>,
  invitationId: string,
  userId: string
) {
  await admin.from("invitations").delete().eq("id", invitationId);
  await admin.from("caregiver_rates").delete().eq("caregiver_id", userId);
  await admin.from("client_user_assignments").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}
