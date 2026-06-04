import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";
import ShiftWatcher, {
  type ActiveWatch,
} from "@/components/shift-watcher";
import InstallPrompt from "@/components/install-prompt";
import PushPermissionPrompt from "@/components/push-permission-prompt";
import PwaHealthCheck from "@/components/pwa-health-check";
import OnboardingTutorial from "@/components/onboarding-tutorial";
import type { Role } from "@/lib/db-types";
import type { Lang } from "@/lib/i18n";

type ProfileWithOrg = {
  id: string;
  full_name: string;
  role: Role;
  organization_id: string | null;
  language: Lang | null;
  avatar_url: string | null;
  avatar_color: string | null;
  tutorial_completed: boolean | null;
  organizations: {
    name: string;
    onboarding_complete: boolean | null;
    intro_video_url: string | null;
    intro_video_enabled: boolean | null;
    show_intro_video_on_first_login: boolean | null;
    enable_custom_branding?: boolean;
    custom_logo_url?: string | null;
    brand_primary_color?: string | null;
    brand_accent_color?: string | null;
    custom_brand_name?: string | null;
    plan_allows_custom_branding?: boolean;
  } | null;
};

type ActiveShiftRow = {
  id: string;
  scheduled_end: string;
  organization_id: string;
  clients: {
    full_name: string;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
  } | null;
  check_ins:
    | Array<{
        id: string;
        check_in_time: string | null;
        check_out_time: string | null;
      }>
    | {
        id: string;
        check_in_time: string | null;
        check_out_time: string | null;
      }
    | null;
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, organization_id, language, avatar_url, avatar_color, theme_preference, tutorial_completed, organizations(name, onboarding_complete, intro_video_url, intro_video_enabled, show_intro_video_on_first_login, enable_custom_branding, custom_logo_url, brand_primary_color, brand_accent_color, custom_brand_name, plan_allows_custom_branding)"
    )
    .eq("id", user.id)
    .single<ProfileWithOrg & { theme_preference: string }>();

  if (!profile?.organization_id || profile.organizations?.onboarding_complete === false) {
    redirect("/setup");
  }

  const lang: Lang = profile?.language === "es" ? "es" : "en";

  let activeWatch: ActiveWatch | null = null;
  if (profile?.role === "caregiver") {
    try {
      const { data: activeRaw } = await supabase
        .from("shifts")
        .select(
          `
          id,
          scheduled_end,
          organization_id,
          clients ( full_name, latitude, longitude, geofence_radius_meters ),
          check_ins!inner ( id, check_in_time, check_out_time )
        `
        )
        .eq("caregiver_id", profile.id)
        .not("check_ins.check_in_time", "is", null)
        .is("check_ins.check_out_time", null)
        .limit(1)
        .maybeSingle();

      if (activeRaw) {
        const active = activeRaw as unknown as ActiveShiftRow;
        const activeCheckIn =
          normalizeRows(active.check_ins).find(
            (row) => row.check_in_time && !row.check_out_time
          ) ?? null;
        activeWatch = {
          shift_id: active.id,
          caregiver_id: profile.id,
          organization_id: active.organization_id,
          scheduled_end: active.scheduled_end,
          client_lat: active.clients?.latitude ?? null,
          client_lng: active.clients?.longitude ?? null,
          geofence_radius: active.clients?.geofence_radius_meters ?? 150,
          client_name: active.clients?.full_name ?? "Client",
          check_in_id: activeCheckIn?.id ?? null,
        };
      }
    } catch {
      activeWatch = null;
    }
  }

  let unreadMessages = 0;
  if (profile) {
    try {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", profile.id)
        .eq("is_read", false);
      unreadMessages = count ?? 0;
    } catch {
      /* ignore */
    }
  }

  let notificationCount = 0;
  if (profile) {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", profile.id)
        .eq("is_read", false)
        .is("dismissed_at", null);
      notificationCount = count ?? 0;
    } catch {
      /* ignore */
    }
  }

  const orgBranding = profile?.organizations ? {
    enable_custom_branding: !!profile.organizations.enable_custom_branding,
    custom_logo_url: profile.organizations.custom_logo_url ?? null,
    brand_primary_color: profile.organizations.brand_primary_color ?? null,
    brand_accent_color: profile.organizations.brand_accent_color ?? null,
    custom_brand_name: profile.organizations.custom_brand_name ?? null,
    plan_allows_custom_branding: profile.organizations.plan_allows_custom_branding !== false,
  } : null;

  const showCustomBranding = orgBranding
    ? !!(orgBranding.enable_custom_branding && orgBranding.plan_allows_custom_branding)
    : false;

  const themeClass = profile?.theme_preference ?? "default";

  return (
    <div className={`min-h-dvh flex flex-col bg-cream-100 theme-${themeClass}`}>
      {showCustomBranding && (orgBranding?.brand_primary_color || orgBranding?.brand_accent_color) && themeClass !== "high-contrast" && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root, .theme-default, .theme-teal, .theme-blue, .theme-green, .theme-purple, .theme-rose {
            ${orgBranding?.brand_primary_color ? `
              --forest-400: ${orgBranding.brand_primary_color}dd;
              --forest-500: ${orgBranding.brand_primary_color};
              --forest-600: ${orgBranding.brand_primary_color}ee;
              --forest-700: ${orgBranding.brand_primary_color}cc;
            ` : ""}
            ${orgBranding?.brand_accent_color ? `
              --terracotta-400: ${orgBranding.brand_accent_color}dd;
              --terracotta-500: ${orgBranding.brand_accent_color};
              --terracotta-600: ${orgBranding.brand_accent_color}ee;
            ` : ""}
          }
        ` }} />
      )}

      <AppHeader
        fullName={profile?.full_name ?? "There"}
        orgName={profile?.organizations?.name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        avatarColor={profile?.avatar_color ?? null}
        userId={profile?.id}
        notificationCount={notificationCount}
        role={profile?.role ?? "caregiver"}
        lang={lang}
        enableCustomBranding={showCustomBranding}
        customLogoUrl={orgBranding?.custom_logo_url}
        customBrandName={orgBranding?.custom_brand_name}
        brandPrimaryColor={orgBranding?.brand_primary_color}
        brandAccentColor={orgBranding?.brand_accent_color}
      />

      <div className="flex-1 pb-24">
        {activeWatch && (
          <div className="px-5 pt-4 max-w-2xl mx-auto">
            <ShiftWatcher active={activeWatch} />
          </div>
        )}
        {children}

        {/* Platform identity reference */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-[10px] text-ink-300 font-semibold tracking-wider uppercase">
            Powered by Carer Vista Pro
          </p>
        </div>
      </div>

      <BottomNav
        role={profile?.role ?? "caregiver"}
        unreadMessages={unreadMessages}
        lang={lang}
      />
      <InstallPrompt />
      <PushPermissionPrompt />
      <PwaHealthCheck />
      <OnboardingTutorial
        role={profile?.role ?? "caregiver"}
        completed={!!profile?.tutorial_completed}
        introVideoUrl={profile?.organizations?.intro_video_url ?? null}
        introVideoEnabled={!!profile?.organizations?.intro_video_enabled}
        showIntroVideoOnFirstLogin={!!profile?.organizations?.show_intro_video_on_first_login}
      />
    </div>
  );
}

function normalizeRows<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
