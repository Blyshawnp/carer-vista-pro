import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/db-types";

const VALID_ROLES: Role[] = ["admin", "client", "caregiver", "family"];

export type SetupStatus =
  | "unauthenticated"
  | "needs_profile"
  | "needs_setup"
  | "setup_complete"
  | "missing_required_org"
  | "invalid_role"
  | "error";

export type UserSetupState = {
  status: SetupStatus;
  redirectTo: "/login" | "/setup" | "/home" | null;
  userId: string | null;
  profileExists: boolean;
  role: Role | null;
  organizationId: string | null;
  organizationExists: boolean;
  membershipExists: boolean | null;
  setupCompleted: boolean | null;
  error: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  organization_id: string | null;
  is_active: boolean | null;
};

type OrganizationRow = {
  id: string;
  onboarding_complete: boolean | null;
};

export async function getUserSetupState(
  userId: string | null | undefined,
  currentPath = "unknown"
): Promise<UserSetupState> {
  if (!userId) {
    return withDebug(
      {
        status: "unauthenticated",
        redirectTo: "/login",
        userId: null,
        profileExists: false,
        role: null,
        organizationId: null,
        organizationExists: false,
        membershipExists: null,
        setupCompleted: null,
        error: null,
      },
      currentPath
    );
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, organization_id, is_active")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return errorState(userId, currentPath, `profile:${profileError.message}`);
    }

    if (!profile) {
      return withDebug(
        baseState({
          status: "needs_profile",
          redirectTo: "/setup",
          userId,
        }),
        currentPath
      );
    }

    const role = VALID_ROLES.includes(profile.role as Role)
      ? (profile.role as Role)
      : null;

    if (!role || profile.is_active === false) {
      return withDebug(
        baseState({
          status: "invalid_role",
          redirectTo: "/setup",
          userId,
          profileExists: true,
          role,
          organizationId: profile.organization_id,
        }),
        currentPath
      );
    }

    if (!profile.organization_id) {
      return withDebug(
        baseState({
          status: "needs_setup",
          redirectTo: "/setup",
          userId,
          profileExists: true,
          role,
        }),
        currentPath
      );
    }

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("id, onboarding_complete")
      .eq("id", profile.organization_id)
      .maybeSingle<OrganizationRow>();

    if (organizationError) {
      return errorState(userId, currentPath, `organization:${organizationError.message}`, {
        profileExists: true,
        role,
        organizationId: profile.organization_id,
      });
    }

    if (!organization) {
      return withDebug(
        baseState({
          status: "missing_required_org",
          redirectTo: "/setup",
          userId,
          profileExists: true,
          role,
          organizationId: profile.organization_id,
        }),
        currentPath
      );
    }

    if (organization.onboarding_complete !== true) {
      return withDebug(
        baseState({
          status: "needs_setup",
          redirectTo: "/setup",
          userId,
          profileExists: true,
          role,
          organizationId: profile.organization_id,
          organizationExists: true,
          setupCompleted: organization.onboarding_complete,
        }),
        currentPath
      );
    }

    return withDebug(
      baseState({
        status: "setup_complete",
        redirectTo: "/home",
        userId,
        profileExists: true,
        role,
        organizationId: profile.organization_id,
        organizationExists: true,
        setupCompleted: true,
      }),
      currentPath
    );
  } catch (error) {
    return errorState(
      userId,
      currentPath,
      error instanceof Error ? error.message : "unknown setup-state error"
    );
  }
}

function baseState(overrides: Partial<UserSetupState>): UserSetupState {
  return {
    status: "error",
    redirectTo: null,
    userId: null,
    profileExists: false,
    role: null,
    organizationId: null,
    organizationExists: false,
    membershipExists: null,
    setupCompleted: null,
    error: null,
    ...overrides,
  };
}

function errorState(
  userId: string | null | undefined,
  currentPath: string,
  error: string,
  details: Partial<UserSetupState> = {}
) {
  return withDebug(
    baseState({
      status: "error",
      redirectTo: null,
      userId: userId ?? null,
      error,
      ...details,
    }),
    currentPath
  );
}

function withDebug(state: UserSetupState, currentPath: string) {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.SETUP_STATE_DEBUG === "true"
  ) {
    console.info("[setup-state]", {
      userId: state.userId ? `${state.userId.slice(0, 8)}...` : null,
      role: state.role,
      profileExists: state.profileExists,
      organizationIdExists: !!state.organizationId,
      organizationExists: state.organizationExists,
      membershipExists: state.membershipExists,
      setupCompleted: state.setupCompleted,
      status: state.status,
      currentPath,
      redirectTarget: state.redirectTo,
      error: state.error,
    });
  }

  return state;
}
