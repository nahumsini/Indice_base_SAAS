import { Paperclip } from 'lucide-react';
import {
  opportunityNextActions,
  opportunityProbabilities,
  opportunitySources,
  opportunityStatuses,
  opportunityTemperatures,
  type OpportunityFlowStage,
  type OpportunityNextAction,
  type OpportunityProbability,
  type OpportunitySource,
  type OpportunityStage,
  type OpportunityStatus,
  type OpportunityTemperature,
  type SalesOpportunity,
  type SalesQuote,
} from '../../salesCrmContext';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import { OpportunityCommercialValueCell } from '../components/OpportunityCommercialValueCell';
import { OpportunityPipelineCell } from '../components/OpportunityPipelineCell';
import { ProspectosQuickActions } from '../components/ProspectosQuickActions';
import { OpportunityQuoteSignalBadge } from '../components/OpportunityQuoteSignalBadge';
import type { ProspectosCopy } from '../translations';
import type { OpportunityColumnId } from '../types/prospectosTypes';
import { opportunityActionsColumnWidth } from '../utils/prospectosStatus';
import { getOpportunitySchedule } from '../utils/prospectosFormatters';
import {
  getOpportunityStageBadgeClass,
  getOpportunityStageConfig,
  getOpportunityStageLabel,
} from '../utils/prospectosFlow';
import { getOpportunityNativePipelineTotals } from '../utils/prospectosPipeline';
import { getLinkedQuotesForOpportunity, getOpportunityQuoteSignal } from '../utils/prospectosQuoteSignals';
import { statusClasses, temperatureClasses } from '../utils/prospectosStatus';

