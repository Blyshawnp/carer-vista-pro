export const EMAIL_RATE_LIMIT_MESSAGE =
  "Email sending is temporarily rate-limited. Please wait a few minutes or create a no-email local account for testing.";

export const EMAIL_RATE_LIMIT_SHORT_MESSAGE =
  "Email sending is temporarily rate-limited. Please wait a few minutes before trying again.";

export const INVALID_LOGIN_MESSAGE = "Invalid login credentials.";

export function isEmailRateLimitError(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over email send rate limit") ||
    normalized.includes("rate limit")
  );
}

export function mapAuthErrorMessage(message?: string | null) {
  if (isEmailRateLimitError(message)) return EMAIL_RATE_LIMIT_MESSAGE;
  return message || "Something went wrong. Please try again.";
}
