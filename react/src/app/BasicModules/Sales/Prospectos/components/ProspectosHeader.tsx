import { BriefcaseBusiness, Columns3, FileText, Plus, Settings2, Workflow } from 'lucide-react';
import { IndiceTitleBarOverflow } from '../../../../components/frontend-os';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { OpportunityFlow } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';

export function ProspectosHeader({
  actionsLabel,
  copy,
  flows,
  selectedFlowId,
  activeFlowLabel,
  factoryLabel,
  onSelectFlow,
  onManageFlow,
  onOpenColumns,
  onCreateSale,
  onCreateQuote,
  onCreateOpportunity,
}: {
  actionsLabel: string;
  copy: ProspectosCopy['header'];
  flows: OpportunityFlow[];
  selectedFlowId: number | null;
  activeFlowLabel: string;
  factoryLabel: string;
  onSelectFlow: (flowId: number) => Promise<void>;
  onManageFlow: () => void;
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
          <Select value={selectedFlowId === null ? undefined : String(selectedFlowId)} onValueChange={(value) => void onSelectFlow(Number(value))}>
            <SelectTrigger aria-label={activeFlowLabel} className={`${salesTitleBarSecondaryActionClassName} min-w-0 sm:min-w-[220px] sm:max-w-[300px]`}>
              <Workflow className="h-4 w-4 shrink-0" />
              <span className="hidden shrink-0 text-slate-500 xl:inline">{activeFlowLabel}:</span>
              <SelectValue placeholder={activeFlowLabel} />
            </SelectTrigger>
            <SelectContent>
              {flows.map((flow) => (
                <SelectItem key={flow.id} value={String(flow.id)}>
                  {flow.name}{flow.factory ? ` · ${factoryLabel}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                id: 'manage-flow',
                icon: <Settings2 className="h-4 w-4" />,
                label: copy.manageFlow,
                onSelect: onManageFlow,
              },
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
