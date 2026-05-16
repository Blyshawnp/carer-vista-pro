import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import EmergencyPanel from "@/components/emergency-panel";
import IncidentReportModal from "./incident-report-modal";
import { ArrowRightIcon } from "@/components/icons";
import { formatStructuredAddress, normalizeCountry } from "@/lib/address";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientFull = {
  id: string;
  full_name: string;
  address: string | null;
  formatted_address: string | null;
  street_address_1: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  state_or_region: string | null;
  postal_code: string | null;
  country: string | null;
  preferred_hospital_name: string | null;
  preferred_hospital_address: string | null;
  preferred_hospital_phone: string | null;
  primary_physician_name: string | null;
  primary_physician_address: string | null;
  primary_physician_phone: string | null;
  show_medications_to_caregivers: boolean;
};

type EmergencyContact = {
  id: string;
  client_id: string;
  name: string;
  relationship: string;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  notes: string | null;
  priority_order: number;
};

type Medication = {
  id: string;
  client_id: string;
  medication_name: string;
  dose: string | null;
  schedule_instructions: string | null;
  notes: string | null;
};

type Allergy = {
  id: string;
  client_id: string;
  name: string;
  reaction: string | null;
  severity: "critical" | "mild" | "minor" | null;
  notes: string | null;
};

type SafetyItem = {
  id: string;
  client_id: string;
  label: string;
  value_location: string;
  notes: string | null;
};

type ClientBundle = Omit<
  ClientFull,
  | "formatted_address"
  | "street_address_1"
  | "street_address_2"
  | "city"
  | "state"
  | "state_or_region"
  | "postal_code"
  | "country"
