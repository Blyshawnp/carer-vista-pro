import { buildAddressQuery, type StructuredAddress } from "./address";

export type AddressLookupResult = {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "address_geocode";
  provider: string;
};

export async function lookupAddress(
  input: StructuredAddress | string
): Promise<AddressLookupResult | null> {
  const provider = process.env.ADDRESS_LOOKUP_PROVIDER?.trim().toLowerCase();
  if (!provider) return null;

  const query = typeof input === "string" ? input.trim() : buildAddressQuery(input);
  if (!query) return null;

  if (provider === "mapbox") {
    return lookupWithMapbox(query);
  }

  if (provider === "nominatim") {
    return lookupWithNominatim(query);
  }

  return null;
}

async function lookupWithMapbox(query: string): Promise<AddressLookupResult | null> {
  const apiKey = process.env.ADDRESS_LOOKUP_API_KEY?.trim();
  if (!apiKey) return null;

  const url = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(query) + ".json");
  url.searchParams.set("access_token", apiKey);
  url.searchParams.set("limit", "1");

  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as
    | { features?: Array<{ place_name?: string; center?: [number, number] }> }
    | null;
  const feature = data?.features?.[0];
  if (!feature?.center) return null;

  return {
    formattedAddress: feature.place_name ?? query,
    longitude: feature.center[0] ?? null,
    latitude: feature.center[1] ?? null,
    source: "address_geocode",
    provider: "mapbox",
  };
}

async function lookupWithNominatim(query: string): Promise<AddressLookupResult | null> {
  const apiKey = process.env.ADDRESS_LOOKUP_API_KEY?.trim();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  if (apiKey) {
    url.searchParams.set("email", apiKey);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Carer Vista Pro",
    },
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as
    | Array<{ display_name?: string; lat?: string; lon?: string }>
    | null;
  const feature = data?.[0];
  if (!feature) return null;

  const latitude = feature.lat != null ? Number(feature.lat) : null;
  const longitude = feature.lon != null ? Number(feature.lon) : null;
  if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    formattedAddress: feature.display_name ?? query,
    longitude,
    latitude,
    source: "address_geocode",
    provider: "nominatim",
  };
}
