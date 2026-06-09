"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPinIcon } from "@/components/icons";
import { getCurrentPosition } from "@/lib/geo";
import {
  COUNTRY_OPTIONS,
  getRegionOptions,
  normalizeCountry,
  postalLabel,
  regionLabel,
  usesRegionDropdown,
} from "@/lib/address";

export default function NewClientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [streetAddress1, setStreetAddress1] = useState("");
  const [streetAddress2, setStreetAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateOrRegion, setStateOrRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState("150");
  const [homeNotes, setHomeNotes] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Invitation state
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Client name is required.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        streetAddress1,
        streetAddress2,
        city,
        stateOrRegion,
        postalCode,
        country: normalizeCountry(country),
        latitude: latitude.trim() === "" ? null : Number(latitude),
        longitude: longitude.trim() === "" ? null : Number(longitude),
        geofenceRadiusMeters: Number(geofenceRadiusMeters),
        homeNotes,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
      }),
    });

    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !result.id) {
      setError(result.error ?? "Could not add client.");
      setSaving(false);
      return;
    }

    setCreatedClientId(result.id);
  }

  async function sendEmailInvite() {
    if (!clientEmail.trim()) {
      setInviteError("Email is required to send an invitation.");
      return;
    }
    setInviting(true);
    setInviteError(null);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: clientEmail.trim(),
          role: "client",
          clientIds: [createdClientId],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setInviteError(result.error ?? "Could not send invitation.");
        setInviting(false);
        return;
      }

      router.push(`/clients/${createdClientId}/home-info`);
      router.refresh();
    } catch {
      setInviteError("Could not send invitation.");
      setInviting(false);
    }
  }

  if (createdClientId) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-6 grain-overlay space-y-5">
        <div>
          <h2 className="font-display text-xl text-ink-900 mb-2">
            Client added successfully!
          </h2>
          <p className="text-ink-500 text-sm">
            Would you like to invite <strong>{fullName}</strong> to create an account and log in?
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
              Client's Email Address
            </span>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className={inputCls}
              placeholder="client@example.com"
            />
          </label>

          {inviteError && <p className="text-xs text-terracotta-600">{inviteError}</p>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={inviting}
              onClick={sendEmailInvite}
              className="flex-1 bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition disabled:opacity-50"
            >
              {inviting ? "Sending invite..." : "Invite by email"}
            </button>
            <button
              type="button"
              disabled={inviting}
              onClick={() => router.push(`/clients/${createdClientId}/home-info`)}
              className="flex-1 bg-cream-100 hover:bg-cream-200 text-ink-700 py-3 rounded-2xl text-sm font-medium transition"
            >
              Not now / Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl shadow-soft p-5 grain-overlay">
      <div className="relative space-y-4">
        <Field label="Client name">
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputCls}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Address">
          <div className="space-y-3">
            <input
              type="text"
              value={streetAddress1}
              onChange={(event) => setStreetAddress1(event.target.value)}
              className={inputCls}
              placeholder="Street address 1"
            />
            <input
              type="text"
              value={streetAddress2}
              onChange={(event) => setStreetAddress2(event.target.value)}
              className={inputCls}
              placeholder="Street address 2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={inputCls}
                placeholder="City"
              />
              {usesRegionDropdown(country) ? (
                <label className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                    {regionLabel(country)}
                  </span>
                  <select
                    value={stateOrRegion}
                    onChange={(event) => setStateOrRegion(event.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select...</option>
                    {getRegionOptions(country).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input
                  type="text"
                  value={stateOrRegion}
                  onChange={(event) => setStateOrRegion(event.target.value)}
                  className={inputCls}
                  placeholder={regionLabel(country)}
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                className={inputCls}
                placeholder={postalLabel(country)}
              />
              <label className="block">
                <span className="block text-xs font-medium text-ink-700 mb-1.5 tracking-wide uppercase">
                  Country
                </span>
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className={inputCls}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </Field>

        <Field label="Location">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                className={inputCls}
                placeholder="Latitude"
              />
              <input
                type="text"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                className={inputCls}
                placeholder="Longitude"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <input
                type="number"
                min={10}
                max={5000}
                value={geofenceRadiusMeters}
                onChange={(event) => setGeofenceRadiusMeters(event.target.value)}
                className={inputCls}
                placeholder="Geofence radius"
              />
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setLocating(true);
                  const coords = await getCurrentPosition();
                  setLocating(false);
                  if (!coords) {
                    setError("Could not get your location.");
                    return;
                  }
                  setLatitude(coords.latitude.toFixed(6));
                  setLongitude(coords.longitude.toFixed(6));
                }}
                className="inline-flex items-center justify-center gap-2 bg-forest-100 hover:bg-forest-100/70 text-forest-700 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
                disabled={locating}
              >
                <MapPinIcon size={16} />
                {locating ? "Getting location..." : "Use my current location"}
              </button>
            </div>
          </div>
        </Field>

        <Field label="Emergency contact name">
          <input
            type="text"
            value={emergencyName}
            onChange={(event) => setEmergencyName(event.target.value)}
            className={inputCls}
            placeholder="Name"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Emergency phone">
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(event) => setEmergencyPhone(event.target.value)}
              className={inputCls}
              placeholder="Phone"
            />
          </Field>
          <Field label="Relationship">
            <input
              type="text"
              value={emergencyRelationship}
              onChange={(event) => setEmergencyRelationship(event.target.value)}
              className={inputCls}
              placeholder="Relationship"
            />
          </Field>
        </div>

        <Field label="Home notes">
          <textarea
            value={homeNotes}
            onChange={(event) => setHomeNotes(event.target.value)}
            className={`${inputCls} min-h-28 resize-none`}
            placeholder="Access notes, routines, or other care context"
          />
        </Field>

        {error && <p className="text-sm text-terracotta-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add client"}
        </button>
      </div>
    </form>
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
