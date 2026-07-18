import { Columns3, LibraryBig, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';
import { LearningModeTitleBarBridge } from '../../../../learningMode';

type AccountingAccountsHeaderBannerProps = {
  onAddAccount: () => void;
  onConfigureColumns: () => void;
  onImportCatalog: () => void;
};

export function AccountingAccountsHeaderBanner({
  onAddAccount,
  onConfigureColumns,
  onImportCatalog,
}: AccountingAccountsHeaderBannerProps) {
  const t = useAccountingAccountsTranslations();
  const actionLayout = (
    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center">
      <Button variant="outline" className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto" onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />{t.common.columns}
      </Button>
      <Button variant="outline" className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto" onClick={onImportCatalog}>
        <LibraryBig className="h-4 w-4" />{t.accountingAccounts.importCatalog}
      </Button>
      <Button className="h-11 w-full justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] sm:w-auto" onClick={onAddAccount}>
        <Plus className="h-4 w-4" />{t.accountingAccounts.add}
      </Button>
    </div>
  );

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
    <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#147514]/20 bg-white text-2xl leading-none shadow-sm dark:bg-slate-900" aria-hidden="true">📚</span>
          <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.accountingAccounts.headerTitle}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
            {t.accountingAccounts.headerSubtitle}
          </p>
          </div>
        </div>

        {actionLayout}
      </div>
    </div>
    </LearningModeTitleBarBridge>
  );
}
