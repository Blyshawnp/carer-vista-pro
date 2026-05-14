"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition } from "@/lib/geo";
import { formatStructuredAddress, normalizeCountry } from "@/lib/address";
import { MapPinIcon } from "@/components/icons";

type Client = {
  id: string;
  full_name: string;
  address: string | null;
  formatted_address: string | null;
  street_address_1: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  state_or_region: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
};

export default function ClientsList({
  clients,
  canManage,
  role,
}: {
  clients: Client[];
  canManage: boolean;
  role: "admin" | "client" | "caregiver" | "family";
}) {
  if (clients.length === 0) {
    const message =
      role === "caregiver"
        ? "No assigned clients yet. Ask an admin to assign you to a client."
        : role === "family"
          ? "No family links yet. Ask an admin to link your account to a client."
          : role === "client"
            ? "No linked clients yet. Ask an admin to link your account to a client."
          : "No care recipients are currently visible for your account.";

    return (
      <div className="bg-white rounded-3xl p-10 shadow-soft text-center grain-overlay">
        <p className="font-display text-lg mb-1">
          {role === "caregiver"
            ? "No assigned clients yet"
            : role === "family"
              ? "No family links yet"
              : "No clients yet"}
        </p>
        <p className="text-sm text-ink-500">{message}</p>
        {canManage && (
          <Link
            href="/clients/new"
            className="mt-4 inline-flex bg-forest-600 hover:bg-forest-700 text-cream-50 px-4 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Add client
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {clients.map((c) => (
        <li key={c.id}>
          <ClientCard client={c} canManage={canManage} />
        </li>
      ))}
    </ul>
  );
}

function ClientCard({
  client,
  canManage,
}: {
  client: Client;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const meaningfulAddress = displayAddress(client);
  const [address, setAddress] = useState(meaningfulAddress ?? "");
  const [latitude, setLatitude] = useState(
    client.latitude != null ? String(client.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    client.longitude != null ? String(client.longitude) : ""
  );
  const [radius, setRadius] = useState(String(client.geofence_radius_meters));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const hasCoords = client.latitude != null && client.longitude != null;

  async function useCurrentLocation() {
    setError(null);
    setLocating(true);
    const coords = await getCurrentPosition();
    setLocating(false);
    if (!coords) {
      setError(
        "Could not get your location. Allow location access or paste coordinates manually."
      );
      return;
    }
    setLatitude(coords.latitude.toFixed(6));
    setLongitude(coords.longitude.toFixed(6));
  }

  async function save() {
    setError(null);
    const lat = latitude.trim() === "" ? null : Number(latitude);
    const lng = longitude.trim() === "" ? null : Number(longitude);
    const rad = Number(radius);

    if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError("Latitude must be between -90 and 90");
      return;
    }
    if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) {
      setError("Longitude must be between -180 and 180");
      return;
    }
    if (isNaN(rad) || rad < 10 || rad > 5000) {
      setError("Radius must be between 10 and 5000 meters");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({
        address: address.trim() || null,
        latitude: lat,
        longitude: lng,
        geofence_radius_meters: rad,
      })
      .eq("id", client.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-5 grain-overlay">
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-lg text-ink-900">
                {client.full_name}
              </h2>
              {meaningfulAddress ? (
                <p className="text-sm text-ink-500 mt-0.5">{meaningfulAddress}</p>
              ) : (
                <p className="text-sm text-ink-400 mt-0.5">Location not set</p>
              )}
            </div>
            {canManage && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-forest-600 font-medium hover:underline shrink-0"
              >
                Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon
              size={16}
              className={hasCoords ? "text-forest-500" : "text-terracotta-600"}
            />
            <span className={hasCoords ? "text-ink-700" : "text-terracotta-600"}>
              {hasCoords ? (
                <>
                  Geofence set · {client.geofence_radius_meters}m radius
                </>
              ) : (
                "No geofence set yet"
              )}
            </span>
          </div>

          <a
            href={`/clients/${client.id}/home-info`}
            className="block mt-4 bg-cream-50 hover:bg-cream-100 text-forest-600 border border-forest-500/20 px-4 py-2.5 rounded-xl text-sm font-medium text-center transition"
          >
            {canManage ? "Edit home info" : "View home info"} →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 grain-overlay">
      <div className="relative space-y-3">
        <h2 className="font-display text-lg text-ink-900">{client.full_name}</h2>

        <Field label="Address">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, ST 12345"
            className={inputCls}
          />
        </Field>

        <div>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="w-full bg-forest-100 hover:bg-forest-100/70 text-forest-700 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MapPinIcon size={16} />
            {locating
              ? "Getting location..."
              : "Use my current location"}
          </button>
          <p className="text-xs text-ink-500 mt-1.5">
            Stand at the client's home and tap this. Or paste coordinates from
            Google Maps below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="40.123456"
              className={inputCls}
            />
          </Field>
          <Field label="Longitude">
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-75.123456"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Geofence radius (meters)">
          <input
            type="number"
            min={10}
            max={5000}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-ink-500 mt-1">
            150m is roughly half a city block. Larger if the property is big or
            GPS accuracy varies.
          </p>
        </Field>

        {error && (
          <p className="text-terracotta-600 text-xs">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="flex-1 bg-cream-200 hover:bg-cream-200/70 text-ink-700 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function displayAddress(client: Client) {
  const fallback = client.formatted_address ?? client.address;
  const country = normalizeCountry(client.country);
  if (fallback?.trim() && fallback.trim() !== country) return fallback;

  return formatStructuredAddress({
    street_address_1: client.street_address_1,
    street_address_2: client.street_address_2,
    city: client.city,
    state_or_region: client.state_or_region ?? client.state,
    postal_code: client.postal_code,
    country: client.country,
  });
}
