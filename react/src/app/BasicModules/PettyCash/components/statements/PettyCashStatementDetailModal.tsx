import { StandardDocumentPreview } from '../../../shared/print/StandardDocumentPreview';
import { getWebPrintCopy } from '../../../shared/print/webPrintCopy';
import { FileText, Printer } from 'lucide-react';
import { useState } from 'react';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import type { PettyCashTranslations } from '../../translations';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../../types/pettyCash.types';
import { getPettyCashAccountStatementCopy } from '../../utils/pettyCashAccountStatementCopy';
import {
  buildPettyCashStatementDocument,
  printPettyCashStatementPdf,
} from '../../utils/pettyCashStatementPdf';

interface PettyCashStatementDetailModalProps {
  copy: PettyCashTranslations;
  fund: PettyCashFund | null;
  movements: PettyCashMovement[];
  onClose: () => void;
  originText: string;
  receipts: PettyCashSettlementLine[];
  statement: PettyCashStatement | null;
}

export function PettyCashStatementDetailModal({
  copy,
  fund,
  movements,
  onClose,
  originText,
  receipts,
  statement,
}: PettyCashStatementDetailModalProps) {
  const [generatedAt] = useState(() => new Date());
  if (!statement || !fund) return null;

  const labels = getPettyCashAccountStatementCopy(copy.locale);
  const pdfContext = {
    copy,
    fund,
    generatedAt,
    locale: copy.locale,
    movements,
    originText,
    settlementLines: receipts,
    statement,
  };
  const definition = buildPettyCashStatementDocument(pdfContext);

  return (
    <IndiceModalFrame
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5 dark:bg-slate-950"
      closeLabel={labels.close}
      contentClassName="h-[92dvh] max-h-[960px] sm:max-w-6xl"
      description={`${statement.folio} · ${labels.description}`}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button className="inline-flex h-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20" onClick={onClose} type="button">{labels.close}</button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] shadow-sm transition hover:bg-slate-100" onClick={() => printPettyCashStatementPdf(pdfContext)} type="button"><Printer className="h-4 w-4" />{getWebPrintCopy(copy.locale).action}</button>
        </div>
      )}
      footerSummary={statement.folio}
      icon={<FileText className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => !open && onClose()}
      open
      title={labels.previewTitle}
      tone="green"
    >
      <StandardDocumentPreview definition={definition} />
    </IndiceModalFrame>
  );
}
