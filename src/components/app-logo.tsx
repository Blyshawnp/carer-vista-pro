"use client";

import Image from "next/image";
import Link from "next/link";

export default function AppLogo({
  href = "/home",
  showText = true,
  textSize = "text-[11px]",
  className = "",
}: {
  href?: string;
  showText?: boolean;
  textSize?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Carer Vista Pro home"
      className={`flex items-center gap-3 min-w-0 ${className}`}
    >
      <span className="relative shrink-0 w-12 h-12 overflow-hidden">
        <Image
          src="/icon.png"
          alt=""
          fill
          sizes="48px"
          priority
          className="object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
        />
      </span>
      {showText && (
        <span className="min-w-0 leading-none">
          <span className={`block uppercase tracking-[0.18em] font-extrabold text-forest-700 ${textSize} truncate`}>
            Carer Vista Pro
          </span>
        </span>
      )}
    </Link>
  );
}
