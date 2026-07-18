import { Accessibility, Languages } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { languages, useLanguage } from '../../shared/context';

const accessibilityStorageKey = 'indice-kiosk-accessibility-mode';

const readAccessibilityPreference = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(accessibilityStorageKey) === 'true';
  } catch {
    return false;
  }
};

const utilityCopy: Record<string, { accessibility: string; language: string; standard: string }> = {
  'es-MX': { accessibility: 'Accesibilidad', language: 'Idioma', standard: 'Vista estándar' },
  'es-CO': { accessibility: 'Accesibilidad', language: 'Idioma', standard: 'Vista estándar' },
  'en-US': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
  'en-CA': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
  'fr-CA': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
  'pt-BR': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
  'ko-CA': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
  'zh-CA': { accessibility: 'Accessibility', language: 'Language', standard: 'Standard view' },
};

interface KioskPublicShellProps {
  banners?: ReactNode;
  children: ReactNode;
  errorMessage?: string | null;
  header: ReactNode;
  loadingOverlay?: ReactNode;
  maxWidthClassName?: string;
  sessionExpiredMessage?: string | null;
  successMessage?: string | null;
}

/** Shared full-workspace frame and status region for every public kiosk. */
export function KioskPublicShell({
  banners,
  children,
  errorMessage,
  header,
  loadingOverlay,
  maxWidthClassName = 'max-w-4xl',
  sessionExpiredMessage,
  successMessage,
}: KioskPublicShellProps) {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [accessibilityMode, setAccessibilityMode] = useState(readAccessibilityPreference);
  const copy = utilityCopy[currentLanguage.code] ?? utilityCopy['en-CA'];

  useEffect(() => {
    try {
      window.localStorage.setItem(accessibilityStorageKey, String(accessibilityMode));
    } catch {
      // Private browsing or hardened storage policies can deny persistence.
    }
  }, [accessibilityMode]);

  return (
    <div
      className={`min-h-dvh bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4 sm:py-4 ${accessibilityMode ? 'contrast-125 [&_button]:focus-visible:ring-4 [&_a]:focus-visible:ring-4 [&_input]:focus-visible:ring-4 [&_select]:focus-visible:ring-4 [&_textarea]:focus-visible:ring-4' : ''}`}
      data-kiosk-accessibility={accessibilityMode ? 'enhanced' : 'standard'}
      style={accessibilityMode ? { fontSize: '112.5%' } : undefined}
    >
      {loadingOverlay}
      <main className={`mx-auto flex min-h-dvh w-full ${maxWidthClassName} flex-col overflow-hidden bg-white dark:bg-slate-950 sm:min-h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-slate-200 sm:shadow-sm sm:dark:border-slate-800`}>
        <div className="flex min-h-11 flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:px-4">
          <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Languages aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="sr-only sm:not-sr-only">{copy.language}</span>
            <select
              aria-label={copy.language}
              value={currentLanguage.code}
              onChange={(event) => {
                const language = languages.find(item => item.code === event.target.value);
                if (language) setCurrentLanguage(language);
              }}
              className="h-9 max-w-[190px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {languages.map(language => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-pressed={accessibilityMode}
            title={accessibilityMode ? copy.standard : copy.accessibility}
            onClick={() => setAccessibilityMode(current => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Accessibility aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">{accessibilityMode ? copy.standard : copy.accessibility}</span>
          </button>
        </div>
        {banners}
        {header}
        <section className="flex min-h-0 flex-1 bg-slate-50/80 px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900/55 sm:px-5 sm:py-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm sm:dark:border-slate-800 sm:dark:bg-slate-950">
            {errorMessage ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {successMessage}
              </div>
            ) : null}
            {sessionExpiredMessage ? (
              <div role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {sessionExpiredMessage}
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
