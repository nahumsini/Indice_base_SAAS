import { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Send,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { QuotesTranslations } from '../translations';
import {
  downloadQuotePdf,
  getQuotePdfBlob,
  getQuotePdfFileName,
  printQuotePdf,
  type QuotePdfContext,
} from '../quotePdf';
import { getQuoteLineExchangeRateLabel } from '../utils/quoteCurrencyConversion';

type QuotePreviewModalProps = {
  quote: SalesQuote | null;
  contact?: SalesContact | null;
  opportunity?: SalesOpportunity | null;
  copy: QuotesTranslations;
  locale?: string;
  onClose: () => void;
};

const previewActionClassNames = getSalesModalActionClassNames('coral');

function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

function getLineTotal(item: SalesQuote['items'][number]) {
  const subtotal = item.quantity * item.unitPrice;
  const discount = subtotal * (item.discountPercent / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (item.taxPercent / 100);
  return taxable + tax;
}

function hasCurrencyConversion(item: SalesQuote['items'][number], quoteCurrency?: string | null) {
  const originalCurrency = item.originalCurrency ?? item.quoteCurrency ?? quoteCurrency;
  const targetCurrency = item.quoteCurrency ?? quoteCurrency;

  return Boolean(originalCurrency && targetCurrency && originalCurrency.toUpperCase() !== targetCurrency.toUpperCase());
}

function getWhatsAppHref(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

function getMailToHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value : 0}%`;
}

function getTaxSummary(quote: SalesQuote, copy: QuotesTranslations) {
  return quote.items
    .map((item) => item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' / ') || copy.common.unassigned;
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

function PreviewInsightCard({
  accentClassName,
  body,
  title,
}: {
  accentClassName: string;
  body: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className={cn('h-3 w-3 rounded-full', accentClassName)} aria-hidden="true" />
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">{body}</p>
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
      <div className="flex min-h-[92px]">
        <span className={cn('w-2 shrink-0', accentClassName)} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
          <p className="truncate text-xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function QuotePreviewModal({
  quote,
  contact,
  opportunity,
  copy,
  locale = 'es-MX',
  onClose,
}: QuotePreviewModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const pdfContext = useMemo<QuotePdfContext | null>(() => (
    quote ? { quote, contact, opportunity, copy, locale } : null
  ), [contact, copy, locale, opportunity, quote]);

  if (!quote || !pdfContext) {
    return null;
  }

  const quoteCurrency = quote.currency ?? 'MXN';
  const isSpanishDocument = locale.toLowerCase().startsWith('es-');
  const itemCount = quote.items.reduce((total, item) => total + item.quantity, 0);
  const estimatedCost = quote.items.reduce((total, item) => (
    total + item.quantity * (item.convertedUnitCost ?? item.unitCost ?? item.originalUnitCost ?? 0)
  ), 0);
  const estimatedProfit = quote.total - estimatedCost;
  const estimatedMargin = quote.total > 0 ? Math.round((estimatedProfit / quote.total) * 100) : 0;
  const taxSummary = getTaxSummary(quote, copy);
  const isExpired = new Date(quote.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const hasLowMargin = estimatedMargin < 20;
  const hasMissingCosts = quote.items.some((item) => !item.unitCost && !item.convertedUnitCost && !item.originalUnitCost);
  const mainRecommendation = quote.items.length === 0
    ? copy.builder.emptyItems
    : isExpired
      ? `${copy.labels.expirationDate}: ${quote.expirationDate}. ${copy.previewModal.defaultTerms}`
      : hasLowMargin
        ? copy.marginGuidance.messages.warning
        : copy.marginGuidance.messages.success;
  const intelligenceLabels = isSpanishDocument
    ? {
      happened: '1. Qué pasó',
      matters: '2. Por qué importa',
      next: '3. Siguiente acción',
      decisionSignal: 'Señal de decisión',
      happenedBody: `${quote.clientName} recibió una cotización por ${formatCurrency(quote.total, quoteCurrency)} con ${quote.items.length} partida(s) comerciales.`,
      mattersBody: `${copy.labels.expirationDate}: ${quote.expirationDate}. ${copy.labels.taxTotal}: ${formatCurrency(quote.taxTotal, quoteCurrency)}. ${copy.labels.currency}: ${quoteCurrency}.`,
    }
    : {
      happened: '1. What happened',
      matters: '2. Why it matters',
      next: '3. Next action',
      decisionSignal: 'Decision signal',
      happenedBody: `${quote.clientName} received a quote for ${formatCurrency(quote.total, quoteCurrency)} covering ${quote.items.length} commercial line(s).`,
      mattersBody: `${copy.labels.expirationDate}: ${quote.expirationDate}. ${copy.labels.taxTotal}: ${formatCurrency(quote.taxTotal, quoteCurrency)}. ${copy.labels.currency}: ${quoteCurrency}.`,
    };
  const metricCards = [
    { label: copy.labels.total, value: formatCurrency(quote.total, quoteCurrency), accent: 'bg-[#FF6B5E]' },
    { label: copy.labels.currency, value: quoteCurrency, accent: 'bg-[#2563EB]' },
    { label: copy.summary.items, value: String(itemCount), accent: 'bg-[#2563EB]' },
    {
      label: copy.pricing.estimatedMargin,
      value: formatPercent(estimatedMargin),
      accent: hasLowMargin ? 'bg-[#FF6B5E]' : 'bg-[#59C3A5]',
    },
    { label: copy.labels.subtotal, value: formatCurrency(quote.subtotal, quoteCurrency), accent: 'bg-[#F4C84A]' },
    { label: copy.labels.taxTotal, value: formatCurrency(quote.taxTotal, quoteCurrency), accent: 'bg-[#F4C84A]' },
    {
      label: copy.pricing.estimatedProfit,
      value: formatCurrency(estimatedProfit, quoteCurrency),
      accent: estimatedProfit < 0 ? 'bg-[#FF6B5E]' : 'bg-[#59C3A5]',
    },
    {
      label: copy.labels.expirationDate,
      value: quote.expirationDate,
      accent: isExpired ? 'bg-[#FF6B5E]' : 'bg-[#2563EB]',
    },
  ];

  const whatsappMessage = copy.previewModal.whatsappMessage(
    quote.clientName,
    quote.quoteNumber,
    formatCurrency(quote.total, quoteCurrency),
    quote.expirationDate,
  );
  const emailSubject = copy.previewModal.emailSubject(quote.quoteNumber);
  const emailBody = copy.previewModal.emailBody(
    quote.clientName,
    quote.quoteNumber,
    formatCurrency(quote.total, quoteCurrency),
    quote.expirationDate,
  );
  const whatsappHref = contact?.phone ? getWhatsAppHref(contact.phone, whatsappMessage) : undefined;
  const emailHref = contact?.email ? getMailToHref(contact.email, emailSubject, emailBody) : undefined;

  const handlePrint = () => {
    printQuotePdf(pdfContext);
  };

  const handleDownload = () => {
    downloadQuotePdf(pdfContext);
  };

  const handleSharePdf = async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }

    setIsSharing(true);
    try {
      const blob = getQuotePdfBlob(pdfContext);
      const file = new File([blob], getQuotePdfFileName(quote), { type: 'application/pdf' });
      const sharePayload = {
        title: emailSubject,
        text: whatsappMessage,
        files: [file],
      };

      if ('canShare' in navigator && !navigator.canShare(sharePayload)) {
        handleDownload();
        return;
      }

      await navigator.share(sharePayload);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SalesModalFrame
      open={Boolean(quote)}
      onOpenChange={(open) => !open && onClose()}
      title={copy.previewModal.title}
      description={copy.previewModal.description}
      icon={<FileText className="h-6 w-6" />}
      contentClassName="flex h-[92vh] max-h-[920px] w-[calc(100vw-2rem)] max-w-[1180px] flex-col sm:max-w-[1180px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5 dark:bg-slate-950"
      footerClassName="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      footer={(
        <>
          <div className="text-xs font-semibold text-white/85">
            {copy.previewModal.shareHint}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', previewActionClassNames.secondary)}
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {copy.previewModal.download}
            </Button>
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', previewActionClassNames.secondary)}
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              {copy.previewModal.print}
            </Button>
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', previewActionClassNames.secondary)}
              asChild={Boolean(whatsappHref)}
              disabled={!whatsappHref}
              title={!whatsappHref ? copy.previewModal.noPhone : undefined}
            >
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {copy.previewModal.whatsapp}
                </a>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  {copy.previewModal.whatsapp}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', previewActionClassNames.secondary)}
              asChild={Boolean(emailHref)}
              disabled={!emailHref}
              title={!emailHref ? copy.previewModal.noEmail : undefined}
            >
              {emailHref ? (
                <a href={emailHref}>
                  <Mail className="h-4 w-4" />
                  {copy.previewModal.emailAction}
                </a>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {copy.previewModal.emailAction}
                </>
              )}
            </Button>
            <Button
              className={cn('h-10 gap-2 px-4 text-sm font-semibold', previewActionClassNames.primary)}
              onClick={handleSharePdf}
              disabled={isSharing}
            >
              <Send className="h-4 w-4" />
              {copy.previewModal.sharePdf}
            </Button>
          </div>
        </>
      )}
    >
          <article className="mx-auto min-h-[980px] w-full max-w-[880px] bg-white px-10 py-9 shadow-xl ring-1 ring-slate-200 sm:px-12">
            <header className="border-b border-slate-200 pb-7">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-slate-500">{copy.table.columns.number}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{quote.quoteNumber}</p>
                </div>
                <div className="text-left md:text-center">
                  <p className="text-2xl font-black text-slate-950">{copy.previewModal.documentTitle}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-normal text-slate-500">
                    {copy.previewModal.documentEyebrow}
                  </p>
                </div>
                <div className="text-left text-sm font-semibold text-slate-500 md:text-right">
                  <p>{copy.labels.createdDate}: {quote.createdDate}</p>
                  <p className="mt-1">{copy.labels.expirationDate}: {quote.expirationDate}</p>
                </div>
              </div>

              <div className="mt-5">
                <PreviewBrandBar />
              </div>

              <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-[#B63B32]">
                    {copy.previewModal.documentLabel}
                  </p>
                  <h1 className="mt-3 text-5xl font-black leading-[0.95] text-slate-950">
                    {copy.previewModal.documentTitle}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                    {copy.previewModal.documentSubtitle}
                  </p>
                </div>
                <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FFF3F1] p-5 text-right">
                  <p className="text-xs font-bold uppercase tracking-normal text-[#B63B32]">
                    {copy.labels.total} · {quoteCurrency}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(quote.total, quoteCurrency)}</p>
                </div>
              </div>
            </header>

            <section className="grid gap-4 border-b border-slate-200 py-7 lg:grid-cols-3">
              <PreviewInsightCard
                accentClassName="bg-[#FF6B5E]"
                title={intelligenceLabels.happened}
                body={intelligenceLabels.happenedBody}
              />
              <PreviewInsightCard
                accentClassName="bg-[#F4C84A]"
                title={intelligenceLabels.matters}
                body={intelligenceLabels.mattersBody}
              />
              <PreviewInsightCard
                accentClassName={hasLowMargin || isExpired ? 'bg-[#FF6B5E]' : 'bg-[#59C3A5]'}
                title={intelligenceLabels.next}
                body={mainRecommendation}
              />
            </section>

            <section className="grid gap-4 border-b border-slate-200 py-7 sm:grid-cols-2 lg:grid-cols-4">
              {metricCards.map((card) => (
                <PreviewMetricCard
                  key={card.label}
                  accentClassName={card.accent}
                  label={card.label}
                  value={card.value}
                />
              ))}
            </section>

            <section className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-normal text-slate-500">{copy.previewModal.clientBlock}</p>
                <h2 className="mt-3 text-xl font-black text-slate-950">{quote.clientName}</h2>
                <p className="mt-1 font-semibold text-slate-600">{quote.contactPerson}</p>
                <div className="mt-4 space-y-1 text-sm font-medium text-slate-500">
                  <p>{copy.previewModal.phone}: {contact?.phone ?? copy.common.unassigned}</p>
                  <p>{copy.previewModal.email}: {contact?.email ?? copy.common.unassigned}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-normal text-slate-500">{copy.previewModal.commercialBlock}</p>
                <h2 className="mt-3 text-xl font-black text-slate-950">{quote.assignedSeller}</h2>
                <div className="mt-4 grid gap-2 text-sm font-medium text-slate-500">
                  <p>{copy.labels.opportunity}: {opportunity?.opportunityName ?? copy.common.unassigned}</p>
                  <p>{copy.labels.status}: {copy.statusLabels[quote.status]}</p>
                  <p>{copy.labels.currency}: {quoteCurrency}</p>
                  <p>{copy.taxBuilder.taxPreset}: {taxSummary}</p>
                </div>
              </div>
            </section>

            <section className="py-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-black text-slate-950">{copy.previewModal.itemsTitle}</h2>
                <span className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-[#B63B32]">
                  {copy.statusLabels[quote.status]}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-3 font-black">{copy.labels.product}</th>
                      <th className="px-3 py-3 font-black">{copy.labels.section}</th>
                      <th className="px-3 py-3 text-center font-black">{copy.labels.quantity}</th>
                      <th className="px-3 py-3 text-right font-black">{copy.labels.unitPrice}</th>
                      <th className="px-3 py-3 text-center font-black">{copy.labels.discount}</th>
                      <th className="px-3 py-3 text-center font-black">{copy.labels.tax}</th>
                      <th className="px-3 py-3 text-right font-black">{copy.previewModal.lineTotal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                          {copy.builder.emptyItems}
                        </td>
                      </tr>
                    ) : quote.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                        <td className="max-w-[240px] px-3 py-4">
                          <p className="font-black text-slate-950">{item.productName}</p>
                          <p className="mt-1 font-semibold text-slate-500">{item.sku}</p>
                          {hasCurrencyConversion(item, quoteCurrency) ? (
                            <p className="mt-1 font-semibold leading-5 text-[#7C5604]">
                              {copy.pricing.catalogPrice}: {formatCurrency(item.originalUnitPrice ?? item.unitPrice, item.originalCurrency)} · {copy.pricing.exchangeRate}: 1 {item.originalCurrency} = {getQuoteLineExchangeRateLabel(item.exchangeRate)} {item.quoteCurrency ?? quoteCurrency} · {item.exchangeRateDate}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 font-bold text-slate-600">{item.section || copy.common.unassigned}</td>
                        <td className="px-3 py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-4 text-right font-bold text-slate-700">{formatCurrency(item.unitPrice, quoteCurrency)}</td>
                        <td className="px-3 py-4 text-center font-bold text-slate-700">{item.discountPercent}%</td>
                        <td className="px-3 py-4 text-center font-bold text-slate-700">
                          {item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`}
                        </td>
                        <td className="px-3 py-4 text-right font-black text-slate-950">{formatCurrency(getLineTotal(item), quoteCurrency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_300px]">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-black uppercase tracking-normal text-slate-500">{copy.labels.notes}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{quote.notes || copy.previewModal.noNotes}</p>
                </div>
                <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FFF3F1] p-5">
                  <p className="mb-2 text-xs font-black uppercase tracking-normal text-[#B63B32]">{copy.labels.currency}: {quoteCurrency}</p>
                  {[
                    [copy.labels.subtotal, quote.subtotal],
                    [copy.labels.discountTotal, quote.discountTotal],
                    [copy.labels.taxTotal, quote.taxTotal],
                    [copy.labels.total, quote.total],
                  ].map(([label, value], index, rows) => (
                    <div
                      key={label}
                      className={cn(
                        'flex items-center justify-between py-2 text-sm',
                        index === rows.length - 1 && 'mt-2 border-t border-[#FF6B5E]/25 pt-4 text-lg font-black text-slate-950',
                      )}
                    >
                      <span className="font-bold text-slate-600">{label}</span>
                      <span className="font-black text-slate-950">{formatCurrency(Number(value), quoteCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-black uppercase tracking-normal text-slate-500">{copy.labels.terms}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{quote.terms || copy.previewModal.defaultTerms}</p>
              </div>

              <div className={cn(
                'mt-5 rounded-lg border p-5',
                hasMissingCosts || hasLowMargin
                  ? 'border-[#FF6B5E]/25 bg-[#FFF3F1]'
                  : 'border-[#59C3A5]/30 bg-[#F3FCF8]',
              )}
              >
                <h3 className="text-sm font-black uppercase tracking-normal text-slate-700">{intelligenceLabels.decisionSignal}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {hasMissingCosts
                    ? copy.marginGuidance.messages.missingCost
                    : `${copy.pricing.estimatedMargin}: ${formatPercent(estimatedMargin)}. ${mainRecommendation}`}
                </p>
              </div>
            </section>
          </article>
    </SalesModalFrame>
  );
}
