import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomeInfoEditor, {
  type Allergy,
  type EmergencyContact,
  type Medication,
  type MedicationReminder,
  type SafetyItem,
} from "./home-info-editor";
import ClientUsersManager from "./client-users-manager";
import EmergencyGuideEditor from "./emergency-guide-editor";
import PetsEditor from "./pets-editor";
import ClientChecklist from "./checklist";
import ClientPhotoUploader from "./client-photo-uploader";
import ClientPhoto from "@/components/client-photo";
import PetsList from "@/components/pets-list";
import { withClientPhotoDisplayUrl } from "@/lib/client-photos";
import { withPetPhotoDisplayUrls } from "@/lib/pet-photos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientHomeInfo = {
  id: string;
  full_name: string;
  organization_id: string;
  photo_url: string | null;
  photo_display_url?: string | null;
  address: string | null;
  formatted_address: string | null;
  street_address_1: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  state_or_region: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  location_set_at: string | null;
  location_source: string | null;
  wifi_ssid: string | null;
  wifi_password: string | null;
  home_notes: string | null;
  preferred_hospital_name: string | null;
  preferred_hospital_address: string | null;
  preferred_hospital_phone: string | null;
  primary_physician_name: string | null;
  primary_physician_address: string | null;
  primary_physician_phone: string | null;
  show_medications_to_caregivers: boolean;
  show_allergies_to_caregivers: boolean;
};

