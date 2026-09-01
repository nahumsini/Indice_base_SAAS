type StoredKioskAttempt = {
  key: string;
  createdAt: number;
};

type KioskMutationWithRecoveryOptions<T> = {
  operation: string;
  payload: unknown;
  request: (idempotencyKey: string) => Promise<T>;
};

const storagePrefix = 'indice:kiosk-idempotency:';
const maximumAttemptAgeMs = 24 * 60 * 60 * 1000;

export function kioskIdempotencyKeyFor(operation: string, payload: unknown) {
  void payload;
  const storageKey = storageKeyFor(operation);
  const existing = readAttempt(storageKey);
  if (existing && Date.now() - existing.createdAt < maximumAttemptAgeMs) {
    return existing.key;
  }
  const attempt: StoredKioskAttempt = {
    key: secureAttemptKey(),
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  } catch {
    // Privacy-restricted browsers still use the generated key for this request.
  }
  return attempt.key;
}

function secureAttemptKey() {
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

export function completeKioskIdempotentOperation(operation: string) {
  try {
    window.sessionStorage.removeItem(storageKeyFor(operation));
  } catch {
    // Storage is optional.
  }
}

export function isKioskIdempotencyRequestMismatch(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  return code === 'KIOSK_IDEMPOTENCY_MISMATCH'
    || (error instanceof Error
      && /idempotency-key was already used with another request/i.test(error.message));
}

/**
 * Normal transport retries keep the same opaque key. If the API explicitly
 * confirms that the stored key belongs to a different body, replace it once.
 */
export async function executeKioskMutationWithMismatchRecovery<T>({
  operation,
  payload,
  request,
}: KioskMutationWithRecoveryOptions<T>): Promise<T> {
  const execute = () => request(kioskIdempotencyKeyFor(operation, payload));

  try {
    return await execute();
  } catch (error) {
    if (!isKioskIdempotencyRequestMismatch(error)) throw error;
    completeKioskIdempotentOperation(operation);
    return execute();
  }
}

function storageKeyFor(operation: string) {
  // Only this namespace hash and an opaque random retry key are persisted. The
  // payload fingerprint was deliberately removed: short PIN/pairing codes and
  // low-entropy PII must never leave a brute-forceable verifier in Web Storage.
  return `${storagePrefix}${lightweightFingerprint(operation)}`;
}

function readAttempt(storageKey: string): StoredKioskAttempt | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '') as Partial<StoredKioskAttempt>;
    return typeof parsed.key === 'string' && typeof parsed.createdAt === 'number'
      ? { key: parsed.key, createdAt: parsed.createdAt }
      : null;
  } catch {
    return null;
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
