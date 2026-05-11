import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomeInfoEditor, {
  type Allergy,
  type EmergencyContact,
  type Medication,
  type SafetyItem,
} from "./home-info-editor";
import ClientUsersManager from "./client-users-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientHomeInfo = {
  id: string;
  full_name: string;
  organization_id: string;
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
  role: "admin" | "client" | "caregiver" | "family";
  is_active: boolean;
};

export default async function HomeInfoPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "admin" | "client" | "caregiver" | "family" }>();

  if (!profile) redirect("/me");
  const canManage = profile.role === "admin" || profile.role === "client";

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, full_name, organization_id, wifi_ssid, wifi_password, home_notes, preferred_hospital_name, preferred_hospital_address, preferred_hospital_phone, primary_physician_name, primary_physician_address, primary_physician_phone, show_medications_to_caregivers, show_allergies_to_caregivers"
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
            Back to clients
          </Link>
        </div>
      </main>
    );
  }

  if (!client) notFound();

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
      .select("id, medication_name, dose, schedule_instructions, notes, sort_order")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true })
      .order("medication_name", { ascending: true });
    medications = (data ?? []) as Medication[];
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
  if (canManage) {
    const [{ data: usersData }, { data: assignmentsData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active")
        .eq("organization_id", client.organization_id)
        .order("full_name"),
      supabase
        .from("client_user_assignments")
        .select("user_id")
        .eq("client_id", client.id)
        .eq("is_active", true),
    ]);

    users = (usersData ?? []) as UserOption[];
    assignedUserIds = (assignmentsData ?? []).map((row) => row.user_id as string);
  }

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/clients"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back to clients
        </Link>
        <h1 className="font-display text-3xl text-ink-900">
          {client.full_name}
        </h1>
        <p className="text-ink-500 text-sm">
          Home info for caregivers
        </p>
      </header>

      <HomeInfoEditor
        client={client}
        contacts={contacts}
        medications={medications}
        allergies={allergies}
        safetyItems={safetyItems}
        documents={documents}
        canEditWifi={canManage}
      />
      {canManage && (
        <ClientUsersManager
          clientId={client.id}
          users={users}
          assignedUserIds={assignedUserIds}
        />
      )}
    </main>
  );
}
