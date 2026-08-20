import { Download, FileText } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import { cn } from '../../../../components/ui/utils';
import type { SalesQuote } from '../../salesCrmContext';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { ProspectosCopy } from '../translations';
import type { OpportunityQuoteSignal } from '../utils/prospectosQuoteSignals';

const quoteSignalClassNames: Record<OpportunityQuoteSignal['state'], string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  draft: 'border-slate-200 bg-slate-50 text-slate-600',
  expired: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  none: 'border-slate-200 bg-white text-slate-500',
};

export function OpportunityQuoteSignalBadge({
  signal,
  copy,
  quotes,
  onDownloadQuote,
}: {
  signal: OpportunityQuoteSignal;
  copy: ProspectosCopy['quoteSignal'];
  quotes: SalesQuote[];
  onDownloadQuote: (quote: SalesQuote) => void;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <p className="break-words text-sm font-medium text-slate-950">
        {signal.quoteCount > 0
          ? copy.forecastTotal(signal.totalQuotedValueLabel)
          : copy.noDocument}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn('h-auto max-w-full whitespace-normal rounded-full px-3 py-1 text-xs font-medium tracking-normal', quoteSignalClassNames[signal.state])}
        >
          {copy.labels[signal.state]}
        </Badge>
        {quotes.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {copy.pdfCount(quotes.length)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {quotes.map((quote) => (
                <DropdownMenuItem
                  key={quote.id}
                  className="items-start gap-3 py-2"
                  onSelect={() => onDownloadQuote(quote)}
                >
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{quote.quoteNumber}</span>
                    <span className="block text-xs text-slate-500">
                      {formatSalesCurrencyAmount(quote.total, quote.currency)} · {copy.downloadPdf}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