> & {
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
};

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams?: Promise<{ report?: string }>;
}) {
  const { report } = (await searchParams) ?? {};
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

  const canFileIncident = profile?.role !== "family";
  let activeShiftClientId: string | null = null;
  let activeShiftId: string | null = null;

  if (profile?.role === "caregiver") {
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("id, client_id, check_ins!inner ( id, check_in_time, check_out_time )")
      .eq("caregiver_id", user.id)
      .not("check_ins.check_in_time", "is", null)
      .is("check_ins.check_out_time", null)
      .maybeSingle<{ id: string; client_id: string | null }>();

    activeShiftId = activeShift?.id ?? null;
    activeShiftClientId = activeShift?.client_id ?? null;
  }

  const { data: clientsRaw } = await supabase
    .from("clients")
    .select(
      "id, full_name, address, formatted_address, street_address_1, street_address_2, city, state, state_or_region, postal_code, country, preferred_hospital_name, preferred_hospital_address, preferred_hospital_phone, primary_physician_name, primary_physician_address, primary_physician_phone, show_medications_to_caregivers"
    )
    .order("full_name");

  const clients = ((clientsRaw ?? []) as ClientFull[]).map((client) => ({
    ...client,
    address: displayAddress(client),
  }));
  const clientIds = clients.map((client) => client.id);

  const [contactsResult, medicationsResult, allergiesResult, safetyResult, incidentsResult] =
    await Promise.all([
      clientIds.length
        ? supabase
            .from("client_emergency_contacts")
            .select("id, client_id, name, relationship, phone, alternate_phone, email, notes, priority_order")
            .in("client_id", clientIds)
            .order("priority_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      clientIds.length
        ? supabase
            .from("client_medications")
            .select("id, client_id, medication_name, dose, schedule_instructions, notes")
            .in("client_id", clientIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      clientIds.length
        ? supabase
            .from("client_allergies")
            .select("id, client_id, name, reaction, severity, notes")
            .in("client_id", clientIds)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [] }),
      clientIds.length
        ? supabase
            .from("client_safety_items")
            .select("id, client_id, label, value_location, notes")
            .in("client_id", clientIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from("incident_reports")
        .select("id, category, description, created_at, client_id, shift_id, profiles:reported_by(full_name), clients(full_name)")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const contacts = (contactsResult.data ?? []) as EmergencyContact[];
  const medications = (medicationsResult.data ?? []) as Medication[];
  const allergies = (allergiesResult.data ?? []) as Allergy[];
  const safetyItems = (safetyResult.data ?? []) as SafetyItem[];
  const incidentReports = ((incidentsResult.data ?? []) as unknown as Array<{
    id: string;
    category: string;
    description: string;
    created_at: string;
    profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null;
    clients: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  }>).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
    clients: Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients,
  }));

  const clientBundles: ClientBundle[] = clients.map((client) => ({
    ...client,
    contacts: contacts.filter((contact) => contact.client_id === client.id),
    medications: medications.filter((medication) => medication.client_id === client.id),
    allergies: allergies.filter((allergy) => allergy.client_id === client.id),
    safetyItems: safetyItems.filter((item) => item.client_id === client.id),
  }));

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-5">
        <Link
          href="/home"
          className="text-sm text-navy-600 hover:underline mb-2 inline-block"
        >
          Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative w-14 h-14 grid place-items-center shrink-0">
            <Image
              src="/icons/emergency.png"
              alt=""
              width={52}
              height={52}
              className="object-contain"
            />
          </span>
          <div>
            <h1 className="font-display text-3xl text-ink-900 leading-tight">
              Emergency
            </h1>
            <p className="text-ink-500 text-sm">
              Critical info and active alerts.
            </p>
          </div>
        </div>
      </header>

      <a
        href="tel:911"
        className="block bg-red-600 hover:bg-red-700 text-cream-50 rounded-[2rem] p-6 mb-6 transition active:scale-[0.99] shadow-xl text-center border-4 border-white/10"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-cream-50/70 mb-1 font-bold">
          Emergency services
        </p>
        <p className="font-display text-4xl">Call 911</p>
      </a>

      {canFileIncident && (
        <section className="mb-5">
          <IncidentReportModal
            clients={clientBundles}
            defaultClientId={activeShiftClientId}
            currentShiftId={activeShiftId}
            openByDefault={report === "1"}
            canFile={canFileIncident}
          />
        </section>
      )}

      <div className="bg-white rounded-2xl shadow-soft p-4 mb-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold mb-1">
          Emergency note
        </p>
        <p className="text-sm text-ink-700">
          This app is for care coordination only. In a medical, safety, fire,
          police, or life-threatening emergency, call your local emergency number
          immediately.
        </p>
        <Link
          href="/emergency-disclaimer"
          className="inline-block mt-2 text-sm text-navy-600 hover:underline font-medium"
        >
          Read the full disclaimer
        </Link>
      </div>

      {clientBundles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-soft text-center grain-overlay">
          <p className="text-sm text-ink-500">No clients to show.</p>
        </div>
      ) : (
        <div id="emergency-info" className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold px-1">
            Client medical info
          </h2>
          {clientBundles.map((client) => (
            <div key={client.id}>
              <div className="flex items-baseline justify-between mb-1.5 px-1">
                <h3 className="font-display text-lg text-ink-900">
                  {client.full_name}
                </h3>
                {client.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-navy-600 hover:underline font-medium"
                  >
                    View map
                  </a>
                )}
              </div>
              <EmergencyPanel
                info={client}
                contacts={client.contacts}
                medications={client.medications}
                allergies={client.allergies}
                safetyItems={client.safetyItems}
                medicationDetailsHidden={
                  profile?.role === "caregiver" &&
                  !client.show_medications_to_caregivers
                }
              />
            </div>
          ))}
        </div>
      )}

      {incidentReports.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold px-1 mb-2">
            Recent incident reports
          </h2>
          <ul className="space-y-2">
            {incidentReports.map((report) => (
              <li key={report.id} className="bg-white rounded-2xl shadow-soft p-4">
                <p className="font-medium text-ink-900">{report.category}</p>
                <p className="text-sm text-ink-500 mt-1 line-clamp-2">
                  {report.description}
                </p>
                <p className="text-xs text-ink-400 mt-2">
                  {report.profiles?.full_name ?? "Reporter"} ·{" "}
                  {report.clients?.full_name ?? "No client"} ·{" "}
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/incidents"
            className="mt-3 flex items-center justify-between bg-white hover:bg-cream-50 px-4 py-3 rounded-2xl shadow-soft text-ink-900 font-medium transition"
          >
            Incident history
            <ArrowRightIcon size={16} className="text-ink-300" />
          </Link>
        </section>
      )}
    </main>
  );
}

function displayAddress(client: ClientFull) {
  const fallback = client.formatted_address ?? client.address;
  const country = normalizeCountry(client.country);
  if (fallback?.trim() && fallback.trim() !== country) return fallback;

  return formatStructuredAddress({
    street_address_1: client.street_address_1,
    street_address_2: client.street_address_2,
    city: client.city,
    state_or_region: client.state_or_region ?? client.state,
    postal_code: client.postal_code,
    country: client.country,
  });
}
