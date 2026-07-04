import { BriefcaseBusiness, Columns3, FileText, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { ProspectosCopy } from '../translations';

export function ProspectosHeader({
  copy,
  onOpenColumns,
  onCreateSale,
  onCreateQuote,
  onCreateOpportunity,
}: {
  copy: ProspectosCopy['header'];
  onOpenColumns: () => void;
  onCreateSale: () => void;
  onCreateQuote: () => void;
  onCreateOpportunity: () => void;
}) {
  return (
    <SalesTitleBar
      icon="🎯"
      title={copy.title}
      subtitle={copy.subtitle}
      actions={(
        <>
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
