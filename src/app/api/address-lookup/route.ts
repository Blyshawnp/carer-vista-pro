import { NextResponse } from "next/server";
import { lookupAddress } from "@/lib/address-lookup";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = payload?.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "Address query is required." }, { status: 400 });
  }

  if (!process.env.ADDRESS_LOOKUP_PROVIDER) {
    return NextResponse.json(
      { error: "Address lookup is not configured yet." },
      { status: 501 }
    );
  }

  const result = await lookupAddress(query);
  if (!result) {
    return NextResponse.json(
      { error: "Address lookup provider could not resolve that address." },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}
