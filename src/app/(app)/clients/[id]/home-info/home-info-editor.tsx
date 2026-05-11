"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  notes: string | null;
  priority_order: number;
};

export type Medication = {
  id: string;
  medication_name: string;
  dose: string | null;
  schedule_instructions: string | null;
  notes: string | null;
  reminder_frequency: ReminderFrequency;
  remind_caregiver: boolean;
  notify_client_family_when_marked: boolean;
  sort_order: number;
  reminders: MedicationReminder[];
};

export type ReminderFrequency =
  | "once_daily"
  | "twice_daily"
  | "three_times_daily"
  | "four_times_daily"
  | "custom_times"
  | "as_needed";

export type MedicationReminder = {
  id: string;
  reminder_time: string;
  label: string | null;
  notify_caregiver: boolean;
  notify_client_family: boolean;
};

export type Allergy = {
  id: string;
  name: string;
  reaction: string | null;
  severity: "critical" | "mild" | "minor" | null;
  notes: string | null;
  sort_order: number;
};

export type SafetyItem = {
  id: string;
  label: string;
  value_location: string;
  notes: string | null;
  visible_to_caregivers: boolean;
  sort_order: number;
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

type EditableContact = Omit<EmergencyContact, "alternate_phone" | "email" | "notes"> & {
  alternate_phone: string;
  email: string;
  notes: string;
};
type EditableMedication = Omit<Medication, "dose" | "schedule_instructions" | "notes"> & {
  dose: string;
  schedule_instructions: string;
  notes: string;
  reminderTimes: string[];
};
type EditableAllergy = Omit<Allergy, "reaction" | "notes"> & {
  reaction: string;
  notes: string;
};
type EditableSafetyItem = Omit<SafetyItem, "notes"> & {
  notes: string;
};

const DOC_CATEGORIES: { value: Document["category"]; label: string }[] = [
  { value: "emergency", label: "Emergency" },
  { value: "instructions", label: "Instructions" },
  { value: "wifi", label: "Wi-Fi / utilities" },
  { value: "general", label: "General" },
];

const EMPTY_CONTACT: EditableContact = {
  id: "new-default-contact",
  name: "",
  relationship: "",
  phone: "",
  alternate_phone: "",
  email: "",
  notes: "",
  priority_order: 1,
};

export default function HomeInfoEditor({
  client,
  contacts: initialContacts,
  medications: initialMedications,
  allergies: initialAllergies,
  safetyItems: initialSafetyItems,
  documents: initialDocs,
  canManage,
  canEditWifi,
}: {
  client: ClientHomeInfo;
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
  documents: Document[];
  canManage: boolean;
  canEditWifi: boolean;
}) {
  const router = useRouter();
  const [wifiSsid, setWifiSsid] = useState(client.wifi_ssid ?? "");
  const [wifiPassword, setWifiPassword] = useState(client.wifi_password ?? "");
  const [showWifi, setShowWifi] = useState(false);
  const [contacts, setContacts] = useState<EditableContact[]>(
    (initialContacts.length > 0 ? initialContacts : [EMPTY_CONTACT]).map((c, index) => ({
      ...c,
      alternate_phone: c.alternate_phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
      priority_order: index + 1,
    }))
  );
  const [medications, setMedications] = useState<EditableMedication[]>(
    initialMedications.map((m, index) => ({
      ...m,
      dose: m.dose ?? "",
      schedule_instructions: m.schedule_instructions ?? "",
      notes: m.notes ?? "",
      reminder_frequency: m.reminder_frequency ?? "as_needed",
      remind_caregiver: m.remind_caregiver ?? false,
      notify_client_family_when_marked: m.notify_client_family_when_marked ?? false,
      reminders: m.reminders ?? [],
      reminderTimes: (m.reminders ?? []).map((r) => r.reminder_time.slice(0, 5)),
      sort_order: index + 1,
    }))
  );
  const [showMedications, setShowMedications] = useState(client.show_medications_to_caregivers);
  const [allergies, setAllergies] = useState<EditableAllergy[]>(
    initialAllergies.map((a, index) => ({
      ...a,
      reaction: a.reaction ?? "",
      notes: a.notes ?? "",
      sort_order: index + 1,
    }))
  );
  const [showAllergies, setShowAllergies] = useState(client.show_allergies_to_caregivers);
  const [safetyItems, setSafetyItems] = useState<EditableSafetyItem[]>(
    initialSafetyItems.map((item, index) => ({
      ...item,
      notes: item.notes ?? "",
      sort_order: index + 1,
    }))
  );
  const [hospName, setHospName] = useState(client.preferred_hospital_name ?? "");
  const [hospAddr, setHospAddr] = useState(client.preferred_hospital_address ?? "");
  const [hospPhone, setHospPhone] = useState(client.preferred_hospital_phone ?? "");
  const [physName, setPhysName] = useState(client.primary_physician_name ?? "");
  const [physAddr, setPhysAddr] = useState(client.primary_physician_address ?? "");
  const [physPhone, setPhysPhone] = useState(client.primary_physician_phone ?? "");
  const [notes, setNotes] = useState(client.home_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const visibleMedicationCount = useMemo(
    () => medications.filter((m) => m.medication_name.trim()).length,
    [medications]
  );
  const visibleAllergyCount = useMemo(
    () => allergies.filter((a) => a.name.trim()).length,
    [allergies]
  );

  if (!canManage) {
    return (
      <ReadOnlyHomeInfo
        client={client}
        contacts={initialContacts}
        medications={initialMedications}
        allergies={initialAllergies}
        safetyItems={initialSafetyItems}
        showMedicationHiddenMessage={!client.show_medications_to_caregivers}
        showAllergyHiddenMessage={!client.show_allergies_to_caregivers}
      />
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const validContacts = contacts
      .map((contact, index) => ({ ...contact, priority_order: index + 1 }))
      .filter((contact) => contact.name.trim() || contact.phone.trim() || contact.relationship.trim());
    const invalidContact = validContacts.find(
      (contact) => !contact.name.trim() || !contact.phone.trim() || !contact.relationship.trim()
    );
    if (invalidContact) {
      setError("Emergency contacts need a name, relationship, and phone.");
      setSaving(false);
      return;
    }
    if (validContacts.length > 5) {
      setError("Each client can have at most 5 emergency contacts.");
      setSaving(false);
      return;
    }
    const invalidSafetyItem = safetyItems.find(
      (item) => (item.label.trim() && !item.value_location.trim()) || (!item.label.trim() && item.value_location.trim())
    );
    if (invalidSafetyItem) {
      setError("Emergency & Safety Items need both a label and a value/location.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        home_notes: notes.trim() || null,
        preferred_hospital_name: hospName.trim() || null,
        preferred_hospital_address: hospAddr.trim() || null,
        preferred_hospital_phone: hospPhone.trim() || null,
        primary_physician_name: physName.trim() || null,
        primary_physician_address: physAddr.trim() || null,
        primary_physician_phone: physPhone.trim() || null,
        show_medications_to_caregivers: showMedications,
        show_allergies_to_caregivers: showAllergies,
        ...(canEditWifi
          ? {
              wifi_ssid: wifiSsid.trim() || null,
              wifi_password: wifiPassword.trim() || null,
            }
          : {}),
      })
      .eq("id", client.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const syncError = await syncNormalizedRows(
      client.id,
      client.organization_id,
      validContacts,
      medications,
      allergies,
      safetyItems
    );

    if (syncError) {
      setError(syncError);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedAt(new Date());
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card title="Emergency contacts" subtitle="Add up to 5 contacts in call order.">
        <ContactEditor contacts={contacts} onChange={setContacts} />
      </Card>

      <Card
        title="Medications"
        subtitle="Use reminders or storage notes only. Do not add clinical administration instructions unless your care team requires them."
      >
        <Toggle
          label="Show medications to caregivers"
          checked={showMedications}
          onChange={setShowMedications}
        />
        {!showMedications && visibleMedicationCount > 0 && (
          <p className="text-xs text-ink-500">
            Medication details are saved for admins and client-family admins only.
          </p>
        )}
        <MedicationEditor medications={medications} onChange={setMedications} />
      </Card>

      <Card title="Allergies" subtitle="Add allergy details and choose whether caregivers can see them.">
        <Toggle
          label="Show allergies to caregivers"
          checked={showAllergies}
          onChange={setShowAllergies}
        />
        {!showAllergies && visibleAllergyCount > 0 && (
          <p className="text-xs text-ink-500">
            Allergy details are saved for admins and client-family admins only.
          </p>
        )}
        <AllergyEditor allergies={allergies} onChange={setAllergies} />
      </Card>

      <Card title="Emergency & Safety Items" subtitle="Add custom equipment, supplies, shutoffs, or key locations.">
        <SafetyItemsEditor items={safetyItems} onChange={setSafetyItems} />
      </Card>

      <Card title="Preferred hospital">
        <Field label="Name" value={hospName} onChange={setHospName} placeholder="Preferred hospital name" />
        <Field label="Address" value={hospAddr} onChange={setHospAddr} placeholder="Hospital address" />
        <Field label="Phone" type="tel" value={hospPhone} onChange={setHospPhone} placeholder="Hospital phone" />
      </Card>

      <Card title="Primary physician">
        <Field label="Name" value={physName} onChange={setPhysName} placeholder="Primary physician name" />
        <Field label="Address" value={physAddr} onChange={setPhysAddr} placeholder="Physician address" />
        <Field label="Phone" type="tel" value={physPhone} onChange={setPhysPhone} placeholder="Physician phone" />
      </Card>

      <Card title="Wi-Fi" subtitle={canEditWifi ? undefined : "Only admins can edit Wi-Fi credentials."}>
        {canEditWifi ? (
          <>
            <Field label="Network name (SSID)" value={wifiSsid} onChange={setWifiSsid} placeholder="Wi-Fi network name" />
            <div>
              <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                Password
              </span>
              <div className="flex gap-2">
                <input
                  type={showWifi ? "text" : "password"}
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowWifi((v) => !v)}
                  className="text-xs text-forest-600 hover:underline px-2"
                >
                  {showWifi ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <ReadOnly label="Network" value={client.wifi_ssid || "Not set"} />
            <ReadOnly label="Password" value={client.wifi_password ? "Hidden" : "Not set"} />
          </>
        )}
      </Card>

      <Card title="Documents" subtitle="Upload PDFs or images for emergencies, instructions, Wi-Fi setup, etc.">
        <DocumentManager
          clientId={client.id}
          organizationId={client.organization_id}
          initialDocs={initialDocs}
          onChanged={() => router.refresh()}
        />
      </Card>

      <Card title="Notes for caregivers (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Parking, pet info, entry notes, or other caregiver reminders"
          className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 text-sm resize-none"
        />
      </Card>

      {error && (
        <div className="bg-terracotta-400/10 border border-terracotta-400/30 text-terracotta-600 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 sticky bottom-3 bg-cream-100/95 backdrop-blur p-3 rounded-2xl shadow-soft border border-cream-200">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-medium transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {savedAt && (
          <p className="text-xs text-forest-600">
            Saved {savedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </form>
  );
}

async function syncNormalizedRows(
  clientId: string,
  organizationId: string,
  contacts: EditableContact[],
  medications: EditableMedication[],
  allergies: EditableAllergy[],
  safetyItems: EditableSafetyItem[]
) {
  const supabase = createClient();
  const deleteResults = await Promise.all([
    supabase.from("client_emergency_contacts").delete().eq("client_id", clientId),
    supabase.from("client_medications").delete().eq("client_id", clientId),
    supabase.from("client_allergies").delete().eq("client_id", clientId),
    supabase.from("client_safety_items").delete().eq("client_id", clientId),
  ]);
  const deleteError = deleteResults.find((result) => result.error)?.error;
  if (deleteError) return deleteError.message;

  const medicationRows = medications
    .filter((m) => m.medication_name.trim())
    .map((medication, index) => ({
      organization_id: organizationId,
      client_id: clientId,
      medication_name: medication.medication_name.trim(),
      dose: medication.dose.trim() || null,
      schedule_instructions: medication.schedule_instructions.trim() || null,
      notes: medication.notes.trim() || null,
      reminder_frequency: medication.reminder_frequency,
      remind_caregiver: medication.remind_caregiver,
      notify_client_family_when_marked: medication.notify_client_family_when_marked,
      sort_order: index + 1,
      reminderTimes: medication.reminderTimes.filter(Boolean),
    }));

  const insertResults = await Promise.all([
    contacts.length > 0
      ? supabase.from("client_emergency_contacts").insert(
          contacts.map((contact, index) => ({
            organization_id: organizationId,
            client_id: clientId,
            name: contact.name.trim(),
            relationship: contact.relationship.trim(),
            phone: contact.phone.trim(),
            alternate_phone: contact.alternate_phone.trim() || null,
            email: contact.email.trim() || null,
            notes: contact.notes.trim() || null,
            priority_order: index + 1,
          }))
        )
      : Promise.resolve({ error: null }),
    Promise.resolve({ error: null }),
    allergies.some((a) => a.name.trim())
      ? supabase.from("client_allergies").insert(
          allergies
            .filter((a) => a.name.trim())
            .map((allergy, index) => ({
              organization_id: organizationId,
              client_id: clientId,
              name: allergy.name.trim(),
              reaction: allergy.reaction.trim() || null,
              severity: allergy.severity || null,
              notes: allergy.notes.trim() || null,
              sort_order: index + 1,
            }))
        )
      : Promise.resolve({ error: null }),
    safetyItems.some((item) => item.label.trim() || item.value_location.trim())
      ? supabase.from("client_safety_items").insert(
          safetyItems
            .filter((item) => item.label.trim() || item.value_location.trim())
            .map((item, index) => ({
              organization_id: organizationId,
              client_id: clientId,
              label: item.label.trim(),
              value_location: item.value_location.trim(),
              notes: item.notes.trim() || null,
              visible_to_caregivers: item.visible_to_caregivers,
              sort_order: index + 1,
            }))
        )
      : Promise.resolve({ error: null }),
  ]);
  const insertError = insertResults.find((result) => result.error)?.error;
  if (insertError) return insertError.message;

  if (medicationRows.length > 0) {
    const { data: insertedMedications, error: medicationError } = await supabase
      .from("client_medications")
      .insert(
        medicationRows.map(({ reminderTimes, ...row }) => row)
      )
      .select("id, medication_name, sort_order");

    if (medicationError) return medicationError.message;

    const reminderRows = (insertedMedications ?? []).flatMap((inserted, index) => {
      const source = medicationRows[index];
      if (!source || source.reminder_frequency === "as_needed") return [];
      return source.reminderTimes.map((time, timeIndex) => ({
        organization_id: organizationId,
        client_id: clientId,
        medication_id: inserted.id,
        reminder_time: time,
        label: source.schedule_instructions || defaultReminderLabel(timeIndex),
        notify_caregiver: source.remind_caregiver,
        notify_client_family: source.notify_client_family_when_marked,
      }));
    });

    if (reminderRows.length > 0) {
      const { error: reminderError } = await supabase
        .from("client_medication_reminders")
        .insert(reminderRows);
      if (reminderError) return reminderError.message;
    }
  }

  return null;
}

function ContactEditor({
  contacts,
  onChange,
}: {
  contacts: EditableContact[];
  onChange: (contacts: EditableContact[]) => void;
}) {
  function update(index: number, patch: Partial<EditableContact>) {
    onChange(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact, index) => (
        <div key={contact.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-ink-500">Priority {index + 1}</p>
            {contacts.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(contacts.filter((_, i) => i !== index))}
                className="text-xs text-terracotta-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <Field label="Name" value={contact.name} onChange={(value) => update(index, { name: value })} placeholder="Emergency contact name" />
          <Field label="Relationship" value={contact.relationship} onChange={(value) => update(index, { relationship: value })} placeholder="Daughter, neighbor, spouse" />
          <Field label="Phone" type="tel" value={contact.phone} onChange={(value) => update(index, { phone: value })} placeholder="Primary phone" />
          <Field label="Alternate phone (optional)" type="tel" value={contact.alternate_phone} onChange={(value) => update(index, { alternate_phone: value })} placeholder="Backup phone" />
          <Field label="Email (optional)" type="email" value={contact.email} onChange={(value) => update(index, { email: value })} placeholder="name@example.com" />
          <Field label="Notes (optional)" value={contact.notes} onChange={(value) => update(index, { notes: value })} placeholder="Best time to call or special notes" />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...contacts,
            {
              ...EMPTY_CONTACT,
              id: `new-contact-${Date.now()}`,
              priority_order: contacts.length + 1,
            },
          ])
        }
        disabled={contacts.length >= 5}
        className="w-full bg-cream-50 hover:bg-cream-100 text-forest-600 border border-forest-500/30 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
      >
        Add emergency contact
      </button>
    </div>
  );
}

function MedicationEditor({
  medications,
  onChange,
}: {
  medications: EditableMedication[];
  onChange: (medications: EditableMedication[]) => void;
}) {
  function update(index: number, patch: Partial<EditableMedication>) {
    onChange(medications.map((medication, i) => (i === index ? { ...medication, ...patch } : medication)));
  }

  return (
    <ListEditor
      emptyText="No medications added."
      addLabel="Add medication"
      onAdd={() =>
        onChange([
          ...medications,
          {
            id: `new-medication-${Date.now()}`,
            medication_name: "",
            dose: "",
            schedule_instructions: "",
            notes: "",
            reminder_frequency: "as_needed",
            remind_caregiver: false,
            notify_client_family_when_marked: false,
            reminders: [],
            reminderTimes: [],
            sort_order: medications.length + 1,
          },
        ])
      }
      hasItems={medications.length > 0}
    >
      {medications.map((medication, index) => (
        <div key={medication.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-3 space-y-2">
          <RowHeader label={`Medication ${index + 1}`} onRemove={() => onChange(medications.filter((_, i) => i !== index))} />
          <Field label="Medication name" value={medication.medication_name} onChange={(value) => update(index, { medication_name: value })} placeholder="Medication name" />
          <Field label="Dose (optional)" value={medication.dose} onChange={(value) => update(index, { dose: value })} placeholder="As entered by family or admin" />
          <Field label="Schedule/instructions (optional)" value={medication.schedule_instructions} onChange={(value) => update(index, { schedule_instructions: value })} placeholder="Reminder timing or storage instructions" />
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
              Reminder frequency
            </span>
            <select
              value={medication.reminder_frequency}
              onChange={(e) => {
                const frequency = e.target.value as ReminderFrequency;
                update(index, {
                  reminder_frequency: frequency,
                  reminderTimes: defaultTimesForFrequency(frequency, medication.reminderTimes),
                });
              }}
              className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 text-sm"
            >
              <option value="as_needed">As needed/PRN, no scheduled reminders</option>
              <option value="once_daily">Once daily</option>
              <option value="twice_daily">Twice daily</option>
              <option value="three_times_daily">Three times daily</option>
              <option value="four_times_daily">Four times daily</option>
              <option value="custom_times">Custom times</option>
            </select>
          </label>
          {medication.reminder_frequency !== "as_needed" && (
            <div className="grid grid-cols-2 gap-2">
              {medication.reminderTimes.map((time, timeIndex) => (
                <label key={timeIndex} className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                    Time {timeIndex + 1}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const next = [...medication.reminderTimes];
                      next[timeIndex] = e.target.value;
                      update(index, { reminderTimes: next });
                    }}
                    className={inputCls}
                  />
                </label>
              ))}
              {medication.reminder_frequency === "custom_times" && (
                <button
                  type="button"
                  onClick={() => update(index, { reminderTimes: [...medication.reminderTimes, "09:00"] })}
                  className="col-span-2 bg-white hover:bg-cream-100 text-forest-600 border border-forest-500/30 py-2 rounded-xl text-xs font-medium transition"
                >
                  Add time
                </button>
              )}
            </div>
          )}
          <Toggle
            label="Remind caregiver"
            checked={medication.remind_caregiver}
            onChange={(value) => update(index, { remind_caregiver: value })}
          />
          <Toggle
            label="Notify client/family when marked"
            checked={medication.notify_client_family_when_marked}
            onChange={(value) => update(index, { notify_client_family_when_marked: value })}
          />
          <Field label="Notes (optional)" value={medication.notes} onChange={(value) => update(index, { notes: value })} placeholder="Additional notes" />
        </div>
      ))}
    </ListEditor>
  );
}

function AllergyEditor({
  allergies,
  onChange,
}: {
  allergies: EditableAllergy[];
  onChange: (allergies: EditableAllergy[]) => void;
}) {
  function update(index: number, patch: Partial<EditableAllergy>) {
    onChange(allergies.map((allergy, i) => (i === index ? { ...allergy, ...patch } : allergy)));
  }

  return (
    <ListEditor
      emptyText="No allergies added."
      addLabel="Add allergy"
      onAdd={() =>
        onChange([
          ...allergies,
          {
            id: `new-allergy-${Date.now()}`,
            name: "",
            reaction: "",
            severity: "mild",
            notes: "",
            sort_order: allergies.length + 1,
          },
        ])
      }
      hasItems={allergies.length > 0}
    >
      {allergies.map((allergy, index) => (
        <div key={allergy.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-3 space-y-2">
          <RowHeader label={`Allergy ${index + 1}`} onRemove={() => onChange(allergies.filter((_, i) => i !== index))} />
          <Field label="Allergy name" value={allergy.name} onChange={(value) => update(index, { name: value })} placeholder="Penicillin, peanuts, latex" />
          <Field label="Reaction (optional)" value={allergy.reaction} onChange={(value) => update(index, { reaction: value })} placeholder="Rash, swelling, nausea" />
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
              Severity (optional)
            </span>
            <select
              value={allergy.severity ?? ""}
              onChange={(e) => update(index, { severity: (e.target.value || null) as Allergy["severity"] })}
              className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-ink-900 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 text-sm"
            >
              <option value="">Not specified</option>
              <option value="critical">Critical</option>
              <option value="mild">Mild</option>
              <option value="minor">Minor</option>
            </select>
          </label>
          <Field label="Notes (optional)" value={allergy.notes} onChange={(value) => update(index, { notes: value })} placeholder="Additional notes" />
        </div>
      ))}
    </ListEditor>
  );
}

function SafetyItemsEditor({
  items,
  onChange,
}: {
  items: EditableSafetyItem[];
  onChange: (items: EditableSafetyItem[]) => void;
}) {
  function update(index: number, patch: Partial<EditableSafetyItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <ListEditor
      emptyText="No emergency or safety items added."
      addLabel="Add emergency/safety item"
      onAdd={() =>
        onChange([
          ...items,
          {
            id: `new-safety-${Date.now()}`,
            label: "",
            value_location: "",
            notes: "",
            visible_to_caregivers: true,
            sort_order: items.length + 1,
          },
        ])
      }
      hasItems={items.length > 0}
    >
      {items.map((item, index) => (
        <div key={item.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-3 space-y-2">
          <RowHeader label={`Item ${index + 1}`} onRemove={() => onChange(items.filter((_, i) => i !== index))} />
          <Field label="Label" value={item.label} onChange={(value) => update(index, { label: value })} placeholder="Fire extinguisher location" />
          <Field label="Value/location" value={item.value_location} onChange={(value) => update(index, { value_location: value })} placeholder="Kitchen cabinet, hallway closet, lockbox location" />
          <Field label="Notes (optional)" value={item.notes} onChange={(value) => update(index, { notes: value })} placeholder="Additional access or safety notes" />
          <Toggle
            label="Visible to caregivers"
            checked={item.visible_to_caregivers}
            onChange={(value) => update(index, { visible_to_caregivers: value })}
          />
        </div>
      ))}
    </ListEditor>
  );
}

function ListEditor({
  emptyText,
  addLabel,
  onAdd,
  hasItems,
  children,
}: {
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {!hasItems ? <p className="text-sm text-ink-500">{emptyText}</p> : children}
      <button
        type="button"
        onClick={onAdd}
        className="w-full bg-cream-50 hover:bg-cream-100 text-forest-600 border border-forest-500/30 py-2.5 rounded-xl text-sm font-medium transition"
      >
        {addLabel}
      </button>
    </div>
  );
}

function RowHeader({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <button type="button" onClick={onRemove} className="text-xs text-terracotta-600 hover:underline">
        Remove
      </button>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <div className="relative">
        <h2 className="font-display text-base mb-1">{title}</h2>
        {subtitle && <p className="text-xs text-ink-500 mb-3">{subtitle}</p>}
        <div className="space-y-3 mt-3">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
      <span className="text-sm text-ink-900">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition ${
          checked ? "bg-forest-600" : "bg-cream-200"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-cream-200 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-500">{label}</span>
      <span className="text-sm text-ink-900">{value}</span>
    </div>
  );
}

function ReadOnlyHomeInfo({
  client,
  contacts,
  medications,
  allergies,
  safetyItems,
  showMedicationHiddenMessage,
  showAllergyHiddenMessage,
}: {
  client: ClientHomeInfo;
  contacts: EmergencyContact[];
  medications: Medication[];
  allergies: Allergy[];
  safetyItems: SafetyItem[];
  showMedicationHiddenMessage: boolean;
  showAllergyHiddenMessage: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card title="Emergency contacts">
        {contacts.length === 0 ? (
          <p className="text-sm text-ink-500">No emergency contacts visible.</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="rounded-2xl bg-cream-50 border border-cream-200 px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">{contact.name}</p>
                  <p className="text-xs text-ink-500">{contact.relationship}</p>
                </div>
                <a href={`tel:${contact.phone}`} className="text-sm text-forest-600 font-medium hover:underline shrink-0">
                  {contact.phone}
                </a>
              </div>
              {contact.notes && <p className="text-xs text-ink-500 mt-1">{contact.notes}</p>}
            </div>
          ))
        )}
      </Card>

      <Card title="Medications">
        {showMedicationHiddenMessage ? (
          <p className="text-sm text-ink-500">Medication details are hidden by the client/admin.</p>
        ) : medications.length === 0 ? (
          <p className="text-sm text-ink-500">No medications visible.</p>
        ) : (
          medications.map((medication) => (
            <div key={medication.id} className="rounded-2xl bg-cream-50 border border-cream-200 px-3 py-2">
              <p className="font-medium text-ink-900">{medication.medication_name}</p>
              {medication.dose && <p className="text-xs text-ink-500">Dose: {medication.dose}</p>}
              {medication.schedule_instructions && <p className="text-xs text-ink-500">{medication.schedule_instructions}</p>}
              {medication.reminders.length > 0 && (
                <p className="text-xs text-ink-500">
                  Reminders: {medication.reminders.map((r) => r.reminder_time.slice(0, 5)).join(", ")}
                </p>
              )}
              {medication.notes && <p className="text-xs text-ink-500">{medication.notes}</p>}
            </div>
          ))
        )}
      </Card>

      <Card title="Allergies">
        {showAllergyHiddenMessage ? (
          <p className="text-sm text-ink-500">Allergy details are hidden by the client/admin.</p>
        ) : allergies.length === 0 ? (
          <p className="text-sm text-ink-500">No allergies visible.</p>
        ) : (
          allergies.map((allergy) => (
            <div key={allergy.id} className="rounded-2xl bg-cream-50 border border-cream-200 px-3 py-2">
              <p className="font-medium text-ink-900">{allergy.name}</p>
              {allergy.reaction && <p className="text-xs text-ink-500">Reaction: {allergy.reaction}</p>}
              {allergy.severity && <p className="text-xs text-ink-500">Severity: {allergy.severity}</p>}
              {allergy.notes && <p className="text-xs text-ink-500">{allergy.notes}</p>}
            </div>
          ))
        )}
      </Card>

      <Card title="Emergency & Safety Items">
        {safetyItems.length === 0 ? (
          <p className="text-sm text-ink-500">No safety items visible.</p>
        ) : (
          safetyItems.map((item) => (
            <ReadOnly
              key={item.id}
              label={item.label}
              value={item.notes ? `${item.value_location} · ${item.notes}` : item.value_location}
            />
          ))
        )}
      </Card>

      <Card title="Home notes">
        <ReadOnly label="Preferred hospital" value={client.preferred_hospital_name || "Not set"} />
        <ReadOnly label="Primary physician" value={client.primary_physician_name || "Not set"} />
        {client.home_notes ? (
          <p className="text-sm text-ink-700 whitespace-pre-wrap">{client.home_notes}</p>
        ) : (
          <p className="text-sm text-ink-500">No home notes visible.</p>
        )}
      </Card>

      <CorrectionRequestForm clientId={client.id} organizationId={client.organization_id} />
    </div>
  );
}

function CorrectionRequestForm({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId: string;
}) {
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setStatus(null);
    const response = await fetch("/api/client-info-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, organizationId, category, message }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);
    if (!response.ok) {
      setStatus(result?.error ?? "Could not send correction request.");
      return;
    }
    setMessage("");
    setCategory("other");
    setStatus("Correction request sent.");
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl shadow-soft p-5 grain-overlay space-y-3">
      <div className="relative">
        <h2 className="font-display text-base text-ink-900 mb-1">Suggest correction</h2>
        <p className="text-xs text-ink-500 mb-3">Report info that looks outdated or incorrect.</p>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-sm mb-3"
        >
          <option value="emergency_contact">Emergency contact</option>
          <option value="medication">Medication</option>
          <option value="allergy">Allergy</option>
          <option value="safety_item">Safety item</option>
          <option value="address">Address</option>
          <option value="home_note">Home note</option>
          <option value="other">Other</option>
        </select>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Describe what should be reviewed"
          className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-sm resize-none"
        />
        {status && <p className="text-xs text-forest-600 mt-2">{status}</p>}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="mt-3 w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Report info issue"}
        </button>
      </div>
    </form>
  );
}

function defaultTimesForFrequency(
  frequency: ReminderFrequency,
  current: string[]
) {
  if (frequency === "as_needed") return [];
  if (frequency === "once_daily") return [current[0] ?? "09:00"];
  if (frequency === "twice_daily") return [current[0] ?? "09:00", current[1] ?? "18:00"];
  if (frequency === "three_times_daily") return [current[0] ?? "08:00", current[1] ?? "14:00", current[2] ?? "20:00"];
  if (frequency === "four_times_daily") return [current[0] ?? "08:00", current[1] ?? "12:00", current[2] ?? "17:00", current[3] ?? "21:00"];
  return current.length > 0 ? current : ["09:00"];
}

function defaultReminderLabel(index: number) {
  return ["Morning", "Midday", "Evening", "Bedtime"][index] ?? `Reminder ${index + 1}`;
}

function DocumentManager({
  clientId,
  organizationId,
  initialDocs,
  onChanged,
}: {
  clientId: string;
  organizationId: string;
  initialDocs: Document[];
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (10 MB max)");
      return;
    }

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const category: Document["category"] = "general";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const stamp = Date.now();
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 60);
    const path = `${organizationId}/${clientId}/${stamp}-${safeName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("client_documents").insert({
      client_id: clientId,
      organization_id: organizationId,
      category,
      title: file.name,
      storage_path: path,
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    if (dbError) {
      void supabase.storage.from("client-documents").remove([path]);
      setError(dbError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    e.target.value = "";
    onChanged();
  }

  async function changeCategory(id: string, category: Document["category"]) {
    const supabase = createClient();
    await supabase.from("client_documents").update({ category }).eq("id", id);
    onChanged();
  }

  async function downloadDoc(doc: Document) {
    const supabase = createClient();
    const { data, error: dlError } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 60 * 5);
    if (dlError || !data?.signedUrl) {
      alert(dlError?.message ?? "Couldn't download");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function removeDoc(doc: Document) {
    if (!confirm(`Remove "${doc.title}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("client-documents").remove([doc.storage_path]);
    await supabase.from("client_documents").delete().eq("id", doc.id);
    onChanged();
  }

  const grouped = DOC_CATEGORIES.map((cat) => ({
    category: cat,
    docs: initialDocs.filter((d) => d.category === cat.value),
  }));

  return (
    <div className="space-y-3">
      {initialDocs.length === 0 ? (
        <p className="text-sm text-ink-500">No documents uploaded yet.</p>
      ) : (
        grouped.map(
          (g) =>
            g.docs.length > 0 && (
              <div key={g.category.value}>
                <p className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5 font-medium">
                  {g.category.label}
                </p>
                <ul className="space-y-1.5">
                  {g.docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cream-50 border border-cream-200"
                    >
                      <button
                        type="button"
                        onClick={() => downloadDoc(d)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {d.title}
                        </p>
                        <p className="text-xs text-ink-500">
                          {d.file_size_bytes ? formatBytes(d.file_size_bytes) : ""}
                          {d.mime_type ? ` · ${d.mime_type}` : ""}
                        </p>
                      </button>
                      <select
                        value={d.category}
                        onChange={(e) => changeCategory(d.id, e.target.value as Document["category"])}
                        className="text-xs bg-white border border-cream-200 rounded px-1.5 py-1"
                      >
                        {DOC_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDoc(d)}
                        className="text-xs text-terracotta-600 hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
        )
      )}

      <label className="block">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={upload}
          disabled={uploading}
          className="hidden"
        />
        <span
          className={`block w-full text-center bg-cream-50 hover:bg-cream-100 text-forest-600 border border-forest-500/30 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
            uploading ? "opacity-50" : ""
          }`}
        >
          {uploading ? "Uploading..." : "+ Upload PDF or image"}
        </span>
      </label>
      <p className="text-[11px] text-ink-500 leading-snug">
        After uploading, set the category with the dropdown next to the file.
        Max 10 MB. PDFs and images only.
      </p>
      {error && <p className="text-terracotta-600 text-xs">{error}</p>}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const inputCls =
  "w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 text-sm";
