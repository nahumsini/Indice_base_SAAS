import {
  ArrowDownToLine,
  Banknote,
  CalendarRange,
  CheckCircle2,
  ReceiptText,
  WalletCards,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
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
    { icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.opening, tone: 'text-slate-700 dark:text-slate-200', value: statement.openingBalanceAmount },
    { icon: <Banknote className="h-4 w-4" />, label: copy.statementsHistory.metrics.funded, tone: 'text-sky-600 dark:text-sky-300', value: statement.assignedAmount + statement.additionalDepositAmount },
    { icon: <ReceiptText className="h-4 w-4" />, label: copy.statementsHistory.metrics.captured, tone: 'text-orange-600 dark:text-orange-300', value: statement.estimatedUsageAmount },
    { icon: <CheckCircle2 className="h-4 w-4" />, label: copy.statementsHistory.metrics.approved, tone: 'text-[#147514] dark:text-emerald-300', value: statement.verifiedExpenseAmount },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="z-[100] flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-[28px] border border-[#147514]/25 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.38)] dark:border-emerald-500/25 dark:bg-slate-950"
        hideCloseButton
        overlayClassName="bg-slate-950/65 backdrop-blur-sm"
      >
        <header className="shrink-0 bg-[#147514] px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-sm"><CalendarRange className="h-5 w-5" /></span>
              <DialogHeader className="min-w-0 gap-1 text-left">
                <DialogTitle className="text-xl font-black leading-6 text-white">{copy.statementsHistory.detail.title}</DialogTitle>
                <DialogDescription className="truncate text-xs font-semibold text-white/75 sm:text-sm">
                  {statement.folio} · {copy.statementsHistory.detail.description}
                </DialogDescription>
              </DialogHeader>
            </div>
            <button aria-label={copy.common.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-4 dark:bg-slate-950 sm:p-5">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metrics.map(metric => (
              <div key={metric.label} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300">{metric.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.07em] text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className={`mt-0.5 truncate text-base font-black tabular-nums ${metric.tone}`}>{formatPettyCashCurrency(metric.value, statement.currencyCode)}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="mt-3 flex items-center gap-3 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-3 py-2.5 dark:bg-emerald-500/10">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#147514] shadow-sm dark:bg-slate-900 dark:text-emerald-300"><ArrowDownToLine className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#147514] dark:text-emerald-300">{copy.statementsHistory.detail.origin}</p>
              <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm">{originText}</p>
            </div>
          </section>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <StatementActivityPanel
              count={movements.length}
              icon={<Banknote className="h-4 w-4" />}
              title={copy.statementsHistory.detail.movements}
            >
              {movements.length ? movements.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="min-w-0"><p className="truncate text-xs font-black text-slate-800 dark:text-white sm:text-sm">{copy.status.movement[item.type]}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{formatPettyCashIsoDate(item.movementDate)}</p></div>
                  <strong className="shrink-0 text-xs font-black tabular-nums text-sky-600 dark:text-sky-300 sm:text-sm">+{formatPettyCashCurrency(item.amount, item.currencyCode)}</strong>
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
                  <div className="min-w-0"><p className="truncate text-xs font-black text-slate-800 dark:text-white sm:text-sm">{item.description}</p><p className={`mt-0.5 text-[10px] font-bold ${item.status === 'EXPENSE_CREATED' ? 'text-[#147514] dark:text-emerald-300' : 'text-orange-600 dark:text-orange-300'}`}>{item.status === 'EXPENSE_CREATED' ? copy.statementsHistory.detail.approved : copy.statementsHistory.detail.pending}</p></div>
                  <strong className="shrink-0 text-xs font-black tabular-nums text-slate-900 dark:text-white sm:text-sm">{formatPettyCashCurrency(item.totalAmount, item.currencyCode)}</strong>
                </div>
              )) : <ModalEmptyState label={copy.statementsHistory.detail.receipts} />}
            </StatementActivityPanel>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end bg-[#147514] px-5 py-3 sm:px-6">
          <button className="h-10 rounded-xl bg-white px-5 text-sm font-black text-[#147514] shadow-sm transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" onClick={onClose} type="button">{copy.statementsHistory.detail.close}</button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function StatementActivityPanel({ children, count, icon, title }: { children: ReactNode; count: number; icon: ReactNode; title: string }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300">{icon}</span>
        <h4 className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 dark:text-white">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>
      </div>
      <div className="max-h-[24rem] space-y-2 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

function ModalEmptyState({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">{label}</div>;
}
