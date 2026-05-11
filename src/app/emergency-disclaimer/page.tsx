const LAST_UPDATED = "May 11, 2026";

export default function EmergencyDisclaimerPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">
          Emergency & Incident Disclaimer
        </h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="What this app may show">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Emergency contacts.</li>
          <li>Allergies.</li>
          <li>Medications.</li>
          <li>Care notes and caregiver notes.</li>
          <li>Shift notes.</li>
          <li>Home safety information.</li>
          <li>Incident reports.</li>
          <li>Client documents.</li>
          <li>Location and geofence-related check-in/check-out information if enabled.</li>
        </ul>
      </Section>

      <Section title="Important">
        <p>
          This app is for care coordination and reference only. It does not
          provide medical advice.
        </p>
        <p>
          The emergency feature and incident reporting are not replacements for
          emergency services, 911, a doctor, nurse, emergency dispatcher,
          medical professional, or caregiver judgment.
        </p>
        <p>
          In a medical, safety, fire, police, or life-threatening emergency, call
          your correct local emergency number immediately.
        </p>
      </Section>

      <Section title="Examples">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>United States and Canada: 911</li>
          <li>European Union and many other countries: 112</li>
          <li>United Kingdom: 999 or 112</li>
        </ul>
        <p className="mt-2">
          Emergency numbers vary by country and location. Use the number that
          applies where you are.
        </p>
      </Section>

      <Section title="Limits">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>The app does not guarantee that emergency information is complete, accurate, current, reviewed, monitored, or received in real time.</li>
          <li>Push notifications, message alerts, incident alerts, and reminders may fail, be delayed, be blocked, or be disabled.</li>
        </ul>
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
