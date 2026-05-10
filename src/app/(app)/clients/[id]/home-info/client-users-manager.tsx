"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "client" | "caregiver" | "family";
  is_active: boolean;
};

export default function ClientUsersManager({
  clientId,
  users,
  assignedUserIds,
}: {
  clientId: string;
  users: UserOption[];
  assignedUserIds: string[];
}) {
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState(new Set(assignedUserIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const roleOrder = roleRank(a.role) - roleRank(b.role);
        if (roleOrder !== 0) return roleOrder;
        return a.full_name.localeCompare(b.full_name);
      }),
    [users]
  );

  async function save() {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/client-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        userIds: Array.from(selectedUserIds),
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Could not save linked users.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 mt-4 grain-overlay">
      <div className="relative">
        <h2 className="font-display text-lg text-ink-900">Linked users</h2>
        <p className="text-sm text-ink-500 mb-4">
          Choose which caregivers, family members, client users, or admins are connected to this care recipient.
        </p>

        {sortedUsers.length === 0 ? (
          <p className="text-sm text-ink-500">No team members have been added yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedUsers.map((person) => {
              const checked = selectedUserIds.has(person.id);
              return (
                <label
                  key={person.id}
                  className="flex items-center gap-3 bg-cream-50 rounded-xl px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = new Set(selectedUserIds);
                      if (event.target.checked) {
                        next.add(person.id);
                      } else {
                        next.delete(person.id);
                      }
                      setSelectedUserIds(next);
                    }}
                    className="h-4 w-4 accent-forest-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink-800 truncate">
                      {person.full_name || person.email}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {roleLabel(person.role)}
                      {!person.is_active && " · Inactive"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-terracotta-600 mt-3">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-4 w-full bg-forest-600 hover:bg-forest-700 text-cream-50 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save linked users"}
        </button>
      </div>
    </section>
  );
}

function roleRank(role: UserOption["role"]) {
  return { admin: 0, client: 1, family: 2, caregiver: 3 }[role];
}

function roleLabel(role: UserOption["role"]) {
  return {
    admin: "Admin",
    client: "Client user",
    family: "Family",
    caregiver: "Caregiver",
  }[role];
}
