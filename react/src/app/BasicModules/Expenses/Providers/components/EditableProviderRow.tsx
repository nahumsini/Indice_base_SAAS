import type { ReactNode } from 'react';
import { Paperclip } from 'lucide-react';
import {
  providerStatusOptions,
  providerTypeOptions,
  type ProviderRecord,
} from '../useProveedoresLogic';
import type { ProviderColumnKey } from '../providerTableConfig';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { getProviderStatusClass, getProviderStatusLabel } from '../providerTableUtils';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import { EditableSelect, ReadonlyPill } from './ProviderInlineControls';
import { ProviderRowActions } from './ProviderRowActions';

type EditableProviderRowProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  columnWidths: Record<string, number>;
  businessOptions: FinanceReferenceOption[];
  isEditing: boolean;
  provider: ProviderRecord;
  unitOptions: FinanceReferenceOption[];
  userOptions: Array<{ value: string; label: string }>;
  visibleColumns: ProviderColumnKey[];
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onEditProvider: (providerId: string) => void;
  onOpenEditProvider: (provider: ProviderRecord) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
};

export function EditableProviderRow({
  accountingAccountOptions,
  columnWidths,
  businessOptions,
  isEditing,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onEditProvider,
  onOpenEditProvider,
  onOpenAttachments,
  onUpdateProvider,
  provider,
  unitOptions,
  userOptions,
  visibleColumns,
}: EditableProviderRowProps) {
  const t = useProvidersTranslations();
  const startEditing = () => onEditProvider(provider.id);
  const canShow = (column: ProviderColumnKey) => visibleColumns.includes(column);
  const typeOptions = providerTypeOptions.map(option => ({
    ...option,
    label: t.providers.types[option.value] ?? option.label,
  }));
  const statusOptions = providerStatusOptions.map(option => ({
    ...option,
    label: option.value === 'active' ? t.common.active : t.common.inactive,
  }));
  const statusLabel = provider.status === 'active'
    ? t.common.active
    : provider.status === 'inactive' ? t.common.inactive : getProviderStatusLabel(provider.status);

  return (
    <tr className={`group relative transition-colors ${isEditing ? 'bg-slate-50/80 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/45 dark:ring-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/35'} ${!isEditing && provider.status === 'inactive' ? 'bg-slate-50/70 dark:bg-slate-900/20' : ''}`}>
      {canShow('folio') ? <td className="whitespace-nowrap px-6 py-4 align-middle text-sm text-slate-900 dark:text-slate-100"><span className="font-mono font-medium">{provider.folio}</span></td> : null}
      {canShow('name') ? <ReadonlyTextCell field="name" provider={provider} columnWidths={columnWidths} /> : null}
      {canShow('company') ? <ReadonlyTextCell field="company" provider={provider} columnWidths={columnWidths} /> : null}
      {canShow('type') ? <SelectCell field="type" label={t.providers.filters.type} options={typeOptions} provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} /> : null}
      {canShow('businessUnit') ? <SelectCell field="businessUnit" label={t.filters.unit} options={unitOptions} provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} /> : null}
      {canShow('business') ? <SelectCell field="business" label={t.filters.business} options={businessOptions} provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} /> : null}
      {(['contactName', 'email', 'phone', 'taxId', 'address'] as const).map(field => (
        canShow(field) ? <ReadonlyTextCell key={field} field={field} provider={provider} columnWidths={columnWidths} /> : null
      ))}
      {canShow('accountingAccount') ? <SelectCell field="accountingAccount" label={t.providers.columns.accountingAccount.label} options={accountingAccountOptions} provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} /> : null}
      {canShow('status') ? <StatusCell label={t.filters.status} provider={provider} columnWidths={columnWidths} isEditing={isEditing} statusLabel={statusLabel} statusOptions={statusOptions} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} /> : null}
      {canShow('attachments') ? <AttachmentsCell addLabel={t.common.addFiles} provider={provider} columnWidths={columnWidths} viewLabel={t.common.viewAttachedFiles} onOpenAttachments={onOpenAttachments} /> : null}
      {canShow('authorizer') ? <ReadonlyMappedCell field="authorizer" provider={provider} columnWidths={columnWidths} options={userOptions} /> : null}
      {canShow('performer') ? <ReadonlyMappedCell field="performer" provider={provider} columnWidths={columnWidths} options={userOptions} /> : null}
      <td className="whitespace-nowrap px-6 py-4 text-right align-middle" style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}>
        <ProviderRowActions providerId={provider.id} onActivateProvider={onActivateProvider} onDeleteProvider={onDeleteProvider} onDuplicateProvider={onDuplicateProvider} onEditProvider={() => onOpenEditProvider(provider)} />
      </td>
    </tr>
  );
}

