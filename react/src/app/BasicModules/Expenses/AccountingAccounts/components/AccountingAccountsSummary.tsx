import { BookOpenCheck, CheckCircle2, CircleSlash } from 'lucide-react';
import { OperationalStatusNavigator } from '../../../shared/operational';
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';
import type { AccountingAccount } from '../types';

type AccountingAccountsSummaryProps = {
  accounts: AccountingAccount[];
  statusFilter: string;
  onStatusChange: (status: string) => void;
};

export function AccountingAccountsSummary({ accounts, onStatusChange, statusFilter }: AccountingAccountsSummaryProps) {
  const t = useAccountingAccountsTranslations();
  const totalCount = accounts.length;
  const activeCount = accounts.filter(account => account.isActive).length;
  const inactiveCount = accounts.filter(account => !account.isActive).length;

  return (
    <OperationalStatusNavigator
      metrics={[
        {
          id: 'total',
          icon: <BookOpenCheck className="h-4 w-4" />,
          label: t.expenses.modal.summaryTotal,
          value: totalCount,
          active: statusFilter === 'all',
          onClick: () => onStatusChange('all'),
        },
        {
          id: 'active',
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: t.common.active,
          value: activeCount,
          valueClassName: 'text-[#147514]',
          active: statusFilter === 'active',
          onClick: () => onStatusChange('active'),
        },
        {
          id: 'inactive',
          icon: <CircleSlash className="h-4 w-4" />,
          label: t.common.inactive,
          value: inactiveCount,
          valueClassName: 'text-rose-600 dark:text-rose-400',
          active: statusFilter === 'inactive',
          onClick: () => onStatusChange('inactive'),
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
