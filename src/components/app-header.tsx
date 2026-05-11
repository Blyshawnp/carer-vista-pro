"use client";

import Link from "next/link";
import NotificationBell from "./notification-bell";
import { StarOfLifeIcon } from "./icons";
import UserAvatar from "./user-avatar";
import type { Role } from "@/lib/db-types";
import { getFirstName } from "@/lib/name";
import AppLogo from "./app-logo";

export default function AppHeader({
  fullName,
  orgName,
  avatarUrl,
  avatarColor,
  userId,
  notificationCount = 0,
  role,
}: {
  fullName: string;
  orgName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  userId?: string;
  notificationCount?: number;
  role: Role;
}) {
  const firstName = getFirstName(fullName);

  return (
    <header className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 sticky top-0 bg-cream-100/85 backdrop-blur-md z-20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <AppLogo href="/home" showText />
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <h1 className="font-display text-2xl text-ink-900 leading-none truncate">
              Welcome, <span className="text-forest-600">{firstName}</span>
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
          aria-label="Emergency Info"
          title="Emergency Info"
          data-role={role}
          className="relative w-12 h-12 rounded-full bg-red-600 text-white grid place-items-center border border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.34)] transition-transform transition-shadow transition-colors duration-150 hover:scale-[1.05] hover:bg-red-500 hover:shadow-[0_0_14px_rgba(239,68,68,0.48)] active:scale-95 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100"
        >
          <StarOfLifeIcon size={24} />
        </Link>
        {userId && (
          <NotificationBell initialCount={notificationCount} userId={userId} />
        )}
        {userId && (
          <Link
            href="/me"
            aria-label="Profile"
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
