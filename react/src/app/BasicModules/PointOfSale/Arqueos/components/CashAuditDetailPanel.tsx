import { useEffect, useState } from 'react';
import { CheckCircle, ClipboardCheck, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CashAuditRecord, CashAuditReviewStatus } from '../types/cashAudit.types';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface CashAuditDetailPanelProps {
  record: CashAuditRecord | null;
  onClose: () => void;
  onUpdateReview: (record: CashAuditRecord, auditStatus: CashAuditReviewStatus, auditNote: string) => void;
  formatCurrency: (amount: number) => string;
}

const statusLabels = {
  balanced: 'Balanceado',
  over: 'Sobrante',
  short: 'Faltante',
} as const;

const auditStatusLabels = {
  pending: 'Pendiente',
  in_review: 'En revision',
  resolved: 'Resuelto',
} as const;

export function CashAuditDetailPanel({
  record,
  onClose,
  onUpdateReview,
  formatCurrency,
}: CashAuditDetailPanelProps) {
  const [auditNote, setAuditNote] = useState('');

  useEffect(() => {
    setAuditNote(record?.auditNote ?? '');
  }, [record?.id, record?.auditNote]);

  if (!record) {
    return null;
  }

  const handleReviewAction = (auditStatus: CashAuditReviewStatus) => {
    onUpdateReview(record, auditStatus, auditNote.trim());
  };

  return (
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar detalle de arqueo"
      eyebrow="Arqueo POS"
      icon={<ClipboardCheck className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle={`${record.cashRegisterCode} - ${record.businessName} - ${record.responsibleUserName}`}
      title={record.id}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-orange-700 dark:text-orange-200">Estado de revision</p>
              <p className="mt-1 text-xl font-black text-gray-950 dark:text-white">
                {auditStatusLabels[record.auditStatus]}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                {record.requiresReview
                  ? 'Este cierre requiere validacion operativa antes de darlo por atendido.'
                  : 'Este cierre no tiene diferencias abiertas para seguimiento.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ReviewButton
                icon={ClipboardCheck}
                label="Tomar revision"
                onClick={() => handleReviewAction('in_review')}
                disabled={record.auditStatus === 'in_review'}
              />
              <ReviewButton
                icon={CheckCircle}
                label="Marcar resuelto"
                tone="success"
                onClick={() => handleReviewAction('resolved')}
                disabled={record.auditStatus === 'resolved'}
              />
              <ReviewButton
                icon={RotateCcw}
                label="Reabrir"
                tone="warning"
                onClick={() => handleReviewAction('pending')}
                disabled={record.auditStatus === 'pending'}
              />
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-black uppercase text-gray-500 dark:text-gray-400">Nota de supervisor</span>
            <textarea
              value={auditNote}
              onChange={(event) => setAuditNote(event.target.value)}
              rows={3}
              placeholder="Registra validacion, correccion solicitada o evidencia revisada."
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-orange-500/30 dark:bg-gray-900 dark:text-white"
            />
          </label>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Empresa" value={record.companyName} />
          <DetailItem label="Unidad" value={record.businessUnitName} />
          <DetailItem label="Sucursal" value={record.businessName} />
          <DetailItem label="Caja" value={`${record.cashRegisterCode} - ${record.cashRegisterName}`} />
          <DetailItem label="Abierto" value={formatFullDate(record.openedAt)} />
          <DetailItem label="Cerrado" value={formatFullDate(record.closedAt)} />
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <DetailRow label="Fondo inicial" expected={record.openingFund} counted={record.openingFund} formatCurrency={formatCurrency} />
          <DetailRow label="Efectivo" expected={record.cashExpected} counted={record.cashCounted} formatCurrency={formatCurrency} />
          <DetailRow label="Tarjeta" expected={record.cardExpected} counted={record.cardCounted} formatCurrency={formatCurrency} />
          <DetailRow label="Transferencia" expected={record.transferExpected} counted={record.transferCounted} formatCurrency={formatCurrency} />
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <SummaryItem label="Tickets" value={String(record.salesCount ?? 0)} />
          <SummaryItem label="Ventas" value={formatCurrency(record.totalSales)} />
          <SummaryItem label="Subtotal" value={formatCurrency(record.subtotalSales ?? Math.max(record.totalSales - (record.taxSales ?? 0), 0))} />
          <SummaryItem label="Impuesto" value={formatCurrency(record.taxSales ?? 0)} />
          <SummaryItem label="Esperado" value={formatCurrency(record.expectedTotal)} />
          <SummaryItem label="Contado" value={formatCurrency(record.countedTotal)} />
          <SummaryItem
            label={statusLabels[record.status]}
            value={`${record.difference > 0 ? '+' : ''}${formatCurrency(record.difference)}`}
            tone={record.status}
          />
        </section>

        {record.notes ? (
          <section className="rounded-lg bg-white p-4 dark:bg-gray-900">
            <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Notas</p>
            <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{record.notes}</p>
          </section>
        ) : null}
      </div>
    </PosModalFrame>
  );
}

function ReviewButton({
  disabled,
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const toneClasses = {
    neutral: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-gray-900">
      <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-gray-950 dark:text-white">{value}</p>
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
      <span className="font-black text-gray-700 dark:text-gray-200">{label}</span>
      <span className="text-right font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(expected)}</span>
      <span className="text-right font-black text-gray-950 dark:text-white">{formatCurrency(counted)}</span>
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
      <p className="text-xs font-black uppercase opacity-80">{label}</p>
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
