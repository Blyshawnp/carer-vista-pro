import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type EmailTransport = {
  provider: string;
  from: string;
  apiKey: string;
};

type MessageEmailInput = {
  senderId: string;
  recipientId: string;
  conversationLink: string;
  preview: string;
};

type InvitationEmailInput = {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  inviteLink: string;
  organizationName?: string | null;
  role: string;
};

type EmailResult = {
  sent: boolean;
  skipped: boolean;
  reason?: "not_configured" | "unsupported_provider" | "missing_recipient";
};

export function getEmailTransport(): EmailTransport | null {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = process.env.EMAIL_FROM?.trim();
  const apiKey = process.env.EMAIL_API_KEY?.trim();

  if (!provider || !from || !apiKey) return null;

  return { provider, from, apiKey };
}

export function isEmailConfigured() {
  return getEmailTransport() !== null;
}

export async function sendMessageNotificationEmail(
  admin: SupabaseAdmin,
  input: MessageEmailInput
) {
  const transport = getEmailTransport();
  if (!transport) return { sent: false, skipped: true, reason: "not_configured" as const };

  const [{ data: sender }, { data: recipient }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, organization_id, is_active")
      .eq("id", input.senderId)
      .maybeSingle<{ id: string; full_name: string; email: string | null; organization_id: string; is_active: boolean }>(),
    admin
      .from("profiles")
      .select("id, full_name, email, organization_id, is_active")
      .eq("id", input.recipientId)
      .maybeSingle<{ id: string; full_name: string; email: string | null; organization_id: string; is_active: boolean }>(),
  ]);

  if (
    !sender?.is_active ||
    !recipient?.is_active ||
    sender.organization_id !== recipient.organization_id ||
    !recipient.email ||
    sender.id === recipient.id
  ) {
    return { sent: false, skipped: true, reason: "missing_recipient" as const };
  }

  const subject = `${sender.full_name || "A teammate"} sent you a message`;
  const preview = input.preview.trim().slice(0, 120);
  const text = [
    "Carer Vista Pro",
    `From: ${sender.full_name || "A teammate"}`,
    `Message: ${preview}`,
    `Open conversation: ${input.conversationLink}`,
    "Do not use messages for emergencies.",
  ].join("\n");

  return sendEmail({
    transport,
    to: recipient.email,
    subject,
    text,
  });
}

export async function sendInvitationEmail(
  input: InvitationEmailInput
): Promise<EmailResult> {
  const transport = getEmailTransport();

  if (!transport) {
    return { sent: false, skipped: true, reason: "not_configured" };
  }

  if (!input.recipientEmail.trim()) {
    return { sent: false, skipped: true, reason: "missing_recipient" };
  }

  const organizationLabel = input.organizationName?.trim() || "your team";
  const subject = `You're invited to join ${organizationLabel}`;
  const text = [
    "Carer Vista Pro",
    `Hello ${input.recipientName || "there"},`,
    `${input.senderName || "A teammate"} invited you to join ${organizationLabel} as a ${input.role}.`,
    `Open this link to accept your invite: ${input.inviteLink}`,
    "If you were not expecting this, you can ignore this email.",
  ].join("\n");

  return sendEmail({
    transport,
    to: input.recipientEmail,
    subject,
    text,
  });
}

async function sendEmail({
  transport,
  to,
  subject,
  text,
}: {
  transport: EmailTransport;
  to: string;
  subject: string;
  text: string;
}): Promise<EmailResult> {
  if (transport.provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${transport.apiKey}`,
      },
      body: JSON.stringify({
        from: transport.from,
        to,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Email provider request failed.");
    }

    return { sent: true, skipped: false };
  }

  return { sent: false, skipped: true, reason: "unsupported_provider" };
}
