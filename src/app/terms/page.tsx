const LAST_UPDATED = "May 11, 2026";

export default function TermsPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="What this app is">
        <p>
          Carer Vista Pro is a care coordination tool. It helps organizations,
          caregivers, clients, and family members organize schedules, notes,
          reminders, messaging, and related operational information.
        </p>
        <p className="mt-2">
          It is not a clinical medical record system, emergency dispatch system,
          or substitute for professional judgment unless separately configured
          and legally reviewed.
        </p>
      </Section>

      <Section title="Acceptable use">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Use the app only for legitimate care coordination and internal organization purposes.</li>
          <li>Do not misuse, copy, scrape, attack, or interfere with the service.</li>
          <li>Do not upload unlawful, abusive, or knowingly false information.</li>
          <li>Do not use the app to bypass workplace, licensing, or care-plan requirements.</li>
        </ul>
      </Section>

      <Section title="Your responsibility">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Keep care information current and accurate.</li>
          <li>Use your own account and protect your password, device, and session.</li>
          <li>Do not share passwords or let others use your login.</li>
          <li>Follow applicable laws, care plans, workplace rules, and professional requirements.</li>
        </ul>
      </Section>

      <Section title="Organization responsibility">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Organization owners and admins are responsible for verifying caregivers, schedules, care instructions, emergency contacts, medications, allergies, documents, and permissions.</li>
          <li>Admins are responsible for reviewing and updating permissions for linked family and client users.</li>
          <li>Admins are responsible for deciding which information may be visible to caregivers and family users.</li>
        </ul>
      </Section>

      <Section title="No medical advice">
        <p>
          Content in the app is for reference and coordination only. It is not
          medical advice and should not replace a doctor, nurse, dispatcher,
          emergency responder, or caregiver judgment.
        </p>
      </Section>

      <Section title="Service availability">
        <p>
          We do not guarantee uninterrupted or error-free service. Data,
          notifications, and reminders may be delayed or unavailable because of
          network issues, device issues, platform issues, browser settings, or
          third-party service interruptions.
        </p>
      </Section>

      <Section title="Limits of responsibility">
        <p>
          The app owner and developer are not responsible for misuse, negligence,
          delayed response, missed notifications, incorrect data entry, failure to
          update emergency information, failure to follow care instructions, or
          failure to seek emergency help.
        </p>
      </Section>
    </main>
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
    <section className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <h2 className="font-display text-lg text-ink-900 mb-2">{title}</h2>
      <div className="text-sm text-ink-700 space-y-2">{children}</div>
    </section>
  );
}
