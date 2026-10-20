import { useMemo, type ReactNode } from 'react';
import { CalendarClock, Mail, Phone } from 'lucide-react';
import {
  IndiceOperationalTable, IndiceTableActionGroup, IndiceTableColGroup,
  IndiceTableHeaderRow, IndiceTableShell, getIndiceTableMinimumWidth,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import { TableBody, TableCell, TableRow } from '../../../../components/ui/table';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import { OpportunityActionButton } from '../../Prospectos/components/ProspectosQuickActions';
import { getPhoneHref } from '../../utils/salesCommunicationUtils';
import { stageLabel, type ContinuityCopy } from './continuityCopy';
import { continuityColors, continuityUrgency, formatContinuityDate } from './continuityModel';
import { continuitySortColumns, type ContinuityFlow, type ContinuityItem, type ContinuityKind, type ContinuitySort, type ContinuitySortColumn } from './postSaleWorkspaceApi';

const widths = { client: 280, sale: 150, stage: 190, owner: 180, lossReason: 240, nextAction: 290 };
const minimums = { client: 220, sale: 130, stage: 160, owner: 150, lossReason: 200, nextAction: 240 };
const actionsWidth = 190;
type Column = keyof typeof widths;
const cellClass = 'px-4 py-4 whitespace-normal text-sm text-slate-700 dark:text-slate-200';
const focusClass = 'rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] disabled:opacity-50';
const actionClass = 'h-11 w-11 md:h-9 md:w-9';
const tones = {
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  overdue: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200',
  today: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  unscheduled: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  upcoming: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

export function ContinuityTable({ kind, items, flow, today, locale, t, busy, onOpen, pagination, sortState, onSort }: {
  kind: ContinuityKind; items: ContinuityItem[]; flow?: ContinuityFlow; today: string; locale: string; t: ContinuityCopy;
  busy: boolean; onOpen: (item: ContinuityItem) => void; pagination: ReactNode;
  sortState: ContinuitySort; onSort: (column: ContinuitySortColumn) => void;
}) {
  const lost = kind === 'lost';
  const labels = useMemo(() => ({ client: t.client, sale: lost ? t.opportunity : t.sale, stage: lost ? t.recoveryState : t.stage,
    owner: t.owner, lossReason: t.lossReason, nextAction: t.nextAction }), [t, lost]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths({
    defaults: widths, minWidths: minimums, headerLabels: labels, sortableColumnIds: continuitySortColumns,
    storageKey: `indice:sales:post-sales:${kind}:columns:v1`,
  });
  const columns: IndiceTableColumnDefinition<Column>[] = (Object.keys(widths) as Column[]).filter((id) => lost || id !== 'lossReason').map((id) => ({
    id, label: labels[id], width: columnWidths[id], defaultWidth: widths[id],
    contentMinimumWidth: minimums[id], resizeLabel: `${t.resizeColumn} · ${labels[id]}`, sortable: true,
  }));
  return <IndiceTableShell pagination={pagination}>
    <IndiceOperationalTable minimumWidth={getIndiceTableMinimumWidth({ columns, actionsWidth })}>
      <caption className="sr-only">{t[kind]} · {t.table}</caption>
      <IndiceTableColGroup columns={columns} actionsWidth={actionsWidth} />
      <IndiceTableHeaderRow columns={columns} actions={{ label: t.actions, width: actionsWidth }} onResize={resizeColumn}
        tone="coral" sortState={sortState} onSort={(column) => { if (!busy) onSort(column); }} />
      <TableBody>
        {items.map((item) => {
          const stage = flow?.stages.find((value) => value.key === item.stageKey);
          const urgency = continuityUrgency(item, today);
          const recoveryLabel = item.recoveryStatus === 'recovered' ? t.reactivated : item.recoveryStatus === 'paused' ? t.paused : item.recoveryStatus === 'scheduled' ? t.scheduled : t.unscheduled;
          const status = urgency === 'done' ? (lost ? recoveryLabel : t.completed) : urgency === 'overdue' ? t.overdue : urgency === 'today' ? t.today : urgency === 'unscheduled' ? t.unscheduled : t.scheduled;
          const statusTone = lost && item.recoveryStatus === 'paused' ? tones.upcoming : tones[urgency];
          const stageColor = lost ? (item.recoveryStatus === 'recovered' ? 'GREEN' : item.recoveryStatus === 'scheduled' ? 'BLUE' : item.recoveryStatus === 'paused' ? 'SLATE' : 'YELLOW') : stage?.colorToken ?? 'SLATE';
          const label = `${t.edit} · ${item.reference}`;
          return <TableRow key={item.sourceId}>
            <TableCell className={cellClass}>
              <button type="button" disabled={busy} onClick={() => onOpen(item)} className={`${focusClass} min-h-11 w-full break-words font-medium text-slate-900 hover:text-[#b63b32] dark:text-white`}>
                {item.clientName || item.title}
              </button>
              {item.contactName && <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{item.contactName}</p>}
            </TableCell>
            <TableCell className={cellClass}><span className="break-words font-medium">{item.reference}</span>{lost && <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{item.title}</p>}</TableCell>
            <TableCell className={cellClass}>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-900">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: continuityColors[stageColor] }} />
                {lost ? recoveryLabel : stageLabel(item.stageKey, stage?.label ?? item.stageKey, flow?.id === 0, t)}
              </span>
            </TableCell>
            <TableCell className={`${cellClass} break-words`}>{item.ownerName || t.noOwner}</TableCell>
            {lost && <TableCell className={`${cellClass} break-words`}>{item.lossReason || '—'}</TableCell>}
            <TableCell className={cellClass}>
              <button type="button" aria-label={`${t.nextAction} · ${item.reference}`} disabled={busy} onClick={() => onOpen(item)} className={`${focusClass} min-h-11 w-full break-words hover:text-[#b63b32] dark:hover:text-red-300`}>
                <span className="block font-medium">{item.nextAction || t.noAction}</span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span>{lost && <>{t.recoveryDate}: </>}{item.nextActionDate ? formatContinuityDate(item.nextActionDate, locale) : t.noDate}</span></span>
              </button>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>{status}</span>
            </TableCell>
            <TableCell className={`${cellClass} text-right`}>
              <IndiceTableActionGroup>
                <OpportunityActionButton label={label} icon={<CalendarClock className="h-4 w-4" />} disabled={busy} onClick={() => onOpen(item)}
                  className={`${actionClass} border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#b63b32] hover:bg-[#FF6B5E]/20 dark:text-red-300`} />
                {item.phone && <OpportunityActionButton label={`${t.phone} · ${item.contactName || item.clientName}`} icon={<Phone className="h-4 w-4" />} href={getPhoneHref(item.phone)}
                  className={`${actionClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`} />}
                {item.email && <OpportunityActionButton label={`${t.email} · ${item.contactName || item.clientName}`} icon={<Mail className="h-4 w-4" />} href={`mailto:${item.email}`}
                  className={`${actionClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`} />}
              </IndiceTableActionGroup>
            </TableCell>
          </TableRow>;
        })}
        {!items.length && <TableRow><TableCell colSpan={columns.length + 1} className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">{t.empty}</TableCell></TableRow>}
      </TableBody>
    </IndiceOperationalTable>
  </IndiceTableShell>;
}
