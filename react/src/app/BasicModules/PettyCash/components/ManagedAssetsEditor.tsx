import { Plus, Trash2 } from 'lucide-react';
import type { PettyCashTranslations } from '../translations';
import { getManagedAssetsCopy, getManagedAssetTypeLabel, managedAssetTypes, MAX_MANAGED_ASSETS, type ManagedAssetDraft } from '../utils/managedAssets';
import { PettyCashField, pettyCashInputClass } from './PettyCashShared';

export function ManagedAssetsEditor({ assets, copy, disabled, onChange }: {
  assets: ManagedAssetDraft[];
  copy: PettyCashTranslations;
  disabled: boolean;
  onChange: (assets: ManagedAssetDraft[]) => void;
}) {
  const labels = getManagedAssetsCopy(copy.locale);
  const update = (id: string, values: Partial<ManagedAssetDraft>) =>
    onChange(assets.map(asset => asset.draftId === id ? { ...asset, ...values } : asset));
  return (
    <div className="space-y-4">
      {assets.map((asset, index) => (
        <section key={asset.draftId} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-sm font-medium text-slate-900 dark:text-white">{labels.item(index + 1)}</h5>
            <button type="button" disabled={disabled} aria-label={`${labels.remove}: ${labels.item(index + 1)}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30"
              onClick={() => onChange(assets.filter(row => row.draftId !== asset.draftId))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />{labels.remove}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PettyCashField label={`${copy.funds.modal.assetType} *`}>
              <select className={pettyCashInputClass} disabled={disabled} value={asset.type} onChange={event => update(asset.draftId, { type: event.target.value })}>
                <option value="">{copy.common.notAvailable}</option>
                {managedAssetTypes.map(type => <option key={type} value={type}>{getManagedAssetTypeLabel(type, copy)}</option>)}
              </select>
            </PettyCashField>
            <PettyCashField label={copy.funds.modal.assetName}>
              <input className={pettyCashInputClass} disabled={disabled} maxLength={180} value={asset.name}
                placeholder={copy.funds.modal.assetNamePlaceholder} onChange={event => update(asset.draftId, { name: event.target.value })} />
            </PettyCashField>
            <PettyCashField label={copy.funds.modal.assetReference}>
              <input className={pettyCashInputClass} disabled={disabled} maxLength={120} value={asset.reference ?? ''}
                placeholder={copy.funds.modal.assetReferencePlaceholder} onChange={event => update(asset.draftId, { reference: event.target.value })} />
            </PettyCashField>
          </div>
        </section>
      ))}
      <button type="button" disabled={disabled || assets.length >= MAX_MANAGED_ASSETS}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-medium text-[#147514] hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
        onClick={() => { if (!disabled && assets.length < MAX_MANAGED_ASSETS) onChange([...assets, { draftId: crypto.randomUUID(), type: '', name: '', reference: '' }]); }}>
        <Plus className="h-4 w-4" aria-hidden="true" />{labels.add}
      </button>
      {assets.length >= MAX_MANAGED_ASSETS ? <p className="text-xs text-slate-600 dark:text-slate-300">{labels.limit}</p> : null}
    </div>
  );
}
