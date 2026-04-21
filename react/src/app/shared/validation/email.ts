export type EmailValidationError = 'invalid_email';

export type EmailValidationResult =
  | {
      ok: true;
      normalized: string;
    }
  | {
      ok: false;
      error: EmailValidationError;
    };

const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;

// Intentionally conservative: allows common real-world emails (plus tags, subdomains),
// avoids trying to fully implement RFC 5322.
const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim();
}

export function isValidEmail(rawEmail: string): boolean {
  const normalized = normalizeEmail(rawEmail);

  if (!normalized) {
    return false;
  }

  if (normalized.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  if (!BASIC_EMAIL_PATTERN.test(normalized)) {
    return false;
  }

  const atIndex = normalized.lastIndexOf('@');
  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);

  if (!localPart || !domainPart) {
    return false;
  }

  if (localPart.length > EMAIL_LOCAL_MAX_LENGTH) {
    return false;
  }

  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return false;
  }

  const labels = domainPart.split('.');
  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return false;
  }

  return true;
}

export function validateEmail(rawEmail: string): EmailValidationResult {
  if (!isValidEmail(rawEmail)) {
    return { ok: false, error: 'invalid_email' };
  }

  return { ok: true, normalized: normalizeEmail(rawEmail) };
}

export function validateOptionalEmail(rawEmail: string): EmailValidationResult {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) {
    return { ok: true, normalized: '' };
  }

  return validateEmail(normalized);
}

