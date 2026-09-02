import { Accessibility, Languages, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { languages, useLanguage } from '../../shared/context';

const accessibilityStorageKey = 'indice-kiosk-accessibility-mode';
const kioskLanguageStorageKey = 'indice-kiosk-language';

interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}

const defaultAccessibilityPreferences: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
};

const readAccessibilityPreference = (): AccessibilityPreferences => {
  if (typeof window === 'undefined') return defaultAccessibilityPreferences;
  try {
    const storedValue = window.localStorage.getItem(accessibilityStorageKey);
    if (storedValue === 'true') {
      return { ...defaultAccessibilityPreferences, highContrast: true, largeText: true };
    }
    if (!storedValue) return defaultAccessibilityPreferences;
    const parsed = JSON.parse(storedValue) as Partial<AccessibilityPreferences>;
    return {
      highContrast: Boolean(parsed.highContrast),
      largeText: Boolean(parsed.largeText),
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return defaultAccessibilityPreferences;
  }
};

interface UtilityCopy {
  accessibility: string;
  accessibilityDescription: string;
  close: string;
  highContrast: string;
  highContrastHint: string;
  language: string;
  largeText: string;
  largeTextHint: string;
  reduceMotion: string;
  reduceMotionHint: string;
  reset: string;
}

const englishUtilityCopy: UtilityCopy = {
  accessibility: 'Accessibility',
  accessibilityDescription: 'Adjust this kiosk to make it easier and more comfortable to use.',
  close: 'Close accessibility settings',
  highContrast: 'High contrast',
  highContrastHint: 'Makes controls, borders and messages easier to distinguish.',
  language: 'Language',
  largeText: 'Large text',
  largeTextHint: 'Increases text and control size throughout the kiosk.',
  reduceMotion: 'Reduce motion',
  reduceMotionHint: 'Minimizes animations and visual transitions.',
  reset: 'Reset settings',
};

const spanishUtilityCopy: UtilityCopy = {
  accessibility: 'Accesibilidad',
  accessibilityDescription: 'Ajusta este kiosko para usarlo de forma más cómoda y sencilla.',
  close: 'Cerrar ajustes de accesibilidad',
  highContrast: 'Alto contraste',
  highContrastHint: 'Distingue mejor controles, bordes y mensajes.',
  language: 'Idioma',
  largeText: 'Texto grande',
  largeTextHint: 'Aumenta el texto y los controles de todo el kiosko.',
  reduceMotion: 'Reducir movimiento',
  reduceMotionHint: 'Minimiza animaciones y transiciones visuales.',
  reset: 'Restablecer ajustes',
};

const frenchUtilityCopy: UtilityCopy = {
  accessibility: 'Accessibilité',
  accessibilityDescription: 'Ajustez ce kiosque pour le rendre plus simple et confortable à utiliser.',
  close: 'Fermer les réglages d’accessibilité',
  highContrast: 'Contraste élevé',
  highContrastHint: 'Distingue plus facilement les contrôles, les bordures et les messages.',
  language: 'Langue',
  largeText: 'Texte agrandi',
  largeTextHint: 'Augmente la taille du texte et des contrôles dans tout le kiosque.',
  reduceMotion: 'Réduire les animations',
  reduceMotionHint: 'Réduit les animations et les transitions visuelles.',
  reset: 'Rétablir les réglages',
};

const portugueseUtilityCopy: UtilityCopy = {
  accessibility: 'Acessibilidade',
  accessibilityDescription: 'Ajuste este quiosque para usá-lo com mais facilidade e conforto.',
  close: 'Fechar configurações de acessibilidade',
  highContrast: 'Alto contraste',
  highContrastHint: 'Facilita a distinção de controles, bordas e mensagens.',
  language: 'Idioma',
  largeText: 'Texto grande',
  largeTextHint: 'Aumenta o tamanho do texto e dos controles em todo o quiosque.',
  reduceMotion: 'Reduzir movimento',
  reduceMotionHint: 'Reduz animações e transições visuais.',
  reset: 'Restaurar configurações',
};

const koreanUtilityCopy: UtilityCopy = {
  accessibility: '접근성',
  accessibilityDescription: '키오스크를 더 쉽고 편안하게 사용할 수 있도록 조정하세요.',
  close: '접근성 설정 닫기',
  highContrast: '고대비',
  highContrastHint: '컨트롤, 테두리 및 메시지를 더 쉽게 구분합니다.',
  language: '언어',
  largeText: '큰 텍스트',
  largeTextHint: '키오스크 전체의 텍스트와 컨트롤 크기를 늘립니다.',
  reduceMotion: '동작 줄이기',
  reduceMotionHint: '애니메이션과 화면 전환을 최소화합니다.',
  reset: '설정 초기화',
};

const chineseUtilityCopy: UtilityCopy = {
  accessibility: '无障碍',
  accessibilityDescription: '调整此自助终端，使其更易于舒适使用。',
  close: '关闭无障碍设置',
  highContrast: '高对比度',
  highContrastHint: '使控件、边框和消息更容易区分。',
  language: '语言',
  largeText: '大号文字',
  largeTextHint: '增大整个自助终端中的文字和控件。',
  reduceMotion: '减少动态效果',
  reduceMotionHint: '尽量减少动画和视觉过渡。',
  reset: '恢复默认设置',
};

const utilityCopy: Record<string, UtilityCopy> = {
  'es-MX': spanishUtilityCopy,
  'es-CO': spanishUtilityCopy,
  'en-US': englishUtilityCopy,
  'en-CA': englishUtilityCopy,
  'fr-CA': frenchUtilityCopy,
  'pt-BR': portugueseUtilityCopy,
  'ko-CA': koreanUtilityCopy,
  'zh-CA': chineseUtilityCopy,
};

interface KioskPublicShellProps {
  banners?: ReactNode;
  children: ReactNode;
  defaultLocale?: string | null;
  errorMessage?: string | null;
  header: ReactNode;
  immersive?: boolean;
  loadingOverlay?: ReactNode;
  lockDesktopViewport?: boolean;
  maxWidthClassName?: string;
  minimalContent?: boolean;
  moduleScope?: string;
  sessionExpiredMessage?: string | null;
  successMessage?: string | null;
}

/** Shared full-workspace frame and status region for every public kiosk. */
export function KioskPublicShell({
  banners,
  children,
  defaultLocale,
  errorMessage,
  header,
  immersive = false,
  loadingOverlay,
  lockDesktopViewport = false,
  maxWidthClassName = 'max-w-4xl',
  minimalContent = false,
  moduleScope,
  sessionExpiredMessage,
  successMessage,
}: KioskPublicShellProps) {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [accessibilityPanelOpen, setAccessibilityPanelOpen] = useState(false);
  const [accessibilityPreferences, setAccessibilityPreferences] = useState(readAccessibilityPreference);
  const accessibilityButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const appliedDefaultLocaleRef = useRef<string | null>(null);
  const copy = utilityCopy[currentLanguage.code] ?? utilityCopy['en-CA'];

  useEffect(() => {
    if (!defaultLocale || appliedDefaultLocaleRef.current === defaultLocale) return;
    let explicitLocale = '';
    try { explicitLocale = window.localStorage.getItem(kioskLanguageStorageKey) ?? ''; } catch { /* no-op */ }
    const nextLanguage = languages.find(language => language.code === explicitLocale)
      ?? languages.find(language => language.code === defaultLocale)
      ?? languages.find(language => language.code === 'en-CA');
    appliedDefaultLocaleRef.current = defaultLocale;
    if (nextLanguage && nextLanguage.code !== currentLanguage.code) setCurrentLanguage(nextLanguage);
  }, [currentLanguage.code, defaultLocale, setCurrentLanguage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(accessibilityStorageKey, JSON.stringify(accessibilityPreferences));
    } catch {
      // Private browsing or hardened storage policies can deny persistence.
    }
  }, [accessibilityPreferences]);

  useEffect(() => {
    if (!accessibilityPanelOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccessibilityPanelOpen(false);
        window.setTimeout(() => accessibilityButtonRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accessibilityPanelOpen]);

  const accessibilityEnabled = Object.values(accessibilityPreferences).some(Boolean);
  const closeAccessibilityPanel = () => {
    setAccessibilityPanelOpen(false);
    window.setTimeout(() => accessibilityButtonRef.current?.focus(), 0);
  };

  return (
    <div
      className={`min-h-dvh bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white [&_button]:min-h-11 [&_button]:min-w-11 ${immersive ? 'p-0' : 'sm:px-4 sm:py-4'} ${accessibilityPreferences.largeText ? '[&_button]:!min-h-12 [&_button]:!text-[1.05rem] [&_h1]:!text-[1.75rem] [&_h2]:!text-[1.625rem] [&_h3]:!text-[1.375rem] [&_input]:!min-h-12 [&_input]:!text-[1.05rem] [&_label]:!text-base [&_p]:!text-base [&_select]:!min-h-12 [&_select]:!text-base [&_textarea]:!text-[1.05rem] [&_[data-kiosk-tool-action]]:!text-base [&_[data-kiosk-tool-description]]:!block [&_[data-kiosk-tool-description]]:!text-base [&_[data-kiosk-tool-grid]]:!grid-cols-1 [&_[data-kiosk-tool-module]]:!text-sm [&_[data-kiosk-tool-name]]:!text-lg [&_[data-kiosk-tool-status]]:!text-base md:[&_[data-kiosk-tool-grid]]:!grid-cols-2 xl:[&_[data-kiosk-tool-grid]]:!grid-cols-3' : ''} ${accessibilityPreferences.highContrast ? 'contrast-125 [&_button]:focus-visible:ring-4 [&_a]:focus-visible:ring-4 [&_input]:focus-visible:ring-4 [&_select]:focus-visible:ring-4 [&_textarea]:focus-visible:ring-4' : ''} ${accessibilityPreferences.reduceMotion ? '[&_*]:!animate-none [&_*]:!scroll-auto [&_*]:!transition-none' : ''}`}
      data-kiosk-accessibility={accessibilityEnabled ? 'enhanced' : 'standard'}
      data-kiosk-large-text={accessibilityPreferences.largeText}
      data-kiosk-reduce-motion={accessibilityPreferences.reduceMotion}
      data-module={moduleScope}
      lang={currentLanguage.code}
    >
      {loadingOverlay}
      <main
        aria-hidden={accessibilityPanelOpen || undefined}
        className={`mx-auto flex min-h-dvh w-full ${immersive ? 'h-dvh max-w-none min-h-0 rounded-none border-0' : `${maxWidthClassName} sm:min-h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-slate-200 sm:shadow-sm sm:dark:border-slate-800`} flex-col overflow-hidden bg-white dark:bg-slate-950 ${lockDesktopViewport && !immersive ? 'xl:h-[calc(100dvh-2rem)] xl:min-h-0' : ''}`}
        inert={accessibilityPanelOpen || undefined}
      >
        <div className={immersive ? 'hidden' : 'grid min-h-14 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-950 sm:flex sm:justify-end sm:px-4'}>
          <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Languages aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="sr-only sm:not-sr-only">{copy.language}</span>
            <select
              aria-label={copy.language}
              value={currentLanguage.code}
              onChange={(event) => {
                const language = languages.find(item => item.code === event.target.value);
                if (language) {
                  try { window.localStorage.setItem(kioskLanguageStorageKey, language.code); } catch { /* no-op */ }
                  setCurrentLanguage(language);
                }
              }}
              className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-w-[190px]"
            >
              {languages.map(language => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.name}
                </option>
              ))}
            </select>
          </label>
          <button
            ref={accessibilityButtonRef}
            type="button"
            aria-label={copy.accessibility}
            aria-expanded={accessibilityPanelOpen}
            title={copy.accessibility}
            onClick={() => setAccessibilityPanelOpen(true)}
            className={`inline-flex h-11 w-11 items-center justify-center gap-2 rounded-lg border bg-white px-0 text-xs font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto sm:px-3 ${accessibilityEnabled ? 'border-[#147514]/35 text-[#147514] dark:border-emerald-400/40 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <Accessibility aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.accessibility}</span>
          </button>
        </div>
        {banners}
        {header}
        <section className="flex min-h-0 flex-1 bg-slate-50/80 px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900/55 sm:px-5 sm:py-5">
          <div className={minimalContent
            ? `flex min-h-0 flex-1 flex-col bg-transparent ${immersive ? 'overflow-hidden' : `overflow-y-auto ${lockDesktopViewport ? 'xl:overflow-hidden' : ''}`}`
            : 'flex min-h-0 flex-1 flex-col overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm sm:dark:border-slate-800 sm:dark:bg-slate-950'}>
            {errorMessage ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {successMessage}
              </div>
            ) : null}
            {sessionExpiredMessage ? (
              <div role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {sessionExpiredMessage}
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </main>

      {accessibilityPanelOpen ? (
        <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-4">
          <button
            aria-label={copy.close}
            className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[2px]"
            onClick={closeAccessibilityPanel}
            tabIndex={-1}
            type="button"
          />
          <section
            aria-labelledby="kiosk-accessibility-title"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:rounded-2xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
                  <Accessibility aria-hidden="true" className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-medium text-slate-950 dark:text-white" id="kiosk-accessibility-title">{copy.accessibility}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{copy.accessibilityDescription}</p>
              </div>
              <button
                ref={closeButtonRef}
                aria-label={copy.close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/20 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={closeAccessibilityPanel}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <AccessibilityOption
                checked={accessibilityPreferences.largeText}
                description={copy.largeTextHint}
                label={copy.largeText}
                onChange={(checked) => setAccessibilityPreferences(current => ({ ...current, largeText: checked }))}
              />
              <AccessibilityOption
                checked={accessibilityPreferences.highContrast}
                description={copy.highContrastHint}
                label={copy.highContrast}
                onChange={(checked) => setAccessibilityPreferences(current => ({ ...current, highContrast: checked }))}
              />
              <AccessibilityOption
                checked={accessibilityPreferences.reduceMotion}
                description={copy.reduceMotionHint}
                label={copy.reduceMotion}
                onChange={(checked) => setAccessibilityPreferences(current => ({ ...current, reduceMotion: checked }))}
              />
            </div>

            <button
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              onClick={() => setAccessibilityPreferences(defaultAccessibilityPreferences)}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {copy.reset}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AccessibilityOption({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-[#147514]/30 dark:border-slate-700 dark:bg-slate-900/70">
      <span>
        <span className="block text-sm font-medium text-slate-950 dark:text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <input
        checked={checked}
        className="peer sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-[#147514] peer-focus-visible:ring-4 peer-focus-visible:ring-[#147514]/20 dark:bg-slate-700 dark:peer-checked:bg-emerald-500">
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  );
}