function OpportunityInlineSelect<TValue extends string>({
  value,
  options,
  onValueChange,
  getLabel,
  className,
}: {
  value: TValue;
  options: readonly TValue[];
  onValueChange: (value: TValue) => void;
  getLabel?: (value: TValue) => string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)}>
      <SelectTrigger
        className={cn(
          'h-9 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white [&>span]:truncate',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {getLabel ? getLabel(option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OpportunityOwnerSelect({
  value,
  options,
  onValueChange,
  selectedLabel,
  className,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  selectedLabel?: string;
  className?: string;
}) {
  const normalizedOptions = options.some((option) => option.value === value) || !selectedLabel
    ? options
    : [{ value, label: `${selectedLabel} (sin vincular)` }, ...options];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          'h-9 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white [&>span]:truncate',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OpportunityScheduleInlineEditor({
  opportunity,
  onScheduleChange,
}: {
  opportunity: SalesOpportunity;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
}) {
  const schedule = getOpportunitySchedule(opportunity);

  return (
    <div className="flex max-w-full min-w-0 flex-wrap gap-2">
      <Input
        type="date"
        value={schedule.date}
        onChange={(event) => onScheduleChange(opportunity, event.target.value, schedule.time)}
        className="h-9 min-w-0 flex-[1_1_132px] rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <Input
        type="time"
        value={schedule.time}
        onChange={(event) => onScheduleChange(opportunity, schedule.date, event.target.value)}
        className="h-9 min-w-0 flex-[1_1_104px] rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

export function ProspectosTableRow({
  copy,
  opportunity,
  quotes,
  stages,
  visibleColumns,
  columnWidths,
  ownerSelectOptions,
  resolveOpportunityOwnerValue,
  getOwnerPayloadFromValue,
  onUpdateOpportunity,
  onStageChange,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
  onScheduleChange,
  onDownloadQuote,
}: {
  copy: ProspectosCopy;
  opportunity: SalesOpportunity;
  quotes: SalesQuote[];
  stages: OpportunityFlowStage[];
  visibleColumns: Array<{ id: string }>;
  columnWidths: Record<OpportunityColumnId, number>;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onUpdateOpportunity: (opportunityId: string, patch: Partial<Omit<SalesOpportunity, 'id'>>) => void;
  onStageChange: (opportunity: SalesOpportunity, stage: OpportunityStage) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete: (opportunity: SalesOpportunity) => void;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
  onDownloadQuote: (opportunity: SalesOpportunity, quote: SalesQuote) => void;
}) {
  const linkedQuotes = getLinkedQuotesForOpportunity(opportunity, quotes);
  const quoteSignal = getOpportunityQuoteSignal(opportunity, quotes);
  const pipeline = getOpportunityNativePipelineTotals(opportunity, quotes);
  const commercialFilesCount = opportunity.files.length + quoteSignal.quoteCount;
  const stageConfig = getOpportunityStageConfig(stages, opportunity.stage);

  const renderOpportunityCell = (columnId: OpportunityColumnId) => {
    switch (columnId) {
      case 'opportunity':
        return (
          <div className="min-w-0 max-w-full space-y-1 whitespace-normal">
            <p className="break-words text-sm font-medium text-slate-950 dark:text-white">{opportunity.opportunityName}</p>
            <p className="break-words text-xs font-medium text-[#2563EB]">{opportunity.company}</p>
            <p className="break-all text-xs text-slate-500">{opportunity.id}</p>
          </div>
        );
      case 'contact':
        return (
          <div className="min-w-0 max-w-full space-y-1">
            <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-200">{opportunity.contactPerson}</p>
            {opportunity.phone ? (
              <a className="block break-all text-xs text-slate-600 hover:text-[#2563EB] dark:text-slate-300" href={`tel:${opportunity.phone}`}>
                {opportunity.phone}
              </a>
            ) : null}
            {opportunity.email ? (
              <a className="block break-all text-xs text-slate-600 hover:text-[#2563EB] dark:text-slate-300" href={`mailto:${opportunity.email}`}>
                {opportunity.email}
              </a>
            ) : null}
          </div>
        );
      case 'phone':
        return <span className="block min-w-0 break-all text-sm text-slate-700 dark:text-slate-300">{opportunity.phone}</span>;
      case 'email':
        return <span className="block min-w-0 break-all text-sm leading-6 text-slate-700 dark:text-slate-300">{opportunity.email}</span>;
      case 'source':
        return (
          <OpportunityInlineSelect<OpportunitySource>
            value={opportunity.source}
            options={opportunitySources}
            getLabel={(source) => copy.options.sources[source]}
            onValueChange={(source) => onUpdateOpportunity(opportunity.id, { source })}
          />
        );
      case 'stage':
        return (
          <OpportunityInlineSelect<OpportunityStage>
            value={opportunity.stage}
            options={stages.map((stage) => stage.key)}
            getLabel={(stageKey) => {
              const option = getOpportunityStageConfig(stages, stageKey);
              return option
                ? getOpportunityStageLabel(option, copy.options.stages as Record<string, string>)
                : stageKey;
            }}
            onValueChange={(stage) => onStageChange(opportunity, stage)}
            className={getOpportunityStageBadgeClass(stageConfig)}
          />
        );
      case 'temperature':
        return (
          <OpportunityInlineSelect<OpportunityTemperature>
            value={opportunity.temperature}
            options={opportunityTemperatures}
            getLabel={(temperature) => copy.options.temperatures[temperature]}
            onValueChange={(temperature) => onUpdateOpportunity(opportunity.id, { temperature })}
            className={temperatureClasses[opportunity.temperature]}
          />
        );
      case 'owner':
        return (
          <OpportunityOwnerSelect
            value={resolveOpportunityOwnerValue(opportunity)}
            options={ownerSelectOptions}
            selectedLabel={opportunity.owner}
            onValueChange={(value) => onUpdateOpportunity(opportunity.id, getOwnerPayloadFromValue(value))}
          />
        );
      case 'estimatedValue':
        return (
          <OpportunityCommercialValueCell
            copy={copy.table.commercialValue}
            opportunity={opportunity}
            pipeline={pipeline}
          />
        );
      case 'probability':
        return (
          <OpportunityInlineSelect<OpportunityProbability>
            value={opportunity.probability}
            options={opportunityProbabilities}
            onValueChange={(probability) => onUpdateOpportunity(opportunity.id, { probability })}
            className="text-[#9a6b05]"
          />
        );
      case 'quoteSignal':
        return (
          <OpportunityQuoteSignalBadge
            signal={quoteSignal}
            copy={copy.quoteSignal}
            quotes={linkedQuotes}
            onDownloadQuote={(quote) => onDownloadQuote(opportunity, quote)}
          />
        );
      case 'pipeline':
        return <OpportunityPipelineCell pipeline={pipeline} copy={copy.kpis} />;
      case 'expectedCloseDate':
        return (
          <Input
            type="date"
            value={opportunity.expectedCloseDate}
            onChange={(event) => onUpdateOpportunity(opportunity.id, { expectedCloseDate: event.target.value })}
            className="h-9 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        );
      case 'nextAction':
        return (
          <div className="min-w-0 max-w-full space-y-2">
            <OpportunityInlineSelect<OpportunityNextAction>
              value={opportunity.nextAction}
              options={opportunityNextActions}
              getLabel={(nextAction) => copy.options.nextActions[nextAction]}
              onValueChange={(nextAction) => onUpdateOpportunity(opportunity.id, { nextAction })}
            />
            <OpportunityScheduleInlineEditor opportunity={opportunity} onScheduleChange={onScheduleChange} />
            <p className="break-words text-[11px] text-slate-500 dark:text-slate-400">
              {copy.columns.lastContact.label}: {opportunity.lastContact || copy.table.noLastContact}
            </p>
          </div>
        );
      case 'nextActionDate':
        return <OpportunityScheduleInlineEditor opportunity={opportunity} onScheduleChange={onScheduleChange} />;
      case 'lastContact':
        return <span className="block min-w-0 break-words text-sm text-slate-700 dark:text-slate-300">{opportunity.lastContact || copy.table.noLastContact}</span>;
      case 'files':
        return (
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => onOpenFiles(opportunity)}>
            <Paperclip className="h-3.5 w-3.5" />
            {commercialFilesCount}
          </button>
        );
      case 'status':
        return (
          <OpportunityInlineSelect<OpportunityStatus>
            value={opportunity.status}
            options={opportunityStatuses}
            getLabel={(status) => copy.options.statuses[status]}
            onValueChange={(status) => onUpdateOpportunity(opportunity.id, { status })}
            className={statusClasses[opportunity.status]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TableRow className="border-slate-100 hover:bg-[#FF6B5E]/[0.025] dark:border-slate-700 dark:hover:bg-slate-700/40">
      {visibleColumns.map((column) => {
        const columnId = column.id as OpportunityColumnId;
        const columnWidth = columnWidths[columnId] ?? 160;

        return (
          <TableCell
            key={column.id}
            className="overflow-hidden whitespace-normal px-5 py-5 align-top"
            style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` }}
          >
            {renderOpportunityCell(columnId)}
          </TableCell>
        );
      })}
      <TableCell
        className="whitespace-normal px-4 py-5 text-right align-top"
        style={{ width: opportunityActionsColumnWidth, minWidth: opportunityActionsColumnWidth, maxWidth: opportunityActionsColumnWidth }}
      >
        <ProspectosQuickActions
          copy={copy.quickActions}
          opportunity={opportunity}
          onOpenFiles={onOpenFiles}
          onOpenHistory={onOpenHistory}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
