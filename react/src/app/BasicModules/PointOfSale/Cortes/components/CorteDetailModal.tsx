import { AlertTriangle, Banknote, CreditCard, Download, Printer, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { escapeDocumentPrintHtml, printDocumentHtml } from '../../../shared/print/documentHtmlPrintEngine';
import {
  documentPrintAttribution,
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from '../../../shared/print/documentPrintContract';
import type { PointOfSaleLocale } from '../../translations';
import type { CortesCopy } from '../cortesTranslations';
import { CortesModalFrame } from './CortesModalFrame';
import type { PosCashClosingDetailResponse } from '../types/cashClosingHistory.types';
import { formatCurrency, formatDateTime, getPaymentTotal, toNumber } from '../utils/cortesUtils';

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
  const currencyCode = detail?.shift?.currencyCode ?? 'MXN';
  const difference = toNumber(detail?.overShortAmount);
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
          <footer class="print-footer"><span>${documentPrintAttribution} · ${escapeDocumentPrintHtml(printLabels.updated)}: ${escapeDocumentPrintHtml(generatedAt)}</span><span>${escapeDocumentPrintHtml(folio)}</span></footer>
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
          </section>
        </div>
      ) : null}
    </CortesModalFrame>
  );
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
