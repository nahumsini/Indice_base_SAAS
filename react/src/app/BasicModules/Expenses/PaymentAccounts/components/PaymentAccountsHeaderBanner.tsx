import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import type { IndiceModuleTone } from '../../../../styles/moduleColors';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';

type PaymentAccountsHeaderBannerProps = {
  onAddAccount: () => void;
  onConfigureColumns: () => void;
  subtitle?: string;
  title?: string;
  tone?: IndiceModuleTone;
};

export function PaymentAccountsHeaderBanner({
  onAddAccount,
  onConfigureColumns,
  subtitle,
  title,
  tone = 'green',
}: PaymentAccountsHeaderBannerProps) {
  const t = usePaymentAccountsTranslations();
  const isSales = tone === 'coral';
  const actionLayout = (
    <>
      <Button variant="outline" className={`h-11 w-full justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto ${isSales ? 'border-[#FF6B5E]/30 text-[#D94E43] hover:bg-[#FF6B5E] hover:text-[#222831]' : 'border-slate-200 text-[#147514] hover:bg-[#147514] hover:text-white'}`} onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />{t.common.columns}
      </Button>
      <Button className={`h-11 w-full justify-center gap-2 rounded-xl px-4 text-sm font-medium shadow-sm sm:w-auto ${isSales ? 'bg-[#FF6B5E] text-[#222831] hover:bg-[#E8564B]' : 'bg-[#147514] text-white hover:bg-[#105010]'}`} onClick={onAddAccount}>
        <Plus className="h-4 w-4" />{t.paymentAccounts.add}
      </Button>
    </>
  );

  return (
    <IndiceTitleBar actions={actionLayout} icon="💳" subtitle={subtitle ?? t.paymentAccounts.headerSubtitle} title={title ?? t.paymentAccounts.headerTitle} tone={tone} />
  );
}
