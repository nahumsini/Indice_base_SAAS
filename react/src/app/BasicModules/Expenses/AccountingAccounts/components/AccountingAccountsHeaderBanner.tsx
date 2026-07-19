import { Columns3, LibraryBig, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';

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
    <>
      <Button variant="outline" className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto" onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />{t.common.columns}
      </Button>
      <Button variant="outline" className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto" onClick={onImportCatalog}>
        <LibraryBig className="h-4 w-4" />{t.accountingAccounts.importCatalog}
      </Button>
      <Button className="h-11 w-full justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] sm:w-auto" onClick={onAddAccount}>
        <Plus className="h-4 w-4" />{t.accountingAccounts.add}
      </Button>
    </>
  );

  return (
    <IndiceTitleBar actions={actionLayout} icon="📚" subtitle={t.accountingAccounts.headerSubtitle} title={t.accountingAccounts.headerTitle} tone="green" />
  );
}
