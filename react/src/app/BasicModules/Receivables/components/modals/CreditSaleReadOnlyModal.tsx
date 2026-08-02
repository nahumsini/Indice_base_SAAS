import { useMemo } from 'react';
import { CalendarClock, Eye } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import { ReceivablesStatusBadge } from '../ReceivablesStatusBadge';
import {
  financeTextClass,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { CreditSale } from '../../types';
import {
  createInstallmentsFromCreditSale,
  createReceivableFromCreditSale,
  formatMoney,
  formatPercent,
} from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';

type CreditSaleReadOnlyMode = 'detail' | 'schedule';

interface CreditSaleReadOnlyModalProps {
  copy: ReceivablesTranslations;
  mode: CreditSaleReadOnlyMode;
  sale: CreditSale;
  onClose: () => void;
}

export function CreditSaleReadOnlyModal({
  copy,
  mode,
  sale,
  onClose,
}: CreditSaleReadOnlyModalProps) {
  const account = useMemo(() => createReceivableFromCreditSale(sale), [sale]);
  const installments = useMemo(() => createInstallmentsFromCreditSale(sale, account), [account, sale]);
  const isSchedule = mode === 'schedule';

  return (
    <ReceivablesModalFrame
      closeLabel={copy.common.close}
      description={isSchedule ? copy.modals.creditSale.scheduleDescription : copy.modals.creditSale.detailDescription}
      footerSummary={isSchedule ? `${sale.customerName} · ${formatMoney(account.totalPayable, sale.currency)}` : undefined}
      icon={isSchedule ? <CalendarClock className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      modalType={isSchedule ? 'operational-workspace' : 'standard-form'}
      onClose={onClose}
      title={isSchedule ? copy.modals.creditSale.scheduleTitle : copy.modals.creditSale.detailTitle}
      footer={(
        <Button type="button" className={moduleModalPrimaryButtonClassName} onClick={onClose}>
          {copy.common.close}
        </Button>
      )}
    >
      {isSchedule ? (
        <div className="space-y-4">
          <SummaryGrid copy={copy} sale={sale} totalPayable={account.totalPayable} />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <TableHead className="px-5 py-4 text-xs font-medium text-slate-500">{copy.modals.creditSale.installment}</TableHead>
                    <TableHead className="px-5 py-4 text-xs font-medium text-slate-500">{copy.modals.creditSale.dueDate}</TableHead>
                    <TableHead className="px-5 py-4 text-xs font-medium text-slate-500">{copy.views.accountsReceivable.table.amount}</TableHead>
                    <TableHead className="px-5 py-4 text-xs font-medium text-slate-500">{copy.modals.creditSale.balance}</TableHead>
                    <TableHead className="px-5 py-4 text-xs font-medium text-slate-500">{copy.views.accountsReceivable.table.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment) => (
                    <TableRow key={installment.id} className="border-slate-100 dark:border-slate-800">
                      <TableCell className="px-5 py-4 font-medium text-slate-950 dark:text-white">#{installment.installmentNumber}</TableCell>
                      <TableCell className="px-5 py-4 font-medium text-slate-600 dark:text-slate-300">{installment.dueDate}</TableCell>
                      <TableCell className="px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{formatMoney(installment.amount, installment.currency)}</TableCell>
                      <TableCell className={cn('px-5 py-4 font-medium', financeTextClass)}>{formatMoney(installment.balance, installment.currency)}</TableCell>
                      <TableCell className="px-5 py-4"><ReceivablesStatusBadge copy={copy} status={installment.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SummaryGrid copy={copy} sale={sale} totalPayable={account.totalPayable} />
          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem label={copy.views.creditSales.table.sale} value={sale.saleNumber} />
            <DetailItem label={copy.views.creditSales.table.customer} value={sale.customerName} />
            <DetailItem label={copy.views.creditSales.table.unit} value={sale.unit} />
            <DetailItem label={copy.views.creditSales.table.business} value={sale.business} />
            <DetailItem label={copy.modals.creditSale.source} value={sale.source.toUpperCase()} />
            <DetailItem label={copy.modals.creditSale.firstDueDateLabel} value={sale.firstDueDate} />
          </div>
        </div>
      )}
    </ReceivablesModalFrame>
  );
}

function SummaryGrid({
  copy,
  sale,
  totalPayable,
}: {
  copy: ReceivablesTranslations;
  sale: CreditSale;
  totalPayable: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <DetailItem label={copy.modals.creditSale.originalAmount} value={formatMoney(sale.originalAmount, sale.currency)} highlight />
      <DetailItem label={copy.views.creditSales.table.amount} value={formatMoney(sale.financedAmount, sale.currency)} highlight />
      <DetailItem label={copy.modals.creditSale.totalPayable} value={formatMoney(totalPayable, sale.currency)} highlight />
      <DetailItem
        label={copy.modals.creditSale.term}
        value={`${sale.selectedSimulation.termMonths} ${copy.modals.creditSale.months.toLowerCase()} - ${formatPercent(sale.selectedSimulation.annualInterestRate)}`}
      />
    </div>
  );
}

function DetailItem({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-1 text-sm font-medium text-slate-950 dark:text-white', highlight && financeTextClass)}>
        {value}
      </p>
    </div>
  );
}
