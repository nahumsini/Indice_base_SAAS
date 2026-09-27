type Attempt = { fingerprint: string; key: string };

export class CheckoutRetryConflict extends Error {
  readonly requestKey: string;
  constructor(requestKey: string) {
    super('Hay un cobro sin confirmar. Reintenta con los mismos productos y pagos; no inicies otro cobro hasta verificar el ticket original.');
    this.requestKey = requestKey;
  }
}

/** Persist only a digest and a random key, never customer or payment details. */
export class CheckoutRetry {
  private attempts = new Map<string, Attempt>();

  async key(scope: string, payload: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const storageKey = this.storageKey(scope);
    let previous = this.attempts.get(scope);
    if (!previous) {
      try {
        const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
        if (typeof value?.fingerprint === 'string' && typeof value?.key === 'string') previous = value;
      } catch { /* Private browsing may disable session storage. */ }
    }
    if (previous && previous.fingerprint !== fingerprint) {
      throw new CheckoutRetryConflict(previous.key);
    }
    const attempt = previous ?? { fingerprint, key: crypto.randomUUID() };
    this.attempts.set(scope, attempt);
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch { /* In-memory retries remain safe. */ }
    return attempt.key;
  }

  clear(scope: string) {
    this.attempts.delete(scope);
    try { sessionStorage.removeItem(this.storageKey(scope)); } catch { /* Storage is optional. */ }
  }

  private storageKey(scope: string) { return 'indice:pos:checkout:' + scope; }
}
