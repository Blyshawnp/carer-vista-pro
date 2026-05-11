import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import EmergencyPanel from "@/components/emergency-panel";
import { ArrowRightIcon } from "@/components/icons";
import IncidentReportModal from "./incident-report-modal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientFull = {
  id: string;
  full_name: string;
  address: string | null;
  preferred_hospital_name: string | null;
  preferred_hospital_address: string | null;
  preferred_hospital_phone: string | null;
  primary_physician_name: string | null;
  primary_physician_address: string | null;
  primary_physician_phone: string | null;
};

type ClientBundle = ClientFull & {
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
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

type SafetyItem = {
  id: string;
  client_id: string;
  label: string;
  value_location: string;
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

type IncidentReport = {
  id: string;
  category: string;
  description: string;
  created_at: string;
  client_id: string | null;
  shift_id: string | null;
  profiles: { full_name: string | null } | null;
  clients: { full_name: string | null } | null;
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

  const { data: clientsRaw } = await supabase
    .from("clients")
    .select(
      "id, full_name, address, preferred_hospital_name, preferred_hospital_address, preferred_hospital_phone, primary_physician_name, primary_physician_address, primary_physician_phone"
    )
    .order("full_name");

  const clients = (clientsRaw ?? []) as ClientFull[];
  const canFileIncident = profile?.role !== "family";

  let activeShiftClientId: string | null = null;
  let activeShiftId: string | null = null;
  if (profile?.role === "caregiver") {
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("id, client_id, check_ins!inner(id, check_in_time, check_out_time)")
      .eq("caregiver_id", user.id)
      .not("check_ins.check_in_time", "is", null)
      .is("check_ins.check_out_time", null)
      .maybeSingle<{ id: string; client_id: string | null }>();
    activeShiftId = activeShift?.id ?? null;
    activeShiftClientId = activeShift?.client_id ?? null;
  }

  let allContacts: EmergencyContact[] = [];
  try {
    const { data } = await supabase
      .from("client_emergency_contacts")
      .select("id, client_id, name, relationship, phone, alternate_phone, email, notes, priority_order")
      .order("priority_order", { ascending: true });
    allContacts = (data ?? []) as EmergencyContact[];
  } catch {
    allContacts = [];
  }

  let allMedications: Medication[] = [];
  try {
    const { data } = await supabase
      .from("client_medications")
      .select("id, client_id, medication_name, dose, schedule_instructions, notes")
      .order("sort_order", { ascending: true });
    allMedications = (data ?? []) as Medication[];
  } catch {
    allMedications = [];
  }

  let allAllergies: Allergy[] = [];
  try {
    const { data } = await supabase
      .from("client_allergies")
      .select("id, client_id, name, reaction, severity, notes")
      .order("sort_order", { ascending: true });
    allAllergies = (data ?? []) as Allergy[];
  } catch {
    allAllergies = [];
  }

  let allSafetyItems: SafetyItem[] = [];
  try {
    const { data } = await supabase
      .from("client_safety_items")
      .select("id, client_id, label, value_location, notes")
      .order("sort_order", { ascending: true });
    allSafetyItems = (data ?? []) as SafetyItem[];
  } catch {
    allSafetyItems = [];
  }

  let incidentReports: IncidentReport[] = [];
  try {
    const { data } = await supabase
      .from("incident_reports")
      .select("id, category, description, created_at, client_id, shift_id, profiles:reported_by(full_name), clients(full_name)")
      .order("created_at", { ascending: false })
      .limit(12);
    incidentReports = (data ?? []) as IncidentReport[];
  } catch {
    incidentReports = [];
  }

  const clientBundles: ClientBundle[] = clients.map((client) => ({
    ...client,
    contacts: allContacts.filter((contact) => contact.client_id === client.id),
    medications: allMedications.filter((medication) => medication.client_id === client.id),
    allergies: allAllergies.filter((allergy) => allergy.client_id === client.id),
    safetyItems: allSafetyItems.filter((item) => item.client_id === client.id),
  }));

  const { data: urgentIncidents } = await supabase
    .from("incidents")
    .select("id, title")
    .eq("severity", "urgent")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <main className="px-5 py-6 max-w-2xl mx-auto">
      <header className="mb-5">
        <Link
          href="/home"
          className="text-sm text-forest-600 hover:underline mb-2 inline-block"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative w-14 h-14 rounded-full bg-[#FF0000] grid place-items-center shrink-0 shadow-xl ring-4 ring-red-200/80 overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
            <Image src="/icons/emergency.png" alt="" width={30} height={30} className="relative z-10" />
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

      {(urgentIncidents ?? []).length > 0 && (
        <section className="mb-6 space-y-2">
          {urgentIncidents?.map((inc) => (
            <Link
              key={inc.id}
              href={`/incidents?incident=${inc.id}`}
              className="flex items-center justify-between bg-terracotta-500 text-white p-5 rounded-[2rem] shadow-lg animate-pulse border-2 border-white/20"
            >
              <div className="flex items-center gap-3 min-w-0">
                 <Image src="/icons/emergency.png" alt="" width={24} height={24} className="shrink-0" />
                 <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-80 leading-none mb-1">Active Urgent Incident</p>
                    <p className="font-display text-lg truncate leading-none">{inc.title}</p>
                 </div>
              </div>
              <ArrowRightIcon size={20} className="shrink-0 ml-2" />
            </Link>
          ))}
        </section>
      )}

      <a
        href="tel:911"
        className="block bg-red-600 hover:bg-red-700 text-cream-50 rounded-[2rem] p-6 mb-8 transition active:scale-[0.99] shadow-xl text-center border-4 border-white/10"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-cream-50/70 mb-1 font-bold">
          Emergency Services
        </p>
        <p className="font-display text-4xl">Call 911</p>
      </a>

      {(canFileIncident || profile?.role !== "caregiver") && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {canFileIncident && (
            <Link
              href="/emergency?report=1"
              className="bg-terracotta-600 hover:bg-terracotta-500 text-cream-50 rounded-2xl shadow-soft px-4 py-3 transition active:scale-[0.99] border border-terracotta-400/30"
            >
              <span className="block font-medium">Report an incident</span>
              <span className="block text-xs text-cream-50/80">Create a care or safety report</span>
            </Link>
          )}
          {profile?.role !== "caregiver" && (
            <Link
              href="/incidents"
              className="bg-white hover:bg-cream-50 rounded-2xl shadow-soft px-4 py-3 transition active:scale-[0.99]"
            >
              <span className="block font-medium text-ink-900">Incident history</span>
              <span className="block text-xs text-ink-500">Review submitted reports</span>
            </Link>
          )}
        </section>
      )}

      <IncidentReportModal
        clients={clientBundles}
        defaultClientId={activeShiftClientId}
        currentShiftId={activeShiftId}
        openByDefault={report === "1"}
        canFile={canFileIncident}
      />

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
          className="inline-block mt-2 text-sm text-forest-600 hover:underline font-medium"
        >
          Read the full disclaimer
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-soft text-center grain-overlay">
          <p className="text-sm text-ink-500">No clients to show.</p>
        </div>
      ) : (
        <div id="emergency-info" className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold px-1">Client Medical Info</h2>
          {clientBundles.map((client) => {
            return (
              <div key={client.id}>
                <div className="flex items-baseline justify-between mb-1.5 px-1">
                  <h2 className="font-display text-lg text-ink-900">
                    {client.full_name}
                  </h2>
                  {client.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-forest-600 hover:underline font-medium"
                    >
                      View Map
                    </a>
                  )}
                </div>
                <EmergencyPanel
                  info={client}
                  contacts={client.contacts}
                  medications={client.medications}
                  allergies={client.allergies}
                  safetyItems={client.safetyItems}
                />
              </div>
            );
          })}
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
                <p className="text-sm text-ink-500 mt-1 line-clamp-2">{report.description}</p>
                <p className="text-xs text-ink-400 mt-2">
                  {report.profiles?.full_name ?? "Reporter"} · {report.clients?.full_name ?? "No client"} · {new Date(report.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
