import { useMemo, useState } from 'react';
import { Eye, FileText, Paperclip } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import { QuotePreviewModal } from '../../Cotizacion/components/QuotePreviewModal';
import type { QuotesTranslations } from '../../Cotizacion/translations';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { ProspectosCopy } from '../translations';
import { getLinkedQuotesForOpportunity } from '../utils/prospectosQuoteSignals';

const filesActionClassNames = getSalesModalActionClassNames('coral');

export function OpportunityFilesModal({
  copy,
  contact,
  locale,
  opportunity,
  quoteCopy,
  quotes,
  onClose,
}: {
  copy: ProspectosCopy['filesModal'];
  contact?: SalesContact | null;
  locale?: string;
  opportunity: SalesOpportunity | null;
  quoteCopy: QuotesTranslations;
  quotes: SalesQuote[];
  onClose: () => void;
}) {
  const [previewQuote, setPreviewQuote] = useState<SalesQuote | null>(null);
  const linkedQuotes = useMemo(
    () => (opportunity ? getLinkedQuotesForOpportunity(opportunity, quotes) : []),
    [opportunity, quotes],
  );
  const hasLocalFiles = Boolean(opportunity?.files.length);
  const hasQuoteFiles = linkedQuotes.length > 0;
  const handleClose = () => {
    setPreviewQuote(null);
    onClose();
  };

  return (
    <>
      <SalesModalFrame
        open={Boolean(opportunity)}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}
        title={copy.title}
        description={copy.description}
        icon={<Paperclip className="h-5 w-5" />}
        contentClassName="w-[min(92vw,760px)]"
        bodyClassName="space-y-5 px-7 py-6"
        footerClassName="sm:justify-end"
        footer={(
          <Button className={filesActionClassNames.primary} onClick={handleClose}>
            {copy.close}
          </Button>
        )}
      >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="break-words font-bold text-slate-950">{opportunity?.opportunityName}</p>
              <p className="mt-1 break-words text-sm text-slate-600">{opportunity?.company}</p>
            </div>

            <div className="space-y-4">
              {hasQuoteFiles ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.quotesTitle}</h3>
                  {linkedQuotes.map((quote) => (
                    <div key={quote.id} className="flex flex-col gap-3 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex min-w-0 items-start gap-3 text-sm font-semibold text-slate-800">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B5E]" />
                        <span className="min-w-0">
                          <span className="block break-all font-black text-slate-950">{quote.quoteNumber}</span>
                          <span className="mt-1 block text-xs font-semibold text-slate-500">
                            {formatSalesCurrencyAmount(quote.total, quote.currency)} · {quote.status}
                          </span>
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 shrink-0 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white text-xs font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10"
                        onClick={() => setPreviewQuote(quote)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {copy.viewQuote}
                      </Button>
                    </div>
                  ))}
                </section>
              ) : null}

              {hasLocalFiles ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.localFilesTitle}</h3>
                  {opportunity?.files.map((file) => (
                    <div key={file} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-800">
                        <FileText className="h-4 w-4 shrink-0 text-[#FF6B5E]" />
                        <span className="min-w-0 break-all">{file}</span>
                      </span>
                      <Badge variant="outline" className="w-fit rounded-full border-slate-200 bg-slate-50 text-slate-600">{copy.local}</Badge>
                    </div>
                  ))}
                </section>
              ) : null}

              {!hasQuoteFiles && !hasLocalFiles ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm font-medium text-slate-400">
                  {copy.empty}
                </div>
              ) : null}
            </div>
      </SalesModalFrame>
      <QuotePreviewModal
        copy={quoteCopy}
        contact={contact}
        locale={locale}
        opportunity={opportunity}
        quote={previewQuote}
        onClose={() => setPreviewQuote(null)}
      />
    </>
  );
}
