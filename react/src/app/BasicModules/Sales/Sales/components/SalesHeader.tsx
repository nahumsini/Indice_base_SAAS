import { BadgePercent, Coins, Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import { salesCurrencyOptions } from '../../utils/salesCurrency';
import type { SalesRecordsTranslations } from '../translations';

export function SalesHeader({
  t,
  preferredCurrency,
  onPreferredCurrencyChange,
  onOpenColumns,
  onOpenCommissionRules,
  onCreateSale,
}: {
  t: SalesRecordsTranslations;
  preferredCurrency: string;
  onPreferredCurrencyChange: (currency: string) => void;
  onOpenColumns: () => void;
  onOpenCommissionRules: () => void;
  onCreateSale: () => void;
}) {
  return (
    <SalesTitleBar
      icon={t.header.emoji}
      title={t.header.title}
      subtitle={t.header.subtitle}
      actions={(
        <>
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA]">
            <Coins className="h-4 w-4" />
            <span>{t.header.preferredCurrencyAction}</span>
            <select
              aria-label={t.header.preferredCurrencyAction}
              value={preferredCurrency}
              onChange={(event) => onPreferredCurrencyChange(event.target.value)}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm font-extrabold text-[#B63B32] outline-none focus:ring-0 dark:text-[#FFB0AA]"
            >
              {salesCurrencyOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.code}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenColumns}
          >
            <Columns3 className="h-4 w-4" />
            {t.header.columnsAction}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenCommissionRules}
          >
            <BadgePercent className="h-4 w-4" />
            {t.header.commissionRulesAction}
          </Button>
          <Button
            type="button"
            className={salesTitleBarPrimaryActionClassName}
            onClick={onCreateSale}
          >
            <Plus className="h-4 w-4" />
            {t.header.primaryAction}
          </Button>
        </>
      )}
    />
  );
}
