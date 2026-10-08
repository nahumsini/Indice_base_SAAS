import { useCallback, useMemo, useState } from 'react';
import { IndiceOperationalTable, IndiceTableColGroup, IndiceTableHeaderRow, IndiceTableShell, type IndiceTableColumnDefinition } from '../../../components/table/IndiceTableEngine';
import { TableBody, TableCell, TableRow } from '../../../components/ui/table';
import { IndiceViewState } from '../../../components/frontend-os/IndiceViewState';
import { ActionButton } from './SchedulingPrimitives';
import type { SchedulingCopy } from '../translations/schedulingCopy';

export function ConfigurationTable({ rows, copy, onEdit }: { rows: { id: number; title: string; detail: string; active: boolean }[]; copy: SchedulingCopy; onEdit: (id: number) => void }) {
  const [widths, setWidths] = useState({ name: 380, detail: 320, status: 160 });
  const resize = useCallback((id: keyof typeof widths, width: number) => setWidths(previous => ({ ...previous, [id]: width })), []);
  const columns = useMemo(() => (['name', 'detail', 'status'] as const).map(id => ({ id, label: { name: copy.name, detail: copy.details, status: copy.status }[id],
    width: widths[id], defaultWidth: { name: 380, detail: 320, status: 160 }[id], contentMinimumWidth: 140, resizeLabel: copy.edit } satisfies IndiceTableColumnDefinition<typeof id>)), [copy, widths]);
  if (!rows.length) return <IndiceViewState variant="empty" compact tone="coral" title={copy.empty} description={copy.setupHint} />;
  return <IndiceTableShell><IndiceOperationalTable minimumWidth={columns.reduce((sum, c) => sum + c.width, 140)}>
    <IndiceTableColGroup columns={columns} actionsWidth={140} />
    <IndiceTableHeaderRow columns={columns} onResize={resize} tone="coral" actions={{ label: copy.actions, width: 140 }} />
    <TableBody>{rows.map(row =>
      <TableRow key={row.id}><TableCell className="px-5 py-4"><span className="block truncate font-medium" title={row.title}>{row.title}</span></TableCell>
        <TableCell className="px-5 py-4"><span className="block truncate text-sm text-slate-500 dark:text-slate-300" title={row.detail}>{row.detail}</span></TableCell>
        <TableCell className="px-5 py-4 text-sm">{row.active ? copy.active : '—'}</TableCell><TableCell className="px-5 py-4 text-right"><ActionButton onClick={() => onEdit(row.id)} aria-label={`${copy.edit}: ${row.title}`}>{copy.edit}</ActionButton></TableCell></TableRow>)}</TableBody>
  </IndiceOperationalTable></IndiceTableShell>;
}
