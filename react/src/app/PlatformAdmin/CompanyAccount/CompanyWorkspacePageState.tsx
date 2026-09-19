import { LoaderCircle, RefreshCw } from 'lucide-react';
import type { PlatformPagination } from '../../api/platformAdmin';
import { DataTablePagination } from '../../components/table/DataTablePagination';
import { useCustomerAccountCopy } from '../Customers/useCustomerAccountCopy';

export function CompanyWorkspacePageState({ loading, failed, reload }: { loading: boolean; failed: boolean; reload: () => void }) {
  const { t } = useCustomerAccountCopy();
  if (loading) return <div role="status" className="flex items-center gap-2 p-5 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{t('workspaceLoading')}</div>;
  if (!failed) return null;
  return <div role="alert" className="flex flex-wrap items-center gap-3 p-5 text-sm text-rose-700 dark:text-rose-300">
    <span>{t('workspaceLoadFailed')}</span>
    <button type="button" onClick={reload} className="inline-flex items-center gap-2 rounded-lg border border-current px-3 py-2"><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('workspaceReload')}</button>
  </div>;
}

export function CompanyWorkspacePagination({ pagination, setPage, setPageSize }: {
  pagination: PlatformPagination;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}) {
  return <DataTablePagination currentPage={pagination.page} totalPages={pagination.total_pages}
    totalCount={pagination.total_items} pageSize={pagination.page_size} pageSizeOptions={[10, 25, 50, 100]}
    pageStart={pagination.total_items ? (pagination.page - 1) * pagination.page_size + 1 : 0}
    pageEnd={Math.min(pagination.page * pagination.page_size, pagination.total_items)}
    onPageChange={setPage} onPageSizeChange={setPageSize} />;
}
