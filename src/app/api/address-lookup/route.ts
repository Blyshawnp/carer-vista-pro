import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = payload?.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "Address query is required." }, { status: 400 });
  }

  const provider = process.env.ADDRESS_LOOKUP_PROVIDER;
  const apiKey = process.env.ADDRESS_LOOKUP_API_KEY;

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "Address lookup is not configured yet." },
      { status: 501 }
    );
  }

  return NextResponse.json(
    {
      error: "Address lookup provider integration has not been implemented yet.",
      provider,
    },
    { status: 501 }
  );
}
