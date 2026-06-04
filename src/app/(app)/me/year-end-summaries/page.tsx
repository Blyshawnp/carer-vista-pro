import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/pay";
import YearEndDashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  id: string;
  role: "admin" | "client" | "caregiver" | "family";
  organization_id: string;
  full_name: string;
};

type SummaryRow = {
  id: string;
  caregiver_id: string;
  year: number;
  total_hours: number;
  total_pay: number;
  total_bonus: number;
  status?: "active" | "voided" | "deleted" | "corrected";
  adjusted_total_hours?: number | null;
  adjusted_total_pay?: number | null;
  adjusted_total_bonus?: number | null;
  released_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
};

type CorrectionRow = {
  id: string;
  summary_id: string;
  caregiver_id: string;
  message: string;
  status: "submitted" | "reviewed" | "resolved" | "dismissed";
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
  profiles?: { full_name: string } | null;
};

export default async function YearEndSummariesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id, full_name")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile) redirect("/login");

  // Fetch organization settings
  const { data: org } = await supabase
    .from("organizations")
    .select("organization_mode, allow_client_admin_for_personal_use, enable_year_end_summary, year_end_summary_release_month, year_end_summary_release_day")
    .eq("id", profile.organization_id)
    .single<{
      organization_mode: string;
      allow_client_admin_for_personal_use: boolean;
      enable_year_end_summary: boolean;
      year_end_summary_release_month: number;
      year_end_summary_release_day: number;
    }>();

  const isCaregiver = profile.role === "caregiver";
  
  const isPersonalFamily = org?.organization_mode === "personal_family";
  const isClientDirected = org?.organization_mode === "client_directed_care";
  const allowClientAdmin = org?.allow_client_admin_for_personal_use;

  const isAdmin = profile.role === "admin" || 
    (profile.role === "client" && (
      (isPersonalFamily && allowClientAdmin) || 
      isClientDirected
    ));

  // If EOY summaries are disabled for the organization and user is caregiver, show disabled message
  if (isCaregiver && !org?.enable_year_end_summary) {
    return (
      <main className="px-5 py-6 max-w-2xl mx-auto">
        <header className="mb-5">
          <Link href="/me" className="text-sm text-forest-600 hover:underline mb-2 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="font-display text-3xl text-ink-900">Year-End Summaries</h1>
        </header>
        <div className="bg-white rounded-3xl p-8 border border-cream-200 text-center shadow-soft grain-overlay">
          <p className="text-sm text-ink-600 font-medium">
            Year-End Summaries are currently not enabled for your organization.
          </p>
          <p className="text-xs text-ink-450 mt-1">
            Please contact your administrator if you require annual earnings statements.
          </p>
        </div>
      </main>
    );
  }

  let summaries: SummaryRow[] = [];
  let corrections: CorrectionRow[] = [];
  let caregiversList: { id: string; full_name: string }[] = [];

  if (isCaregiver) {
    // Caregiver: see own summaries
    const { data: sumData } = await supabase
      .from("year_end_summaries")
      .select("id, caregiver_id, year, total_hours, total_pay, total_bonus, status, adjusted_total_hours, adjusted_total_pay, adjusted_total_bonus, released_at, created_at")
      .eq("caregiver_id", profile.id)
      .neq("status", "deleted")
      .order("year", { ascending: false });

    summaries = (sumData ?? []) as SummaryRow[];

    const { data: corrData } = await supabase
      .from("summary_correction_requests")
      .select("id, summary_id, caregiver_id, message, status, admin_response, created_at, resolved_at")
      .eq("caregiver_id", profile.id)
      .order("created_at", { ascending: false });

    corrections = (corrData ?? []) as CorrectionRow[];
  } else if (isAdmin) {
    // Admin: see all summaries in org
    const { data: sumData } = await supabase
      .from("year_end_summaries")
      .select(`
        id, caregiver_id, year, total_hours, total_pay, total_bonus, status, adjusted_total_hours, adjusted_total_pay, adjusted_total_bonus, released_at, created_at,
        profiles:caregiver_id ( full_name )
      `)
      .eq("organization_id", profile.organization_id)
      .order("year", { ascending: false });

    summaries = (sumData ?? []) as unknown as SummaryRow[];

    const { data: corrData } = await supabase
      .from("summary_correction_requests")
      .select(`
        id, summary_id, caregiver_id, message, status, admin_response, created_at, resolved_at,
        profiles:caregiver_id ( full_name )
      `)
      .order("created_at", { ascending: false });

    corrections = (corrData ?? []) as unknown as CorrectionRow[];

    // Fetch all caregivers to show filters or info
    const { data: cgData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", profile.organization_id)
      .eq("role", "caregiver")
      .order("full_name");

    caregiversList = (cgData ?? []) as { id: string; full_name: string }[];
  }

  return (
    <main className="px-5 py-6 max-w-3xl mx-auto">
      <header className="mb-5">
        <Link href="/me" className="text-sm text-forest-600 hover:underline mb-2 inline-block">
          ← Back to Profile
        </Link>
        <h1 className="font-display text-3xl text-ink-900">Year-End Summaries</h1>
        <p className="text-ink-500 text-sm">
          {isCaregiver 
            ? "View and verify your income and hours statements for recordkeeping."
            : "Review annual earning statements and resolve caregiver correction requests."
          }
        </p>
      </header>

      {/* Compliance & Verification Notice for PUBLIC app */}
      <section className="bg-cream-100/60 border border-cream-200 p-5 rounded-3xl text-xs text-ink-700 leading-relaxed mb-6 grain-overlay">
        <h2 className="font-semibold text-ink-900 uppercase tracking-wider mb-2 text-[10px]">
          🏢 Organization Compliance & Recordkeeping Notice
        </h2>
        <ul className="list-disc pl-4 space-y-1.5">
          <li><strong>Organization Responsibility:</strong> The employing agency or contracting organization is fully responsible for classification, payroll, and legal tax compliance.</li>
          <li><strong>Recordkeeping Only:</strong> Year-end summaries generated in this app are for recordkeeping only, unless separately verified and issued as official tax documents by your organization.</li>
          <li><strong>No Auto-Filing:</strong> This app does not prepare, file, or submit W-2, 1099, payroll taxes, or income tax returns to any government authority.</li>
          <li><strong>Legal Classification:</strong> The organization must independently verify caregiver employee/contractor status. The app does not provide tax, legal, accounting, payroll, or insurance advice.</li>
        </ul>
      </section>

      <YearEndDashboardClient
        role={profile.role}
        initialSummaries={summaries}
        initialCorrections={corrections}
        caregiversList={caregiversList}
        isPublicApp={true}
        orgSettings={org}
      />
    </main>
  );
}
