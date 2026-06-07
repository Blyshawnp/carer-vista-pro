import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSetupState } from "@/lib/setup-state";
import SetupWizard from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const setupState = await getUserSetupState(user.id, "/setup");
  if (setupState.status === "setup_complete") {
    redirect("/home");
  }
  if (setupState.status === "error") {
    return <SetupStateError />;
  }

  const defaultName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return <SetupWizard defaultName={defaultName} email={user.email ?? ""} />;
}

function SetupStateError() {
  return (
    <main className="min-h-dvh bg-cream-100 px-5 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-terracotta-500/20 bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-ink-900">
          We could not load your setup status. Please refresh or contact support.
        </p>
      </section>
    </main>
  );
}
