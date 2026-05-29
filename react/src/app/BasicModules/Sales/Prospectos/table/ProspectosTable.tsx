import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { OpportunityColumnId, OpportunitySortState } from '../types/prospectosTypes';
import { ProspectosTableRow } from './ProspectosTableRow';

function OpportunitySortableHeader({
  column,
  sortState,
  onSort,
}: {
  column: ColumnConfig;
  sortState: OpportunitySortState;
  onSort: (columnId: OpportunityColumnId) => void;
}) {
  const columnId = column.id as OpportunityColumnId;
  const isActive = sortState.columnId === columnId;
  const SortIcon = isActive ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-950"
      onClick={() => onSort(columnId)}
    >
      <span>{column.label}</span>
      <SortIcon className={cn('h-3.5 w-3.5', isActive ? 'text-[#2563EB]' : 'text-slate-400')} />
    </button>
  );
}

export function ProspectosTable({
  opportunities,
  quotes,
  visibleColumns,
  tableMinWidth,
  sortState,
  ownerSelectOptions,
  resolveOpportunityOwnerValue,
  getOwnerPayloadFromValue,
  onSort,
  onUpdateOpportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
  onScheduleChange,
}: {
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  visibleColumns: ColumnConfig[];
  tableMinWidth: number;
  sortState: OpportunitySortState;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onSort: (columnId: OpportunityColumnId) => void;
  onUpdateOpportunity: (opportunityId: string, patch: Partial<Omit<SalesOpportunity, 'id'>>) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete: (opportunity: SalesOpportunity) => void;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
}) {
  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table style={{ minWidth: `${tableMinWidth}px` }}>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
            {visibleColumns.map((column) => (
              <TableHead key={column.id} className="px-5 py-5">
                <OpportunitySortableHeader column={column} sortState={sortState} onSort={onSort} />
              </TableHead>
            ))}
            <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <ProspectosTableRow
              key={opportunity.id}
              opportunity={opportunity}
              quotes={quotes}
              visibleColumns={visibleColumns}
              ownerSelectOptions={ownerSelectOptions}
              resolveOpportunityOwnerValue={resolveOpportunityOwnerValue}
              getOwnerPayloadFromValue={getOwnerPayloadFromValue}
              onUpdateOpportunity={onUpdateOpportunity}
              onOpenFiles={onOpenFiles}
              onOpenHistory={onOpenHistory}
              onEdit={onEdit}
              onDelete={onDelete}
              onScheduleChange={onScheduleChange}
            />
          ))}

          {opportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center text-base text-slate-500">
                No hay oportunidades que coincidan con la búsqueda.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </section>
  );
}
