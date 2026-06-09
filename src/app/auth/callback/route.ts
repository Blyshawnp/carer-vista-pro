import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSetupState } from "@/lib/setup-state";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = getSafeNextPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isDefaultNext = next === "/home" || next === "/setup" || next === "/login" || next === "";
    if (isDefaultNext) {
      const setupState = await getUserSetupState(user?.id, "/auth/callback");
      if (setupState.status === "unauthenticated") {
        next = "/login";
      } else if (setupState.status === "setup_complete") {
        next = "/home";
      } else if (setupState.status !== "error") {
        next = "/setup";
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function getSafeNextPath(next: string | null, origin: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/home";
  }

  try {
    const parsed = new URL(next, origin);
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== origin || normalizedPath !== next) {
      return "/home";
    }

    return normalizedPath;
  } catch {
    return "/home";
  }
}
