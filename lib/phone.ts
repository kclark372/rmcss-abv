/**
 * Formats a US phone number as the user types, e.g. "1113334444" -> "111-333-4444".
 * Non-digit characters are stripped first, so pasting a formatted number works
 * too. Anything past the 10th digit is dropped rather than treated as an
 * extension.
 */
export function formatPhoneAsTyped(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
