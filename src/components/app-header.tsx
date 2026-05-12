"use client";

import Link from "next/link";
import Image from "next/image";
import NotificationBell from "./notification-bell";
import UserAvatar from "./user-avatar";
import type { Role } from "@/lib/db-types";
import { getFirstName } from "@/lib/name";

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
          <Link
            href="/home"
            aria-label="Carer Vista Pro home"
            className="inline-flex items-center min-w-0"
          >
            <span className="relative block w-36 h-12 shrink-0">
              <Image
                src="/icon.png"
                alt="Carer Vista Pro"
                fill
                sizes="144px"
                priority
                className="object-contain"
              />
            </span>
          </Link>
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
          href="/emergency?report=1"
          aria-label="Emergency info"
          title="Emergency info"
          data-role={role}
          className="relative w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full grid place-items-center overflow-visible shadow-[0_0_18px_rgba(220,38,38,0.38)] transition duration-150 hover:scale-[1.05] hover:shadow-[0_0_24px_rgba(220,38,38,0.5)] active:scale-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 motion-safe:animate-pulse"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-red-600"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
          />
          <Image
            src="/icons/emergency.png"
            alt=""
            width={48}
            height={48}
            className="relative z-10 block object-contain"
          />
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
