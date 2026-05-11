const LAST_UPDATED = "May 11, 2026";

export default function PrivacyPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="Information we collect">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Names, email addresses, phone numbers, and roles.</li>
          <li>Organization and care-circle membership.</li>
          <li>Schedules, shift history, check-in and check-out records.</li>
          <li>Messages, notifications, care notes, shift notes, and incident reports.</li>
          <li>Emergency contacts, allergies, medications, home safety details, and client documents if enabled.</li>
          <li>Location and geofence data if enabled.</li>
          <li>Avatars, profile photos, device/browser data, and push subscription data.</li>
          <li>Audit and history records needed for care coordination and accountability.</li>
        </ul>
      </Section>

      <Section title="How we use information">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Scheduling and shift management.</li>
          <li>Care coordination and communication.</li>
          <li>Emergency reference and incident reporting.</li>
          <li>Reminders, notifications, and check-in/check-out workflows.</li>
          <li>Audit history, invoicing, pay estimates, and exports if enabled.</li>
          <li>Account, organization, and permission management.</li>
        </ul>
      </Section>

      <Section title="Who can access it">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Admins, owners, and organization managers.</li>
          <li>Assigned caregivers and linked family/client users based on role permissions.</li>
          <li>Service providers needed to operate the app, such as hosting, database, notification, storage, or email providers if enabled.</li>
        </ul>
      </Section>

      <Section title="How we protect it">
        <p>
          We use authentication, role-based permissions, Supabase security, row-level security policies, and secure hosting where configured.
        </p>
        <p>
          No system is completely secure. Users must protect passwords and devices,
          avoid sharing accounts, and keep access credentials private.
        </p>
        <p>
          The app owner and developer are not responsible for unauthorized access
          caused by shared passwords, lost devices, user negligence, misuse, or
          incorrect permissions configured by admins.
        </p>
      </Section>

      <Section title="Third-party services">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Supabase for database, auth, and storage.</li>
          <li>Vercel or another hosting provider.</li>
          <li>Browser push notification services and providers.</li>
          <li>Email services if enabled later.</li>
          <li>Payment providers if added later.</li>
        </ul>
      </Section>

      <Section title="Your choices">
        <p>
          You may request account and data deletion using the deletion request
          page linked from Help. Some information may need to be retained for
          audit, legal, billing, safety, or care-coordination reasons where
          applicable.
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
