import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INVALID_LOGIN_MESSAGE } from "@/lib/auth-errors";

type UsernameLoginRequest = {
  username?: string;
  password?: string;
};

type NoEmailProfile = {
  email: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UsernameLoginRequest;
    const username = normalizeUsername(payload.username ?? "");
    const password = payload.password ?? "";

    if (!username || !password) {
      return NextResponse.json({ error: INVALID_LOGIN_MESSAGE }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: matches, error: lookupError } = await admin
      .from("profiles")
      .select("email")
      .eq("username", username)
      .eq("has_real_email", false)
      .eq("is_active", true)
      .limit(2)
      .returns<NoEmailProfile[]>();

    if (lookupError || !matches || matches.length !== 1) {
      return NextResponse.json({ error: INVALID_LOGIN_MESSAGE }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: matches[0].email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: INVALID_LOGIN_MESSAGE }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: INVALID_LOGIN_MESSAGE }, { status: 400 });
  }
}

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9]{2,32}$/.test(username) ? username : "";
}
