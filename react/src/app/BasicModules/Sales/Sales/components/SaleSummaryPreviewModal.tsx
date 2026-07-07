import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesQuote } from '../../types';
import { defaultSalesCurrency, formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SaleRecordDraft } from '../types/salesTypes';
import {
  downloadSaleInvoicePdf,
  printSaleInvoicePdf,
  type SaleInvoicePdfContext,
} from '../utils/saleInvoicePdf';

const actionClassNames = getSalesModalActionClassNames('coral');

function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

function getLineTotal({
  quantity,
  unitPrice,
  discountPercent,
  taxPercent,
  subtotal,
}: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  subtotal?: number;
}) {
  const grossSubtotal = quantity * unitPrice;
  const discount = grossSubtotal * (discountPercent / 100);
  const taxable = subtotal ?? Math.max(grossSubtotal - discount, 0);

  return taxable + (taxable * (taxPercent / 100));
}

function getTaxIdentifierLabel(country?: string, fallback?: string, defaultLabel = 'Tax ID') {
  if (fallback) {
    return fallback;
  }

  const countryLabels: Record<string, string> = {
    BR: 'CNPJ / CPF',
    CA: 'BN / GST-HST',
    CO: 'NIT',
    MX: 'RFC',
    US: 'EIN / Sales Tax ID',
  };

  return countryLabels[String(country ?? '').toUpperCase()] ?? defaultLabel;
}

function PreviewBrandBar() {
  return (
    <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
      <span className="w-[34%] bg-[#FF6B5E]" />
      <span className="w-[22%] bg-[#F4C84A]" />
      <span className="w-[22%] bg-[#59C3A5]" />
      <span className="w-[22%] bg-[#2563EB]" />
    </div>
  );
}

