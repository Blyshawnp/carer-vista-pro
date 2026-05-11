import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type MessageEmailInput = {
  senderId: string;
  recipientId: string;
  conversationLink: string;
  preview: string;
};

export async function sendMessageNotificationEmail(
  admin: SupabaseAdmin,
  input: MessageEmailInput
) {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = process.env.EMAIL_FROM?.trim();
  const apiKey = process.env.EMAIL_API_KEY?.trim();

  if (!provider || !from || !apiKey) return { sent: false, skipped: true };

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
    return { sent: false, skipped: true };
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

  if (provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: recipient.email,
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

  return { sent: false, skipped: true };
}
