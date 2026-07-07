import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';

type PaymentAccountsHeaderBannerProps = {
  onAddAccount: () => void;
  onConfigureColumns: () => void;
};

export function PaymentAccountsHeaderBanner({
  onAddAccount,
  onConfigureColumns,
}: PaymentAccountsHeaderBannerProps) {
  const t = usePaymentAccountsTranslations();

  return (
    <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-[28px]">
            <span className="text-3xl leading-none" aria-hidden="true">💳</span>
            {t.paymentAccounts.headerTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t.paymentAccounts.headerSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
            onClick={onConfigureColumns}
          >
            <Columns3 className="h-4 w-4" />
            {t.common.columns}
          </Button>
          <Button
            className="h-11 w-full justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] sm:w-auto"
            onClick={onAddAccount}
          >
            <Plus className="h-4 w-4" />
            {t.paymentAccounts.add}
          </Button>
        </div>
      </div>
    </div>
  );
}