function PreviewMetricCard({
  accentClassName,
  label,
  value,
}: {
  accentClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex min-h-[88px]">
        <span className={cn('w-2 shrink-0', accentClassName)} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="truncate text-xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function SaleSummaryPreviewModal({
  open,
  sale,
  quote,
  t,
  onOpenChange,
}: {
  open: boolean;
  sale: SaleRecord | SaleRecordDraft | null;
  quote?: SalesQuote | null;
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  if (!sale) {
    return null;
  }

  const currency = sale.currency || defaultSalesCurrency;
  const operationalContext = getSalesOperationalContext(sale.businessId);
  const saleLines = sale.saleLines ?? [];
  const quoteLines = quote?.items ?? [];
  const itemCount = saleLines.length
    ? saleLines.reduce((total, item) => total + item.quantity, 0)
    : quoteLines.reduce((total, item) => total + item.quantity, 0);
  const locale = typeof navigator === 'undefined' ? 'es-MX' : navigator.language || 'es-MX';
  const pdfContext: SaleInvoicePdfContext = {
    sale,
    quote,
    operationalContext,
    copy: t,
    locale,
  };
  const invoiceNumber = sale.saleNumber || sale.saleDocumentReference || quote?.quoteNumber || t.common.notAvailable;

  const handleDownload = () => {
    downloadSaleInvoicePdf(pdfContext);
  };

  const handlePrint = () => {
    printSaleInvoicePdf(pdfContext);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<FileText className="h-6 w-6" />}
      title={t.summaryPreview.title}
      description={t.summaryPreview.description}
      contentClassName="flex h-[92vh] max-h-[920px] w-[calc(100vw-2rem)] max-w-[1180px] flex-col sm:max-w-[1180px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5 dark:bg-slate-950"
      footerClassName="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      footer={(
        <>
          <div className="text-xs font-semibold text-white/85">
            {t.summaryPreview.footerNote}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', actionClassNames.secondary)}
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {t.invoice.download}
            </Button>
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', actionClassNames.secondary)}
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              {t.invoice.print}
            </Button>
            <Button type="button" className={cn('h-10 px-4 text-sm font-semibold', actionClassNames.primary)} onClick={() => onOpenChange(false)}>
              {t.common.close}
            </Button>
          </div>
        </>
      )}
    >
      <article className="mx-auto min-h-[900px] w-full max-w-[880px] bg-white px-10 py-9 shadow-xl ring-1 ring-slate-200 sm:px-12">
        <header className="border-b border-slate-200 pb-7">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t.invoice.number}</p>
              <p className="mt-1 text-lg font-black text-slate-950">{invoiceNumber}</p>
            </div>
            <div className="text-left md:text-center">
              <p className="text-2xl font-black text-slate-950">{t.invoice.documentTitle}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {t.invoice.documentLabel}
              </p>
            </div>
            <div className="text-left text-sm font-semibold text-slate-500 md:text-right">
              <p>{t.modal.fields.saleDate}: {sale.saleDate || t.common.notAvailable}</p>
              <p className="mt-1">{t.modal.fields.quoteReference}: {sale.quoteReference || quote?.quoteNumber || t.common.notAvailable}</p>
            </div>
          </div>

          <div className="mt-5">
            <PreviewBrandBar />
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B63B32]">
                {t.invoice.documentLabel}
              </p>
              <h1 className="mt-3 text-5xl font-black leading-[0.95] text-slate-950">
                {t.invoice.documentTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                {t.invoice.subtitle}
              </p>
            </div>
            <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FFF3F1] p-5 text-right">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B63B32]">
                {t.modal.fields.totalAmount} · {currency}
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(sale.totalAmount, currency)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 border-b border-slate-200 py-7 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewMetricCard accentClassName="bg-[#FF6B5E]" label={t.modal.fields.totalAmount} value={formatCurrency(sale.totalAmount, currency)} />
          <PreviewMetricCard accentClassName="bg-[#2563EB]" label={t.modal.fields.currency} value={currency} />
          <PreviewMetricCard accentClassName="bg-[#59C3A5]" label={t.modal.workspace.itemsLabel} value={String(itemCount)} />
          <PreviewMetricCard accentClassName="bg-[#F4C84A]" label={t.modal.fields.taxTotal} value={formatCurrency(sale.taxTotal, currency)} />
        </section>

        <section className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t.invoice.billTo}</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">{sale.customerName || t.common.notAvailable}</h2>
            <div className="mt-4 space-y-1 text-sm font-medium text-slate-500">
              <p>{t.modal.fields.sellerName}: {sale.sellerName || t.common.notAvailable}</p>
              <p>{t.modal.fields.paymentMethod}: {sale.paymentMethod || t.common.notAvailable}</p>
              <p>{t.modal.fields.paymentReference}: {sale.paymentReference || t.common.notAvailable}</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t.invoice.issuedBy}</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">{operationalContext.legalName || t.common.notAvailable}</h2>
            <div className="mt-4 grid gap-2 text-sm font-medium text-slate-500">
              <p>{operationalContext.fiscalAddress || ''}</p>
              <p>{getTaxIdentifierLabel(operationalContext.country, operationalContext.taxIdentifierLabel, t.modal.operationalContext.taxIdentifier)}: {operationalContext.taxIdentifier || ''}</p>
              <p>{t.modal.fields.businessUnit}: {sale.businessUnitName || t.common.notAvailable}</p>
              <p>{t.modal.fields.business}: {sale.businessName || t.common.notAvailable}</p>
            </div>
          </div>
        </section>

        <section className="py-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">{t.invoice.itemsTitle}</h2>
            <span className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#B63B32]">
              {t.invoice.documentLabel}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-3 font-black">{t.modal.summaryColumns.item}</th>
                  <th className="px-3 py-3 font-black">{t.modal.summaryColumns.sku}</th>
                  <th className="px-3 py-3 text-center font-black">{t.modal.summaryColumns.quantity}</th>
                  <th className="px-3 py-3 text-right font-black">{t.modal.summaryColumns.unitPrice}</th>
                  <th className="px-3 py-3 text-center font-black">{t.modal.summaryColumns.tax}</th>
                  <th className="px-3 py-3 text-right font-black">{t.modal.summaryColumns.total}</th>
                </tr>
              </thead>
              <tbody>
                {saleLines.length === 0 && quoteLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      {t.summaryPreview.noProducts}
                    </td>
                  </tr>
                ) : null}
                {saleLines.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                    <td className="max-w-[240px] px-3 py-4">
                      <p className="font-black text-slate-950">{item.productName}</p>
                    </td>
                    <td className="px-3 py-4 font-bold text-slate-600">{item.sku}</td>
                    <td className="px-3 py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="px-3 py-4 text-right font-bold text-slate-700">{formatCurrency(item.unitPrice, currency)}</td>
                    <td className="px-3 py-4 text-center font-bold text-slate-700">{item.taxPercent}%</td>
                    <td className="px-3 py-4 text-right font-black text-slate-950">{formatCurrency(getLineTotal(item), currency)}</td>
                  </tr>
                ))}
                {!saleLines.length ? quoteLines.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                    <td className="max-w-[240px] px-3 py-4">
                      <p className="font-black text-slate-950">{item.productName}</p>
                    </td>
                    <td className="px-3 py-4 font-bold text-slate-600">{item.sku}</td>
                    <td className="px-3 py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="px-3 py-4 text-right font-bold text-slate-700">{formatCurrency(item.unitPrice, currency)}</td>
                    <td className="px-3 py-4 text-center font-bold text-slate-700">{item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`}</td>
                    <td className="px-3 py-4 text-right font-black text-slate-950">{formatCurrency(getLineTotal(item), currency)}</td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{t.modal.fields.notes}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{sale.notes || t.invoice.defaultNotes}</p>
            </div>
            <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FFF3F1] p-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">{t.modal.fields.currency}: {currency}</p>
              {[
                [t.invoice.subtotal, sale.subtotal],
                [t.invoice.discount, sale.discountTotal],
                [t.modal.fields.taxTotal, sale.taxTotal],
                [t.invoice.total, sale.totalAmount],
              ].map(([label, value], index, rows) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center justify-between py-2 text-sm',
                    index === rows.length - 1 && 'mt-2 border-t border-[#FF6B5E]/25 pt-4 text-lg font-black text-slate-950',
                  )}
                >
                  <span className="font-bold text-slate-600">{label}</span>
                  <span className="font-black text-slate-950">{formatCurrency(Number(value), currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{t.invoice.disclaimerTitle}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{t.invoice.disclaimerBody}</p>
          </div>
        </section>
      </article>
    </SalesModalFrame>
  );
}
