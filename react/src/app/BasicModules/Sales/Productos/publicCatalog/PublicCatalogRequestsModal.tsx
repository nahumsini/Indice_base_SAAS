import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { useProductsResolvedLocale, type ProductsTranslations } from '../translations';
import { publicCatalogApi, type PublicCatalogRequestResult } from './publicCatalogApi';

const statusClass: Record<PublicCatalogRequestResult['status'], string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700',
  IN_REVIEW: 'bg-amber-50 text-amber-800',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  CONVERTED: 'bg-violet-50 text-violet-700',
};

const money = (value: number | string, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: currency || 'MXN',
}).format(Number(value ?? 0));

export function PublicCatalogRequestsModal({
  open,
  t,
  onOpenChange,
}: {
  open: boolean;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useProductsResolvedLocale();
  const [requests, setRequests] = useState<PublicCatalogRequestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await publicCatalogApi.listRequests();
      setRequests(response.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.publicCatalog.requests.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return requests;
    return requests.filter((request) => (
      `${request.requestNumber} ${request.customerName} ${request.contact} ${request.status}`
        .toLocaleLowerCase(locale)
        .includes(normalized)
    ));
  }, [locale, query, requests]);

  const review = async (requestId: number, status: 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED') => {
    setBusyId(requestId);
    setError('');
    try {
      const updated = await publicCatalogApi.reviewRequest(requestId, status);
      setRequests((current) => current.map((request) => request.id === requestId ? updated : request));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.publicCatalog.requests.updateError);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.publicCatalog.requests.title}
      description={t.publicCatalog.requests.description}
      icon={<ClipboardList className="h-5 w-5" />}
      contentClassName="flex h-[88vh] w-[calc(100vw-2rem)] max-w-[1100px] flex-col sm:max-w-[1100px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-slate-50 p-0"
      footer={(
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.close}</Button>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t.publicCatalog.requests.searchLabel}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.publicCatalog.requests.searchPlaceholder} className="pl-9" />
          </label>
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => void load()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t.publicCatalog.refresh}
          </Button>
        </div>

        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && requests.length === 0 ? (
            <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">{t.publicCatalog.requests.loading}</div>
          ) : null}
          {!loading && visible.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              {t.publicCatalog.requests.empty}
            </div>
          ) : null}
          <div className="grid gap-3">
            {visible.map((request) => {
              const mutable = request.status === 'SUBMITTED' || request.status === 'IN_REVIEW';
              const busy = busyId === request.id;
              return (
                <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-sm font-black text-slate-950">{request.requestNumber}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass[request.status]}`}>{t.publicCatalog.requests.statuses[request.status]}</span>
                      </div>
                      <p className="mt-2 font-black text-slate-900">{request.customerName}</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-500">{request.contact} · {request.preferredContactMethod}</p>
                      {request.message ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{request.message}</p> : null}
                    </div>
                    <div className="shrink-0 rounded-lg bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs font-bold text-slate-500">{t.publicCatalog.requests.lineItems(request.itemCount)}</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{money(request.estimatedTotal, request.currencyCode, locale)}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(request.createdAt).toLocaleString(locale)}</p>
                    </div>
                  </div>
                  {request.items.length > 0 ? (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">{t.publicCatalog.requests.product}</th><th className="px-3 py-2 text-right">{t.publicCatalog.requests.quantity}</th><th className="px-3 py-2 text-right">{t.publicCatalog.requests.serverPrice}</th><th className="px-3 py-2 text-right">{t.publicCatalog.requests.amount}</th></tr></thead>
                        <tbody>
                          {request.items.map((item) => (
                            <tr key={item.productId} className="border-t border-slate-100 text-slate-700">
                              <td className="px-3 py-2 font-semibold">{item.productName}<span className="ml-2 text-slate-400">{item.sku}</span></td>
                              <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                              <td className="px-3 py-2 text-right">{money(item.unitPrice, request.currencyCode, locale)}</td>
                              <td className="px-3 py-2 text-right font-bold">{money(item.lineTotal, request.currencyCode, locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {mutable ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                      {request.status === 'SUBMITTED' ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void review(request.id, 'IN_REVIEW')}>
                          {t.publicCatalog.requests.markInReview}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="gap-1 border-red-200 text-red-700" disabled={busy} onClick={() => void review(request.id, 'REJECTED')}>
                        <XCircle className="h-4 w-4" /> {t.publicCatalog.requests.reject}
                      </Button>
                      <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy} onClick={() => void review(request.id, 'ACCEPTED')}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t.publicCatalog.requests.accept}
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </SalesModalFrame>
  );
}
