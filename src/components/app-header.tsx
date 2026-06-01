"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import AppLogo from "./app-logo";
import NotificationBell from "./notification-bell";
import UserAvatar from "./user-avatar";
import type { Role } from "@/lib/db-types";
import { t, type Lang } from "@/lib/i18n";
import { getFirstName } from "@/lib/name";

export default function AppHeader({
  fullName,
  orgName,
  avatarUrl,
  avatarColor,
  userId,
  notificationCount = 0,
  role,
  lang = "en",
  enableCustomBranding = false,
  customLogoUrl = null,
  customBrandName = null,
  brandPrimaryColor = null,
  brandAccentColor = null,
}: {
  fullName: string;
  orgName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  userId?: string;
  notificationCount?: number;
  role: Role;
  lang?: Lang;
  enableCustomBranding?: boolean;
  customLogoUrl?: string | null;
  customBrandName?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
}) {
  const firstName = getFirstName(fullName);
  const [emergencyIconFailed, setEmergencyIconFailed] = useState(false);
  const emergencyLabel = t("header.emergencyInfo", lang);
  const profileLabel = t("header.profile", lang);

  return (
    <header className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 sticky top-0 bg-cream-100/85 backdrop-blur-md z-20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <AppLogo
            href="/home"
            variant="header"
            showText={false}
            enableCustomBranding={enableCustomBranding}
            customLogoUrl={customLogoUrl}
            customBrandName={customBrandName}
          />
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <h1 className="font-display text-4xl text-ink-900 mb-1.5">
              {t("header.welcome", lang)},{" "}
              <span
                className="text-navy-600 font-bold"
                style={{ color: enableCustomBranding && brandPrimaryColor ? brandPrimaryColor : undefined }}
              >
                {firstName}
              </span>
            </h1>
            {orgName && (
              <>
                <span className="hidden min-[390px]:inline-block w-1 h-1 rounded-full bg-ink-300 shrink-0" />
                <p className="hidden min-[390px]:block text-[10px] uppercase tracking-[0.16em] text-ink-400 font-bold leading-none truncate">
                  {orgName}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/emergency"
          aria-label={emergencyLabel}
          title={emergencyLabel}
          data-role={role}
          className="relative w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full grid place-items-center overflow-visible shadow-[0_0_18px_rgba(220,38,38,0.38)] transition duration-150 hover:scale-[1.05] hover:shadow-[0_0_24px_rgba(220,38,38,0.5)] active:scale-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 motion-safe:animate-pulse"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
          />
          {emergencyIconFailed ? (
            <EmergencyFallbackIcon className="relative z-10" />
          ) : (
            <Image
              src="/icons/emergency.png"
              alt=""
              width={48}
              height={48}
              onError={() => setEmergencyIconFailed(true)}
              className="relative z-10 block object-contain"
            />
          )}
        </Link>
        {userId && (
          <NotificationBell
            initialCount={notificationCount}
            userId={userId}
            label={t("header.notifications", lang)}
          />
        )}
        {userId && (
          <Link
            href="/me"
            aria-label={profileLabel}
            className="rounded-full hover:opacity-90 transition active:scale-95"
          >
            <UserAvatar
              person={{
                full_name: fullName,
                avatar_url: avatarUrl,
                avatar_color: avatarColor,
              }}
              size="sm"
            />
          </Link>
        )}
      </div>
    </header>
  );
}

function EmergencyFallbackIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-12 w-12 place-items-center rounded-full bg-red-600 ${className}`}
    >
      <span className="absolute h-7 w-2.5 rounded-sm bg-white" />
      <span className="absolute h-2.5 w-7 rounded-sm bg-white" />
    </span>
  );
}
