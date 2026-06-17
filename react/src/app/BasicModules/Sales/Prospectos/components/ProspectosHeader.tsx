import { BriefcaseBusiness, Coins, Columns3, FileText, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import { salesCurrencyOptions } from '../../utils/salesCurrency';
import type { ProspectosCopy } from '../translations';

export function ProspectosHeader({
  copy,
  onOpenColumns,
  onCreateSale,
  onCreateQuote,
  onCreateOpportunity,
  onPreferredCurrencyChange,
  preferredCurrency,
}: {
  copy: ProspectosCopy['header'];
  onOpenColumns: () => void;
  onCreateSale: () => void;
  onCreateQuote: () => void;
  onCreateOpportunity: () => void;
  onPreferredCurrencyChange: (currency: string) => void;
  preferredCurrency: string;
}) {
  return (
    <SalesTitleBar
      icon="🎯"
      title={copy.title}
      subtitle={copy.subtitle}
      actions={(
        <>
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA]">
            <Coins className="h-4 w-4" />
            <span>{copy.preferredCurrency}</span>
            <select
              aria-label={copy.preferredCurrency}
              value={preferredCurrency}
              onChange={(event) => onPreferredCurrencyChange(event.target.value)}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm font-extrabold text-[#B63B32] outline-none focus:ring-0 dark:text-[#FFB0AA]"
            >
              {salesCurrencyOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.code}</option>
              ))}
            </select>
          </label>
          <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={onOpenColumns}>
            <Columns3 className="h-4 w-4" />
            {copy.columns}
          </Button>
          <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={onCreateSale}>
            <BriefcaseBusiness className="h-4 w-4" />
            {copy.createSale}
          </Button>
          <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={onCreateQuote}>
            <FileText className="h-4 w-4" />
            {copy.createQuote}
          </Button>
          <Button className={salesTitleBarPrimaryActionClassName} onClick={onCreateOpportunity}>
            <Plus className="h-4 w-4" />
            {copy.createOpportunity}
          </Button>
        </>
      )}
    />
  );
}
