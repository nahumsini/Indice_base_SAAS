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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import type { QuotesTranslations } from '../translations';
import {
  downloadQuotePdf,
  getQuotePdfBlob,
  getQuotePdfFileName,
  printQuotePdf,
  type QuotePdfContext,
} from '../quotePdf';

type QuotePreviewModalProps = {
  quote: SalesQuote | null;
  contact?: SalesContact | null;
  opportunity?: SalesOpportunity | null;
  copy: QuotesTranslations;
  locale?: string;
  onClose: () => void;
};

function formatCurrency(value: number, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getLineTotal(item: SalesQuote['items'][number]) {
  const subtotal = item.quantity * item.unitPrice;
  const discount = subtotal * (item.discountPercent / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (item.taxPercent / 100);
  return taxable + tax;
}

function getWhatsAppHref(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

function getMailToHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function IndiceMark() {
  return (
    <span className="inline-flex items-end gap-1" aria-hidden="true">
      <span className="h-4 w-2 rounded-sm bg-[#FF6B5E]" />
      <span className="h-6 w-2 rounded-sm bg-[#F4C84A]" />
      <span className="h-8 w-2 rounded-sm bg-[#59C3A5]" />
      <span className="h-10 w-2 rounded-sm bg-[#2563EB]" />
    </span>
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

  const whatsappMessage = copy.previewModal.whatsappMessage(
    quote.clientName,
    quote.quoteNumber,
    formatCurrency(quote.total, locale),
    quote.expirationDate,
  );
  const emailSubject = copy.previewModal.emailSubject(quote.quoteNumber);
  const emailBody = copy.previewModal.emailBody(
    quote.clientName,
    quote.quoteNumber,
    formatCurrency(quote.total, locale),
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
    <Dialog open={Boolean(quote)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="grid h-[92vh] max-h-[920px] w-[calc(100vw-2rem)] max-w-[1180px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-[#FF6B5E]/25 bg-white p-0 shadow-2xl sm:max-w-[1180px]"
        closeButtonClassName="text-white hover:bg-white/10 hover:text-white"
      >
        <DialogHeader className="bg-[#222831] px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black">
            <FileText className="h-6 w-6 text-[#FF6B5E]" />
            {copy.previewModal.title}
          </DialogTitle>
          <DialogDescription className="max-w-3xl text-sm font-medium leading-6 text-slate-200">
            {copy.previewModal.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-auto bg-slate-100 px-4 py-5">
          <article className="mx-auto min-h-[920px] w-full max-w-[860px] bg-white px-12 py-10 shadow-xl ring-1 ring-slate-200">
            <header className="border-b border-slate-200 pb-7">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <IndiceMark />
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-950">INDICE</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {copy.previewModal.documentEyebrow}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.table.columns.number}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{quote.quoteNumber}</p>
                </div>
              </div>

              <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B63B32]">
                    {copy.previewModal.documentLabel}
                  </p>
                  <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight text-slate-950">
                    {copy.previewModal.documentTitle}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                    {copy.previewModal.documentSubtitle}
                  </p>
                </div>
                <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5 text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B63B32]">{copy.labels.total}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(quote.total, locale)}</p>
                </div>
              </div>
            </header>

            <section className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{copy.previewModal.clientBlock}</p>
                <h2 className="mt-3 text-xl font-black text-slate-950">{quote.clientName}</h2>
                <p className="mt-1 font-semibold text-slate-600">{quote.contactPerson}</p>
                <p className="mt-4 text-sm font-medium text-slate-500">{copy.previewModal.phone}: {contact?.phone ?? copy.common.unassigned}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{copy.previewModal.email}: {contact?.email ?? copy.common.unassigned}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{copy.previewModal.commercialBlock}</p>
                <h2 className="mt-3 text-xl font-black text-slate-950">{quote.assignedSeller}</h2>
                <p className="mt-4 text-sm font-medium text-slate-500">{copy.labels.createdDate}: {quote.createdDate}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{copy.labels.expirationDate}: {quote.expirationDate}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{copy.labels.opportunity}: {opportunity?.opportunityName ?? copy.common.unassigned}</p>
              </div>
            </section>

            <section className="py-7">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-black text-slate-950">{copy.previewModal.itemsTitle}</h2>
                <span className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#B63B32]">
                  {copy.statusLabels[quote.status]}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#222831] text-white">
                    <tr>
                      <th className="px-4 py-3 font-black">{copy.labels.product}</th>
                      <th className="px-4 py-3 font-black">{copy.labels.quantity}</th>
                      <th className="px-4 py-3 text-right font-black">{copy.labels.unitPrice}</th>
                      <th className="px-4 py-3 text-right font-black">{copy.previewModal.lineTotal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">{item.productName}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{item.sku} · {item.section}</p>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-700">{formatCurrency(item.unitPrice, locale)}</td>
                        <td className="px-4 py-4 text-right font-black text-slate-950">{formatCurrency(getLineTotal(item), locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_280px]">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{copy.labels.notes}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{quote.notes || copy.previewModal.noNotes}</p>
                </div>
                <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5">
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
                      <span className="font-black text-slate-950">{formatCurrency(Number(value), locale)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{copy.labels.terms}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{quote.terms || copy.previewModal.defaultTerms}</p>
              </div>
            </section>
          </article>
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500">
            {copy.previewModal.shareHint}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="h-10 gap-2 rounded-lg border-slate-200 bg-white" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              {copy.previewModal.download}
            </Button>
            <Button variant="outline" className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/10" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              {copy.previewModal.print}
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
              className="h-10 gap-2 rounded-lg border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20"
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
            <Button className="h-10 gap-2 rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={handleSharePdf} disabled={isSharing}>
              <Send className="h-4 w-4" />
              {copy.previewModal.sharePdf}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
