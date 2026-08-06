import {
  ArrowDownToLine,
  Banknote,
  CalendarRange,
  CheckCircle2,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { IndiceModalFrame, IndiceModalSummary } from '../../../../components/indice-modal';
import type { PettyCashTranslations } from '../../translations';
import type { PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../../types/pettyCash.types';
import { formatPettyCashCurrency, formatPettyCashIsoDate } from '../../utils/pettyCash.utils';

interface PettyCashStatementDetailModalProps {
  copy: PettyCashTranslations;
  movements: PettyCashMovement[];
  onClose: () => void;
  originText: string;
  receipts: PettyCashSettlementLine[];
  statement: PettyCashStatement | null;
}

export function PettyCashStatementDetailModal({
  copy,
  movements,
  onClose,
  originText,
  receipts,
  statement,
}: PettyCashStatementDetailModalProps) {
  if (!statement) return null;

  const metrics = [
    { id: 'opening', label: copy.statementsHistory.metrics.opening, value: formatPettyCashCurrency(statement.openingBalanceAmount, statement.currencyCode) },
    { id: 'funded', label: copy.statementsHistory.metrics.funded, value: formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode) },
    { emphasized: true, id: 'approved', label: copy.statementsHistory.metrics.approved, value: formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode) },
    { id: 'closing', label: copy.statementsHistory.metrics.closing, value: formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode) },
  ];

  return (
    <IndiceModalFrame
      bodyClassName="p-4 sm:p-5"
      closeLabel={copy.common.close}
      contentClassName="sm:max-w-6xl"
      description={`${statement.folio} · ${copy.statementsHistory.detail.description}`}
      footer={(
        <button className="h-10 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] shadow-sm transition hover:bg-emerald-50" onClick={onClose} type="button">
          {copy.statementsHistory.detail.close}
        </button>
      )}
      footerSummary={statement.folio}
      icon={<CalendarRange className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => !open && onClose()}
      open
      title={copy.statementsHistory.detail.title}
      tone="green"
    >
      <IndiceModalSummary columns={4} items={metrics} variant="plain" />

      <section className="mt-3 rounded-xl border border-[#147514]/20 bg-[#147514]/5 p-3 dark:bg-emerald-500/10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#147514] dark:bg-slate-900 dark:text-emerald-300"><ArrowDownToLine className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.statementsHistory.detail.origin}</p>
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200 sm:text-sm">{originText}</p>
          </div>
        </div>
        <dl className="mt-3 grid gap-3 border-t border-[#147514]/10 pt-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.statementsHistory.table.period}</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatPettyCashIsoDate(statement.periodStart)} – {formatPettyCashIsoDate(statement.periodEnd)}</dd></div>
          <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.statementsHistory.table.fund}</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">{statement.responsibleName}</dd></div>
          <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.statementsHistory.table.status}</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">{copy.status.statement[statement.status]}</dd></div>
        </dl>
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <StatementActivityPanel
              count={movements.length}
              icon={<Banknote className="h-4 w-4" />}
              title={copy.statementsHistory.detail.movements}
            >
              {movements.length ? movements.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-800 dark:text-white sm:text-sm">{copy.status.movement[item.type]}</p><p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{formatPettyCashIsoDate(item.movementDate)}</p></div>
                  <strong className="shrink-0 text-xs font-medium tabular-nums text-sky-600 dark:text-sky-300 sm:text-sm">+{formatPettyCashCurrency(item.amount, item.currencyCode)}</strong>
                </div>
              )) : <ModalEmptyState label={copy.statementsHistory.detail.movements} />}
            </StatementActivityPanel>

            <StatementActivityPanel
              count={receipts.length}
              icon={<ReceiptText className="h-4 w-4" />}
              title={copy.statementsHistory.detail.receipts}
            >
              {receipts.length ? receipts.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-800 dark:text-white sm:text-sm">{item.description}</p><p className={`mt-0.5 text-xs font-medium ${item.status === 'EXPENSE_CREATED' ? 'text-[#147514] dark:text-emerald-300' : 'text-orange-600 dark:text-orange-300'}`}>{item.status === 'EXPENSE_CREATED' ? copy.statementsHistory.detail.approved : copy.statementsHistory.detail.pending}</p></div>
                  <strong className="shrink-0 text-xs font-medium tabular-nums text-slate-900 dark:text-white sm:text-sm">{formatPettyCashCurrency(item.totalAmount, item.currencyCode)}</strong>
                </div>
              )) : <ModalEmptyState label={copy.statementsHistory.detail.receipts} />}
            </StatementActivityPanel>
      </div>
    </IndiceModalFrame>
  );
}

function StatementActivityPanel({ children, count, icon, title }: { children: ReactNode; count: number; icon: ReactNode; title: string }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300">{icon}</span>
        <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>
      </div>
      <div className="max-h-[24rem] space-y-2 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

function ModalEmptyState({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">{label}</div>;
}
