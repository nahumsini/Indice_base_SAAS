import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, Info, Search, ShieldCheck, Wallet } from 'lucide-react';
import type { CashFund, CashFundStatus, PettyCashExpense } from '../types/pettyCash.types';
import { formatPettyCashCurrency, getCashFundSummary } from '../utils/pettyCash.utils';
import { CashFundTable } from './components/CashFundTable';

interface ControlProps {
  expenses: PettyCashExpense[];
  funds: CashFund[];
  onFundsChange: Dispatch<SetStateAction<CashFund[]>>;
}

export default function Control({
  expenses,
  funds,
  onFundsChange,
}: ControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CashFundStatus | 'all'>('all');

  const filteredFunds = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return funds.filter((fund) => {
      const matchesSearch = normalizedSearch.length === 0
        || fund.name.toLowerCase().includes(normalizedSearch)
        || fund.custodian.toLowerCase().includes(normalizedSearch)
        || fund.department.toLowerCase().includes(normalizedSearch)
        || fund.businessUnit.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || fund.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [funds, searchTerm, statusFilter]);

  const summary = useMemo(() => getCashFundSummary(filteredFunds), [filteredFunds]);
  const openBalances = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.balance, 0);
  }, [expenses]);

  const handleReplenishFund = (fundId: string) => {
    onFundsChange(currentFunds =>
      currentFunds.map((fund) => {
        if (fund.id !== fundId) return fund;

        const replenishment = Math.min(750, Math.max(0, fund.limit - fund.currentBalance));
        const nextBalance = fund.currentBalance + replenishment;

        return {
          ...fund,
          currentBalance: nextBalance,
          status: nextBalance < fund.limit * 0.25 ? 'low_balance' : 'active',
        };
      }),
    );
  };

  const handleReconcileFund = (fundId: string) => {
    onFundsChange(currentFunds =>
      currentFunds.map(fund =>
        fund.id === fundId
          ? {
              ...fund,
              lastReconciliation: new Date(),
              status: fund.currentBalance < fund.limit * 0.25 ? 'low_balance' : 'active',
            }
          : fund,
      ),
    );
  };

  const handleCloseFund = (fundId: string) => {
    onFundsChange(currentFunds =>
      currentFunds.map(fund =>
        fund.id === fundId
          ? {
              ...fund,
              status: 'closed',
            }
          : fund,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#147514] text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">Cash Control</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Administer petty cash boxes, custodians, balances, replenishments, and reconciliation status.
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-[#147514] shadow-sm dark:bg-gray-900 dark:text-green-300">
            {summary.riskFunds} fund risk{summary.riskFunds === 1 ? '' : 's'}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Search fund</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder="Fund, custodian, department"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CashFundStatus | 'all')}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="low_balance">Low balance</option>
              <option value="needs_reconciliation">Needs reconciliation</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ControlMetric icon={Wallet} label="Available cash" value={formatPettyCashCurrency(summary.totalBalance)} />
        <ControlMetric icon={Wallet} label="Fund limit" value={formatPettyCashCurrency(summary.totalLimit)} />
        <ControlMetric icon={AlertTriangle} label="Pending receipts" value={formatPettyCashCurrency(summary.pendingReceipts)} tone={summary.pendingReceipts > 0 ? 'warning' : 'success'} />
        <ControlMetric icon={ShieldCheck} label="Active funds" value={String(summary.activeFunds)} />
        <ControlMetric icon={AlertTriangle} label="Open balances" value={formatPettyCashCurrency(openBalances)} tone={openBalances > 0 ? 'warning' : 'success'} />
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Control summary: {formatPettyCashCurrency(summary.totalBalance)} available across {summary.activeFunds} active funds, with {formatPettyCashCurrency(summary.pendingReceipts)} waiting for receipt validation.
          </p>
        </div>
      </section>

      <CashFundTable
        funds={filteredFunds}
        onCloseFund={handleCloseFund}
        onReconcileFund={handleReconcileFund}
        onReplenishFund={handleReplenishFund}
      />
    </div>
  );
}

function ControlMetric({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const toneClass = {
    neutral: 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white',
    success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100',
  }[tone];

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-medium">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-[#147514] dark:bg-gray-950/30">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
