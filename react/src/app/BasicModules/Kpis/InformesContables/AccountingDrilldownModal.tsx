import { useEffect, useState } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { Button } from '../../../components/ui/button';
import type { AccountingReportCopy } from './accountingReportTranslations';
import { accountingReportsApi, type AccountingDrilldown } from './accountingReportsApi';
import { formatAccountingMoney } from './AccountingReportViews';

export type AccountingDrilldownSubject = { type: 'STATEMENT_LINE' | 'ACCOUNT'; id: string };

export function AccountingDrilldownModal({
  copy, locale, subject, scope, onClose,
}: {
  copy: AccountingReportCopy;
  locale: string;
  subject: AccountingDrilldownSubject | null;
  scope: { from: string; to: string; unitId: string; businessId: string };
  onClose: () => void;
}) {
  const [data, setData] = useState<AccountingDrilldown | null>(null);
  const [page, setPage] = useState(0);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 25;

  useEffect(() => {
    if (!subject) return;
    let active = true;
    setLoading(true); setError('');
    accountingReportsApi.drilldown({ ...scope, subjectType: subject.type, subjectId: subject.id, page, pageSize })
      .then((response) => {
        if (!active) return;
        setData(response);
        setSelectedLineId((current) => response.rows.some((row) => row.lineId === current) ? current : response.rows[0]?.lineId ?? null);
      })
      .catch(() => { if (active) setError(copy.drilldown.loadError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [copy.drilldown.loadError, page, scope.businessId, scope.from, scope.to, scope.unitId, subject]);

  useEffect(() => { setPage(0); setData(null); }, [subject]);
  const selected = data?.rows.find((row) => row.lineId === selectedLineId) ?? data?.rows[0];

  return <IndiceModalFrame
    open={Boolean(subject)} onOpenChange={(open) => { if (!open) onClose(); }}
    modalType="operational-workspace" tone="blue" icon={<BookOpenCheck className="h-5 w-5" />}
    title={data?.subject.label ?? copy.drilldown.title} description={copy.drilldown.description}
    closeLabel={copy.actions.closeModal}
    bodyClassName="p-0"
    footer={data && data.totalPages > 1 ? <><Button type="button" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" />{copy.actions.previous}</Button><Button type="button" variant="outline" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>{copy.actions.next}<ChevronRight className="h-4 w-4" /></Button></> : undefined}
    footerSummary={data ? `${copy.trial.page} ${data.page + 1} ${copy.trial.of} ${Math.max(1, data.totalPages)} · ${data.totalRows}` : undefined}
  >
    {loading && !data ? <div className="grid min-h-[420px] place-items-center text-sm text-slate-500">{copy.actions.syncing}…</div> : null}
    {error ? <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200">{error}</div> : null}
    {data ? <div className="flex min-h-[540px] flex-col lg:grid lg:grid-cols-[minmax(420px,.95fr)_minmax(420px,1.05fr)]">
      <section className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:border-b-0 lg:border-r">
        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 p-4 dark:border-slate-700">
          <Summary label={copy.drilldown.debit} value={formatAccountingMoney(data.summary.debit, data.context.presentationCurrency, locale)} />
          <Summary label={copy.drilldown.credit} value={formatAccountingMoney(data.summary.credit, data.context.presentationCurrency, locale)} />
          <Summary label={copy.drilldown.net} value={formatAccountingMoney(data.summary.netAmount, data.context.presentationCurrency, locale)} />
        </div>
        <div className="max-h-[430px] overflow-y-auto p-3">
          {data.rows.map((row) => <button key={row.lineId} type="button" onClick={() => setSelectedLineId(row.lineId)} className={`mb-2 w-full rounded-2xl border p-3 text-left transition-colors ${selected?.lineId === row.lineId ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'}`}><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-blue-700 dark:text-blue-300">{row.entryNumber}</span><span className="text-xs text-slate-500">{row.entryDate}</span></div><p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{row.accountCode} · {row.accountName}</p><p className="mt-1 truncate text-xs text-slate-500">{row.entryDescription}</p><p className="mt-2 text-right text-sm font-medium tabular-nums">{formatAccountingMoney(row.netAmount, data.context.presentationCurrency, locale)}</p></button>)}
          {!data.rows.length ? <p className="p-8 text-center text-sm text-slate-500">{copy.drilldown.empty}</p> : null}
        </div>
      </section>
      <section className="bg-slate-50 p-5 dark:bg-slate-950">
        {selected ? <div className="space-y-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"><FileText className="h-5 w-5" /></span><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{selected.entryNumber}</h3><p className="text-sm text-slate-500">{selected.entryDate} · {selected.sourceModule}</p></div></div><Detail label={copy.common.concept} value={selected.entryDescription} /><div className="grid gap-3 sm:grid-cols-2"><Detail label={copy.trial.code} value={`${selected.accountCode} · ${selected.accountName}`} /><Detail label={copy.drilldown.source} value={`${selected.sourceType} · ${selected.sourceId}`} /><Detail label={copy.drilldown.document} value={selected.sourceDocumentReference ?? '—'} /><Detail label={copy.drilldown.organization} value={[selected.unitName, selected.businessName].filter(Boolean).join(' / ') || '—'} /></div><div className="grid grid-cols-3 gap-3"><Summary label={copy.drilldown.debit} value={formatAccountingMoney(selected.debit, data.context.presentationCurrency, locale)} /><Summary label={copy.drilldown.credit} value={formatAccountingMoney(selected.credit, data.context.presentationCurrency, locale)} /><Summary label={copy.drilldown.net} value={formatAccountingMoney(selected.netAmount, data.context.presentationCurrency, locale)} /></div></div> : <p className="text-sm text-slate-500">{copy.drilldown.empty}</p>}
      </section>
    </div> : null}
  </IndiceModalFrame>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-medium tabular-nums text-slate-950 dark:text-white">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value}</p></div>;
}
