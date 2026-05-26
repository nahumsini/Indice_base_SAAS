import { Paperclip } from 'lucide-react';
import {
  opportunityNextActions,
  opportunityProbabilities,
  opportunitySources,
  opportunityStages,
  opportunityStatuses,
  opportunityTemperatures,
  type OpportunityNextAction,
  type OpportunityProbability,
  type OpportunitySource,
  type OpportunityStage,
  type OpportunityStatus,
  type OpportunityTemperature,
  type SalesOpportunity,
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
import { ProspectosQuickActions } from '../components/ProspectosQuickActions';
import type { OpportunityColumnId } from '../types/prospectosTypes';
import {
  formatCurrencyAmount,
  getOpportunitySchedule,
  normalizeEstimatedValueInput,
  parseMoney,
  toEstimatedValueInputValue,
} from '../utils/prospectosFormatters';
import { stageClasses, statusClasses, temperatureClasses } from '../utils/prospectosStatus';

function OpportunityInlineSelect<TValue extends string>({
  value,
  options,
  onValueChange,
  className,
}: {
  value: TValue;
  options: readonly TValue[];
  onValueChange: (value: TValue) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)}>
      <SelectTrigger
        className={cn(
          'h-9 min-w-[138px] rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none focus:ring-[#2563EB]/20',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
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
          'h-9 min-w-[172px] rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none focus:ring-[#2563EB]/20',
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
    <div className="grid min-w-[256px] grid-cols-[minmax(132px,1fr)_104px] gap-2">
      <Input
        type="date"
        value={schedule.date}
        onChange={(event) => onScheduleChange(opportunity, event.target.value, schedule.time)}
        className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20"
      />
      <Input
        type="time"
        value={schedule.time}
        onChange={(event) => onScheduleChange(opportunity, schedule.date, event.target.value)}
        className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20"
      />
    </div>
  );
}

export function ProspectosTableRow({
  opportunity,
  visibleColumns,
  ownerSelectOptions,
  resolveOpportunityOwnerValue,
  getOwnerPayloadFromValue,
  onUpdateOpportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
  onScheduleChange,
}: {
  opportunity: SalesOpportunity;
  visibleColumns: Array<{ id: string }>;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onUpdateOpportunity: (opportunityId: string, patch: Partial<Omit<SalesOpportunity, 'id'>>) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete: (opportunity: SalesOpportunity) => void;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
}) {
  const renderOpportunityCell = (columnId: OpportunityColumnId) => {
    switch (columnId) {
      case 'opportunity':
        return (
          <div className="min-w-[260px] space-y-1 whitespace-normal">
            <p className="text-sm font-bold text-slate-950">{opportunity.opportunityName}</p>
            <p className="text-xs font-semibold text-[#2563EB]">{opportunity.company}</p>
            <p className="text-xs text-slate-500">{opportunity.id}</p>
          </div>
        );
      case 'contact':
        return <span className="text-sm font-semibold text-slate-900">{opportunity.contactPerson}</span>;
      case 'phone':
        return <span className="text-sm text-slate-700">{opportunity.phone}</span>;
      case 'email':
        return <span className="text-sm text-slate-700">{opportunity.email}</span>;
      case 'source':
        return (
          <OpportunityInlineSelect<OpportunitySource>
            value={opportunity.source}
            options={opportunitySources}
            onValueChange={(source) => onUpdateOpportunity(opportunity.id, { source })}
          />
        );
      case 'stage':
        return (
          <OpportunityInlineSelect<OpportunityStage>
            value={opportunity.stage}
            options={opportunityStages}
            onValueChange={(stage) => onUpdateOpportunity(opportunity.id, { stage })}
            className={stageClasses[opportunity.stage]}
          />
        );
      case 'temperature':
        return (
          <OpportunityInlineSelect<OpportunityTemperature>
            value={opportunity.temperature}
            options={opportunityTemperatures}
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
          <Input
            value={toEstimatedValueInputValue(opportunity.estimatedValue)}
            inputMode="decimal"
            onChange={(event) => onUpdateOpportunity(opportunity.id, { estimatedValue: normalizeEstimatedValueInput(event.target.value) })}
            placeholder="0"
            className="h-9 min-w-[148px] rounded-full border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20"
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
      case 'expectedCloseDate':
        return (
          <Input
            type="date"
            value={opportunity.expectedCloseDate}
            onChange={(event) => onUpdateOpportunity(opportunity.id, { expectedCloseDate: event.target.value })}
            className="h-9 min-w-[150px] rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none"
          />
        );
      case 'nextAction':
        return (
          <OpportunityInlineSelect<OpportunityNextAction>
            value={opportunity.nextAction}
            options={opportunityNextActions}
            onValueChange={(nextAction) => onUpdateOpportunity(opportunity.id, { nextAction })}
          />
        );
      case 'nextActionDate':
        return <OpportunityScheduleInlineEditor opportunity={opportunity} onScheduleChange={onScheduleChange} />;
      case 'lastContact':
        return <span className="text-sm text-slate-700">{opportunity.lastContact || 'Sin registro'}</span>;
      case 'files':
        return (
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100" onClick={() => onOpenFiles(opportunity)}>
            <Paperclip className="h-3.5 w-3.5" />
            {opportunity.files.length}
          </button>
        );
      case 'status':
        return (
          <OpportunityInlineSelect<OpportunityStatus>
            value={opportunity.status}
            options={opportunityStatuses}
            onValueChange={(status) => onUpdateOpportunity(opportunity.id, { status })}
            className={statusClasses[opportunity.status]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TableRow className="border-slate-200 hover:bg-slate-50/80">
      {visibleColumns.map((column) => (
        <TableCell key={column.id} className="px-5 py-5">
          {renderOpportunityCell(column.id as OpportunityColumnId)}
        </TableCell>
      ))}
      <TableCell className="px-5 py-5">
        <ProspectosQuickActions
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

