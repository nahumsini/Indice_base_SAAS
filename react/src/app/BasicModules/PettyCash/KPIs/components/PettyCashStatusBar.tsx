import type { PettyCashExpense, PettyCashExpenseStatus } from '../../types/pettyCash.types';
import { pettyCashStatusLabels } from '../../utils/pettyCash.utils';

interface PettyCashStatusBarProps {
  expenses: PettyCashExpense[];
}

const statusColors: Record<PettyCashExpenseStatus, string> = {
  pending_receipt: 'bg-amber-500',
  submitted: 'bg-blue-500',
  approved: 'bg-emerald-500',
  settled: 'bg-green-600',
  overdue: 'bg-red-500',
  rejected: 'bg-gray-400',
};

const trackedStatuses: PettyCashExpenseStatus[] = [
  'settled',
  'pending_receipt',
  'submitted',
  'overdue',
];

export function PettyCashStatusBar({ expenses }: PettyCashStatusBarProps) {
  const total = expenses.length || 1;
  const distribution = trackedStatuses.map((status) => {
    const count = expenses.filter(expense => expense.status === status).length;

    return {
      status,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Settlement distribution</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">How petty cash is moving through control states</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {distribution.map((entry) => (
            <span key={entry.status} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
              <span className={`h-2 w-2 rounded-full ${statusColors[entry.status]}`} />
              {pettyCashStatusLabels[entry.status]} {entry.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        {distribution.map((entry) => (
          <div
            key={entry.status}
            className={statusColors[entry.status]}
            style={{ width: `${Math.max(entry.count > 0 ? 6 : 0, entry.percentage)}%` }}
            title={`${pettyCashStatusLabels[entry.status]}: ${entry.percentage}%`}
          />
        ))}
      </div>
    </section>
  );
}
