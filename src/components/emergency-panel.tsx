"use client";

import { useState } from "react";
import { StarOfLifeIcon } from "./icons";

type Allergy = {
  id: string;
  name: string;
  reaction: string | null;
  severity: "critical" | "mild" | "minor" | null;
  notes: string | null;
};

type EmergencyContact = {
  id: string;
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
  medication_name: string;
  dose: string | null;
  schedule_instructions: string | null;
  notes: string | null;
};

type SafetyItem = {
  id: string;
  label: string;
  value_location: string;
  notes: string | null;
};

type EmergencyInfo = {
  // Hospital
  preferred_hospital_name: string | null;
  preferred_hospital_address: string | null;
  preferred_hospital_phone: string | null;
  // Physician
  primary_physician_name: string | null;
  primary_physician_address: string | null;
  primary_physician_phone: string | null;
};

export default function EmergencyPanel({
  info,
  contacts,
  medications,
  allergies,
  safetyItems,
}: {
  info: EmergencyInfo;
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  const criticalAllergies = allergies.filter((a) => a.severity === "critical");
  const mildAllergies = allergies.filter((a) => a.severity === "mild");
  const minorAllergies = allergies.filter((a) => a.severity === "minor");
  const unspecifiedAllergies = allergies.filter((a) => !a.severity);

  const hasContacts = contacts.length > 0;
  const hasHospital = !!(
    info.preferred_hospital_name || info.preferred_hospital_phone
  );
  const hasPhysician = !!(
    info.primary_physician_name || info.primary_physician_phone
  );
  const hasSafetyItems = safetyItems.length > 0;

  // Don't render the panel at all if there's nothing to show
  const hasAnyInfo =
    hasContacts ||
    hasHospital ||
    hasPhysician ||
    hasSafetyItems ||
    allergies.length > 0 ||
    medications.length > 0;
  if (!hasAnyInfo) return null;

  return (
    <section className="bg-white rounded-3xl shadow-soft border-2 border-terracotta-500/30 mt-4 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-5 hover:bg-red-50 transition text-left"
      >
        <span className="w-10 h-10 rounded-xl bg-red-600 text-cream-50 grid place-items-center shrink-0">
          <StarOfLifeIcon size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg text-ink-900">Emergency info</p>
          <p className="text-xs text-ink-500">
            {criticalAllergies.length > 0 && (
              <span className="text-terracotta-600 font-medium mr-2">
                {criticalAllergies.length} critical{" "}
                {criticalAllergies.length === 1 ? "allergy" : "allergies"}
              </span>
            )}
            {hasContacts && "Contacts · "}
            {medications.length > 0 && "Medications · "}
            {hasHospital && "Hospital · "}
            {hasPhysician && "Physician · "}
            {hasSafetyItems && "Safety"}
            {allergies.length === 0 &&
              !hasContacts &&
              medications.length === 0 &&
              !hasHospital &&
              !hasPhysician &&
              !hasSafetyItems &&
              "Tap to view"}
          </p>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-cream-200">
          {/* ALLERGIES (always first if present) */}
          {allergies.length > 0 && (
            <Section title="Allergies">
              {criticalAllergies.length > 0 && (
                <AllergyGroup
                  label="Critical"
                  tone="critical"
                  items={criticalAllergies}
                />
              )}
              {mildAllergies.length > 0 && (
                <AllergyGroup
                  label="Mild"
                  tone="mild"
                  items={mildAllergies}
                />
              )}
              {minorAllergies.length > 0 && (
                <AllergyGroup
                  label="Minor"
                  tone="minor"
                  items={minorAllergies}
                />
              )}
              {unspecifiedAllergies.length > 0 && (
                <AllergyGroup
                  label="Not specified"
                  tone="minor"
                  items={unspecifiedAllergies}
                />
              )}
            </Section>
          )}

          {/* EMERGENCY CONTACTS */}
          {hasContacts && (
            <Section title="Emergency contacts">
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                />
              ))}
            </Section>
          )}

          {medications.length > 0 && (
            <Section title="Medications">
              {medications.map((medication) => (
                <MedicationRow key={medication.id} medication={medication} />
              ))}
            </Section>
          )}

          {/* HOSPITAL */}
          {hasHospital && (
            <Section title="Preferred hospital">
              <PlaceRow
                name={info.preferred_hospital_name}
                address={info.preferred_hospital_address}
                phone={info.preferred_hospital_phone}
              />
            </Section>
          )}

          {/* PHYSICIAN */}
          {hasPhysician && (
            <Section title="Primary physician">
              <PlaceRow
                name={info.primary_physician_name}
                address={info.primary_physician_address}
                phone={info.primary_physician_phone}
              />
            </Section>
          )}

          {hasSafetyItems && (
            <Section title="Emergency & safety items">
              {safetyItems.map((item) => (
                <DeviceRow
                  key={item.id}
                  label={item.label}
                  location={item.value_location}
                  notes={item.notes}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-2 mt-4">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AllergyGroup({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "critical" | "mild" | "minor";
  items: Allergy[];
}) {
  const styles = {
    critical: "bg-terracotta-500/10 border-terracotta-500/40 text-terracotta-700",
    mild: "bg-yellow-50 border-yellow-300/50 text-yellow-800",
    minor: "bg-cream-50 border-cream-200 text-ink-700",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${styles[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold mb-1">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((a) => (
          <li key={a.id} className="text-sm">
            <span className="font-medium">{a.name}</span>
            {a.reaction && (
              <span className="text-xs opacity-80"> · {a.reaction}</span>
            )}
            {a.notes && (
              <span className="text-xs opacity-80"> · {a.notes}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactRow({
  contact,
}: {
  contact: EmergencyContact;
}) {
  return (
    <div className="bg-cream-50 rounded-xl px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink-900 truncate">{contact.name}</p>
          <p className="text-xs text-ink-500">{contact.relationship}</p>
        </div>
        <a
          href={`tel:${contact.phone}`}
          className="text-sm text-forest-600 font-medium hover:underline shrink-0"
        >
          {contact.phone}
        </a>
      </div>
      {(contact.alternate_phone || contact.email || contact.notes) && (
        <div className="mt-2 space-y-0.5 text-xs text-ink-500">
          {contact.alternate_phone && (
            <p>
              Alternate:{" "}
              <a href={`tel:${contact.alternate_phone}`} className="text-forest-600 hover:underline">
                {contact.alternate_phone}
              </a>
            </p>
          )}
          {contact.email && <p>{contact.email}</p>}
          {contact.notes && <p>{contact.notes}</p>}
        </div>
      )}
    </div>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  return (
    <div className="bg-cream-50 rounded-xl px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium text-ink-900">{medication.medication_name}</p>
        {medication.dose && <p className="text-xs text-ink-500">Dose: {medication.dose}</p>}
        {medication.schedule_instructions && (
          <p className="text-xs text-ink-500">{medication.schedule_instructions}</p>
        )}
        {medication.notes && <p className="text-xs text-ink-500">{medication.notes}</p>}
      </div>
    </div>
  );
}

function PlaceRow({
  name,
  address,
  phone,
}: {
  name: string | null;
  address: string | null;
  phone: string | null;
}) {
  return (
    <div className="bg-cream-50 rounded-xl px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-ink-900">{name ?? "—"}</p>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="text-sm text-forest-600 font-medium hover:underline shrink-0"
          >
            {phone}
          </a>
        )}
      </div>
      {address && (
        <p className="text-xs text-ink-500 mt-0.5">{address}</p>
      )}
    </div>
  );
}

function DeviceRow({
  label,
  location,
  notes,
}: {
  label: string;
  location: string;
  notes?: string | null;
}) {
  return (
    <div className="bg-cream-50 rounded-xl px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-ink-500 shrink-0">
          {label}
        </span>
        <span className="text-sm text-ink-900 text-right">{location}</span>
      </div>
      {notes && <p className="text-xs text-ink-500 mt-1">{notes}</p>}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 text-ink-500 transition-transform ${
        expanded ? "rotate-180" : ""
      }`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
