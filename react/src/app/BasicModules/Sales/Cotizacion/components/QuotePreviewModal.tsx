import { useMemo, useRef, useState } from 'react';
import { ChevronDown, FileText, Loader2, LockKeyhole, Mail, MessageCircle, Printer, Send } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { getWebPrintCopy } from '../../../shared/print/webPrintCopy';
import { StandardDocumentPreview } from '../../../shared/print/StandardDocumentPreview';
import { printStandardDocumentHtml } from '../../../shared/print/standardDocumentHtml';
import type { CompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { QuotesTranslations } from '../translations';
import { getQuotePreviewCopy } from '../translations/quotePreviewCopy';
import { buildQuoteWebDocument, formatQuoteDocumentAmount, getQuotePdfBlob, getQuotePdfFileName, type QuotePdfContext } from '../quotePdf';

type QuotePreviewModalProps = {
  quote: SalesQuote | null;
  contact?: SalesContact | null;
  opportunity?: SalesOpportunity | null;
  company?: CompanyPrintIdentity | null;
  companyReady?: boolean;
  copy: QuotesTranslations;
  locale?: string;
  onClose: () => void;
};
const actions = getSalesModalActionClassNames('coral');

/** The modal session resets zoom, scroll and async feedback for each opened quotation. */
export function QuotePreviewModal(props: QuotePreviewModalProps) {
  return props.quote ? <QuotePreviewSession key={props.quote.id} {...props} quote={props.quote} /> : null;
}
function QuotePreviewSession({ quote, contact, opportunity, company, companyReady = true, copy, locale = 'es-MX', onClose }: QuotePreviewModalProps & { quote: SalesQuote }) {
  const [isSharing, setIsSharing] = useState(false);
  const sharingRef = useRef(false);
  const [shareError, setShareError] = useState('');
  const [zoom, setZoom] = useState('fit');
  const ui = getQuotePreviewCopy(locale);
  const pdfContext = useMemo<QuotePdfContext>(() => ({ quote, contact, opportunity, company, copy, locale, generatedAt: new Date() }), [quote, contact, opportunity, company, copy, locale]);
  const definition = useMemo(() => buildQuoteWebDocument(pdfContext), [pdfContext]);
  const currency = quote.currency ?? 'MXN';
  const amount = (value: number) => formatQuoteDocumentAmount(value, currency);
  // These existing estimates are internal review only, never part of the customer document.
  const cost = quote.items.reduce((total, item) => total + item.quantity * (item.convertedUnitCost ?? item.unitCost ?? item.originalUnitCost ?? 0), 0);
  const profit = quote.total - cost;
  const margin = quote.total > 0 ? Math.round(profit / quote.total * 100) : 0;
  const missingCosts = quote.items.some(item => !item.unitCost && !item.convertedUnitCost && !item.originalUnitCost);
  const expired = new Date(quote.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const guidance = quote.items.length === 0 ? copy.builder.emptyItems : missingCosts ? copy.marginGuidance.messages.missingCost : margin < 20 ? copy.marginGuidance.messages.warning : copy.marginGuidance.messages.success;
  const message = copy.previewModal.whatsappMessage(quote.clientName, quote.quoteNumber, amount(quote.total), quote.expirationDate);
  const subject = copy.previewModal.emailSubject(quote.quoteNumber);
  const emailBody = copy.previewModal.emailBody(quote.clientName, quote.quoteNumber, amount(quote.total), quote.expirationDate);
  const whatsappHref = contact?.phone ? `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : undefined;
  const emailHref = contact?.email ? `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}` : undefined;
  const print = () => { if (companyReady) printStandardDocumentHtml(definition); };
  const share = async () => {
    if (!companyReady || sharingRef.current) return;
    if (!navigator.share) { print(); return; }
    sharingRef.current = true;
    setIsSharing(true);
    setShareError('');
    try {
      const blob = await getQuotePdfBlob(pdfContext);
      const file = new File([blob], getQuotePdfFileName(quote), { type: 'application/pdf' });
      const payload = { title: subject, text: message, files: [file] };
      if (navigator.canShare && !navigator.canShare(payload)) { setShareError(ui.shareError); return; }
      await navigator.share(payload);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareError(ui.shareError);
    } finally { sharingRef.current = false; setIsSharing(false); }
  };
  return (
    <SalesModalFrame open onOpenChange={open => !open && onClose()} busy={isSharing} closeLabel={copy.common.close}
      title={copy.previewModal.title} description={`${quote.quoteNumber} · ${quote.clientName}`}
      icon={<FileText className="h-6 w-6" />} modalType="operational-workspace"
      contentClassName="h-[92dvh]" bodyClassName="!max-h-none min-h-0 flex-1 overflow-y-auto !p-0 xl:overflow-hidden"
      footerLeading={<Button variant="outline" className={actions.secondary} onClick={onClose} disabled={isSharing}>{copy.common.close}</Button>}
      footerSummary={`${quote.quoteNumber} · ${amount(quote.total)} ${currency}`}
      footer={<Button className={actions.primary} onClick={print} disabled={!companyReady || isSharing}><Printer className="mr-2 h-4 w-4" />{getWebPrintCopy(locale).action}</Button>}
    >
      <div className="grid min-h-0 xl:h-full xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-0 min-w-0 flex-col bg-slate-100 dark:bg-slate-950" aria-label={ui.document}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-[#B63B32] dark:text-[#FFB0AA]" />{ui.document}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ui.documentHint}</p>
            </div>
            <Select value={zoom} onValueChange={setZoom}>
              <SelectTrigger className="h-9 w-[160px] text-xs" aria-label={ui.zoom}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="fit">{ui.fit}</SelectItem>{['75', '100', '125', '150'].map(value => <SelectItem key={value} value={value}>{value}%</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {companyReady ? <StandardDocumentPreview definition={definition} paperPreview zoom={zoom === 'fit' ? undefined : Number(zoom) / 100}
            className="h-[60dvh] min-h-[360px] w-full flex-1 border-0 bg-slate-100 xl:h-full xl:min-h-0" /> :
            <div role="status" className="flex min-h-[360px] flex-1 items-center justify-center gap-2 p-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{ui.loading}</div>}
        </section>
        <aside className="min-w-0 space-y-5 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:overflow-y-auto xl:border-l xl:border-t-0">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.previewModal.clientBlock}</p>
            <p className="mt-1 break-words text-base font-medium">{quote.clientName}</p>
            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{quote.contactPerson}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.labels.total} · {currency}</p>
              <p className="mt-1 break-words text-2xl font-medium tabular-nums">{amount(quote.total)}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{copy.statusLabels[quote.status]}</span><span className={expired ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}>{quote.expirationDate}</span></div>
              {expired && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{ui.review}</p>}
            </div>
          </div>
          <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden"><LockKeyhole className="h-4 w-4 text-slate-500" />{ui.internal}<ChevronDown className="ml-auto h-4 w-4 group-open:rotate-180" /></summary>
            <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{ui.internalHint}</p>
              <dl className="space-y-2 text-sm">
                {[[copy.pricing.estimatedMargin, missingCosts ? ui.unavailable : `${margin}%`], [copy.pricing.estimatedProfit, missingCosts ? ui.unavailable : amount(profit)]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>)}
              </dl>
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{guidance}</p>
            </div>
          </details>
          <section className="space-y-3" aria-label={ui.contact}>
            <h3 className="text-sm font-medium">{ui.contact}</h3>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{ui.contactHint}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" asChild={Boolean(whatsappHref)} disabled={!whatsappHref || isSharing} title={!whatsappHref ? copy.previewModal.noPhone : undefined}>
                {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{copy.previewModal.whatsapp}</a> : <><MessageCircle className="h-4 w-4" />{copy.previewModal.whatsapp}</>}
              </Button>
              <Button variant="outline" className="gap-2" asChild={Boolean(emailHref)} disabled={!emailHref || isSharing} title={!emailHref ? copy.previewModal.noEmail : undefined}>
                {emailHref ? <a href={emailHref}><Mail className="h-4 w-4" />{copy.previewModal.emailAction}</a> : <><Mail className="h-4 w-4" />{copy.previewModal.emailAction}</>}
              </Button>
            </div>
          </section>
          <section className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button variant="outline" className="w-full gap-2" onClick={share} disabled={!companyReady || isSharing}>{isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{copy.previewModal.sharePdf}</Button>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{ui.shareHint}</p>
            {shareError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{shareError}</p>}
          </section>
        </aside>
      </div>
    </SalesModalFrame>
  );
}
