import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  Download,
  Eye,
  Eye as EyeIcon,
  GraduationCap,
  Pencil,
} from 'lucide-react';
import type { EmployeeRecord, RecordSeverity, RecordStatus, RecordType } from '../types/records.types';

interface RecordsListProps {
  records: EmployeeRecord[];
  onRecordClick: (record: EmployeeRecord) => void;
  onEdit: (record: EmployeeRecord) => void;
  onDownload: (record: EmployeeRecord) => void;
}

type SortField = 'id' | 'employee' | 'reportedBy' | 'unit' | 'business' | 'type' | 'severity' | 'date';
type SortDirection = 'asc' | 'desc' | null;

const typeConfig: Record<RecordType, { label: string; color: string; bgColor: string; icon: ReactNode }> = {
  incident: {
    label: 'Incident',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  warning: {
    label: 'Warning',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  recognition: {
    label: 'Recognition',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: <Award className="h-3.5 w-3.5" />,
  },
  observation: {
    label: 'Observation',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <EyeIcon className="h-3.5 w-3.5" />,
  },
  training: {
    label: 'Training',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: <GraduationCap className="h-3.5 w-3.5" />,
  },
};

const severityConfig: Record<RecordSeverity, { label: string; color: string; bgColor: string }> = {
  low: {
    label: 'Low',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  },
  high: {
    label: 'High',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
};

const severityOrder: Record<RecordSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

export function RecordsList({ records, onRecordClick, onEdit, onDownload }: RecordsListProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
          aValue = a.employee.name.toLowerCase();
          bValue = b.employee.name.toLowerCase();
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />;
  };

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <tr>
              {[
                ['id', 'ID'],
                ['employee', 'Employee'],
                ['reportedBy', 'Reported By'],
                ['unit', 'Unit'],
                ['business', 'Business'],
                ['type', 'Type'],
                ['severity', 'Severity'],
                ['date', 'Date'],
              ].map(([field, label]) => (
                <th key={field} className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort(field as SortField)}
                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {label}
                    {getSortIcon(field as SortField)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Actions
              </th>
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
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {record.recordNumber || `#${record.id}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{record.employee.name}</div>
                      <div className="text-gray-500 dark:text-gray-400">{record.employee.position}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">
                    {record.reportedBy.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">{record.unit}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-white">{record.business}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                      {typeInfo.icon}
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {severityInfo ? (
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${severityInfo.bgColor} ${severityInfo.color}`}>
                        {severityInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(record.eventDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRecordClick(record);
                        }}
                        className="rounded p-1.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(record);
                        }}
                        className="rounded p-1.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDownload(record);
                        }}
                        className="rounded p-1.5 text-gray-600 transition-colors hover:bg-green-50 hover:text-green-600 dark:text-gray-400 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
