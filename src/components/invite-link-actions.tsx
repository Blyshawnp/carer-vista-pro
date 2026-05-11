"use client";

import { useEffect, useState } from "react";

type InviteLinkActionsProps = {
  inviteLink: string;
  sendEmailEndpoint?: string;
  emailConfigured: boolean;
  hasRecipientEmail: boolean;
};

export default function InviteLinkActions({
  inviteLink,
  sendEmailEndpoint,
  emailConfigured,
  hasRecipientEmail,
}: InviteLinkActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatus("Invite link copied.");
    } catch {
      setStatus("Could not copy the invite link.");
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Invite link",
          text: "Open this link to join the team.",
          url: inviteLink,
        });
        setStatus("Invite link shared.");
      }
    } catch {
      setStatus("Could not share the invite link.");
    }
  }

  async function sendEmail() {
    if (!sendEmailEndpoint) return;
    setSendingEmail(true);
    setStatus(null);

    try {
      const response = await fetch(sendEmailEndpoint, { method: "POST" });
      const result = (await response.json()) as {
        ok?: boolean;
        sent?: boolean;
        skipped?: boolean;
        configured?: boolean;
        reason?: string | null;
        error?: string;
      };

      if (!response.ok || result.ok === false || result.sent === false) {
        if (result.reason === "not_configured") {
          setStatus("Email sending is not configured yet. Copy or share this invite link.");
        } else if (result.reason === "missing_recipient") {
          setStatus("Add an email address to send this invite by email.");
        } else {
          setStatus(result.error ?? "Email could not be sent. Copy or share the invite link.");
        }
        return;
      }

      setStatus("Invite email sent.");
    } catch {
      setStatus("Email could not be sent. Copy or share the invite link.");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={copyLink}
          className="bg-forest-600 hover:bg-forest-700 text-cream-50 py-3 rounded-2xl font-medium transition"
        >
          Copy invite link
        </button>
        {canShare && (
          <button
            type="button"
            onClick={() => void shareLink()}
            className="bg-cream-200 hover:bg-cream-200/70 text-ink-700 py-3 rounded-2xl font-medium transition"
          >
            Share invite link
          </button>
        )}
        {emailConfigured && hasRecipientEmail && sendEmailEndpoint && (
          <button
            type="button"
            onClick={() => void sendEmail()}
            disabled={sendingEmail}
            className="sm:col-span-2 bg-cream-200 hover:bg-cream-200/70 text-ink-700 py-3 rounded-2xl font-medium transition disabled:opacity-60"
          >
            {sendingEmail ? "Sending email..." : "Send email"}
          </button>
        )}
      </div>

      {!emailConfigured && (
        <p className="text-xs text-ink-500">
          Email sending is not configured yet. Copy or share this invite link.
        </p>
      )}

      {emailConfigured && !hasRecipientEmail && (
        <p className="text-xs text-ink-500">
          Add an email address to send this invite by email.
        </p>
      )}

      {status && <p className="text-xs text-ink-500">{status}</p>}
    </div>
  );
}
