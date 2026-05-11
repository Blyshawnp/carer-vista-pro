export function normalizeDisplayName(value: string | null | undefined) {
  return (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function getFirstName(value: string | null | undefined) {
  const cleaned = normalizeDisplayName(value);
  if (!cleaned) return "there";
  return cleaned.split(" ")[0] ?? "there";
}

export function getInitials(value: string | null | undefined) {
  const cleaned = normalizeDisplayName(value);
  if (!cleaned) return "?";

  const words = cleaned.split(" ").filter(Boolean);
  const firstTwo = words.slice(0, 2);
  const initials = firstTwo
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return initials || cleaned.charAt(0).toUpperCase() || "?";
}
