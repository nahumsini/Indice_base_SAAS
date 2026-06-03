import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  StandardActionButton,
  StandardPaginationFooter,
  StandardSortIcon,
  type StandardSortDirection,
} from '../../shared/StandardTableControls';
import type { AnnouncementView } from '../announcementTypes';
import type { AnnouncementTableCopy } from '../translations';

interface AnnouncementTableProps {
  announcements: AnnouncementView[];
  copy: AnnouncementTableCopy;
  getAudienceLabel: (announcement: AnnouncementView) => string;
  getStatusClasses: (status: AnnouncementView['status']) => string;
  getTypeClasses: (type: AnnouncementView['type']) => string;
  visibleColumns: string[];
  canManage?: boolean;
  onDelete: (announcement: AnnouncementView) => void;
  onEdit: (announcement: AnnouncementView) => void;
  onOpen: (announcement: AnnouncementView) => void;
}

type AnnouncementSortField =
  | 'announcement'
  | 'type'
  | 'audience'
  | 'publication'
  | 'reads'
  | 'status'
  | 'author';

interface AnnouncementColumn {
  id: string;
  label: string;
  sortField?: AnnouncementSortField;
}

const defaultPageSize = 10;

export function AnnouncementTable({
  announcements,
  copy,
  getAudienceLabel,
  getStatusClasses,
  getTypeClasses,
  visibleColumns,
  canManage = false,
  onDelete,
  onEdit,
  onOpen,
}: AnnouncementTableProps) {
  const canShow = (columnId: string) => visibleColumns.includes(columnId);
  const [sortField, setSortField] = useState<AnnouncementSortField>('publication');
  const [sortDirection, setSortDirection] = useState<StandardSortDirection>('desc');
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const tableColumns = useMemo<AnnouncementColumn[]>(
    () => [
      { id: 'announcement', label: copy.table.columns.announcement, sortField: 'announcement' },
      ...(canShow('type') ? [{ id: 'type', label: copy.table.columns.type, sortField: 'type' as const }] : []),
      ...(canShow('audience') ? [{ id: 'audience', label: copy.table.columns.audience, sortField: 'audience' as const }] : []),
      ...(canShow('publication') ? [{ id: 'publication', label: copy.table.columns.publication, sortField: 'publication' as const }] : []),
      ...(canShow('reads') ? [{ id: 'reads', label: copy.table.columns.reads, sortField: 'reads' as const }] : []),
      ...(canShow('status') ? [{ id: 'status', label: copy.table.columns.status, sortField: 'status' as const }] : []),
      ...(canShow('author') ? [{ id: 'author', label: copy.table.columns.author, sortField: 'author' as const }] : []),
      { id: 'actions', label: copy.table.columns.actions },
    ],
    [copy, visibleColumns],
  );

  const handleSort = (field: AnnouncementSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const sortedAnnouncements = useMemo(() => {
    const getValue = (announcement: AnnouncementView) => {
      switch (sortField) {
        case 'announcement':
          return announcement.title.toLowerCase();
        case 'type':
          return copy.typeLabels[announcement.type].toLowerCase();
        case 'audience':
          return getAudienceLabel(announcement).toLowerCase();
        case 'publication':
          return `${announcement.publicationDate} ${announcement.publicationTime ?? ''}`.trim();
        case 'reads':
          return announcement.readSummary.toLowerCase();
        case 'status':
          return copy.statusLabels[announcement.status].toLowerCase();
        case 'author':
          return announcement.authorName.toLowerCase();
      }
    };

    return [...announcements].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);
      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [announcements, copy.statusLabels, copy.typeLabels, getAudienceLabel, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedAnnouncements.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedAnnouncements = sortedAnnouncements.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedAnnouncements.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedAnnouncements.length === 0 ? 0 : Math.min(pageEndIndex, sortedAnnouncements.length);
  const emptyColSpan = tableColumns.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [announcements, pageSize, visibleColumns]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {tableColumns.map((column) => (
                <TableHeader
                  key={column.id}
                  align={column.id === 'actions' ? 'right' : 'left'}
                  onSort={column.sortField ? () => handleSort(column.sortField!) : undefined}
                  sortActive={sortField === column.sortField}
                  sortDirection={sortDirection}
                >
                  {column.label}
                </TableHeader>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAnnouncements.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.table.emptyState}
                </td>
              </tr>
            ) : (
              paginatedAnnouncements.map((announcement) => {
                return (
                  <tr
                    key={announcement.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/35"
                  >
                    <td className="min-w-[320px] px-5 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[#59C3A5] dark:bg-slate-700 dark:text-blue-200">
                          {announcement.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {announcement.title}
                          </p>
                          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {announcement.preview || copy.table.noPreview}
                          </p>
                        </div>
                      </div>
                    </td>
                    {canShow('type') ? (
                      <td className="px-5 py-5 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTypeClasses(announcement.type)}`}>
                          {copy.typeLabels[announcement.type]}
                        </span>
                      </td>
                    ) : null}
                    {canShow('audience') ? (
                      <td className="min-w-[190px] px-5 py-5 align-middle text-sm text-slate-600 dark:text-slate-300">
                        {getAudienceLabel(announcement)}
                      </td>
                    ) : null}
                    {canShow('publication') ? (
                      <td className="min-w-[170px] px-5 py-5 align-middle text-sm text-slate-600 dark:text-slate-300">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {announcement.publicationDate}
                          </p>
                          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {announcement.publicationTime || copy.table.noTime}
                          </p>
                        </div>
                      </td>
                    ) : null}
                    {canShow('reads') ? (
                      <td className="px-5 py-5 align-middle text-sm text-slate-600 dark:text-slate-300">
                        {announcement.readSummary}
                      </td>
                    ) : null}
                    {canShow('status') ? (
                      <td className="px-5 py-5 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(announcement.status)}`}>
                          {copy.statusLabels[announcement.status]}
                        </span>
                      </td>
                    ) : null}
                    {canShow('author') ? (
                      <td className="min-w-[140px] px-5 py-5 align-middle text-sm text-slate-600 dark:text-slate-300">
                        {announcement.authorName}
                      </td>
                    ) : null}
                    <td className="px-5 py-5 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <StandardActionButton label={copy.feedback.openDetails} onClick={() => onOpen(announcement)}>
                          <Eye className="h-4 w-4" />
                        </StandardActionButton>
                        {canManage ? (
                          <>
                            <StandardActionButton label={copy.table.edit} onClick={() => onEdit(announcement)}>
                              <Pencil className="h-4 w-4" />
                            </StandardActionButton>
                            <StandardActionButton label={copy.table.delete} tone="danger" onClick={() => onDelete(announcement)}>
                              <Trash2 className="h-4 w-4" />
                            </StandardActionButton>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <StandardPaginationFooter
        currentPage={safeCurrentPage}
        labels={{
          showing: () => copy.table.showing(sortedAnnouncements.length),
          page: (current, total) => (total === 1 ? copy.table.pageInfo : `${current} / ${total}`),
          previous: copy.table.previous,
          next: copy.table.next,
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setCurrentPage(1);
        }}
        pageEnd={paginationEnd}
        pageSize={pageSize}
        pageStart={paginationStart}
        totalCount={sortedAnnouncements.length}
        totalPages={totalPages}
      />
    </div>
  );
}

function TableHeader({
  align = 'left',
  children,
  onSort,
  sortActive = false,
  sortDirection = null,
}: {
  align?: 'left' | 'right';
  children: ReactNode;
  onSort?: () => void;
  sortActive?: boolean;
  sortDirection?: StandardSortDirection;
}) {
  const headerAlignClass = align === 'right' ? 'text-right' : 'text-left';
  const buttonAlignClass = align === 'right' ? 'text-right' : 'text-left';

  if (onSort) {
    return (
      <th className={`px-5 py-4 ${headerAlignClass}`}>
        <button
          type="button"
          onClick={onSort}
          className={`inline-flex items-center gap-2 ${buttonAlignClass} text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`}
        >
          <span>{children}</span>
          <StandardSortIcon active={sortActive} direction={sortDirection} />
        </button>
      </th>
    );
  }

  return (
    <th className={`px-5 py-4 ${headerAlignClass} text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400`}>
      {children}
    </th>
  );
}
