import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { applyDocumentGrayscale } from '../../shared/print/documentGrayscale';
import type { StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import { StandardDocumentPreview } from '../../shared/print/StandardDocumentPreview';
import { getWebPrintCopy } from '../../shared/print/webPrintCopy';
import { Download, FileDown, FileText, Printer, SlidersHorizontal } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal';
import { Button } from '../../../components/ui/button';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { getDocumentPreviewCopy } from './documentPreviewTranslations';
import { downloadVisualDocument, printVisualDocument } from './visualDocumentExport';

export type AnalyticsDocumentMode = 'export' | 'print';

export function AnalyticsDocumentPreviewModal({
  children,
  company,
  fileName,
  locale,
  mode,
  onClose,
  onExportData,
  scopeItems,
  title,
  documentDefinition,
  quotationStyle = false,
}: {
  children: ReactNode;
  company: CompanyPrintIdentity;
  fileName: string;
  locale: string;
  mode: AnalyticsDocumentMode | null;
  onClose: () => void;
  onExportData: () => void;
  scopeItems: Array<{ label: string; value: string }>;
  title: string;
  documentDefinition?: StandardDocumentDefinition;
  quotationStyle?: boolean;
}) {
  const baselineCopy = getDocumentPreviewCopy(locale);
  const copy = documentDefinition || quotationStyle
    ? { ...baselineCopy, visualDownload: getWebPrintCopy(locale).action, visualDownloadHelp: getWebPrintCopy(locale).help }
    : baselineCopy;
  const documentRef = useRef<HTMLDivElement>(null);
  const isExport = mode === 'export';
  useLayoutEffect(() => {
    if (quotationStyle && documentRef.current) applyDocumentGrayscale(documentRef.current);
  }, [quotationStyle, children, company, mode]);

  const handlePrint = () => {
    if (documentDefinition) printStandardDocumentHtml(documentDefinition);
    else if (documentRef.current) printVisualDocument(documentRef.current, title, quotationStyle, locale);
  };

  const handleVisualDownload = () => {
    if (documentDefinition || quotationStyle) handlePrint();
    else if (documentRef.current) downloadVisualDocument(documentRef.current, title, fileName);
  };

  return (
    <IndiceModalFrame
      open={mode !== null}
      onOpenChange={(open) => !open && onClose()}
      closeLabel={copy.close}
      title={isExport ? copy.exportTitle : copy.printTitle}
      description={isExport ? copy.exportDescription : copy.printDescription}
      eyebrow={copy.workspaceType}
      icon={isExport ? <FileDown className="h-6 w-6" /> : <Printer className="h-6 w-6" />}
      modalType="operational-workspace"
      tone="blue"
      contentClassName="h-[92dvh] max-h-[940px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden p-0"
      footerSummary={`${copy.currentView}: ${title}`}
      footerClassName="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-11 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">{copy.close}</Button>
          <Button type="button" variant="outline" onClick={onExportData} className="h-11 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><Download className="h-4 w-4" />{copy.dataExport}</Button>
          {documentDefinition || quotationStyle ? <Button type="button" onClick={handlePrint} className="h-11 bg-white text-blue-800 hover:bg-blue-50"><Printer className="h-4 w-4" />{getWebPrintCopy(locale).action}</Button> : <>
            <Button type="button" variant="outline" onClick={isExport ? handlePrint : handleVisualDownload} className="h-11 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">{isExport ? <Printer className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{isExport ? copy.print : copy.visualDownload}</Button>
            <Button type="button" onClick={isExport ? handleVisualDownload : handlePrint} className="h-11 bg-white text-blue-800 hover:bg-blue-50">{isExport ? <FileText className="h-4 w-4" /> : <Printer className="h-4 w-4" />}{isExport ? copy.visualDownload : copy.print}</Button>
          </>}
        </div>
      )}
    >
      <div className="grid h-full min-h-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-slate-950 dark:text-white"><SlidersHorizontal className="h-4 w-4 text-blue-600" /><h3 className="text-base font-medium">{copy.configuration}</h3></div>
          <dl className="mt-5 space-y-4">
            <div><dt className="text-xs text-slate-500">{copy.currentView}</dt><dd className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{title}</dd></div>
            <div><dt className="text-xs text-slate-500">{copy.format}</dt><dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">{copy.formatValue}</dd></div>
          </dl>
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.scope}</p>
            <dl className="mt-3 space-y-3">{scopeItems.map((item) => <div key={item.label}><dt className="text-xs text-slate-500">{item.label}</dt><dd className="mt-0.5 break-words text-sm text-slate-700 dark:text-slate-200">{item.value}</dd></div>)}</dl>
          </div>
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{copy.dataExport}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy.dataExportHelp}</p></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30"><p className="text-xs font-medium text-blue-800 dark:text-blue-200">{copy.visualDownload}</p><p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">{copy.visualDownloadHelp}</p></div>
          </div>
        </aside>
        <section aria-label={copy.documentPreview} className="min-h-0 overflow-auto bg-slate-200/70 p-4 dark:bg-slate-950 sm:p-6">
          {documentDefinition ? <StandardDocumentPreview definition={documentDefinition} /> : <div ref={documentRef} className="indice-visual-document mx-auto min-w-[760px] max-w-[1180px] overflow-hidden rounded-xl bg-white shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
            <header className="border-b border-slate-200 px-8 py-6 text-slate-950">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-center gap-4">
                  {company.logoUrl ? <img data-company-logo src={company.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-slate-200 object-contain" /> : quotationStyle ? null : <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-700 text-lg font-medium text-white">I</span>}
                  <div><p className="text-lg font-medium">{company.name || (quotationStyle ? '' : 'Indice')}</p><p className="mt-0.5 text-xs text-slate-500">{company.address || company.email}</p></div>
                </div>
                <div className="text-right"><p className="text-xs text-slate-500">{copy.currentView}</p><p className="mt-1 text-base font-medium text-slate-950">{title}</p></div>
              </div>
              <div className="mt-5 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true"><span className="w-[34%] bg-[#2563EB]" /><span className="w-[22%] bg-[#59C3A5]" /><span className="w-[22%] bg-[#F4C84A]" /><span className="w-[22%] bg-[#FF6B5E]" /></div>
            </header>
            <div className="bg-white p-7 text-slate-950">{children}</div>
            <footer className="flex items-center justify-between border-t border-slate-200 px-8 py-4 text-[11px] text-slate-500"><span>{company.name || (quotationStyle ? '' : 'Indice')}</span><span>{scopeItems.map((item) => item.value).join(' · ')}</span></footer>
          </div>}
        </section>
      </div>
    </IndiceModalFrame>
  );
}
