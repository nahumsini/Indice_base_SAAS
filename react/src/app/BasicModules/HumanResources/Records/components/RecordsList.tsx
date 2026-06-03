import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Download,
  Eye,
  Eye as EyeIcon,
  GraduationCap,
  Pencil,
} from 'lucide-react';
import {
  StandardActionButton,
  StandardSortIcon,
  type StandardSortDirection,
} from '../../shared/StandardTableControls';
import type { EmployeeRecord, RecordSeverity, RecordType } from '../types/records.types';
import type { RecordsListCopy } from '../translations';

interface RecordsListProps {
  copy: RecordsListCopy;
  locale: string;
  records: EmployeeRecord[];
  visibleColumns: RecordColumnId[];
  onRecordClick: (record: EmployeeRecord) => void;
  onEdit: (record: EmployeeRecord) => void;
  onDownload: (record: EmployeeRecord) => void;
}

type SortField = 'id' | 'employee' | 'reportedBy' | 'unit' | 'business' | 'type' | 'severity' | 'date';
export type RecordColumnId = SortField | 'actions';

const typeConfig: Record<RecordType, { color: string; bgColor: string; icon: ReactNode }> = {
  incident: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  warning: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  recognition: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: <Award className="h-3.5 w-3.5" />,
  },
  observation: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <EyeIcon className="h-3.5 w-3.5" />,
  },
  training: {
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: <GraduationCap className="h-3.5 w-3.5" />,
  },
};

const severityConfig: Record<RecordSeverity, { color: string; bgColor: string }> = {
  low: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  medium: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  },
  high: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
};

const severityOrder: Record<RecordSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const formatDate = (value: string, locale: string) => new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

export function RecordsList({ copy, locale, records, visibleColumns, onRecordClick, onEdit, onDownload }: RecordsListProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<StandardSortDirection>(null);
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const recordColumns = useMemo<Array<{ id: RecordColumnId; label: string; sortable?: boolean }>>(
    () => [
      { id: 'id', label: copy.columns.id, sortable: true },
      { id: 'employee', label: copy.columns.employee, sortable: true },
      { id: 'reportedBy', label: copy.columns.reportedBy, sortable: true },
      { id: 'unit', label: copy.columns.unit, sortable: true },
      { id: 'business', label: copy.columns.business, sortable: true },
      { id: 'type', label: copy.columns.type, sortable: true },
      { id: 'severity', label: copy.columns.severity, sortable: true },
      { id: 'date', label: copy.columns.date, sortable: true },
      { id: 'actions', label: copy.columns.actions },
    ],
    [copy],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const sortedRecords = useMemo(() => {
    if (!sortField || !sortDirection) {
      return records;
    }

    return [...records].sort((a, b) => {
      let aValue: number | string = '';
      let bValue: number | string = '';

      switch (sortField) {
        case 'id':
          aValue = Number(a.id);
          bValue = Number(b.id);
          break;
        case 'employee':
          aValue = a.user.name.toLowerCase();
          bValue = b.user.name.toLowerCase();
          break;
        case 'reportedBy':
          aValue = a.reportedBy.name.toLowerCase();
          bValue = b.reportedBy.name.toLowerCase();
          break;
        case 'unit':
          aValue = a.unit.toLowerCase();
          bValue = b.unit.toLowerCase();
          break;
        case 'business':
          aValue = a.business.toLowerCase();
          bValue = b.business.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'severity':
          aValue = a.severity ? severityOrder[a.severity] : 0;
          bValue = b.severity ? severityOrder[b.severity] : 0;
          break;
        case 'date':
          aValue = new Date(a.eventDate).getTime();
          bValue = new Date(b.eventDate).getTime();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortDirection, sortField]);

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-gray-500 dark:text-gray-400">{copy.list.empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {recordColumns
                .filter((column) => column.id !== 'actions' && visibleColumnSet.has(column.id))
                .map((column) => (
                <th key={column.id} className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort(column.id as SortField)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {column.label}
                    <StandardSortIcon active={sortField === column.id} direction={sortDirection} />
                  </button>
                </th>
              ))}
              {visibleColumnSet.has('actions') ? (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
                  {copy.columns.actions}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedRecords.map((record) => {
              const typeInfo = typeConfig[record.type];
              const severityInfo = record.severity ? severityConfig[record.severity] : null;

              return (
                <tr
                  key={record.id}
                  onClick={() => onRecordClick(record)}
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  {visibleColumnSet.has('id') ? (
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {record.recordNumber || copy.list.recordFallback(record.id)}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('employee') ? (
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 dark:text-white">{record.user.name}</div>
                        <div className="text-gray-500 dark:text-gray-400">{record.user.position || copy.list.noPosition}</div>
                      </div>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('reportedBy') ? (
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">
                      {record.reportedBy.name}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('unit') ? (
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">{record.unit || copy.list.emptyValue}</td>
                  ) : null}
                  {visibleColumnSet.has('business') ? (
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">{record.business || copy.list.emptyValue}</td>
                  ) : null}
                  {visibleColumnSet.has('type') ? (
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                        {typeInfo.icon}
                        {copy.types[record.type]}
                      </span>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('severity') ? (
                    <td className="whitespace-nowrap px-4 py-4">
                      {severityInfo ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${severityInfo.bgColor} ${severityInfo.color}`}>
                          {copy.severity[record.severity!]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600">{copy.list.emptyValue}</span>
                      )}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('date') ? (
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(record.eventDate, locale)}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('actions') ? (
                    <td
                      className="whitespace-nowrap px-4 py-4 text-right text-sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <StandardActionButton
                          label={copy.actions.view}
                          onClick={() => onRecordClick(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </StandardActionButton>
                        <StandardActionButton
                          label={copy.actions.edit}
                          onClick={() => onEdit(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </StandardActionButton>
                        <StandardActionButton
                          label={copy.actions.downloadPdf}
                          onClick={() => onDownload(record)}
                          tone="success"
                        >
                          <Download className="h-4 w-4" />
                        </StandardActionButton>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
