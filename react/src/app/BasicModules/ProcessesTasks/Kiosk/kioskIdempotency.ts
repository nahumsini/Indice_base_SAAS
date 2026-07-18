type StoredKioskAttempt = {
  key: string;
  createdAt: number;
};

const storagePrefix = 'indice:kiosk-idempotency:';
const maximumAttemptAgeMs = 24 * 60 * 60 * 1000;

export function createKioskIdempotencyKey() {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === 'function') {
    return browserCrypto.randomUUID();
  }
  if (typeof browserCrypto?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable in this browser.');
  }
  const bytes = new Uint8Array(32);
  browserCrypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export function kioskIdempotencyKeyFor(operation: string, payload: unknown) {
  void payload;
  const storageKey = storageKeyFor(operation);
  const existing = readAttempt(storageKey);
  if (
    existing &&
    Date.now() - existing.createdAt < maximumAttemptAgeMs
  ) {
    return existing.key;
  }

  const attempt: StoredKioskAttempt = {
    key: createKioskIdempotencyKey(),
    createdAt: Date.now(),
  };
  writeAttempt(storageKey, attempt);
  return attempt.key;
}

export function completeKioskIdempotentOperation(operation: string) {
  try {
    window.sessionStorage.removeItem(storageKeyFor(operation));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function storageKeyFor(operation: string) {
  // Persist only a namespace hash and an opaque random retry key. Never persist
  // a fast payload verifier: kiosk payloads can contain short PINs or PII.
  return `${storagePrefix}${lightweightFingerprint(operation)}`;
}

function readAttempt(storageKey: string): StoredKioskAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKioskAttempt>;
    return typeof parsed.key === 'string'
      && typeof parsed.createdAt === 'number'
      ? { key: parsed.key, createdAt: parsed.createdAt }
      : null;
  } catch {
    return null;
  }
}

function writeAttempt(storageKey: string, attempt: StoredKioskAttempt) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  } catch {
    // The generated key still protects the current request when storage is unavailable.
  }
}

function lightweightFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
