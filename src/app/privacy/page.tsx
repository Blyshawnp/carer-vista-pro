const LAST_UPDATED = "June 4, 2026";

export default function PrivacyPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
        <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3">
          Notice: These terms and policies should be reviewed by a qualified attorney before deployment.
        </p>
      </header>

      <Section title="Information We Collect">
        <p>
          Carer Vista Pro collects and processes the following information to facilitate care coordination:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-ink-700">
          <li><strong>Account Details:</strong> Name, email address, password hashes, contact email, phone, profile photos, profile settings, language preferences, and theme, font size, and accessibility preferences.</li>
          <li><strong>Role &amp; Organization:</strong> User role (admin, caregiver, client, family), linked organization, and uploaded organization assets (such as custom company logos, white-label branding names, and brand color hexadecimal values).</li>
          <li><strong>Client &amp; Recipient Profiles:</strong> Names, addresses, care recipient photos, home access instructions, Wi-Fi networks, and home notes.</li>
          <li><strong>Health &amp; Emergency Logs:</strong> Emergency contacts, allergy severity lists, medication instructions, physician contacts, and hospital preferences.</li>
          <li><strong>Pets &amp; Guides:</strong> Pet information, pet photos uploaded by authorized users, and emergency preparedness guides.</li>
          <li><strong>Schedules &amp; Rates:</strong> Shift timings, caregiver estimated pay rates, and billing structures.</li>
          <li><strong>Shifts &amp; Check-ins:</strong> Clock-in/out timestamps, check-in location coordinates, and task completion checklists (including required, optional, and PRN task statuses).</li>
          <li><strong>Location Information:</strong> GPS location coordinates captured exclusively at check-in and check-out to verify geofences. We do not perform continuous background tracking.</li>
          <li><strong>Break &amp; Lunch Logs:</strong> Lunch and break clock-in/out records and administrative adjustment history.</li>
          <li><strong>Internal Communication:</strong> In-app messages, notifications, system alerts, and commendations or complaints.</li>
          <li><strong>Documents &amp; Audits:</strong> PDF or image uploads, read acknowledgments, print history logs, and financial audit logs.</li>
          <li><strong>Invoices &amp; Balances:</strong> Invoice history, recorded manual payments, balances due, client-funded appreciation bonuses, and holiday surcharges.</li>
          <li><strong>Technical Metadata:</strong> Device identifiers, browser type, operating system, push notification subscriptions, device metadata, and system security logs.</li>
          <li><strong>Notification, Tutorial, and Onboarding Settings:</strong> Notification category preferences, in-app tone and quiet-hour settings, privacy-safe notification body settings, tutorial completion or skip status, onboarding checklist dismissal, and organization intro video settings may be stored.</li>
        </ul>
      </Section>

      <Section title="How We Use Information">
        <p>
          We utilize collected data to operate the coordination features of the platform:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-ink-700">
          <li>User authentication and role-based authorization.</li>
          <li>Displaying schedules, claiming shifts, and organizing care.</li>
          <li>Providing active caregivers with immediate reference data (allergies, contacts) during active shifts.</li>
          <li>Tracking care checklist completions, medication reminders, and shift notes.</li>
          <li>Logging geofenced check-ins to verify shifts.</li>
          <li>Maintaining invoices, pay estimates, payment records, and year-end summaries.</li>
          <li>Recording detailed financial audits and system diagnostic troubleshooting logs.</li>
          <li>Allowing authorized organization administrators to manage user profile/contact details and send password reset emails.</li>
          <li>Remembering notification, tutorial, intro video, and onboarding checklist preferences so they do not repeat unnecessarily.</li>
        </ul>
      </Section>

      <Section title="Sharing Within Care Circles">
        <p>
          Information is shared among organization members based on explicit permission configurations:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-ink-700">
          <li>Assigned caregivers see necessary home, client, contact, and medical reference guides.</li>
          <li>Pet information, pet photos, caregiver profile photos, and care recipient photos may be visible to assigned caregivers, administrators, clients, and family users based on organization and client permissions.</li>
          <li>Clients and families see schedules and invoices (where permitted), but never caregiver pay rates or organization margins.</li>
          <li>Administrators have full visibility over all checklists, audits, invoice billing, and payroll rates.</li>
        </ul>
        <p className="mt-2 text-sm text-ink-700">
          We do not sell personal or sensitive data. We share information with third-party service providers (such as hosting and database platforms) only as required to run the platform, or when legally mandated.
        </p>
      </Section>

      <Section title="Administrator Account Management">
        <p>
          Organization administrators may update managed user profile/contact details and initiate password reset emails for users in the same organization. Audit logs may record the administrator, target user, action type, timestamp, and related metadata.
        </p>
      </Section>

      <Section title="HIPAA &amp; Health Compliance Notice">
        <p>
          Carer Vista Pro is a care coordination and reference tool. The application is not automatically HIPAA-compliant. Unless your organization has signed a formal Business Associate Agreement (BAA) and established a complete, customized compliance program with the platform, the app is not HIPAA-covered. Using organizations are solely responsible for determining their own HIPAA and health data privacy compliance obligations.
        </p>
      </Section>

      <Section title="Account &amp; Data Deletion (Google Play Compliance)">
        <p>
          Users can request account and data deletion in two ways:
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-ink-700">
          <li><strong>In-App Path:</strong> Navigate to <strong>Help &rarr; Request Account Deletion</strong> and submit the deletion request form.</li>
          <li><strong>Web / Contact Path:</strong> Contact your organization administrator directly, or submit a request via our support channels.</li>
        </ol>
        <p className="mt-2 text-sm text-ink-700">
          Upon receiving a deletion request, administrators will remove your account profile. However, under Google Play and regulatory policies, some data may be retained for legitimate recordkeeping, billing audits, caregiver tax history (W-2/1099 support), safety logs, dispute tracking, fraud prevention, or legal compliance reasons.
        </p>
      </Section>

      <Section title="Children's Privacy">
        <p>
          The application is not intended for use by children under 13. Care recipient profiles of minor children may only be entered and managed by authorized adult parents, guardians, or administrator organizations.
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
