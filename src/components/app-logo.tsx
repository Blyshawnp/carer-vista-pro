"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type AppLogoVariant = "auth" | "header" | "compact";

const logoSizes: Record<
  AppLogoVariant,
  {
    wrapper: string;
    image: string;
    width: number;
    height: number;
    sizes: string;
    fallback: string;
  }
> = {
  auth: {
    wrapper: "w-[88px] h-[88px] sm:w-[104px] sm:h-[104px]",
    image: "h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]",
    width: 104,
    height: 104,
    sizes: "(min-width: 640px) 104px, 88px",
    fallback: "h-[88px] w-[88px] sm:h-[104px] sm:w-[104px] text-sm",
  },
  header: {
    wrapper: "w-[56px] h-[56px] sm:w-16 sm:h-16",
    image: "h-14 w-14 sm:h-16 sm:w-16",
    width: 64,
    height: 64,
    sizes: "(min-width: 640px) 64px, 56px",
    fallback: "h-14 w-14 sm:h-16 sm:w-16 text-[10px]",
  },
  compact: {
    wrapper: "w-12 h-12",
    image: "h-12 w-12",
    width: 48,
    height: 48,
    sizes: "48px",
    fallback: "h-12 w-12 text-[9px]",
  },
};

export default function AppLogo({
  href = "/home",
  showText = true,
  textSize = "text-[11px]",
  variant = "compact",
  className = "",
}: {
  href?: string;
  showText?: boolean;
  textSize?: string;
  variant?: AppLogoVariant;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const size = logoSizes[variant];

  return (
    <Link
      href={href}
      aria-label="Carer Vista Pro home"
      className={`flex items-center gap-3 min-w-0 ${className}`}
    >
      <span className={`relative shrink-0 overflow-visible ${size.wrapper}`}>
        {logoFailed ? (
          <span
            className={`flex items-center justify-center text-center font-extrabold uppercase leading-none text-forest-700 ${size.fallback}`}
          >
            Carer Vista Pro
          </span>
        ) : (
          <Image
            src="/icon.png"
            alt="Carer Vista Pro"
            width={size.width}
            height={size.height}
            sizes={size.sizes}
            priority
            onError={() => setLogoFailed(true)}
            className={`object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)] ${size.image}`}
          />
        )}
      </span>
      {(showText || logoFailed) && (
        <span className="min-w-0 leading-none">
          <span className={`block uppercase tracking-[0.18em] font-extrabold text-forest-700 ${textSize} truncate`}>
            Carer Vista Pro
          </span>
        </span>
      )}
    </Link>
  );
}
