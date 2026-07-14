import { Check, Globe2, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';
import { useFinanceModalAccessibility } from '../../hooks/useFinanceModalAccessibility';
import type { AccountingAccount, AccountingCountryCode } from '../types';
import {
  accountMatchesCatalogTemplate,
  accountingCatalogTemplates,
  accountingCountryOptions,
  catalogTemplateKey,
  type AccountingCatalogTemplate,
} from '../accountingCatalogSeed';

type AccountingCatalogImportModalProps = {
  accounts: AccountingAccount[];
  isImporting: boolean;
  onClose: () => void;
  onImport: (templates: AccountingCatalogTemplate[]) => void | Promise<void>;
};

export function AccountingCatalogImportModal({
  accounts,
  isImporting,
  onClose,
  onImport,
}: AccountingCatalogImportModalProps) {
  const t = useAccountingAccountsTranslations();
  const { panelRef, titleId } = useFinanceModalAccessibility(onClose);
  const [activeCountry, setActiveCountry] = useState<AccountingCountryCode>('MX');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const visibleTemplates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return accountingCatalogTemplates.filter(template => {
      if (template.countryCode !== activeCountry) return false;
      if (!normalizedSearch) return true;
      return `${template.code} ${template.name} ${template.description} ${template.localStandard}`.toLowerCase().includes(normalizedSearch);
    });
  }, [activeCountry, searchTerm]);
  const availableTemplates = visibleTemplates.filter(template => !accounts.some(account => accountMatchesCatalogTemplate(account, template)));
  const selectedTemplates = accountingCatalogTemplates.filter(template => selectedKeys.has(catalogTemplateKey(template)));
  const activeCountryMeta = accountingCountryOptions.find(country => country.code === activeCountry);

  const toggleTemplate = (template: AccountingCatalogTemplate) => {
    if (accounts.some(account => accountMatchesCatalogTemplate(account, template))) return;
    const key = catalogTemplateKey(template);
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedKeys(current => {
      const next = new Set(current);
      availableTemplates.forEach(template => next.add(catalogTemplateKey(template)));
      return next;
    });
  };

  const clearVisible = () => {
    setSelectedKeys(current => {
      const next = new Set(current);
      visibleTemplates.forEach(template => next.delete(catalogTemplateKey(template)));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-[min(88vh,860px)] max-h-[calc(100vh-3rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#147514] px-6 py-5 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Globe2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-2xl font-extrabold tracking-normal">{t.accountingAccounts.importCatalog}</h2>
              <p className="mt-1 max-w-2xl text-sm font-medium text-white/85">
                {t.accountingAccounts.catalog.description}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white transition hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70">
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-wrap gap-2">
              {accountingCountryOptions.map(country => (
                <button key={country.code} type="button" onClick={() => setActiveCountry(country.code)} className={`h-10 rounded-xl border px-4 text-sm font-extrabold transition ${activeCountry === country.code ? 'border-[#147514] bg-[#147514] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#147514]/30 hover:text-[#147514]'}`}>
                  {t.accountingAccounts.catalog.countryLabels[country.code] ?? country.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-600">{activeCountryMeta?.standard}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t.accountingAccounts.catalog.selectedCount(selectedTemplates.length)} · {t.accountingAccounts.catalog.availableInView(availableTemplates.length)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectVisible} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#147514]/30 hover:text-[#147514]">{t.accountingAccounts.catalog.selectVisible}</button>
                <button type="button" onClick={clearVisible} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#147514]/30 hover:text-[#147514]">{t.accountingAccounts.catalog.clearVisible}</button>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t.accountingAccounts.catalog.searchPlaceholder} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#147514]/45 focus:ring-4 focus:ring-[#147514]/10" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              {visibleTemplates.map(template => {
                const exists = accounts.some(account => accountMatchesCatalogTemplate(account, template));
                const selected = selectedKeys.has(catalogTemplateKey(template));
                return (
                  <button key={catalogTemplateKey(template)} type="button" onClick={() => toggleTemplate(template)} disabled={exists} className={`flex w-full items-start gap-4 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm transition ${selected ? 'border-[#147514]/35 ring-2 ring-[#147514]/10' : 'border-slate-200 hover:border-[#147514]/25'} ${exists ? 'cursor-not-allowed opacity-65' : ''}`}>
                    <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-[#147514] bg-[#147514] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-slate-900">{template.code}</span>
                        <span className="text-base font-extrabold text-slate-900">{template.name}</span>
                        {exists ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{t.accountingAccounts.catalog.alreadyExists}</span> : null}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{template.description}</span>
                      <span className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{t.accountingAccounts.types[template.type] ?? template.type}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{t.accountingAccounts.catalog.sectionLabels[template.statementSection] ?? template.statementSection}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{template.localReferenceCode}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-[#147514] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-white/35 bg-white/10 px-7 text-sm font-extrabold text-white transition hover:bg-white/18">{t.common.cancel}</button>
          <button type="button" onClick={() => void onImport(selectedTemplates)} disabled={isImporting || selectedTemplates.length === 0} className="h-12 rounded-2xl bg-white px-7 text-sm font-extrabold text-[#147514] shadow-lg shadow-slate-900/15 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-white/45 disabled:text-[#147514]/50">
            {isImporting ? t.accountingAccounts.catalog.importing : t.accountingAccounts.catalog.importSelected(selectedTemplates.length)}
          </button>
        </div>
      </div>
    </div>
  );
}
