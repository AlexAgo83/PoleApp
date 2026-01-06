export const PHONE_ERROR_MESSAGE = "Numéro WhatsApp invalide (8–20 chiffres, + optionnel)";
export const INSTAGRAM_ERROR_MESSAGE =
  "Username Instagram invalide (lettres/chiffres/._, 2–30 caractères)";

export function normalizePhone(input?: string | null): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  const withoutSeparators = trimmed.replace(/[\s()-]/g, "");
  const sanitized =
    withoutSeparators.startsWith("+")
      ? `+${withoutSeparators.slice(1).replace(/\+/g, "")}`
      : withoutSeparators.replace(/\+/g, "");

  const plusPrefix = sanitized.startsWith("+");
  const digits = plusPrefix ? sanitized.slice(1) : sanitized;

  if (!/^\d{8,20}$/.test(digits)) {
    throw new Error(PHONE_ERROR_MESSAGE);
  }

  return plusPrefix ? `+${digits}` : digits;
}

export function validateInstagramUsername(input?: string | null): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  if (!/^[A-Za-z0-9._]{2,30}$/.test(trimmed)) {
    throw new Error(INSTAGRAM_ERROR_MESSAGE);
  }

  return trimmed;
}
