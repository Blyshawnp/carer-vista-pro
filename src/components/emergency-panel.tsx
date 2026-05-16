"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type EmergencyInfo = {
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

type Allergy = {
  id: string;
  name: string;
  reaction: string | null;
  severity: "critical" | "mild" | "minor" | null;
  notes: string | null;
};

type SafetyItem = {
  id: string;
  label: string;
  value_location: string;
  notes: string | null;
};

type EmergencyPanelProps = {
  info: EmergencyInfo;
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
  medicationDetailsHidden?: boolean;
};

export default function EmergencyPanel({
  info,
  contacts,
  medications,
  allergies,
  safetyItems,
  medicationDetailsHidden = false,
}: EmergencyPanelProps) {
  const [emergencyIconFailed, setEmergencyIconFailed] = useState(false);

  return (
    <section
      aria-label={`${info.full_name} emergency information`}
      className="rounded-3xl bg-white shadow-soft border border-cream-200 overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4 border-b border-cream-200 bg-cream-50">
        <span className="relative w-11 h-11 rounded-full grid place-items-center shrink-0 shadow-[0_0_16px_rgba(220,38,38,0.28)] overflow-hidden">
          {emergencyIconFailed ? (
            <EmergencyFallbackIcon />
          ) : (
            <Image
              src="/icons/emergency.png"
              alt=""
              width={44}
              height={44}
              onError={() => setEmergencyIconFailed(true)}
              className="object-contain"
            />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl text-ink-900 leading-tight">
            Emergency information
          </h3>
          <p className="text-xs text-ink-500 leading-snug mt-1">
            This app is for care coordination and reference only. It is not a
            replacement for emergency services. In an emergency, call your local
            emergency number immediately, such as 911 in the United States and
            Canada, 112 in many countries, or 999/112 in the United Kingdom.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <InfoSection title="Emergency contacts">
          {contacts.length > 0 ? (
            <ul className="space-y-2">
              {contacts.map((contact) => (
                <li key={contact.id} className="rounded-2xl bg-cream-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900 truncate">
                        {contact.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {contact.relationship || "Emergency contact"}
                      </p>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(220,38,38,0.25)] transition hover:scale-[1.03] hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                    >
                      Call
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{contact.phone}</p>
                  {contact.alternate_phone && (
                    <p className="text-xs text-ink-500">
                      Alternate: {contact.alternate_phone}
                    </p>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="mt-1 inline-block text-xs text-forest-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.notes && (
                    <p className="mt-1 text-xs text-ink-500">{contact.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyText>No emergency contacts recorded.</EmptyText>
          )}
        </InfoSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoSection title="Allergies">
            {allergies.length > 0 ? (
              <ul className="space-y-2">
                {allergies.map((allergy) => (
                  <li key={allergy.id} className="rounded-2xl bg-cream-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink-900">{allergy.name}</p>
                      {allergy.severity && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          {allergy.severity}
                        </span>
                      )}
                    </div>
                    {allergy.reaction && (
                      <p className="mt-1 text-xs text-ink-600">
                        Reaction: {allergy.reaction}
                      </p>
                    )}
                    {allergy.notes && (
                      <p className="mt-1 text-xs text-ink-500">
                        {allergy.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText>No allergies recorded.</EmptyText>
            )}
          </InfoSection>

          <InfoSection title="Medications">
            {medicationDetailsHidden ? (
              <EmptyText>Medication details are hidden by the client/admin.</EmptyText>
            ) : medications.length > 0 ? (
              <ul className="space-y-2">
                {medications.map((medication) => (
                  <li
                    key={medication.id}
                    className="rounded-2xl bg-cream-50 p-3"
                  >
                    <p className="font-medium text-ink-900">
                      {medication.medication_name}
                    </p>
                    {(medication.dose || medication.schedule_instructions) && (
                      <p className="mt-1 text-xs text-ink-600">
                        {[medication.dose, medication.schedule_instructions]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    )}
                    {medication.notes && (
                      <p className="mt-1 text-xs text-ink-500">
                        {medication.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText>No medications listed.</EmptyText>
            )}
          </InfoSection>
        </div>

        <InfoSection title="Safety items">
          {safetyItems.length > 0 ? (
            <ul className="space-y-2">
              {safetyItems.map((item) => (
                <li key={item.id} className="rounded-2xl bg-cream-50 p-3">
                  <p className="font-medium text-ink-900">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-700">
                    {item.value_location}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-ink-500">{item.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyText>No safety items recorded.</EmptyText>
          )}
        </InfoSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard title="Primary physician">
            <p className="font-medium text-ink-900">
              {info.primary_physician_name || "Not recorded"}
            </p>
            {info.primary_physician_phone && (
              <a
                href={`tel:${info.primary_physician_phone}`}
                className="mt-1 inline-block text-sm text-forest-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded"
              >
                {info.primary_physician_phone}
              </a>
            )}
            {info.primary_physician_address && (
              <MapLink address={info.primary_physician_address} />
            )}
          </InfoCard>

          <InfoCard title="Preferred hospital">
            <p className="font-medium text-ink-900">
              {info.preferred_hospital_name || "Not recorded"}
            </p>
            {info.preferred_hospital_phone && (
              <a
                href={`tel:${info.preferred_hospital_phone}`}
                className="mt-1 inline-block text-sm text-forest-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded"
              >
                {info.preferred_hospital_phone}
              </a>
            )}
            {info.preferred_hospital_address && (
              <MapLink address={info.preferred_hospital_address} />
            )}
          </InfoCard>
        </div>

        {info.address && (
          <InfoCard title="Client address">
            <p className="text-sm text-ink-700">{info.address}</p>
            <MapLink address={info.address} />
          </InfoCard>
        )}
      </div>
    </section>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold mb-2">
        {title}
      </h4>
      {children}
    </section>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-cream-50 p-3">
      <h4 className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold mb-1.5">
        {title}
      </h4>
      {children}
    </section>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-cream-50 p-3 text-sm text-ink-500">{children}</p>;
}

function EmergencyFallbackIcon() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-11 w-11 place-items-center rounded-full bg-red-600"
    >
      <span className="absolute h-6 w-2 rounded-sm bg-white" />
      <span className="absolute h-2 w-6 rounded-sm bg-white" />
    </span>
  );
}

function MapLink({ address }: { address: string }) {
  return (
    <a
      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-block text-sm text-forest-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded"
    >
      View map
    </a>
  );
}
