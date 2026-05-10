"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DeletionRequest = {
  id: string;
  user_id: string;
  email: string | null;
  reason: string | null;
  status: "pending" | "reviewing" | "completed" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
};

export default function DeletionRequestsList({
  requests,
  reviewerId,
}: {
  requests: DeletionRequest[];
  reviewerId: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-soft text-center text-sm text-ink-500">
        No deletion requests.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id}>
          <DeletionRequestCard request={request} reviewerId={reviewerId} />
        </li>
      ))}
    </ul>
  );
}

function DeletionRequestCard({
  request,
  reviewerId,
}: {
  request: DeletionRequest;
  reviewerId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: DeletionRequest["status"]) {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("account_deletion_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq("id", request.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <article className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink-900 truncate">
            {request.email || request.user_id}
          </p>
          <p className="text-xs text-ink-500">
            {new Date(request.requested_at).toLocaleString()}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide bg-cream-100 text-ink-600 px-2 py-1 rounded-full">
          {request.status}
        </span>
      </div>
      {request.reason && (
        <p className="text-sm text-ink-600 mt-3 whitespace-pre-wrap">
          {request.reason}
        </p>
      )}
      {error && <p className="text-xs text-terracotta-600 mt-3">{error}</p>}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={() => updateStatus("reviewing")}
          disabled={saving}
          className="bg-cream-100 hover:bg-cream-200 rounded-xl py-2 text-xs font-medium text-ink-700 disabled:opacity-50"
        >
          Reviewing
        </button>
        <button
          onClick={() => updateStatus("completed")}
          disabled={saving}
          className="bg-forest-600 hover:bg-forest-700 rounded-xl py-2 text-xs font-medium text-cream-50 disabled:opacity-50"
        >
          Completed
        </button>
        <button
          onClick={() => updateStatus("rejected")}
          disabled={saving}
          className="bg-white hover:bg-cream-50 border border-cream-200 rounded-xl py-2 text-xs font-medium text-ink-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </article>
  );
}