type Document = {
  id: string;
  category: "emergency" | "wifi" | "instructions" | "general";
  title: string;
  description: string | null;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type UserOption = {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  has_real_email: boolean | null;
  role: "admin" | "client" | "caregiver" | "family";
  is_active: boolean;
};

type AssignmentOption = {
  user_id: string;
  role: "caregiver" | "family" | "client" | "admin" | "viewer" | "client-like";
  relationship_role: "caregiver" | "family" | "client" | "admin" | "viewer";
  is_active: boolean;
};

type Pet = {
  id?: string;
  name: string;
  pet_type: string;
  sex: "Male" | "Female" | "Unknown" | null;
  spayed_neutered: "Yes" | "No" | "Unknown" | null;
  photo_url: string | null;
  photo_display_url?: string | null;
  feeding_instructions: string | null;
  medication_instructions: string | null;
  behavior_notes: string | null;
  emergency_notes: string | null;
  supplies_location: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  emergency_vet_phone: string | null;
  microchip_number: string | null;
  vaccine_info: string | null;
  show_to_caregivers: boolean;
};

export default async function HomeInfoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = (await searchParams) ?? {};
  const currentTab =
    tab === "edit" ? "edit" : tab === "guide" ? "guide" : tab === "pets" ? "pets" : "view";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single<{ role: "admin" | "client" | "caregiver" | "family"; organization_id: string }>();

  if (!profile) redirect("/me");

  // Fetch organization settings to check mode
  const { data: org } = await supabase
    .from("organizations")
    .select("organization_mode, allow_client_admin_for_personal_use")
    .eq("id", profile.organization_id)
    .single();

  const isPersonalFamily = org?.organization_mode === "personal_family";
  const isClientDirected = org?.organization_mode === "client_directed_care";
  const allowClientAdmin = org?.allow_client_admin_for_personal_use;

  const canManage = profile.role === "admin" || 
    (profile.role === "client" && (
      (isPersonalFamily && allowClientAdmin) || 
      isClientDirected
    ));
  const backLabel = profile.role === "family" ? "Back to family" : "Back to clients";

  const { data: assignment } = await supabase
    .from("client_user_assignments")
    .select("user_id, role, relationship_role, is_active")
    .eq("client_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<AssignmentOption>();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, full_name, organization_id, photo_url, address, formatted_address, street_address_1, street_address_2, city, state, state_or_region, postal_code, country, latitude, longitude, geofence_radius_meters, location_set_at, location_source, wifi_ssid, wifi_password, home_notes, preferred_hospital_name, preferred_hospital_address, preferred_hospital_phone, primary_physician_name, primary_physician_address, primary_physician_phone, show_medications_to_caregivers, show_allergies_to_caregivers"
    )
    .eq("id", id)
    .single<ClientHomeInfo>();

  if (clientError) {
    return (
      <main className="px-5 py-10 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
          <h1 className="font-display text-2xl mb-2">Couldn't load home info</h1>
          <p className="text-ink-500 text-sm mb-2">{clientError.message}</p>
          <p className="text-xs text-ink-500 mb-5">
            If a column is missing, run the latest migration in Supabase SQL
            Editor.
          </p>
          <Link
            href="/clients"
            className="inline-block bg-forest-600 hover:bg-forest-700 text-cream-50 px-5 py-2.5 rounded-2xl text-sm font-medium transition"
          >
            {backLabel}
          </Link>
        </div>
      </main>
    );
  }

  if (!client) notFound();
  const clientWithPhoto = await withClientPhotoDisplayUrl(supabase, client);

  const canViewMedicationDetails =
    canManage ||
    assignment?.role === "client-like" ||
    (profile.role === "caregiver" &&
      client.show_medications_to_caregivers &&
      assignment?.is_active !== false &&
      (assignment?.role === "caregiver" ||
        assignment?.role === "admin" ||
        assignment?.role === "viewer" ||
        assignment?.relationship_role === "caregiver" ||
        assignment?.relationship_role === "admin" ||
        assignment?.relationship_role === "viewer"));
  const canViewAllergyDetails =
    canManage ||
    assignment?.role === "client-like" ||
    (profile.role === "caregiver" && client.show_allergies_to_caregivers);

  let contacts: EmergencyContact[] = [];
  try {
    const { data } = await supabase
      .from("client_emergency_contacts")
      .select("id, name, relationship, phone, alternate_phone, email, notes, priority_order")
      .eq("client_id", client.id)
      .order("priority_order", { ascending: true });
    contacts = (data ?? []) as EmergencyContact[];
  } catch {
    contacts = [];
  }

  let medications: Medication[] = [];
  try {
    const { data } = await supabase
      .from("client_medications")
      .select("id, medication_name, dose, schedule_instructions, notes, reminder_frequency, remind_caregiver, notify_client_family_when_marked, sort_order")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true })
      .order("medication_name", { ascending: true });
    const baseMedications = (data ?? []) as Omit<Medication, "reminders">[];
    let reminders: (MedicationReminder & { medication_id: string })[] = [];
    if (baseMedications.length > 0) {
      const { data: reminderData } = await supabase
        .from("client_medication_reminders")
        .select("id, medication_id, reminder_time, label, notify_caregiver, notify_client_family")
        .eq("client_id", client.id)
        .eq("is_active", true)
        .order("reminder_time", { ascending: true });
      reminders = (reminderData ?? []) as (MedicationReminder & { medication_id: string })[];
    }
    medications = baseMedications.map((medication) => ({
      ...medication,
      reminders: reminders.filter((reminder) => reminder.medication_id === medication.id),
    })) as Medication[];
  } catch {
    medications = [];
  }

  let allergies: Allergy[] = [];
  try {
    const { data } = await supabase
      .from("client_allergies")
      .select("id, name, reaction, severity, notes, sort_order")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    allergies = (data ?? []) as Allergy[];
  } catch {
    allergies = [];
  }

  let safetyItems: SafetyItem[] = [];
  try {
    const { data } = await supabase
      .from("client_safety_items")
      .select("id, label, value_location, notes, visible_to_caregivers, sort_order")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    safetyItems = (data ?? []) as SafetyItem[];
  } catch {
    safetyItems = [];
  }

  const canViewSafetyDetails =
    canManage ||
    assignment?.role === "client-like" ||
    safetyItems.length > 0;

  // Fetch documents (silent fail)
  let documents: Document[] = [];
  try {
    const { data } = await supabase
      .from("client_documents")
      .select(
        "id, category, title, description, storage_path, mime_type, file_size_bytes, created_at"
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    documents = (data ?? []) as Document[];
  } catch {
    documents = [];
  }

  let users: UserOption[] = [];
  let assignedUserIds: string[] = [];
  let assignments: AssignmentOption[] = [];
  if (canManage) {
    const [{ data: usersData }, { data: assignmentsData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, username, has_real_email, role, is_active")
        .eq("organization_id", client.organization_id)
        .order("full_name"),
      supabase
        .from("client_user_assignments")
        .select("user_id, role, relationship_role, is_active")
        .eq("client_id", client.id)
        .eq("is_active", true),
    ]);

    users = (usersData ?? []) as UserOption[];
    assignments = (assignmentsData ?? []) as AssignmentOption[];
    assignedUserIds = assignments.map((row) => row.user_id);
  }

  // Fetch emergency preparedness guide
  const { data: guide } = await supabase
    .from("client_emergency_guides")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle();

  // Fetch pet details
  const { data: petsData } = await supabase
    .from("client_pets")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });

  const pets = await withPetPhotoDisplayUrls(supabase, (petsData ?? []) as Pet[]);

  // Compute checklist metrics
  const isGeofenceSet = !!(client.address && client.latitude && client.longitude);
  const isContactsAdded = contacts.length > 0;
  const isPetsConfigured = pets.length > 0;
  const isGuideConfigured = !!(guide?.enabled);
  const isNotesAdded = !!client.home_notes;
  const isAllergiesConfigured = allergies.length > 0 || medications.length > 0;

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/clients"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← {backLabel}
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          {client.full_name}
        </h1>
        <p className="text-ink-500 text-sm">
          {profile.role === "family"
            ? "Home info for family access"
            : profile.role === "caregiver"
              ? "Home info for caregivers"
              : "Home info"}
        </p>
      </header>

      {canManage && (
        <>
          {/* Completion Checklist */}
          <ClientChecklist
            isGeofenceSet={isGeofenceSet}
            isContactsAdded={isContactsAdded}
            isPetsConfigured={isPetsConfigured}
            isGuideConfigured={isGuideConfigured}
            isNotesAdded={isNotesAdded}
            isAllergiesConfigured={isAllergiesConfigured}
          />

          {/* Navigation tabs */}
          <div className="flex gap-1.5 p-1 bg-cream-50 rounded-2xl border border-cream-200/80 mb-5 text-center no-print">
            <Link
              href={`/clients/${client.id}/home-info`}
              className={`flex-1 text-xs py-2.5 rounded-xl font-medium transition ${
                currentTab === "view"
                  ? "bg-white text-forest-700 shadow-sm"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              View
            </Link>
            <Link
              href={`/clients/${client.id}/home-info?tab=edit`}
              className={`flex-1 text-xs py-2.5 rounded-xl font-medium transition ${
                currentTab === "edit"
                  ? "bg-white text-forest-700 shadow-sm"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Edit Info
            </Link>
            <Link
              href={`/clients/${client.id}/home-info?tab=guide`}
              className={`flex-1 text-xs py-2.5 rounded-xl font-medium transition ${
                currentTab === "guide"
                  ? "bg-white text-forest-700 shadow-sm"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Emergency Guide
            </Link>
            <Link
              href={`/clients/${client.id}/home-info?tab=pets`}
              className={`flex-1 text-xs py-2.5 rounded-xl font-medium transition ${
                currentTab === "pets"
                  ? "bg-white text-forest-700 shadow-sm"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Pet Records
            </Link>
          </div>
        </>
      )}

      {/* Tab content */}
      {currentTab === "view" && (
        <ClientViewSummary client={clientWithPhoto} pets={pets} documents={documents} canManage={canManage} />
      )}

      {(currentTab === "view" || (!canManage && currentTab === "edit")) && (
        <section className="mt-4">
          <HomeInfoEditor
            client={clientWithPhoto}
            contacts={contacts}
            medications={medications}
            allergies={allergies}
            safetyItems={safetyItems}
            documents={documents}
            canManage={false}
            canEditWifi={false}
            canViewMedicationDetails={canViewMedicationDetails}
            canViewAllergyDetails={canViewAllergyDetails}
            canViewSafetyDetails={canViewSafetyDetails}
            assignmentRole={assignment?.role ?? null}
          />
        </section>
      )}

      {canManage && currentTab === "edit" && (
        <>
          <HomeInfoEditor
            client={clientWithPhoto}
            contacts={contacts}
            medications={medications}
            allergies={allergies}
            safetyItems={safetyItems}
            documents={documents}
            canManage={canManage}
            canEditWifi={canManage}
            canViewMedicationDetails={canViewMedicationDetails}
            canViewAllergyDetails={canViewAllergyDetails}
            canViewSafetyDetails={canViewSafetyDetails}
            assignmentRole={assignment?.role ?? null}
          />
          {canManage && (
            <ClientUsersManager
              clientId={client.id}
              users={users}
              assignedUserIds={assignedUserIds}
              assignments={assignments}
            />
          )}
        </>
      )}

      {canManage && currentTab === "guide" && (
        <EmergencyGuideEditor clientId={client.id} initialGuide={guide} client={clientWithPhoto} />
      )}

      {!canManage && currentTab === "guide" && (
        <ReadOnlyEmergencyGuide guide={guide} client={client} />
      )}

      {currentTab === "pets" && (
        canManage ? (
          <PetsEditor clientId={client.id} initialPets={pets} orgId={profile.organization_id} />
        ) : (
          <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
            <PetsList pets={pets} readOnly={true} />
          </section>
        )
      )}
    </main>
  );
}

function ClientViewSummary({
  client,
  pets,
  documents,
  canManage,
}: {
  client: ClientHomeInfo;
  pets: Pet[];
  documents: Document[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-base text-ink-900">Client profile</h2>
            <p className="text-xs text-ink-500">Photo and care recipient summary</p>
          </div>
          {!canManage && (
            <ClientPhoto
              name={client.full_name}
              photoUrl={client.photo_display_url ?? client.photo_url}
              size="md"
            />
          )}
        </div>
        {canManage ? (
          <ClientPhotoUploader
            clientId={client.id}
            orgId={client.organization_id}
            clientName={client.full_name}
            currentPhotoUrl={client.photo_display_url ?? client.photo_url}
          />
        ) : (
          <ReadOnly label="Location" value={client.address || "Location not set"} />
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-base text-ink-900">Pets ({pets.length})</h2>
          <Link href={`/clients/${client.id}/home-info?tab=pets`} className="text-sm text-forest-600 font-medium hover:underline">
            View pets
          </Link>
        </div>
        {pets.length === 0 ? (
          <p className="text-sm text-ink-500">No pets listed</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pets.slice(0, 4).map((pet) => {
              const photoUrl = pet.photo_display_url ?? pet.photo_url;
              return (
                <Link
                  key={pet.id ?? pet.name}
                  href={`/clients/${client.id}/home-info?tab=pets`}
                  className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/50 hover:bg-cream-100 p-3 transition"
                >
                  <span className="w-20 h-20 rounded-2xl bg-white overflow-hidden grid place-items-center text-lg font-semibold text-forest-700 shrink-0 border border-cream-200">
                    {photoUrl ? (
                      <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={petPresetForType(pet.pet_type)} alt={`${pet.name} preset avatar`} className="w-full h-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900 truncate">{pet.name}</span>
                    <span className="block text-xs text-ink-500 capitalize">{pet.pet_type || "Pet"}</span>
                    {(pet.medication_instructions || pet.emergency_notes || pet.behavior_notes) && (
                      <span className="block text-[10px] text-terracotta-600 mt-1">Pet notes available</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <Link href={`/clients/${client.id}/home-info?tab=guide`} className="flex items-center justify-between bg-white hover:bg-cream-50 px-5 py-4 rounded-2xl shadow-soft transition">
          <span>
            <span className="block font-medium text-ink-900">Emergency guide</span>
            <span className="block text-xs text-ink-500">Preparedness and evacuation info</span>
          </span>
          <span className="text-ink-300">→</span>
        </Link>
        <Link href={`/clients/${client.id}/documents`} className="flex items-center justify-between bg-white hover:bg-cream-50 px-5 py-4 rounded-2xl shadow-soft transition">
          <span>
            <span className="block font-medium text-ink-900">Documents ({documents.length})</span>
            <span className="block text-xs text-ink-500">Care documents and instructions</span>
          </span>
          <span className="text-ink-300">→</span>
        </Link>
        {canManage && (
          <Link href={`/clients/${client.id}/home-info?tab=edit`} className="flex items-center justify-between bg-forest-600 hover:bg-forest-700 text-cream-50 px-5 py-4 rounded-2xl shadow-soft transition">
            <span className="font-medium">Edit client info</span>
            <span>→</span>
          </Link>
        )}
      </section>
    </div>
  );
}

function petPresetForType(type?: string | null) {
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("cat")) return "/avatar-presets/cat.png";
  if (normalized.includes("dog")) return "/avatar-presets/dog.png";
  if (normalized.includes("bird")) return "/avatar-presets/paw.png";
  if (normalized.includes("fish")) return "/avatar-presets/fish.png";
  if (normalized.includes("reptile")) return "/avatar-presets/dinosaur.png";
  if (normalized.includes("rabbit") || normalized.includes("bunny")) return "/avatar-presets/paw.png";
  return "/avatar-presets/paw.png";
}

function ReadOnlyEmergencyGuide({
  guide,
  client,
}: {
  guide: any;
  client: ClientHomeInfo;
}) {
  if (!guide?.enabled) {
    return (
      <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
        <p className="text-sm text-ink-500">No emergency guide is enabled for this client.</p>
      </section>
    );
  }

  const items = [
    ["Medical emergency", guide.medical_emergency_plan],
    ["Fall plan", guide.fall_plan],
    ["Fire evacuation", guide.fire_evacuation_plan],
    ["Severe weather", guide.severe_weather_plan],
    ["Power outage", guide.power_outage_plan],
    ["Pet evacuation", guide.pet_evacuation_plan],
    ["Supplies", guide.supplies_location],
    ["Backup contact", guide.backup_contact_instructions],
    ["Mobility equipment", guide.mobility_equipment],
    ["Oxygen / fire risk", guide.oxygen_fire_risk],
    ["Emergency access", guide.access_notes],
    ["Other", guide.other_instructions],
  ].filter(([, value]) => typeof value === "string" && value.trim());

  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <h2 className="font-display text-base text-ink-900 mb-3">Emergency guide</h2>
      <ReadOnly label="Preferred hospital" value={client.preferred_hospital_name || guide.hospital_preference || "Not set"} />
      <div className="space-y-3 mt-3">
        {items.length === 0 ? (
          <p className="text-sm text-ink-500">No guide details listed.</p>
        ) : (
          items.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-cream-50 border border-cream-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
              <p className="text-sm text-ink-900 whitespace-pre-wrap">{value}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-cream-200 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-500">{label}</span>
      <span className="text-sm text-ink-900 text-right">{value}</span>
    </div>
  );
}
