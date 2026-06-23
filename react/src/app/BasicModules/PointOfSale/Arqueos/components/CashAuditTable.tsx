import { Eye } from 'lucide-react';
import type { CashAuditRecord } from '../types/cashAudit.types';

interface CashAuditTableProps {
  records: CashAuditRecord[];
  selectedRecordId?: string;
  onSelectRecord: (record: CashAuditRecord) => void;
  formatCurrency: (amount: number) => string;
  isLoading?: boolean;
}

const statusLabels = {
  balanced: 'Balanceado',
  over: 'Sobrante',
  short: 'Faltante',
} as const;

const statusClasses = {
  balanced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  over: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  short: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
} as const;

const auditStatusLabels = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  resolved: 'Resuelto',
} as const;

const auditStatusClasses = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
} as const;

export function CashAuditTable({
  records,
  selectedRecordId,
  onSelectRecord,
  formatCurrency,
  isLoading = false,
}: CashAuditTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-black text-gray-950 dark:text-white">Bandeja de revisión</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isLoading ? 'Cargando registros reales' : `${records.length} cierres encontrados`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1420px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              {[
                'Cierre',
                'Fecha',
                'Caja',
                'Unidad',
                'Sucursal',
                'Usuario',
                'Fondo',
                'Total venta',
                'Esperado',
                'Contado',
                'Diferencia',
                'Estatus',
                'Revisión',
                '',
              ].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && records.length === 0 && Array.from({ length: 4 }, (_, index) => (
              <tr key={`skeleton-${index}`}>
                {Array.from({ length: 14 }, (_, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                  </td>
                ))}
              </tr>
            ))}

            {records.map((record) => (
              <tr
                key={record.id}
                className={`transition hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                  selectedRecordId === record.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                }`}
              >
                <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{record.id}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDateTime(record.closedAt)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <span className="font-bold">{record.cashRegisterCode}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{record.cashRegisterName}</span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{record.businessUnitName}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{record.businessName}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{record.responsibleUserName}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(record.openingFund)}</td>
                <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{formatCurrency(record.totalSales)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(record.expectedTotal)}</td>
                <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{formatCurrency(record.countedTotal)}</td>
                <td className={`px-4 py-3 font-black ${record.difference < 0 ? 'text-red-600' : record.difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {record.difference > 0 ? '+' : ''}{formatCurrency(record.difference)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClasses[record.status]}`}>
                    {statusLabels[record.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${auditStatusClasses[record.auditStatus]}`}>
                    {auditStatusLabels[record.auditStatus]}
                  </span>
                  {record.auditNote && (
                    <span className="mt-1 block max-w-[170px] truncate text-xs text-gray-500 dark:text-gray-400">
                      {record.auditNote}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelectRecord(record)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label={`Revisar ${record.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && records.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-200">No hay arqueos por revisar</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajusta enfoque, periodo, estatus o búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