function ReadonlyTextCell({
  columnWidths,
  field,
  provider,
}: {
  columnWidths: Record<string, number>;
  field: keyof Pick<ProviderRecord, 'name' | 'company' | 'contactName' | 'email' | 'phone' | 'taxId' | 'address'>;
  provider: ProviderRecord;
}) {
  return (
    <td className="px-6 py-4 align-middle" style={{ width: columnWidths[field], minWidth: columnWidths[field] }}>
      <ReadonlyValue>{provider[field] || '-'}</ReadonlyValue>
      {field === 'name' && provider.registrationSource === 'payable-kiosk-registration' ? <span className="ml-3 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Registro desde kiosko</span> : null}
    </td>
  );
}

function SelectCell<T extends keyof Pick<ProviderRecord, 'accountingAccount' | 'business' | 'businessUnit' | 'type'>>({
  columnWidths,
  field,
  isEditing,
  label,
  options,
  onStartEdit,
  onUpdateProvider,
  provider,
}: {
  columnWidths: Record<string, number>;
  field: T;
  isEditing: boolean;
  label: string;
  options: Array<{ value: ProviderRecord[T]; label: string }>;
  onStartEdit: () => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  provider: ProviderRecord;
}) {
  return (
    <td className="whitespace-nowrap px-6 py-4 align-middle" style={{ width: columnWidths[field], minWidth: columnWidths[field] }}>
      {isEditing ? <EditableSelect ariaLabel={`${label} ${provider.folio}`} value={provider[field]} options={options} onChange={(value) => onUpdateProvider(provider.id, { [field]: value })} /> : <ReadonlyPill onClick={onStartEdit}>{options.find(option => option.value === provider[field])?.label ?? provider[field]}</ReadonlyPill>}
    </td>
  );
}

function ReadonlyMappedCell<T extends keyof Pick<ProviderRecord, 'authorizer' | 'performer'>>({
  columnWidths,
  field,
  options,
  provider,
}: {
  columnWidths: Record<string, number>;
  field: T;
  options: Array<{ value: ProviderRecord[T]; label: string }>;
  provider: ProviderRecord;
}) {
  const value = provider[field];
  const label = options.find(option => option.value === value)?.label ?? value;

  return (
    <td className="whitespace-nowrap px-6 py-4 align-middle" style={{ width: columnWidths[field], minWidth: columnWidths[field] }}>
      <ReadonlyValue>{label || '-'}</ReadonlyValue>
    </td>
  );
}

function ReadonlyValue({ children }: { children: ReactNode }) {
  return (
    <span className="block max-w-xs truncate px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">
      {children}
    </span>
  );
}

function StatusCell({ columnWidths, isEditing, label, onStartEdit, onUpdateProvider, provider, statusLabel, statusOptions }: {
  columnWidths: Record<string, number>;
  isEditing: boolean;
  label: string;
  onStartEdit: () => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  provider: ProviderRecord;
  statusLabel: string;
  statusOptions: typeof providerStatusOptions;
}) {
  return (
    <td className="px-6 py-4 align-middle" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
      {isEditing ? <EditableSelect ariaLabel={`${label} ${provider.folio}`} value={provider.status} options={statusOptions} onChange={(status) => onUpdateProvider(provider.id, { status })} /> : (
        <button type="button" onClick={onStartEdit} className={`w-full rounded-full border px-3 py-2 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${getProviderStatusClass(provider.status)}`}>{statusLabel}</button>
      )}
    </td>
  );
}

function AttachmentsCell({ addLabel, columnWidths, onOpenAttachments, provider, viewLabel }: { addLabel: string; columnWidths: Record<string, number>; onOpenAttachments: (provider: ProviderRecord) => void; provider: ProviderRecord; viewLabel: string }) {
  const hasAttachments = provider.attachments.length > 0;
  return (
    <td className="whitespace-nowrap px-6 py-4 text-center align-middle" style={{ width: columnWidths.attachments, minWidth: columnWidths.attachments }}>
      <button type="button" onClick={() => onOpenAttachments(provider)} className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${hasAttachments ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/60' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'}`} title={hasAttachments ? viewLabel : addLabel} aria-label={hasAttachments ? viewLabel : addLabel}>
        <Paperclip className="h-4 w-4" />
        <span>{provider.attachments.length}</span>
      </button>
    </td>
  );
}
