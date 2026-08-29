import { Banknote, CheckCircle2, CircleSlash, CreditCard } from 'lucide-react';
import { OperationalStatusNavigator } from '../../../shared/operational';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import type { PaymentAccount } from '../types';

type PaymentAccountsSummaryProps = {
  accounts: PaymentAccount[];
  statusFilter: string;
  tone?: 'green' | 'coral';
  onStatusChange: (status: string) => void;
};

export function PaymentAccountsSummary({ accounts, onStatusChange, statusFilter, tone = 'green' }: PaymentAccountsSummaryProps) {
  const t = usePaymentAccountsTranslations();
  const totalCount = accounts.length;
  const activeCount = accounts.filter(account => account.isActive).length;
  const inactiveCount = accounts.filter(account => !account.isActive).length;
  const internalCashCount = accounts.filter(account => account.source === 'petty_cash').length;
  const iconClassName = tone === 'coral' ? 'text-[#E8564B]' : 'text-[#147514]';

  return (
    <OperationalStatusNavigator
      metrics={[
        {
          id: 'total',
          icon: <CreditCard className="h-4 w-4" />,
          iconClassName,
          label: t.expenses.modal.summaryTotal,
          value: totalCount,
          active: statusFilter === 'all',
          onClick: () => onStatusChange('all'),
        },
        {
          id: 'active',
          icon: <CheckCircle2 className="h-4 w-4" />,
          iconClassName,
          label: t.common.active,
          value: activeCount,
          valueClassName: 'text-[#147514]',
          active: statusFilter === 'active',
          onClick: () => onStatusChange('active'),
        },
        {
          id: 'inactive',
          icon: <CircleSlash className="h-4 w-4" />,
          iconClassName,
          label: t.common.inactive,
          value: inactiveCount,
          valueClassName: 'text-rose-600 dark:text-rose-400',
          active: statusFilter === 'inactive',
          onClick: () => onStatusChange('inactive'),
        },
        {
          id: 'petty-cash',
          icon: <Banknote className="h-4 w-4" />,
          iconClassName,
          label: t.paymentAccounts.table.pettyCash,
          value: internalCashCount,
          valueClassName: 'text-amber-600 dark:text-amber-400',
        },
      ]}
      segments={[
        {
          id: 'active',
          label: t.common.active,
          count: activeCount,
          className: 'bg-[#147514]',
          active: statusFilter === 'active',
          onClick: () => onStatusChange('active'),
        },
        {
          id: 'inactive',
          label: t.common.inactive,
          count: inactiveCount,
          className: 'bg-rose-500',
          active: statusFilter === 'inactive',
          onClick: () => onStatusChange('inactive'),
        },
      ]}
    />
  );
}
