import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: organizationId, error } = await supabase.rpc(
    "create_initial_organization",
    {
      p_organization_name: organizationName,
      p_setup_type: setupType,
      p_first_role: firstRole,
      p_full_name: fullName,
      p_client_name: clientName,
      p_client_address: payload.clientAddress?.trim() || null,
      p_emergency_name: payload.emergencyName?.trim() || null,
      p_emergency_phone: payload.emergencyPhone?.trim() || null,
      p_emergency_relationship:
        payload.emergencyRelationship?.trim() || null,
      p_home_notes: payload.homeNotes?.trim() || null,
      p_invite_emails: emails,
    }
  );

  if (error || !organizationId) {
    return NextResponse.json(
      { error: mapSetupError(error?.message) },
      { status: error?.message.includes("already set up") ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true, organizationId });
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
    return "This account is already set up.";
  }
  return message;
}
