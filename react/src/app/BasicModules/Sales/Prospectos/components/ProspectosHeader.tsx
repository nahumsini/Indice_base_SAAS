import { BriefcaseBusiness, Columns3, FileText, Plus } from 'lucide-react';
import { IndiceTitleBarOverflow } from '../../../../components/frontend-os';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { ProspectosCopy } from '../translations';

export function ProspectosHeader({
  actionsLabel,
  copy,
  onOpenColumns,
  onCreateSale,
  onCreateQuote,
  onCreateOpportunity,
}: {
  actionsLabel: string;
  copy: ProspectosCopy['header'];
  onOpenColumns: () => void;
  onCreateSale: () => void;
  onCreateQuote: () => void;
  onCreateOpportunity: () => void;
}) {
  return (
    <SalesTitleBar
      icon="🎯"
      rhIndent
      title={copy.title}
      subtitle={copy.subtitle}
      actions={(
        <>
          <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={onCreateQuote}>
            <FileText className="h-4 w-4" />
            {copy.createQuote}
          </Button>
          <Button className={salesTitleBarPrimaryActionClassName} onClick={onCreateOpportunity}>
            <Plus className="h-4 w-4" />
            {copy.createOpportunity}
          </Button>
          <IndiceTitleBarOverflow
            label={actionsLabel}
            items={[
              {
                id: 'columns',
                icon: <Columns3 className="h-4 w-4" />,
                label: copy.columns,
                onSelect: onOpenColumns,
              },
              {
                id: 'create-sale',
                icon: <BriefcaseBusiness className="h-4 w-4" />,
                label: copy.createSale,
                onSelect: onCreateSale,
              },
            ]}
          />
        </>
      )}
    />
  );
}
