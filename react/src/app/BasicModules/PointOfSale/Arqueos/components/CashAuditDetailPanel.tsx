import { X } from 'lucide-react';
import type { CashAuditRecord } from '../types/cashAudit.types';

interface CashAuditDetailPanelProps {
  record: CashAuditRecord | null;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const statusLabels = {
  balanced: 'Balanceado',
  over: 'Sobrante',
  short: 'Faltante',
} as const;

export function CashAuditDetailPanel({
  record,
  onClose,
  formatCurrency,
}: CashAuditDetailPanelProps) {
  if (!record) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-gray-950 dark:text-white">{record.id}</h3>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {record.cashRegisterCode} · {record.businessName} · {record.responsibleUserName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Cerrar detalle de arqueo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-74px)] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Empresa" value={record.companyName} />
            <DetailItem label="Unidad" value={record.businessUnitName} />
            <DetailItem label="Sucursal" value={record.businessName} />
            <DetailItem label="Caja" value={`${record.cashRegisterCode} · ${record.cashRegisterName}`} />
            <DetailItem label="Abierto" value={formatFullDate(record.openedAt)} />
            <DetailItem label="Cerrado" value={formatFullDate(record.closedAt)} />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <DetailRow label="Fondo inicial" expected={record.openingFund} counted={record.openingFund} formatCurrency={formatCurrency} />
            <DetailRow label="Efectivo" expected={record.cashExpected} counted={record.cashCounted} formatCurrency={formatCurrency} />
            <DetailRow label="Tarjeta" expected={record.cardExpected} counted={record.cardCounted} formatCurrency={formatCurrency} />
            <DetailRow label="Transferencia" expected={record.transferExpected} counted={record.transferCounted} formatCurrency={formatCurrency} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryItem label="Ventas" value={formatCurrency(record.totalSales)} />
            <SummaryItem label="Esperado" value={formatCurrency(record.expectedTotal)} />
            <SummaryItem label="Contado" value={formatCurrency(record.countedTotal)} />
            <SummaryItem
              label={statusLabels[record.status]}
              value={`${record.difference > 0 ? '+' : ''}${formatCurrency(record.difference)}`}
              tone={record.status}
            />
          </div>

          {record.notes && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Notas</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{record.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  expected,
  counted,
  formatCurrency,
}: {
  label: string;
  expected: number;
  counted: number;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 dark:border-gray-700">
      <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
      <span className="text-right text-gray-600 dark:text-gray-300">{formatCurrency(expected)}</span>
      <span className="text-right font-bold text-gray-950 dark:text-white">{formatCurrency(counted)}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone = 'balanced',
}: {
  label: string;
  value: string;
  tone?: CashAuditRecord['status'];
}) {
  const toneClasses = {
    balanced: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    over: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    short: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  }[tone];

  return (
    <div className={`rounded-lg p-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase opacity-80">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function formatFullDate(date: Date) {
  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
