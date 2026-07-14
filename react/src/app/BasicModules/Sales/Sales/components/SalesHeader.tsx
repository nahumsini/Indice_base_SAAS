import { BadgePercent, Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { SalesRecordsTranslations } from '../translations';

export function SalesHeader({
  t,
  onOpenColumns,
  onOpenCommissionRules,
  onCreateSale,
}: {
  t: SalesRecordsTranslations;
  onOpenColumns: () => void;
  onOpenCommissionRules: () => void;
  onCreateSale: () => void;
}) {
  return (
    <SalesTitleBar
      icon="💰"
      rhIndent
      title={t.header.title}
      subtitle={t.header.subtitle}
      actions={(
        <>
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
