import { AlertTriangle, Home, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { MultiKioskCard } from '../../api/multiKiosks';
import { KioskModalFrame } from '../../components/kiosk-engine/KioskModalFrame';
import { cn } from '../../components/ui/utils';
import { getMultiKioskToolIdentity, getMultiKioskToolPresentation, MultiKioskToolGlyph } from './toolPresentation';
import { getProviderPortalCopy } from './providerPortalTranslations';

interface ProviderPortalLayoutProps {
  activeToolIdentity?: string;
  busyId?: number | null;
  cards: readonly MultiKioskCard[];
  children: ReactNode;
  locale: string;
  onHome: () => void;
  onOpen: (card: MultiKioskCard) => void | Promise<void>;
  providerName: string;
}

export function ProviderPortalLayout({
  activeToolIdentity = '',
  busyId = null,
  cards,
  children,
  locale,
  onHome,
  onOpen,
  providerName,
}: ProviderPortalLayoutProps) {
  const copy = getProviderPortalCopy(locale);
  const providerCards = cards.filter(card => getMultiKioskToolIdentity(card).startsWith('provider.'));
  const [pendingDestination, setPendingDestination] = useState<MultiKioskCard | 'home' | null>(null);
  const hasUnsavedDraft = () => Boolean(document.querySelector('[data-provider-unsaved="true"]'));
  const requestHome = () => {
    if (activeToolIdentity && hasUnsavedDraft()) setPendingDestination('home');
    else onHome();
  };
  const requestOpen = (card: MultiKioskCard) => {
    if (getMultiKioskToolIdentity(card) === activeToolIdentity) return;
    if (hasUnsavedDraft()) setPendingDestination(card);
    else void onOpen(card);
  };
  const confirmNavigation = () => {
    const destination = pendingDestination;
    setPendingDestination(null);
    if (destination === 'home') onHome();
    else if (destination) void onOpen(destination);
  };
  useEffect(() => {
    const handleHomeRequest = () => requestHome();
    window.addEventListener('provider-portal-home-request', handleHomeRequest);
    return () => window.removeEventListener('provider-portal-home-request', handleHomeRequest);
  });

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid-cols-[14rem_minmax(0,1fr)] lg:pb-0">
      <aside className="sticky top-4 hidden h-fit overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:block">
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.safeSession}</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{providerName}</p>
        </div>
        <nav aria-label={copy.navigationLabel} className="space-y-1 p-2">
          <button
            type="button"
            aria-current={!activeToolIdentity ? 'page' : undefined}
            onClick={requestHome}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none transition focus-visible:ring-4 focus-visible:ring-[#177D66]/20',
              !activeToolIdentity
                ? 'bg-[#59C3A5]/15 text-[#177D66] dark:bg-emerald-950/45 dark:text-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:bg-emerald-950/60 dark:text-emerald-200">
              <Home className="h-4 w-4" aria-hidden="true" />
            </span>
            {copy.home}
          </button>
          {providerCards.map(card => {
            const identity = getMultiKioskToolIdentity(card);
            const presentation = getMultiKioskToolPresentation(card);
            const selected = identity === activeToolIdentity;
            return (
              <button
                key={card.id}
                type="button"
                aria-current={selected ? 'page' : undefined}
                disabled={busyId !== null}
                onClick={() => requestOpen(card)}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none transition focus-visible:ring-4 disabled:opacity-50',
                  selected
                    ? presentation.toneClasses.tileSelected
                    : 'border border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
                )}
              >
                <MultiKioskToolGlyph source={card} selected={selected} busy={busyId === card.id} className="h-9 w-9 rounded-xl [&_svg]:h-4 [&_svg]:w-4" />
                <span className="min-w-0 leading-5">{presentation.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-start gap-2 border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{copy.applicationsDescription}</span>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>

      <nav
        aria-label={copy.navigationLabel}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {providerCards.map(card => {
            const identity = getMultiKioskToolIdentity(card);
            const presentation = getMultiKioskToolPresentation(card);
            const selected = identity === activeToolIdentity;
            return (
              <button
                key={card.id}
                type="button"
                aria-current={selected ? 'page' : undefined}
                aria-label={presentation.name}
                disabled={busyId !== null}
                onClick={() => requestOpen(card)}
                className={cn(
                  'flex min-h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium leading-4 outline-none transition focus-visible:ring-4 disabled:opacity-50',
                  selected ? presentation.toneClasses.module : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <MultiKioskToolGlyph source={card} selected={selected} busy={busyId === card.id} className="h-9 w-9 rounded-xl [&_svg]:h-4 [&_svg]:w-4" />
                <span className="w-full truncate">{copy.shortAppLabels[identity] ?? presentation.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <KioskModalFrame
        open={pendingDestination !== null}
        contentClassName="[&>button.absolute]:!h-12 [&>button.absolute]:!w-12"
        onOpenChange={open => { if (!open) setPendingDestination(null); }}
        size="compact"
        surface="public"
        tone="aqua"
        icon={<AlertTriangle className="h-5 w-5" />}
        title={copy.unsavedTitle}
        description={copy.unsavedDescription}
        footer={<><button type="button" onClick={() => setPendingDestination(null)} className="min-h-12 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-medium">{copy.stay}</button><button type="button" onClick={confirmNavigation} className="min-h-12 rounded-xl bg-white px-4 text-sm font-medium text-[#177D66]">{copy.leave}</button></>}
      >
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{copy.unsavedDescription}</p>
      </KioskModalFrame>
    </div>
  );
}
