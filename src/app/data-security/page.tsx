const LAST_UPDATED = "May 11, 2026";

export default function DataSecurityPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">Data Security Notice</h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="How data is protected">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Authentication and role-based access control.</li>
          <li>Supabase row-level security and database policies.</li>
          <li>Secure hosting and protected server-side service credentials where configured.</li>
          <li>Limited access for service providers only where needed to operate the app.</li>
        </ul>
      </Section>

      <Section title="What users should do">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Use a strong password and keep it private.</li>
          <li>Do not share accounts.</li>
          <li>Keep phones, tablets, and browsers locked when not in use.</li>
          <li>Update client and care information promptly when it changes.</li>
          <li>Report lost devices, suspected misuse, or incorrect permissions to an admin quickly.</li>
        </ul>
      </Section>

      <Section title="Limitations">
        <p>
          No software platform is perfectly secure. Unauthorized access can still
          happen through user error, shared passwords, lost devices, phishing,
          misconfiguration, or third-party outages.
        </p>
        <p>
          The app owner and developer are not responsible for unauthorized access
          caused by account sharing, weak passwords, device compromise, or
          permissions configured incorrectly by administrators.
        </p>
      </Section>

      <Section title="Related services">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Supabase database, authentication, and storage.</li>
          <li>Vercel or the configured hosting platform.</li>
          <li>Push notification providers if enabled.</li>
          <li>Email services if enabled later.</li>
          <li>Payment providers if added later.</li>
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
