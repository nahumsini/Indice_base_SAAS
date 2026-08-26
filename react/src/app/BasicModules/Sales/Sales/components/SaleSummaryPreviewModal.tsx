import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileText, LoaderCircle, Printer, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesQuote } from '../../types';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SaleRecordDraft } from '../types/salesTypes';
import type { CompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';
import {
  downloadSaleNotePdf,
  getSaleNotePdfBlob,
  printSaleNotePdf,
  type SaleNotePdfContext,
} from '../utils/saleInvoicePdf';

const actionClassNames = getSalesModalActionClassNames('coral');

export function SaleSummaryPreviewModal({
  open,
  sale,
  quote,
  company,
  locale = typeof navigator === 'undefined' ? 'en-CA' : navigator.language || 'en-CA',
  t,
  onOpenChange,
}: {
  open: boolean;
  sale: SaleRecord | SaleRecordDraft | null;
  quote?: SalesQuote | null;
  company?: CompanyPrintIdentity | null;
  locale?: string;
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const pdfContext = useMemo<SaleNotePdfContext | null>(() => {
    if (!sale) {
      return null;
    }

    return {
      sale,
      quote,
      operationalContext: getSalesOperationalContext(sale.businessId),
      company,
      copy: t,
      locale,
    };
  }, [company, locale, quote, sale, t]);

  useEffect(() => {
    if (!open || !pdfContext) {
      setPreviewUrl(null);
      setPreviewError(false);
      setIsPreparingPreview(false);
      return undefined;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setPreviewUrl(null);
    setPreviewError(false);
    setIsPreparingPreview(true);

    void getSaleNotePdfBlob(pdfContext)
      .then((blob) => {
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreparingPreview(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, pdfContext, previewRevision]);

  if (!sale || !pdfContext) {
    return null;
  }

  const salesNoteNumber = sale.saleNumber
    || sale.saleDocumentReference
    || quote?.quoteNumber
    || t.common.notAvailable;
  const showPreparingPreview = isPreparingPreview || (!previewUrl && !previewError);

  const handleDownload = () => {
    void downloadSaleNotePdf(pdfContext);
  };

  const handlePrint = () => {
    void printSaleNotePdf(pdfContext);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<FileText className="h-6 w-6" />}
      title={t.summaryPreview.title}
      description={t.summaryPreview.description}
      closeLabel={t.common.close}
      modalType="large-workspace"
      contentClassName="h-[92dvh] max-h-[920px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-slate-200 p-2 dark:bg-slate-950 sm:p-4"
      footerClassName="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      footerSummary={t.summaryPreview.footerNote}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn('h-10 px-4 text-sm font-medium', actionClassNames.secondary)}
            onClick={() => onOpenChange(false)}
          >
            {t.common.close}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn('h-10 gap-2 px-4 text-sm font-medium', actionClassNames.secondary)}
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            {t.saleNote.download}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn('h-10 gap-2 px-4 text-sm font-medium', actionClassNames.secondary)}
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            {t.saleNote.print}
          </Button>
        </div>
      )}
    >
      {showPreparingPreview ? (
        <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-inner">
          <div className="flex flex-col items-center gap-3 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#B63B32]" aria-hidden="true" />
            <p className="text-sm font-medium">{t.summaryPreview.preparing}</p>
          </div>
        </div>
      ) : null}

      {!showPreparingPreview && previewError ? (
        <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-red-200 bg-white px-6 text-slate-700 shadow-inner">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <AlertCircle className="h-9 w-9 text-red-500" aria-hidden="true" />
            <p className="text-sm font-medium">{t.summaryPreview.previewError}</p>
            <Button
              type="button"
              variant="outline"
              className={cn('h-10 gap-2 px-4 text-sm font-medium', actionClassNames.secondary)}
              onClick={() => setPreviewRevision((revision) => revision + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              {t.summaryPreview.retry}
            </Button>
          </div>
        </div>
      ) : null}

      {!showPreparingPreview && !previewError && previewUrl ? (
        <iframe
          className="h-full min-h-[520px] w-full rounded-xl border border-slate-300 bg-white shadow-inner"
          src={previewUrl}
          title={`${t.summaryPreview.title}: ${salesNoteNumber}`}
        />
      ) : null}
    </SalesModalFrame>
  );
}
