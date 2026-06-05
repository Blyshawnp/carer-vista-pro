const LAST_UPDATED = "June 4, 2026";

export default function TermsPage() {
  return (
    <main className="px-5 py-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-ink-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
        <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3">
          Notice: These terms and policies should be reviewed by a qualified attorney before deployment.
        </p>
      </header>

      <Section title="What this app is">
        <p>
          Carer Vista Pro is a care coordination and recordkeeping tool. It helps organizations,
          caregivers, clients, and family members organize schedules, notes,
          reminders, messaging, and related operational information.
        </p>
        <p className="mt-2">
          It is not medical advice, clinical documentation, or emergency services.
          It is not a substitute for professional medical judgment, licensed nursing care,
          physician orders, legal advice, payroll advice, tax advice, or accounting advice.
        </p>
      </Section>

      <Section title="Emergency Boundary">
        <p>
          In a medical, safety, fire, police, or life-threatening emergency, call
          your correct local emergency number immediately (such as 911 in US/Canada, 999 or 112 in UK, 112 in EU). Do not rely on the application to alert emergency responders.
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
          <li>Keep care information current and accurate. Users are responsible for keeping entries updated.</li>
          <li>Use your own account and protect your password, device, and session.</li>
          <li>Do not share passwords or let others use your login.</li>
          <li>Follow applicable laws, care plans, workplace rules, and professional requirements.</li>
          <li><strong>Bulk Actions Liability:</strong> Deleting or cancelling shifts bulk will permanently delete associated tasks, check-in history, and records, which can affect invoices, caregiver pay histories, and reports. Users are strictly responsible for reviewing and confirming all selections before executing bulk actions.</li>
        </ul>
      </Section>

      <Section title="Organization responsibility">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Organization owners and admins are responsible for verifying caregivers, schedules, care instructions, emergency contacts, medications, allergies, documents, and permissions.</li>
          <li>Admins are responsible for reviewing and updating permissions for linked family and client users.</li>
          <li>Admins are responsible for maintaining accurate managed user profile/contact details, sending password reset emails only when appropriate, and disabling access when users should no longer have access.</li>
          <li>Admins are responsible for deciding which information may be visible to caregivers and family users.</li>
        </ul>
      </Section>

      <Section title="Payroll, Tax, and Classification Compliance">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Organizations and clients are solely responsible for all payroll, tax, legal, and regulatory compliance.</li>
          <li>This app does not provide payroll, tax, legal, accounting, or employment advice.</li>
          <li>Organizations and clients are fully responsible for setting correct rates, generating accurate invoices, paying taxes, managing payments, determining worker classification (such as W-2 vs. 1099), and maintaining correct business and employment records.</li>
          <li>Year-end summaries and client invoices are for recordkeeping and administration only, unless official tax documents are separately issued by the organization.</li>
          <li>The app does not prepare, file, or submit W-2 forms, 1099 forms, payroll taxes, or tax returns.</li>
          <li>Organizations must independently verify and document caregiver employee or contractor classification.</li>
        </ul>
      </Section>

      <Section title="Manual Payments, Invoices, and Appreciation Bonuses">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Manual Payment Records:</strong> The invoicing, payment logging, and balance tracking tools in this app are for manual recordkeeping only. The app does not process real payments, credit card transactions, or bank transfers unless a dedicated payment processor is explicitly added and configured.</li>
          <li><strong>Appreciation Bonuses:</strong> Optional caregiver appreciation, holiday, performance, or other bonuses funded by clients are subject to organization rules and configuration. In Agency / Company mode, all client-submitted caregiver appreciation bonuses are subject to organization and administrator approval before affecting caregiver payouts, pay summaries, or client invoices.</li>
          <li>Clients and families are not allowed to directly pay caregivers through the application. All monetary records and transactions must align with the organization's policies.</li>
        </ul>
      </Section>

      <Section title="Wage, Hour, and Tax Compliance Disclaimer">
        <p className="mb-2">
          Carer Vista Pro does not provide tax, payroll, legal, accounting, or employment classification advice. All tools and calculations (including caregiver pay estimates, tax estimates, deductions, holiday multipliers, and surcharges) are for recordkeeping and estimate purposes only.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Organization Responsibility:</strong> Using organizations are fully responsible for confirming that caregiver pay calculations and deductions conform with federal, state, and local wage, hour, tax, payroll, overtime, and worker classification laws.</li>
          <li><strong>Worker Classification:</strong> The organization is solely responsible for determining whether caregivers are employees or independent contractors.</li>
          <li><strong>Tax Preparation:</strong> The organization is responsible for preparing and sending any required W-2, 1099, or other tax forms, and maintaining accurate tax and business records.</li>
          <li><strong>Legality of Deductions:</strong> The organization must verify that any deduction from caregiver pay is lawful, authorized, and conforms with applicable laws. Do not use the deductions feature unless you understand and accept these responsibilities.</li>
        </ul>
      </Section>

      <Section title="Custom Branding & White-Label Legal">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Organization custom branding or white-labeling does not transfer ownership of the app or the underlying software platform.</li>
          <li>Using organizations do not own or claim ownership of Carer Vista Pro or the underlying platform.</li>
          <li>The organization is fully responsible for having appropriate copyright and usage rights to upload and display its logo.</li>
          <li>Carer Vista Pro remains the sole platform and software provider.</li>
          <li>Custom organization branding may be available only on upgraded plans. Personal appearance and accessibility preferences are not paywalled.</li>
          <li>Powered by Carer Vista Pro branding remains present in footer, help, about, legal, and platform identity areas.</li>
          <li>Application store and PWA installer identity remains Carer Vista Pro unless separately and explicitly configured.</li>
        </ul>
      </Section>

      <Section title="Shift Cancellations & Cancellation Fees">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Cancellation Request Workflow:</strong> In Agency/Company mode, clients cannot directly delete shifts; instead, they submit a cancellation request. Administrators can approve the request (applying or waiving any cancellation fee) or decline it with a reason.</li>
          <li><strong>Organization Responsibility:</strong> Cancellation fee policies, rates, and criteria are configured solely by the employing organization. The organization is fully responsible for ensuring compliance and legal enforceability of cancellation fees under local laws.</li>
          <li><strong>No App Responsibility:</strong> The application does not determine the validity, fairness, or legal enforceability of cancellation fees. The app acts solely as a logging, notification, and calculation record tool for administrative convenience.</li>
        </ul>
      </Section>

      <Section title="No medical advice">
        <p>
          Content in the app is for reference and coordination only. It is not
          medical advice and should not replace a doctor, nurse, dispatcher,
          emergency responder, or caregiver judgment.
        </p>
      </Section>

      <Section title="Service and Notification availability">
        <p>
          We do not guarantee uninterrupted or error-free service. Data,
          push notifications, PWA alerts, and reminders may be delayed, blocked, disabled, or unavailable because of
          network issues, cellular signals, device settings, platform issues, browser settings, power outages, or
          third-party service interruptions.
        </p>
        <p className="mt-2 text-xs">
          ⚠️ PWA notifications and push notifications are not guaranteed for urgent, critical, or emergency use. Always use primary emergency dispatch lines (such as calling 911) for any urgent care or life safety situation.
        </p>
        <p className="mt-2">
          In-app tones and category sound choices are browser-based convenience features. They are not guaranteed, may require prior user interaction, and do not replace phone calls, emergency services, or other primary alert paths.
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
      <div className="mt-8 mb-4 text-center">
        <p className="text-[10px] text-ink-300 font-semibold tracking-wider uppercase">
          Powered by Carer Vista Pro
        </p>
      </div>
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
