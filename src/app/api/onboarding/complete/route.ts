import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SetupType = "personal_family" | "organization";
type FirstRole = "client" | "family" | "admin";

type OnboardingRequest = {
  fullName?: string;
  organizationName?: string;
  setupType?: SetupType;
  firstRole?: FirstRole;
  clientName?: string;
  clientAddress?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  homeNotes?: string;
  inviteEmails?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as OnboardingRequest;
  const fullName = payload.fullName?.trim() || user.email || "Account owner";
  const organizationName = payload.organizationName?.trim() ?? "";
  const setupType = payload.setupType;
  const firstRole = payload.firstRole;
  const clientName = payload.clientName?.trim() ?? "";

  if (!organizationName) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }
  if (setupType !== "personal_family" && setupType !== "organization") {
    return NextResponse.json({ error: "Setup type is invalid." }, { status: 400 });
  }
  if (firstRole !== "client" && firstRole !== "family" && firstRole !== "admin") {
    return NextResponse.json({ error: "First user role is invalid." }, { status: 400 });
  }
  if (!clientName) {
    return NextResponse.json({ error: "Care recipient name is required." }, { status: 400 });
  }

  const emails = parseInviteEmails(payload.inviteEmails);
  const admin = createAdminClient();
  const organizationMode =
    setupType === "organization" ? "agency_company" : "personal_family";
  const ownerRoleLabel =
    firstRole === "client" || firstRole === "family" ? "Client/Family Admin" : null;

  try {
    const { data: existingProfile, error: profileFetchError } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user.id)
      .maybeSingle<{ id: string; organization_id: string | null }>();

    if (profileFetchError) {
      throw profileFetchError;
    }

    const { data: ownedOrg, error: ownedOrgError } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string }>();

    if (ownedOrgError) {
      throw ownedOrgError;
    }

    let profileOrganizationId = existingProfile?.organization_id ?? null;
    if (profileOrganizationId) {
      const { data: profileOrganization, error: profileOrganizationError } =
        await admin
          .from("organizations")
          .select("id")
          .eq("id", profileOrganizationId)
          .maybeSingle<{ id: string }>();

      if (profileOrganizationError) {
        throw profileOrganizationError;
      }

      if (!profileOrganization) {
        profileOrganizationId = null;
      }
    }

    let organizationId = profileOrganizationId ?? ownedOrg?.id ?? null;

    if (!organizationId) {
      const { data: insertedOrg, error: insertOrgError } = await admin
        .from("organizations")
        .insert({
          name: organizationName,
          setup_type: setupType,
          organization_mode: organizationMode,
          owner_id: user.id,
          onboarding_complete: true,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertOrgError || !insertedOrg?.id) {
        throw insertOrgError ?? new Error("Organization could not be created.");
      }

      organizationId = insertedOrg.id;
    } else {
      const { error: updateOrgError } = await admin
        .from("organizations")
        .update({
          name: organizationName,
          setup_type: setupType,
          organization_mode: organizationMode,
          owner_id: user.id,
          onboarding_complete: true,
        })
        .eq("id", organizationId);

      if (updateOrgError) {
        throw updateOrgError;
      }
    }

    const profileValues = {
      organization_id: organizationId,
      role: "admin",
      owner_role: firstRole,
      owner_role_label: ownerRoleLabel,
      is_owner: true,
      full_name: fullName,
      email: user.email ?? "",
      is_active: true,
    };

    const profileWrite = existingProfile
      ? admin.from("profiles").update(profileValues).eq("id", user.id)
      : admin
          .from("profiles")
          .insert({
            ...profileValues,
          id: user.id,
          phone: null,
          });

    const { error: profileUpsertError } = await profileWrite;

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    const { data: existingClient, error: existingClientError } = await admin
      .from("clients")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("full_name", clientName)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingClientError) {
      throw existingClientError;
    }

    if (!existingClient) {
      const { error: clientInsertError } = await admin.from("clients").insert({
        organization_id: organizationId,
        full_name: clientName,
        address: payload.clientAddress?.trim() || null,
        emergency_contact_1_name: payload.emergencyName?.trim() || null,
        emergency_contact_1_phone: payload.emergencyPhone?.trim() || null,
        emergency_contact_1_relationship:
          payload.emergencyRelationship?.trim() || null,
        home_notes: payload.homeNotes?.trim() || null,
      });

      if (clientInsertError) {
        throw clientInsertError;
      }
    }

    for (const inviteEmail of emails) {
      const { data: existingInvite, error: inviteFetchError } = await admin
        .from("invitations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", inviteEmail)
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (inviteFetchError) {
        throw inviteFetchError;
      }

      if (!existingInvite) {
        const { error: inviteInsertError } = await admin.from("invitations").insert({
          organization_id: organizationId,
          full_name: inviteEmail.split("@")[0],
          email: inviteEmail,
          role: "caregiver",
          invited_by: user.id,
          created_by: user.id,
          status: "pending",
        });

        if (inviteInsertError) {
          throw inviteInsertError;
        }
      }
    }

    return NextResponse.json({ ok: true, organizationId });
  } catch (error) {
    console.error("[onboarding.complete] setup failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      { error: mapSetupError(error instanceof Error ? error.message : undefined) },
      { status: 500 }
    );
  }
}

function parseInviteEmails(value?: string) {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    )
  );
}

function mapSetupError(message?: string) {
  if (!message) return "Could not complete setup.";
  if (message.includes("duplicate key")) {
    return "Setup found existing records and could not safely update them. Please try again.";
  }
  return message;
}
