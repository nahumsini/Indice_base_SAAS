import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  DatabaseZap,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { AccountingReport, AccountingStatement } from './accountingReportsApi';
import type { AccountingReportCopy } from './accountingReportTranslations';

export function formatAccountingMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function AccountingReadiness({ copy, data, locale }: { copy: AccountingReportCopy; data: AccountingReport; locale: string }) {
  const ready = data.readiness.decisionReady;
  const metrics = [
    [copy.readiness.coverage, `${data.readiness.coveragePercent}%`],
    [copy.readiness.entries, String(data.readiness.postedEntries)],
    [copy.readiness.pending, String(data.readiness.pendingSourceEvents)],
    [copy.readiness.blocking, String(data.readiness.blockingFindings)],
  ];
  return (
    <section className={cn(
      'overflow-hidden rounded-[24px] border border-l-4 bg-white shadow-sm dark:bg-slate-900',
      ready ? 'border-emerald-200 border-l-emerald-500 dark:border-emerald-900 dark:border-l-emerald-500' : 'border-amber-200 border-l-amber-500 dark:border-amber-900 dark:border-l-amber-500',
    )}>
      <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200')}>
            {ready ? <BadgeCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.readiness[data.readiness.status]}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {data.context.reportingFramework.split('_').join(' ')}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{data.readiness.message}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {data.context.from} — {data.context.to} · {data.context.presentationCurrency} · {new Date(data.context.generatedAt).toLocaleString(locale)}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
          {metrics.map(([label, value]) => (
            <div key={label} className="min-w-28 bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-base font-medium tabular-nums text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AccountingWorkflow({ copy, data }: { copy: AccountingReportCopy; data: AccountingReport }) {
  const steps = [
    { title: copy.workflow.synchronize, detail: copy.workflow.source, icon: DatabaseZap, done: data.readiness.postedEntries > 0 },
    { title: copy.workflow.reconcile, detail: copy.workflow.balance, icon: Scale, done: data.readiness.blockingFindings === 0 },
    { title: copy.workflow.review, detail: copy.workflow.compare, icon: BookOpenCheck, done: data.readiness.decisionReady },
    { title: copy.workflow.close, detail: copy.workflow.protect, icon: LockKeyhole, done: data.context.periodStatus === 'CLOSED' },
  ];
  return (
    <ol className="grid gap-2 md:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className={cn('relative rounded-2xl border p-4', step.done ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/25' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900')}>
            <div className="flex items-center gap-3">
              <span className={cn('grid h-9 w-9 place-items-center rounded-xl', step.done ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-950 dark:text-white">{step.title}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{step.detail}</p>
              </div>
            </div>
            {index < steps.length - 1 ? <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden h-px w-3 bg-slate-300 md:block dark:bg-slate-700" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function AccountingHeadline({ copy, data, locale }: { copy: AccountingReportCopy; data: AccountingReport; locale: string }) {
  const currency = data.context.presentationCurrency;
  const metrics = [
    [copy.metrics.revenue, data.headline.revenue], [copy.metrics.grossProfit, data.headline.grossProfit],
    [copy.metrics.operatingProfit, data.headline.operatingProfit], [copy.metrics.netProfit, data.headline.netProfit],
    [copy.metrics.assets, data.headline.totalAssets], [copy.metrics.liabilities, data.headline.totalLiabilities],
    [copy.metrics.equity, data.headline.totalEquity], [copy.metrics.cash, data.headline.netCashChange],
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, raw], index) => {
        const value = raw as number;
        return (
          <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <CircleDollarSign className={cn('h-4 w-4', index < 4 ? 'text-blue-600' : 'text-slate-400')} />
            </div>
            <p className={cn('mt-3 text-xl font-medium tracking-tight', value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-950 dark:text-white')}>
              {formatAccountingMoney(value, currency, locale)}
            </p>
          </article>
        );
      })}
    </section>
  );
}

export function StatementView({ copy, currency, locale, statement, onOpenLine }: { copy: AccountingReportCopy; currency: string; locale: string; statement: AccountingStatement; onOpenLine: (lineCode: string) => void }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-medium text-slate-950 dark:text-white">{statement.title}</h3>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', statement.internallyConsistent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200')}>
              {statement.internallyConsistent ? copy.statement.consistent : copy.statement.inconsistent}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{statement.subtitle}</p>
        </div>
        <span className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{statement.standardReference}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr><th className="px-5 py-3 text-left font-medium">{copy.common.concept}</th><th className="px-4 py-3 text-right font-medium">{copy.statement.current}</th><th className="px-4 py-3 text-right font-medium">{copy.statement.comparative}</th><th className="px-4 py-3 text-right font-medium">{copy.statement.variance}</th><th className="w-16 px-3 py-3 text-right font-medium"><span className="sr-only">{copy.common.detail}</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {statement.lines.map((line) => (
              <tr key={line.code} className={line.subtotal ? 'bg-blue-50/70 font-medium dark:bg-blue-950/20' : undefined}>
                <td className={cn('px-5 py-3 text-slate-800 dark:text-slate-100', line.level > 0 && 'pl-9')}>{line.label}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-950 dark:text-white">{formatAccountingMoney(line.current, currency, locale)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatAccountingMoney(line.comparative, currency, locale)}</td>
                <td className={cn('px-5 py-3 text-right tabular-nums', line.variance !== 0 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500')}>
                  <span className="inline-flex items-center gap-1">{line.variance > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : line.variance < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}{line.variancePercent.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="icon" aria-label={`${copy.statement.openDetail}: ${line.label}`} onClick={() => onOpenLine(line.code)}><ExternalLink className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function TrialBalanceView({ copy, data, locale }: { copy: AccountingReportCopy; data: AccountingReport; locale: string }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400"><tr><th className="px-4 py-3 text-left">{copy.trial.code}</th><th className="px-4 py-3 text-left">{copy.trial.name}</th><th className="px-4 py-3 text-left">{copy.trial.type}</th><th className="px-4 py-3 text-right">{copy.trial.debit}</th><th className="px-4 py-3 text-right">{copy.trial.credit}</th><th className="px-4 py-3 text-right">{copy.trial.balance}</th><th className="px-4 py-3 text-right">{copy.trial.journals}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.trialBalance.map((row) => <tr key={row.accountId}><td className="px-4 py-3 font-mono text-xs text-blue-700 dark:text-blue-300">{row.accountCode}</td><td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{row.accountName}</td><td className="px-4 py-3 text-slate-500">{copy.accountTypes[row.accountType as keyof typeof copy.accountTypes] ?? row.accountType}</td><td className="px-4 py-3 text-right tabular-nums">{formatAccountingMoney(row.debit, data.context.presentationCurrency, locale)}</td><td className="px-4 py-3 text-right tabular-nums">{formatAccountingMoney(row.credit, data.context.presentationCurrency, locale)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatAccountingMoney(row.balance, data.context.presentationCurrency, locale)}</td><td className="px-4 py-3 text-right">{row.journalCount}</td></tr>)}
          </tbody>
        </table>
      </div>
      {!data.trialBalance.length ? <p className="p-8 text-center text-sm text-slate-500">{copy.trial.empty}</p> : null}
    </section>
  );
}

export function QualityView({ copy, data }: { copy: AccountingReportCopy; data: AccountingReport }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"><FileCheck2 className="h-5 w-5" /></span><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.quality.title}</h3><p className="mt-1 text-sm text-slate-500">{copy.quality.subtitle}</p></div></div>
        <div className="mt-5 space-y-3">
          {data.findings.map((finding) => <article key={`${finding.code}-${finding.sourceModule}`} className={cn('rounded-2xl border p-4', finding.severity === 'BLOCKING' ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20')}><div className="flex items-start gap-3">{finding.severity === 'BLOCKING' ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}<div><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-slate-950 dark:text-white">{finding.title}</h4><span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-900">{finding.affectedRecords} {copy.quality.affected}</span></div><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{finding.detail}</p><p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">{copy.quality.action}: {finding.action}</p></div></div></article>)}
          {!data.findings.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"><CheckCircle2 className="mr-2 inline h-4 w-4" />{copy.quality.noFindings}</div> : null}
        </div>
      </section>
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.quality.sources}</h3><div className="mt-5 space-y-4">{data.sourceCoverage.map((source) => <div key={source.module}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-800 dark:text-slate-100">{copy.modules[source.module]}</span><span className="text-xs text-slate-500">{source.posted}/{source.eligible} · {source.coveragePercent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn('h-full rounded-full', source.status === 'READY' ? 'bg-emerald-500' : source.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-amber-500')} style={{ width: `${source.coveragePercent}%` }} /></div></div>)}</div></section>
    </div>
  );
}

export function AccountingLoading() {
  return <div aria-busy="true" className="space-y-4"><div className="h-40 animate-pulse rounded-[24px] bg-slate-200 dark:bg-slate-800" /><div className="grid gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="h-80 animate-pulse rounded-[24px] bg-slate-200 dark:bg-slate-800" /></div>;
}
