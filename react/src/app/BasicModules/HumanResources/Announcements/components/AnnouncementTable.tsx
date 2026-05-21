import { type ReactNode } from 'react';
import { Calendar, Clock, Eye, Pencil, Trash2 } from 'lucide-react';
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
  const emptyColSpan = 2 + visibleColumns.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              <TableHeader>{copy.table.columns.announcement}</TableHeader>
              {canShow('type') ? <TableHeader>{copy.table.columns.type}</TableHeader> : null}
              {canShow('audience') ? <TableHeader>{copy.table.columns.audience}</TableHeader> : null}
              {canShow('publication') ? <TableHeader>{copy.table.columns.publication}</TableHeader> : null}
              {canShow('reads') ? <TableHeader>{copy.table.columns.reads}</TableHeader> : null}
              {canShow('status') ? <TableHeader>{copy.table.columns.status}</TableHeader> : null}
              {canShow('author') ? <TableHeader>{copy.table.columns.author}</TableHeader> : null}
              <TableHeader>{copy.table.columns.actions}</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.table.emptyState}
                </td>
              </tr>
            ) : (
              announcements.map((announcement) => {
                return (
                  <tr
                    key={announcement.id}
                    className="transition-colors odd:bg-slate-50/45 hover:bg-slate-50 dark:odd:bg-slate-900/20 dark:hover:bg-slate-700/35"
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
                    <td className="px-5 py-5 align-middle">
                      <div className="flex items-center gap-2">
                        <ActionButton title="Open" onClick={() => onOpen(announcement)}>
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        {canManage ? (
                          <>
                            <ActionButton title={copy.table.edit} onClick={() => onEdit(announcement)}>
                              <Pencil className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title={copy.table.delete} tone="danger" onClick={() => onDelete(announcement)}>
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
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

      <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>{copy.table.showing(announcements.length)}</span>
        <div className="flex items-center gap-3">
          <span>{copy.table.pageInfo}</span>
          <button className="rounded-lg px-2 py-1 text-slate-400" disabled>{copy.table.previous}</button>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">1</span>
          <button className="rounded-lg px-2 py-1 text-slate-400" disabled>{copy.table.next}</button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  tone = 'default',
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone?: 'default' | 'danger';
}) {
  const classes = tone === 'danger'
    ? 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
    : 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300';
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${classes}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}
