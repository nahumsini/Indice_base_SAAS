import { useMemo } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ReceiptText, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react';
import type { CashFund, PettyCashExpense } from '../types/pettyCash.types';
import { formatPettyCashCurrency, getCashFundSummary, getPettyCashSummary } from '../utils/pettyCash.utils';
import { PettyCashStatusBar } from './components/PettyCashStatusBar';

interface KPIsProps {
  expenses: PettyCashExpense[];
  funds: CashFund[];
}

type MetricTone = 'green' | 'blue' | 'amber' | 'red';

export default function KPIs({ expenses, funds }: KPIsProps) {
  const cashSummary = useMemo(() => getPettyCashSummary(expenses), [expenses]);
  const fundSummary = useMemo(() => getCashFundSummary(funds), [funds]);
  const settlementRate = cashSummary.totalIssued > 0
    ? Math.round((cashSummary.totalSettled / cashSummary.totalIssued) * 100)
    : 0;
  const auditQueueCount = expenses.filter(expense => expense.auditStatus !== 'audited').length;

  const collaboratorExposure = useMemo(() => {
    const totals = new Map<string, { collaborator: string; balance: number; issued: number; count: number }>();

    expenses.forEach((expense) => {
      const current = totals.get(expense.collaborator) ?? {
        collaborator: expense.collaborator,
        balance: 0,
        issued: 0,
        count: 0,
      };

      totals.set(expense.collaborator, {
        ...current,
        balance: current.balance + expense.balance,
        issued: current.issued + expense.amountIssued,
        count: current.count + 1,
      });
    });

    return Array.from(totals.values())
      .sort((left, right) => right.balance - left.balance)
      .slice(0, 5);
  }, [expenses]);

  const fundUtilization = useMemo(() => {
    return funds.map((fund) => ({
      id: fund.id,
      name: fund.name,
      custodian: fund.custodian,
      balanceRate: fund.limit > 0 ? Math.round((fund.currentBalance / fund.limit) * 100) : 0,
      pendingReceipts: fund.pendingReceipts,
    }));
  }, [funds]);

  const insights = [
    {
      title: 'Internal audit queue',
      description: `${auditQueueCount} movement${auditQueueCount === 1 ? '' : 's'} still need Petty Cash audit follow-up.`,
      tone: auditQueueCount > 0 ? 'warning' : 'success',
      icon: ShieldCheck,
    },
    {
      title: 'Receipt control risk',
      description: `${cashSummary.pendingReceiptCount} case${cashSummary.pendingReceiptCount === 1 ? '' : 's'} still need receipt validation.`,
      tone: cashSummary.pendingReceiptCount > 0 ? 'warning' : 'success',
      icon: ReceiptText,
    },
    {
      title: 'Cash boxes under watch',
      description: `${fundSummary.riskFunds} cash fund${fundSummary.riskFunds === 1 ? '' : 's'} need replenishment or reconciliation.`,
      tone: fundSummary.riskFunds > 0 ? 'warning' : 'success',
      icon: ShieldCheck,
    },
    {
      title: 'Settlement pace',
      description: `${settlementRate}% of issued petty cash has been settled.`,
      tone: settlementRate >= 80 ? 'success' : 'warning',
      icon: ArrowUpRight,
    },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#147514] text-white">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Petty Cash KPIs</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Control issued cash, collaborator balances, receipt risk, and fund health.
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#147514] shadow-sm dark:bg-gray-900 dark:text-green-300">
            {settlementRate}% settlement rate
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiMetric icon={Wallet} label="Issued cash" value={formatPettyCashCurrency(cashSummary.totalIssued)} detail="Granted to collaborators" tone="green" />
        <KpiMetric icon={CheckCircle2} label="Settled cash" value={formatPettyCashCurrency(cashSummary.totalSettled)} detail={`${settlementRate}% of issued cash`} tone="blue" />
        <KpiMetric icon={AlertTriangle} label="Pending balance" value={formatPettyCashCurrency(cashSummary.pendingBalance)} detail={`${cashSummary.pendingReceiptCount} receipt cases`} tone={cashSummary.pendingBalance > 0 ? 'amber' : 'green'} />
        <KpiMetric icon={ShieldCheck} label="Audit queue" value={String(auditQueueCount)} detail="Reviewed inside Petty Cash" tone={auditQueueCount > 0 ? 'amber' : 'green'} />
      </section>

      <PettyCashStatusBar expenses={expenses} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#147514]" />
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Collaborator exposure</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open petty cash balances by collaborator</p>
            </div>
          </div>
          <div className="space-y-3">
            {collaboratorExposure.map((item) => (
              <div key={item.collaborator} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.collaborator}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} movement{item.count === 1 ? '' : 's'} / {formatPettyCashCurrency(item.issued)} issued</p>
                  </div>
                  <p className={`text-sm font-bold ${item.balance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                    {formatPettyCashCurrency(item.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#147514]" />
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Fund utilization</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cash available and pending receipts by box</p>
            </div>
          </div>
          <div className="space-y-4">
            {fundUtilization.map((fund) => (
              <div key={fund.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{fund.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fund.custodian}</p>
                  </div>
                  <span className="shrink-0 font-bold text-gray-900 dark:text-white">{fund.balanceRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${fund.balanceRate < 25 ? 'bg-amber-500' : 'bg-[#147514]'}`}
                    style={{ width: `${Math.max(4, fund.balanceRate)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatPettyCashCurrency(fund.pendingReceipts)} pending receipts</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          const toneClass = insight.tone === 'success'
            ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100'
            : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100';

          return (
            <div key={insight.title} className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-950/30">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{insight.title}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function KpiMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
}) {
  const toneClass = {
    green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100',
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100',
  }[tone];

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs opacity-80">{detail}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-950/30">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
