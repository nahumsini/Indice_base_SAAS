import { useMemo, useState } from 'react';
import {
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../../components/ui/table';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import type { SalesKpiSellerRankingRow } from '../salesKpiSelectors';
import type { SalesKpisTranslations } from '../translations';

type SellerRankingColumnId = 'rank' | 'seller' | 'sales' | 'pipeline' | 'quotes' | 'closed' | 'conversion';
type SellerRankingSortState = { columnId: SellerRankingColumnId; direction: 'asc' | 'desc' };

const sellerRankingColumnWidths: Record<SellerRankingColumnId, number> = {
  rank: 105,
  seller: 220,
  sales: 170,
  pipeline: 170,
  quotes: 130,
  closed: 130,
  conversion: 155,
};

const sellerRankingMinimumWidths: Record<SellerRankingColumnId, number> = {
  rank: 90,
  seller: 170,
  sales: 145,
  pipeline: 145,
  quotes: 115,
  closed: 115,
  conversion: 135,
};

const sellerRankingColumnIds = Object.keys(sellerRankingColumnWidths) as SellerRankingColumnId[];
const sellerRankingCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

function percent(value: number) {
  return `${Math.round(value)}%`;
}

export function SalesSellerRanking({
  copy,
  rows,
  sellerMoney,
}: {
  copy: SalesKpisTranslations;
  rows: SalesKpiSellerRankingRow[];
  sellerMoney: Map<string, { pipeline: string; pipelineValue: number; sales: string; salesValue: number }>;
}) {
  const [sortState, setSortState] = useState<SellerRankingSortState>({ columnId: 'rank', direction: 'asc' });
  const columnLabels = useMemo<Record<SellerRankingColumnId, string>>(() => ({
    rank: copy.sellerTable.columns.rank,
    seller: copy.sellerTable.columns.seller,
    sales: copy.sellerTable.columns.sales,
    pipeline: copy.sellerTable.columns.pipeline,
    quotes: copy.sellerTable.columns.quotes,
    closed: copy.sellerTable.columns.closed,
    conversion: copy.sellerTable.columns.conversion,
  }), [copy.sellerTable.columns]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<SellerRankingColumnId>({
    defaults: sellerRankingColumnWidths,
    headerLabels: columnLabels,
    minWidths: sellerRankingMinimumWidths,
    sortableColumnIds: sellerRankingColumnIds,
    storageKey: 'sales-kpi-seller-ranking-column-widths-v2',
  });
  const originalRanks = useMemo(() => new Map(rows.map((row, index) => [row.seller, index + 1])), [rows]);
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const valueFor = (row: SalesKpiSellerRankingRow, columnId: SellerRankingColumnId): string | number => {
      switch (columnId) {
        case 'rank': return originalRanks.get(row.seller) ?? 0;
        case 'seller': return row.seller;
        case 'sales': return sellerMoney.get(row.seller)?.salesValue ?? row.sales;
        case 'pipeline': return sellerMoney.get(row.seller)?.pipelineValue ?? row.pipeline;
        case 'quotes': return row.quotes;
        case 'closed': return row.closed;
        case 'conversion': return row.conversion;
        default: return '';
      }
    };
    const leftValue = valueFor(left, sortState.columnId);
    const rightValue = valueFor(right, sortState.columnId);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : sellerRankingCollator.compare(String(leftValue), String(rightValue));
    const directedComparison = sortState.direction === 'asc' ? comparison : -comparison;
    return directedComparison || sellerRankingCollator.compare(left.seller, right.seller);
  }), [originalRanks, rows, sellerMoney, sortState]);
  const tableMinimumWidth = sellerRankingColumnIds.reduce((total, columnId) => total + columnWidths[columnId], 0);

  const handleSort = (columnId: SellerRankingColumnId) => {
    setSortState((current) => current.columnId === columnId
      ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { columnId, direction: 'asc' });
  };
  const tableColumns: Array<IndiceTableColumnDefinition<SellerRankingColumnId>> = sellerRankingColumnIds.map((columnId) => ({
    id: columnId,
    label: columnLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: sellerRankingColumnWidths[columnId],
    contentMinimumWidth: sellerRankingMinimumWidths[columnId],
    alignment: columnId === 'seller' ? 'left' : 'right',
    sortable: true,
    resizeLabel: `${columnLabels[columnId]}: ajustar ancho`,
  }));

  return (
    <IndiceTableShell>
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.sellerTable.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.sellerTable.subtitle}</p>
      </div>

      <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
        <IndiceTableColGroup columns={tableColumns} />
        <IndiceTableHeaderRow
          columns={tableColumns}
          onResize={resizeColumn}
          onSort={handleSort}
          sortState={sortState}
        />
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.seller} className="border-slate-100 dark:border-slate-700">
              <TableCell className="px-5 py-4 text-right font-medium text-slate-950 dark:text-white">#{originalRanks.get(row.seller)}</TableCell>
              <TableCell className="whitespace-normal px-5 py-4 font-medium text-slate-950 dark:text-white">{row.seller}</TableCell>
              <TableCell className="px-5 py-4 text-right font-medium text-slate-900 dark:text-slate-100">{sellerMoney.get(row.seller)?.sales}</TableCell>
              <TableCell className="px-5 py-4 text-right text-slate-700 dark:text-slate-200">{sellerMoney.get(row.seller)?.pipeline}</TableCell>
              <TableCell className="px-5 py-4 text-right text-slate-700 dark:text-slate-200">{row.quotes}</TableCell>
              <TableCell className="px-5 py-4 text-right text-slate-700 dark:text-slate-200">{row.closed}</TableCell>
              <TableCell className="px-5 py-4 text-right font-medium text-slate-900 dark:text-white">{percent(row.conversion)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
