import { Columns3, LibraryBig, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

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
  return (
    <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-6 py-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[28px] font-bold text-slate-900 dark:text-white">
            <span className="text-3xl leading-none" aria-hidden="true">📊</span>
            Cuentas contables
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Catálogo financiero para clasificar gastos, ingresos y movimientos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onClick={onConfigureColumns}
          >
            <Columns3 className="h-4 w-4" />
            Columnas
          </Button>
          <Button
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onClick={onImportCatalog}
          >
            <LibraryBig className="h-4 w-4" />
            Cargar catálogo base
          </Button>
          <Button
            className="h-11 justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010]"
            onClick={onAddAccount}
          >
            <Plus className="h-4 w-4" />
            Agregar cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}
