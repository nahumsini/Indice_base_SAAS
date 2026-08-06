import { Paperclip, Search } from 'lucide-react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import type { ProviderRecord } from '../useProveedoresLogic';
import { getProviderStatusClass } from '../providerTableUtils';
import { ProviderRowActions } from './ProviderRowActions';

type ProvidersMobileCardsProps = {
  businessOptions: FinanceReferenceOption[];
  providers: ProviderRecord[];
  unitOptions: FinanceReferenceOption[];
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onOpenEditProvider: (provider: ProviderRecord) => void;
  onManageAccess: (provider: ProviderRecord) => void;
};

export function ProvidersMobileCards({
  businessOptions,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onOpenAttachments,
  onOpenEditProvider,
  onManageAccess,
  providers,
  unitOptions,
}: ProvidersMobileCardsProps) {
  const t = useProvidersTranslations();

  if (providers.length === 0) {
    return (
      <div className="p-3 md:hidden">
        <MobileEmptyState message={t.common.noOptions} />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 md:hidden">
      {providers.map(provider => (
        <ProviderMobileCard
          key={provider.id}
          businessOptions={businessOptions}
          provider={provider}
          unitOptions={unitOptions}
          onActivateProvider={onActivateProvider}
          onDeleteProvider={onDeleteProvider}
          onDuplicateProvider={onDuplicateProvider}
          onOpenAttachments={onOpenAttachments}
          onOpenEditProvider={onOpenEditProvider}
          onManageAccess={onManageAccess}
        />
      ))}
    </div>
  );
}

function ProviderMobileCard({
  businessOptions,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onOpenAttachments,
  onOpenEditProvider,
  onManageAccess,
  provider,
  unitOptions,
}: {
  businessOptions: FinanceReferenceOption[];
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onOpenEditProvider: (provider: ProviderRecord) => void;
  onManageAccess: (provider: ProviderRecord) => void;
  provider: ProviderRecord;
  unitOptions: FinanceReferenceOption[];
}) {
  const t = useProvidersTranslations();
  const typeLabel = t.providers.types[provider.type] ?? provider.type;
  const statusLabel = provider.status === 'active' ? t.common.active : t.common.inactive;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/75">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{provider.folio}</p>
          <h3 className="mt-1 truncate text-base font-medium text-slate-950 dark:text-white">{provider.name}</h3>
          {provider.registrationSource === 'payable-kiosk-registration' ? <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Registro desde kiosko</span> : null}
          <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{provider.company || '-'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getProviderStatusClass(provider.status)}`}>{statusLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <ProviderMobileValue label={t.providers.filters.type} value={typeLabel} />
        <ProviderMobileValue label={t.filters.unit} value={getReferenceLabel(unitOptions, provider.businessUnit)} />
        <ProviderMobileValue label={t.filters.business} value={getReferenceLabel(businessOptions, provider.business)} />
        <ProviderMobileValue label={t.providers.columns.accountingAccount.label} value={provider.accountingAccount || '-'} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <ProviderMobilePair label={t.providers.columns.contactName.label} value={provider.contactName || '-'} />
        <ProviderMobilePair label={t.providers.columns.email.label} value={provider.email || '-'} />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/70">
        <button
          type="button"
          onClick={() => onOpenAttachments(provider)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Paperclip className="h-4 w-4" />
          {t.providers.columns.attachments.label}: {provider.attachments.length}
        </button>
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ProviderRowActions
            providerId={provider.id}
            onActivateProvider={onActivateProvider}
            onDeleteProvider={onDeleteProvider}
            onDuplicateProvider={onDuplicateProvider}
            onEditProvider={() => onOpenEditProvider(provider)}
            onManageAccess={() => onManageAccess(provider)}
          />
        </div>
      </div>
    </article>
  );
}

function ProviderMobileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white">{value || '-'}</p>
    </div>
  );
}

function ProviderMobilePair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium text-slate-800 dark:text-slate-100">{value || '-'}</span>
    </div>
  );
}

function MobileEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
      <p className="text-base font-medium text-slate-800 dark:text-slate-100">{message}</p>
    </div>
  );
}

function getReferenceLabel(options: FinanceReferenceOption[], value: string) {
  if (!value) return '-';
  return options.find(option => option.value === value)?.label ?? value;
}
