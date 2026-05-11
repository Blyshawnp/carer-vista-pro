"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ClientData {
  allergies: string[];
  medications: string[];
  emergencyContacts: { name: string; phone: string }[];
  safetyItems: { label: string; location: string }[];
  doctor: string;
  hospital: string;
}

interface EmergencyPanelProps {
  assignedClients: { id: string; full_name: string }[];
  currentShiftClientId?: string;
  role: string;
}

export default function EmergencyPanel({
  assignedClients,
  currentShiftClientId,
  role,
}: EmergencyPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(
    currentShiftClientId || (assignedClients[0]?.id ?? "")
  );
  const [clientData, setClientData] = useState<ClientData | null>(null);

  // Fetch client data dynamically from Supabase whenever selectedClientId changes
  useEffect(() => {
    if (!selectedClientId) return;

    async function fetchClientData() {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          allergies,
          medications,
          emergency_contacts,
          safety_items,
          doctor,
          hospital
        `)
        .eq("id", selectedClientId)
        .single();

      if (error) console.error("Error fetching client data:", error);
      else if (data)
        setClientData({
          allergies: data.allergies ?? [],
          medications: data.medications ?? [],
          emergencyContacts: data.emergency_contacts ?? [],
          safetyItems: data.safety_items ?? [],
          doctor: data.doctor ?? "",
          hospital: data.hospital ?? "",
        });
    }

    fetchClientData();
  }, [selectedClientId]);

  return (
    <>
      {/* Floating Emergency Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Emergency Info"
        className="fixed top-4 right-4 w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg z-50 hover:scale-105 animate-pulse transition-transform duration-150"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/10 animate-ping"
        />
        <img
          src="/icons/emergency.png"
          alt="Emergency Star of Life"
          className="relative z-10 w-6 h-6"
        />
      </button>

      {/* Emergency Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 flex justify-center items-start pt-20"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Emergency Info
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                aria-label="Close Emergency Screen"
              >
                ✕
              </button>
            </div>

            {/* Client Selection if caregiver has multiple assigned clients */}
            {assignedClients.length > 1 && (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mb-4 w-full border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100"
              >
                {assignedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Client Emergency Info Sections */}
            <div className="space-y-4 text-gray-900 dark:text-gray-100">
              <div>
                <h3 className="font-semibold">Allergies</h3>
                <p>{clientData?.allergies.join(", ") || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Medications</h3>
                <p>{clientData?.medications.join(", ") || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Emergency Contacts</h3>
                {clientData?.emergencyContacts.length ? (
                  <ul>
                    {clientData.emergencyContacts.map((c, i) => (
                      <li key={i}>
                        {c.name} — {c.phone}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Safety Items</h3>
                {clientData?.safetyItems.length ? (
                  <ul>
                    {clientData.safetyItems.map((s, i) => (
                      <li key={i}>
                        {s.label}: {s.location}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Doctor & Hospital</h3>
                <p>
                  {clientData?.doctor || "N/A"} —{" "}
                  {clientData?.hospital || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}