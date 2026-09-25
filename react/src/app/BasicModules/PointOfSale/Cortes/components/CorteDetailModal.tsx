import { closingTicket, printPosOperationTicket, reservePosTicketWindow } from '../../shared/posOperationTickets';
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, Download, Loader2, Printer, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { escapeDocumentPrintHtml, printDocumentHtml } from '../../../shared/print/documentHtmlPrintEngine';
import {
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from '../../../shared/print/documentPrintContract';
import type { PointOfSaleLocale } from '../../translations';
import type { CortesCopy } from '../cortesTranslations';
import { CortesModalFrame } from './CortesModalFrame';
import type { PosCashClosingDetailResponse, PosCashClosingSettlement } from '../types/cashClosingHistory.types';
import { formatCurrency, formatDateTime, getPaymentTotal, toNumber } from '../utils/cortesUtils';
import { cashClosingsApi } from '../services/cashClosingsApi';

interface CorteDetailModalProps {
  copy: CortesCopy;
  detail: PosCashClosingDetailResponse | null;
  error: string;
  locale: PointOfSaleLocale;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export function CorteDetailModal({
  copy,
  detail,
  error,
  locale,
  loading,
  open,
  onClose,
  onDownload,
}: CorteDetailModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [settlements, setSettlements] = useState<PosCashClosingSettlement[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const [confirmingSettlementId, setConfirmingSettlementId] = useState<number | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<Record<number, number>>({});
  const [settlementNotes, setSettlementNotes] = useState<Record<number, string>>({});
  const currencyCode = detail?.shift?.currencyCode ?? 'MXN';
  const difference = toNumber(detail?.overShortAmount);
  const settlementCopy = copy.detail.settlement;

  useEffect(() => {
    if (!open || !detail) {
      setSettlements([]);
      setSettlementError('');
      return;
    }
    let cancelled = false;
    setSettlementsLoading(true);
    setSettlementError('');
    void cashClosingsApi.settlements(detail.id)
      .then((items) => {
        if (cancelled) return;
        setSettlements(items);
        setReceivedAmounts(Object.fromEntries(items.map((item) => [item.id, toNumber(item.pendingAmount)])));
        setSettlementNotes({});
      })
      .catch((requestError) => {
        if (!cancelled) setSettlementError(requestError instanceof Error ? requestError.message : settlementCopy.loadError);
      })
      .finally(() => { if (!cancelled) setSettlementsLoading(false); });
    return () => { cancelled = true; };
  }, [detail, open, settlementCopy.loadError]);

  const confirmSettlement = async (settlement: PosCashClosingSettlement) => {
    const receivedAmount = receivedAmounts[settlement.id];
    if (!Number.isFinite(receivedAmount) || receivedAmount < 0) return;
    setConfirmingSettlementId(settlement.id);
    setSettlementError('');
    try {
      const updated = await cashClosingsApi.confirmSettlement(detail!.id, settlement.id, {
        receivedAmount,
        note: settlementNotes[settlement.id]?.trim() || undefined,
      });
      setSettlements((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setSettlementError(requestError instanceof Error ? requestError.message : settlementCopy.confirmError);
    } finally {
      setConfirmingSettlementId(null);
    }
  };
  const handleTicketPrint = async () => {
    if (!detail) return;
    const target = reservePosTicketWindow();
    try {
      const result = await cashClosingsApi.list({ shiftId: detail.shiftId });
      const row = result.items.find(item => item.id === detail.id);
      if (!printPosOperationTicket(closingTicket({ ...row, ...detail }, locale), target)) {
        setSettlementError('Habilita las ventanas emergentes y vuelve a imprimir el ticket.');
      }
    } catch {
      target?.close();
      setSettlementError('No se pudo preparar el ticket del corte. Reintenta imprimir.');
    }
  };
  const handlePrint = () => {
    if (!detail || !documentRef.current) return;
    const folio = `COR-${detail.id}`;
    const generatedAt = formatDocumentPrintDateTime(new Date(), locale);
    const printLabels = getDocumentPrintLabels(locale);
    printDocumentHtml({
      bodyHtml: `
        <main class="print-corte">
          <header class="print-header">
            <div><p>${escapeDocumentPrintHtml(copy.detail.printControl)}</p><h1>${escapeDocumentPrintHtml(copy.detail.printTitle)}</h1></div>
            <div class="print-meta"><strong>${escapeDocumentPrintHtml(folio)}</strong><span>${escapeDocumentPrintHtml(formatDateTime(detail.closedAt))}</span></div>
          </header>
          ${documentRef.current.outerHTML}
          <footer class="print-footer"><span>${escapeDocumentPrintHtml(printLabels.updated)}: ${escapeDocumentPrintHtml(generatedAt)}</span><span>${escapeDocumentPrintHtml(folio)}</span></footer>
        </main>`,
      contentStyles: `
        body { padding: 12mm 14mm 10mm; }
        .print-corte { color: #24272c; }
        .print-header { align-items: end; border-bottom: 1px solid #cfd4d8; display: flex; justify-content: space-between; margin-bottom: 8mm; padding-bottom: 4mm; }
        .print-header p, .print-header h1 { margin: 0; }
        .print-header p { color: #68717b; font-size: 9pt; font-weight: 400; }
        .print-header h1 { font-size: 24pt; font-weight: 500; margin-top: 2mm; }
        .print-meta { display: grid; font-size: 9pt; gap: 1mm; text-align: right; }
        .print-meta strong { font-weight: 500; }
        .print-footer { border-top: 1px solid #d8dadd; color: #737b84; display: flex; font-size: 8pt; justify-content: space-between; margin-top: 8mm; padding-top: 3mm; }
        [class*="shadow"] { box-shadow: none !important; }
        .no-print { display: none !important; }
        section, [class*="rounded"] { break-inside: avoid; }
      `,
      documentTitle: `cash-closing_${folio}`,
      includeApplicationStyles: true,
      locale,
      pageSize: 'a4',
    });
  };

  return (
    <CortesModalFrame
      modalType="operational-workspace"
      closeLabel={copy.detail.closeLabel}
      eyebrow={copy.detail.eyebrow}
      icon={<ReceiptText className="h-5 w-5" />}
      onClose={onClose}
      open={open}
      size="xl"
      title={copy.detail.title}
      subtitle={detail ? `COR-${detail.id} - ${formatDateTime(detail.closedAt)}` : copy.detail.loadingSubtitle}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={!detail} onClick={() => void handleTicketPrint()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-medium"><Printer className="h-4 w-4" /> Ticket 80 mm</button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            {copy.detail.print}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#222831] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#111827]"
          >
            <Download className="h-4 w-4" />
            {copy.detail.download}
          </button>
        </div>
      )}
    >
      {loading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          {copy.detail.loading}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {detail ? (
        <div ref={documentRef} className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium tracking-normal text-[#B63B32] dark:text-[#FFB0AA]">{copy.detail.operationalClosing}</p>
                  <h4 className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">
                    {detail.cashRegister?.name ?? copy.common.cashRegister(detail.cashRegisterId)}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {copy.common.warehouse(detail.warehouseId)} - {copy.common.shift(detail.shiftId)} - {copy.common.user(detail.closedByUserId)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  difference === 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
                }`}>
                  {difference === 0 ? copy.detail.statusBalanced : copy.detail.statusWithDifference}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoTile label={copy.detail.opening} value={formatDateTime(detail.shift?.openedAt)} />
                <InfoTile label={copy.detail.closing} value={formatDateTime(detail.closedAt)} />
                <InfoTile label={copy.detail.currency} value={currencyCode} />
              </div>
            </div>

            <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
              <p className="text-xs font-medium tracking-normal text-[#B63B32] dark:text-[#FFB0AA]">{copy.detail.summary}</p>
              <p className="mt-3 text-4xl font-medium text-slate-950 dark:text-white">
                {formatCurrency(toNumber(detail.totalSalesAmount), currencyCode)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {copy.detail.processedTickets(detail.ticketsCount)}
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Banknote className="h-5 w-5" />} label={copy.detail.expectedCash} value={formatCurrency(toNumber(detail.expectedCashAmount), currencyCode)} />
            <MetricCard icon={<Banknote className="h-5 w-5" />} label={copy.detail.countedCash} value={formatCurrency(toNumber(detail.countedCashAmount), currencyCode)} />
            <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label={copy.detail.difference} value={`${difference > 0 ? '+' : ''}${formatCurrency(difference, currencyCode)}`} tone={difference === 0 ? 'success' : 'warning'} />
            <MetricCard icon={<ReceiptText className="h-5 w-5" />} label={copy.detail.refunds} value={formatCurrency(toNumber(detail.totalRefundsAmount), currencyCode)} />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <DetailSection icon={<CreditCard className="h-5 w-5" />} title={copy.detail.paymentMethods}>
              <LineItem label={copy.detail.cash} value={formatCurrency(getPaymentTotal(detail, 'CASH'), currencyCode)} />
              <LineItem label={copy.detail.card} value={formatCurrency(getPaymentTotal(detail, 'CARD'), currencyCode)} />
              <LineItem label={copy.detail.transfer} value={formatCurrency(getPaymentTotal(detail, 'TRANSFER'), currencyCode)} />
              <LineItem label={copy.detail.credit} value={formatCurrency(getPaymentTotal(detail, 'CREDIT'), currencyCode)} />
              <LineItem label={copy.detail.wallet} value={formatCurrency(getPaymentTotal(detail, 'WALLET'), currencyCode)} />
            </DetailSection>

            <DetailSection icon={<TrendingUp className="h-5 w-5" />} title={copy.detail.cashMovements}>
              <LineItem label={copy.detail.opening} value={formatCurrency(toNumber(detail.openingCashAmount), currencyCode)} />
              <LineItem label={copy.detail.cashSales} value={formatCurrency(toNumber(detail.cashSalesAmount), currencyCode)} />
              <LineItem label={copy.detail.cashIn} value={formatCurrency(toNumber(detail.cashInAmount), currencyCode)} />
              <LineItem label={copy.detail.corrections} value={formatCurrency(toNumber(detail.correctionAmount), currencyCode)} />
            </DetailSection>

            <DetailSection icon={<TrendingDown className="h-5 w-5" />} title={copy.detail.outflows}>
              <LineItem label={copy.detail.cashOut} value={formatCurrency(toNumber(detail.cashOutAmount), currencyCode)} />
              <LineItem label={copy.detail.safeDrops} value={formatCurrency(toNumber(detail.safeDropAmount), currencyCode)} />
              <LineItem label={copy.detail.operatingDifference} value={formatCurrency(difference, currencyCode)} />
            </DetailSection>

            <DetailSection icon={<ReceiptText className="h-5 w-5" />} title={copy.detail.logbook}>
              <LineItem label={copy.filters.cashRegister} value={detail.cashRegister?.code ?? copy.common.cashRegister(detail.cashRegisterId)} />
              <LineItem label={copy.detail.unitLabel} value={detail.unitId ? copy.detail.unit(detail.unitId) : copy.detail.noUnit} />
              <LineItem label={copy.detail.businessLabel} value={detail.businessId ? copy.detail.business(detail.businessId) : copy.detail.noBusiness} />
              <LineItem label={copy.detail.notes} value={detail.notes || copy.detail.noNotes} />
            </DetailSection>

            <div className="lg:col-span-2">
              <DetailSection icon={<LandmarkSettlementIcon />} title={settlementCopy.title}>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {settlementCopy.description}
                </p>
                {settlementsLoading ? <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800"><Loader2 className="h-4 w-4 animate-spin" />{settlementCopy.loading}</div> : null}
                {settlementError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{settlementError}</div> : null}
                {!settlementsLoading && settlements.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700">{settlementCopy.empty}</div> : null}
                {settlements.map((settlement) => {
                  const pending = settlement.status === 'PENDING';
                  const variance = toNumber(settlement.varianceAmount);
                  return <div key={settlement.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <strong className="text-sm font-medium text-slate-950 dark:text-white">{settlementCopy.methods[settlement.paymentMethod]}</strong>
                        <p className="mt-1 text-xs text-slate-500">{settlement.destinationPaymentAccountName ?? settlementCopy.account(settlement.destinationPaymentAccountId)}</p>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pending ? 'bg-amber-100 text-amber-800' : variance === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {pending ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {settlementCopy.statuses[settlement.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <InfoTile label={settlementCopy.collected} value={formatCurrency(toNumber(settlement.grossAmount), settlement.currencyCode)} />
                      <InfoTile label={settlementCopy.toTransfer} value={formatCurrency(toNumber(settlement.transferableAmount), settlement.currencyCode)} />
                      <InfoTile label={pending ? settlementCopy.pending : settlementCopy.confirmed} value={formatCurrency(pending ? toNumber(settlement.pendingAmount) : toNumber(settlement.settledAmount), settlement.currencyCode)} />
                    </div>
                    {pending ? <div className="no-print mt-3 grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{settlementCopy.receivedAmount}
                        <input type="number" min="0" step="0.01" value={receivedAmounts[settlement.id] ?? ''} onChange={(event) => setReceivedAmounts((current) => ({ ...current, [settlement.id]: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-950" />
                      </label>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{settlementCopy.confirmationNote}
                        <input type="text" maxLength={500} value={settlementNotes[settlement.id] ?? ''} onChange={(event) => setSettlementNotes((current) => ({ ...current, [settlement.id]: event.target.value }))} placeholder={settlementCopy.confirmationNoteHint} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-950" />
                      </label>
                      <button type="button" disabled={confirmingSettlementId === settlement.id} onClick={() => void confirmSettlement(settlement)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-medium text-white transition hover:bg-[#e65b50] disabled:opacity-60">
                        {confirmingSettlementId === settlement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {settlementCopy.confirm}
                      </button>
                    </div> : null}
                    {!pending && variance !== 0 ? <p className="mt-3 text-xs font-medium text-red-600">{settlementCopy.variance}: {formatCurrency(variance, settlement.currencyCode)}</p> : null}
                  </div>;
                })}
              </DetailSection>
            </div>
          </section>
        </div>
      ) : null}
    </CortesModalFrame>
  );
}

function LandmarkSettlementIcon() {
  return <Banknote className="h-5 w-5" />;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-medium tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  tone = 'neutral',
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
  value: string;
}) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
    : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
        {icon}
        <p className="text-xs font-medium tracking-normal">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-medium">{value}</p>
    </div>
  );
}

function DetailSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-[#FF6B5E]">
        {icon}
        <h4 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h4>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 dark:border-slate-800">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}
