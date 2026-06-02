import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TeamMemberDetail from "./team-member-detail";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single<{ role: "admin" | "client" | "caregiver" | "family"; organization_id: string }>();

  if (!viewer || viewer.role !== "admin") redirect("/team");

  const { data: person } = await supabase
    .from("profiles")
    .select("id, full_name, email, username, has_real_email, phone, role, is_active, avatar_url, avatar_color")
    .eq("id", id)
    .single<{
      id: string;
      full_name: string;
      email: string;
      username: string | null;
      has_real_email: boolean | null;
      phone: string | null;
      role: "admin" | "client" | "caregiver" | "family";
      is_active: boolean;
      avatar_url: string | null;
      avatar_color: string | null;
    }>();

  if (!person) notFound();

  const today = new Date().toISOString().split("T")[0];

  const { data: currentRate } = await supabase
    .from("caregiver_rates")
    .select("id, base_hourly_rate, effective_from, effective_to")
    .eq("caregiver_id", id)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      base_hourly_rate: number;
      effective_from: string;
      effective_to: string | null;
    }>();

  const { count: upcomingCount } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("caregiver_id", id)
    .gte("scheduled_end", new Date().toISOString());

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", viewer.organization_id)
    .order("full_name");

  const { data: assignments } = await supabase
    .from("client_user_assignments")
    .select("client_id")
    .eq("organization_id", viewer.organization_id)
    .eq("user_id", id)
    .eq("is_active", true);

  return (
    <TeamMemberDetail
      person={person}
      currentRate={currentRate}
      upcomingShiftCount={upcomingCount ?? 0}
      clients={clients ?? []}
      assignedClientIds={(assignments ?? []).map((row) => row.client_id)}
    />
  );
}
