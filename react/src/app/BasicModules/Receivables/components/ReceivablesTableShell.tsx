import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '../../../components/ui/table';
import { DataTablePagination } from '../../../components/table/DataTablePagination';

interface ReceivablesTableShellProps {
  children: ReactNode;
  currentPage: number;
  emptyColSpan: number;
  emptyLabel: string;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
}

export function ReceivablesTableShell({
  children,
  currentPage,
  emptyColSpan,
  emptyLabel,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageSizeOptions,
  pageStart,
  totalCount,
  totalPages,
}: ReceivablesTableShellProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <Table className="min-w-[1120px]">
          {children}
          {totalCount === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={emptyColSpan}
                  className="px-6 py-16 text-center text-sm font-medium text-slate-500 dark:text-slate-300"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : null}
        </Table>
      </div>
      <DataTablePagination
        currentPage={currentPage}
        itemLabel={itemLabel}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageEnd={pageEnd}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        pageStart={pageStart}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </section>
  );
}
