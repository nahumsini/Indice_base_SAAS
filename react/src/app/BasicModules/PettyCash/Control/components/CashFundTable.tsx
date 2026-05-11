import { CheckCircle2, Lock, PlusCircle } from 'lucide-react';
import type { CashFund } from '../../types/pettyCash.types';
import {
  cashFundStatusClasses,
  cashFundStatusLabels,
  formatPettyCashCurrency,
  formatPettyCashDate,
} from '../../utils/pettyCash.utils';

interface CashFundTableProps {
  funds: CashFund[];
  onCloseFund: (fundId: string) => void;
  onReconcileFund: (fundId: string) => void;
  onReplenishFund: (fundId: string) => void;
}

export function CashFundTable({
  funds,
  onCloseFund,
  onReconcileFund,
  onReplenishFund,
}: CashFundTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
            <tr>
              <Header label="Cash fund" />
              <Header label="Custodian" />
              <Header label="Limit" align="right" />
              <Header label="Current balance" align="right" />
              <Header label="Pending receipts" align="right" />
              <Header label="Open requests" align="center" />
              <Header label="Last reconciliation" />
              <Header label="Status" />
              <Header label="Actions" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {funds.map((fund) => {
              const balanceRate = fund.limit > 0 ? Math.round((fund.currentBalance / fund.limit) * 100) : 0;

              return (
                <tr key={fund.id} className="transition odd:bg-white even:bg-gray-50/60 hover:bg-green-50/50 dark:odd:bg-gray-800 dark:even:bg-gray-900/30 dark:hover:bg-green-900/10">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{fund.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fund.businessUnit} / {fund.business}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{fund.custodian}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fund.department}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPettyCashCurrency(fund.limit, fund.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPettyCashCurrency(fund.currentBalance, fund.currency)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full ${balanceRate < 25 ? 'bg-amber-500' : 'bg-[#147514]'}`}
                        style={{ width: `${Math.max(4, Math.min(100, balanceRate))}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatPettyCashCurrency(fund.pendingReceipts, fund.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {fund.openRequests}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {formatPettyCashDate(fund.lastReconciliation)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cashFundStatusClasses[fund.status]}`}>
                      {cashFundStatusLabels[fund.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onReplenishFund(fund.id)}
                        className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20"
                        title="Replenish fund"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReconcileFund(fund.id)}
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        title="Reconcile fund"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCloseFund(fund.id)}
                        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        title="Close fund"
                      >
                        <Lock className="h-4 w-4" />
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

function Header({ label, align = 'left' }: { label: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}
