import type { SaleRow, Workspace } from './boardModel';

export const boardExportLimit = 10_000;
/** Export the complete filtered result, never silently truncate it to the visible page. */
export async function collectBoardExport(
  fetchPage: (page: number, pageSize: number) => Promise<Workspace>,
  expectedTotal: number,
  signal: AbortSignal,
): Promise<SaleRow[]> {
  if (expectedTotal > boardExportLimit) throw new Error('export_limit');
  const rows: SaleRow[] = [];
  const seen = new Set<number>();
  for (let page = 1; rows.length < expectedTotal; page++) {
    signal.throwIfAborted();
    const result = await fetchPage(page, 200);
    signal.throwIfAborted();
    if (result.total !== expectedTotal || result.page !== page || result.items.length === 0) throw new Error('export_changed');
    for (const row of result.items) {
      if (seen.has(row.sale.id) || rows.length >= expectedTotal) throw new Error('export_changed');
      seen.add(row.sale.id);
      rows.push(row);
    }
  }
  return rows;
}
export function boardCsv(rows: (string | number | null)[][]) {
  const cell = (value: string | number | null) => {
    let text = String(value ?? '');
    // Quoting alone does not stop spreadsheet formula evaluation in customer-provided names.
    if (typeof value === 'string' && (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
