import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceTitleBar } from '../../../../components/frontend-os';
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
  const actionLayout = (
    <>
      <Button variant="outline" className="h-11 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto" onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />{t.common.columns}
      </Button>
      <Button className="h-11 w-full justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#105010] sm:w-auto" onClick={onAddAccount}>
        <Plus className="h-4 w-4" />{t.paymentAccounts.add}
      </Button>
    </>
  );

  return (
    <IndiceTitleBar actions={actionLayout} icon="💳" subtitle={t.paymentAccounts.headerSubtitle} title={t.paymentAccounts.headerTitle} tone="green" />
  );
}
