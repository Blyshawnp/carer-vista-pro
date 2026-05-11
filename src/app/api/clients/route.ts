import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { lookupAddress } from "@/lib/address-lookup";
import {
  buildAddressQuery,
  normalizeCountry,
} from "@/lib/address";

type CreateClientRequest = {
  fullName?: string;
  address?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  stateOrRegion?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number;
  homeNotes?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateClientRequest;
  const fullName = payload.fullName?.trim();

  if (!fullName) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, organization_id, role, owner_role, is_owner")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      organization_id: string | null;
      role: string;
      owner_role: string | null;
      is_owner: boolean | null;
    }>();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Complete setup before adding clients." }, { status: 400 });
  }

  if (profile.role !== "admin" && profile.role !== "client") {
    return NextResponse.json({ error: "Admin or client-family admin access required." }, { status: 403 });
  }

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      organization_id: profile.organization_id,
      full_name: fullName,
      address: null,
      street_address_1: clean(payload.streetAddress1),
      street_address_2: clean(payload.streetAddress2),
      city: clean(payload.city),
      state: clean(payload.stateOrRegion ?? payload.state),
      state_or_region: clean(payload.stateOrRegion ?? payload.state),
      postal_code: clean(payload.postalCode),
      country: normalizeCountry(payload.country),
      latitude: normalizeNumber(payload.latitude),
      longitude: normalizeNumber(payload.longitude),
      geofence_radius_meters: normalizeRadius(payload.geofenceRadiusMeters),
      home_notes: clean(payload.homeNotes),
      emergency_contact_1_name: clean(payload.emergencyName),
      emergency_contact_1_phone: clean(payload.emergencyPhone),
      emergency_contact_1_relationship: clean(payload.emergencyRelationship),
      location_source:
        normalizeNumber(payload.latitude) != null && normalizeNumber(payload.longitude) != null
          ? "manual"
          : "unknown",
      location_set_at:
        normalizeNumber(payload.latitude) != null && normalizeNumber(payload.longitude) != null
        ? new Date().toISOString()
        : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (clientError || !client) {
    return NextResponse.json(
      { error: clientError?.message ?? "Could not add client." },
      { status: 400 }
    );
  }

  const relationshipRole =
    profile.is_owner && (profile.owner_role === "client" || profile.owner_role === "family")
      ? profile.owner_role
      : "admin";

  const { error: assignmentError } = await admin
    .from("client_user_assignments")
    .insert({
      organization_id: profile.organization_id,
      client_id: client.id,
      user_id: profile.id,
      relationship_role: relationshipRole,
      assigned_by: profile.id,
      is_active: true,
    });

  if (assignmentError) {
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: assignmentError.message }, { status: 400 });
  }

  await maybeBackfillGeocode(admin, client.id, payload).catch(() => null);

  return NextResponse.json({ id: client.id });
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRadius(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 150;
}

async function maybeBackfillGeocode(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  payload: CreateClientRequest
) {
  if (normalizeNumber(payload.latitude) != null && normalizeNumber(payload.longitude) != null) {
    return;
  }

  const lookup = await lookupAddress({
    street_address_1: payload.streetAddress1 ?? null,
    street_address_2: payload.streetAddress2 ?? null,
    city: payload.city ?? null,
    state_or_region: payload.stateOrRegion ?? payload.state ?? null,
    postal_code: payload.postalCode ?? null,
    country: payload.country ?? null,
  });

  if (!lookup?.latitude || !lookup.longitude) {
    return;
  }

  await admin
    .from("clients")
    .update({
      formatted_address: lookup.formattedAddress,
      address: lookup.formattedAddress,
      latitude: lookup.latitude,
      longitude: lookup.longitude,
      geofence_radius_meters: 150,
      location_source: lookup.source,
      location_set_at: new Date().toISOString(),
    })
    .eq("id", clientId);
}
