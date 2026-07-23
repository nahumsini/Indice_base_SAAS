const padDatePart = (value: number) => `${value}`.padStart(2, '0');

export const publicKioskMinimumLoadingMs = 2000;

export const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;

export const isObjectStorageDisabledError = (error: unknown) =>
  error instanceof Error && /object storage is not enabled/i.test(error.message);

const isValidBrowserReference = (value: string | null) =>
  Boolean(value && /^[A-Za-z0-9_-]{32,128}$/.test(value));

const secureBrowserReference = () => {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure randomness is required for kiosk browser validation.');
};

/**
 * A kiosk tab owns its browser reference independently from the authenticated ERP session.
 * This prevents another same-origin tab from invalidating an attendance flow already in progress.
 */
export const publicKioskBrowserSessionReference = (deviceToken?: string) => {
  if (!deviceToken || typeof window === 'undefined') {
    return '';
  }

  const storageKey = `indice.hr-attendance-kiosk.browser.${deviceToken}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (isValidBrowserReference(existing)) {
      return existing as string;
    }
    const created = secureBrowserReference();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return secureBrowserReference();
  }
};
