import {
  ArrowDownToLine,
  CalendarRange,
  Download,
  FileText,
  Printer,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import type { PettyCashTranslations } from '../../translations';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../../types/pettyCash.types';
import { getPettyCashAccountStatementCopy } from '../../utils/pettyCashAccountStatementCopy';
import { downloadPettyCashStatementPdf, printPettyCashStatementPdf } from '../../utils/pettyCashStatementPdf';
import { formatPettyCashCurrency, formatPettyCashIsoDate, getStatementSettlementBalance } from '../../utils/pettyCash.utils';

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
  if (!statement || !fund) return null;

  const labels = getPettyCashAccountStatementCopy(copy.locale);
  const isExternalFund = statement.fundTypeSnapshot === 'EXTERNAL_MANAGED';
  const documentTitle = isExternalFund ? labels.externalDocumentTitle : labels.documentTitle;
  const documentLabel = isExternalFund ? labels.externalDocumentLabel : labels.documentLabel;
  const documentSubtitle = isExternalFund ? labels.externalDocumentSubtitle : labels.documentSubtitle;
  const externalOwnerName = statement.externalOwnerNameSnapshot ?? fund.externalOwnerName ?? copy.common.notAvailable;
  const externalIdentityRows: Array<[string, string]> = [
    [labels.owner, externalOwnerName],
    [labels.relationship, (statement.externalOwnerRelationshipSnapshot ?? fund.externalOwnerRelationship ?? copy.common.notAvailable).split('_').join(' ')],
    [labels.statementRecipient, statement.statementRecipientEmailSnapshot ?? fund.statementRecipientEmail ?? copy.common.notAvailable],
  ];
  const managedAssetName = statement.managedAssetNameSnapshot ?? fund.managedAssetName;
  if (managedAssetName) externalIdentityRows.push([labels.managedAsset, managedAssetName]);
  const ownerReference = statement.externalOwnerReferenceSnapshot ?? fund.externalOwnerReference;
  if (ownerReference) externalIdentityRows.push([labels.ownerReference, ownerReference]);
  const fundedAmount = statement.assignedAmount + statement.additionalDepositAmount;
  const pendingAmount = getStatementSettlementBalance(statement);
  const generatedAt = new Intl.DateTimeFormat(copy.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const orderedMovements = [...movements].sort((left, right) => right.movementDate.localeCompare(left.movementDate));
  const orderedReceipts = [...receipts].sort((left, right) => right.expenseDate.localeCompare(left.expenseDate));
  const pdfContext = { copy, fund, locale: copy.locale, movements, settlementLines: receipts, statement };

  return (
    <IndiceModalFrame
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5 dark:bg-slate-950"
      closeLabel={labels.close}
      contentClassName="h-[92dvh] max-h-[960px] sm:max-w-6xl"
      description={`${statement.folio} · ${labels.description}`}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button className="inline-flex h-10 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20" onClick={onClose} type="button">{labels.close}</button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-[#147514] transition hover:bg-emerald-50" onClick={() => downloadPettyCashStatementPdf(pdfContext)} type="button"><Download className="h-4 w-4" />{labels.download}</button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-[#147514] transition hover:bg-emerald-50" onClick={() => printPettyCashStatementPdf(pdfContext)} type="button"><Printer className="h-4 w-4" />{labels.print}</button>
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
      <article className="mx-auto min-h-[980px] w-full max-w-[920px] bg-white px-6 py-7 text-slate-950 shadow-xl ring-1 ring-slate-200 sm:px-10 sm:py-9">
        <header className="border-b border-slate-200 pb-7">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
            <div><p className="text-xs font-medium text-slate-500">{labels.statement}</p><p className="mt-1 text-lg font-medium">{statement.folio}</p></div>
            <div className="text-left md:text-center"><p className="text-2xl font-medium">{documentTitle}</p><p className="mt-1 text-xs font-medium text-slate-500">{documentLabel}</p></div>
            <div className="text-left text-sm text-slate-500 md:text-right"><p>{labels.period}: {statement.periodKey}</p><p className="mt-1">{labels.generated}: {generatedAt}</p></div>
          </div>
          <div className="mt-5 flex h-2 overflow-hidden rounded-full" aria-hidden="true"><span className="w-[34%] bg-[#FF6B5E]" /><span className="w-[22%] bg-[#F4C84A]" /><span className="w-[22%] bg-[#59C3A5]" /><span className="w-[22%] bg-[#2563EB]" /></div>
          <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div><p className="text-xs font-medium text-[#147514]">{fund.businessName || fund.name}</p><h1 className="mt-3 text-4xl font-medium leading-none sm:text-5xl">{fund.name}</h1><p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{documentSubtitle}</p></div>
            <div className="rounded-lg border border-[#147514]/25 bg-[#147514]/5 p-5 text-right"><p className="text-xs font-medium text-[#147514]">{labels.closing} · {statement.currencyCode}</p><p className="mt-2 text-3xl font-medium tabular-nums">{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</p></div>
          </div>
        </header>

        <section className="grid gap-4 border-b border-slate-200 py-7 sm:grid-cols-2 lg:grid-cols-4">
          <StatementMetric accent="bg-[#2563EB]" label={labels.opening} value={formatPettyCashCurrency(statement.openingBalanceAmount, statement.currencyCode)} />
          <StatementMetric accent="bg-[#59C3A5]" label={labels.funded} value={formatPettyCashCurrency(fundedAmount, statement.currencyCode)} />
          <StatementMetric accent="bg-[#F4C84A]" label={labels.captured} value={formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)} />
          <StatementMetric accent="bg-[#147514]" label={labels.currentBalance} value={formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)} />
        </section>

        <section className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-2">
          <StatementIdentity title={isExternalFund ? labels.owner : labels.fund} icon={<WalletCards className="h-4 w-4" />} rows={isExternalFund ? externalIdentityRows : [[labels.fund, fund.name], [labels.responsible, statement.responsibleName], [labels.currentBalance, formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)]]} />
          <StatementIdentity title={labels.statement} icon={<CalendarRange className="h-4 w-4" />} rows={[[labels.period, `${formatPettyCashIsoDate(statement.periodStart)} – ${formatPettyCashIsoDate(statement.periodEnd)}`], [labels.status, copy.status.statement[statement.status]], [labels.opening, originText]]} />
        </section>

        <StatementTableSection count={orderedMovements.length} icon={<ArrowDownToLine className="h-4 w-4" />} title={labels.movements} tone="blue">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="bg-slate-100 text-slate-700"><tr><th className="px-3 py-3 font-medium">{copy.common.date}</th><th className="px-3 py-3 font-medium">{labels.type}</th><th className="px-3 py-3 font-medium">{labels.reference}</th><th className="px-3 py-3 font-medium">{labels.destination}</th><th className="px-3 py-3 text-right font-medium">{labels.total}</th></tr></thead><tbody>
            {orderedMovements.length ? orderedMovements.map(movement => <tr className="border-t border-slate-200 odd:bg-white even:bg-slate-50" key={movement.id}><td className="px-3 py-3 text-slate-600">{formatPettyCashIsoDate(movement.movementDate)}</td><td className="px-3 py-3 font-medium text-slate-800">{copy.status.movement[movement.type]}</td><td className="px-3 py-3 text-slate-600">{movement.statementDescription || movement.reference || copy.common.notAvailable}</td><td className="px-3 py-3 text-slate-600">{movement.toPaymentAccountName ?? fund.name}</td><td className="px-3 py-3 text-right font-medium tabular-nums text-sky-700">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td></tr>) : <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>{labels.emptyMovements}</td></tr>}
          </tbody></table>
        </StatementTableSection>

        <StatementTableSection count={orderedReceipts.length} icon={<ReceiptText className="h-4 w-4" />} title={labels.expenses} tone="amber">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs"><thead className="bg-slate-100 text-slate-700"><tr><th className="px-3 py-3 font-medium">{copy.common.date}</th><th className="px-3 py-3 font-medium">{copy.reconciliation.receipts.columns.receipt}</th><th className="px-3 py-3 font-medium">{labels.provider}</th><th className="px-3 py-3 font-medium">{labels.status}</th><th className="px-3 py-3 text-right font-medium">{labels.total}</th></tr></thead><tbody>
            {orderedReceipts.length ? orderedReceipts.map(receipt => <tr className="border-t border-slate-200 odd:bg-white even:bg-slate-50" key={receipt.id}><td className="px-3 py-3 text-slate-600">{formatPettyCashIsoDate(receipt.expenseDate)}</td><td className="px-3 py-3"><p className="font-medium text-slate-800">{receipt.description}</p><p className="mt-1 text-slate-500">{receipt.receiptReference ?? copy.reconciliation.receipts.noReference}</p></td><td className="px-3 py-3 text-slate-600">{receipt.providerName ?? copy.common.notAvailable}</td><td className="px-3 py-3 text-slate-600">{copy.status.line[receipt.status]}</td><td className="px-3 py-3 text-right font-medium tabular-nums">{formatPettyCashCurrency(receipt.totalAmount, receipt.currencyCode)}</td></tr>) : <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>{labels.emptyExpenses}</td></tr>}
          </tbody></table>
        </StatementTableSection>

        <section className="grid gap-4 border-t border-slate-200 pt-7 md:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5"><h3 className="text-sm font-medium text-slate-700">{isExternalFund ? documentLabel : labels.internalNote}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{isExternalFund ? labels.externalLegalNote : originText}</p></div>
          <div className="rounded-lg border border-[#147514]/25 bg-[#147514]/5 p-5"><p className="mb-2 text-xs font-medium text-[#147514]">{labels.reconciliation}</p>{[[labels.funded, fundedAmount], [labels.captured, statement.estimatedUsageAmount], [isExternalFund ? labels.externalAuthorized : labels.authorized, statement.verifiedExpenseAmount], [copy.reconciliation.metrics.pendingSettlement, pendingAmount], [labels.closing, statement.declaredClosingBalanceAmount]].map(([label, amount], index, rows) => <div className={`flex items-center justify-between py-2 text-sm ${index === rows.length - 1 ? 'mt-2 border-t border-[#147514]/20 pt-4 text-base' : ''}`} key={String(label)}><span className="font-medium text-slate-600">{label}</span><span className="font-medium tabular-nums">{formatPettyCashCurrency(Number(amount), statement.currencyCode)}</span></div>)}</div>
        </section>
      </article>
    </IndiceModalFrame>
  );
}

function StatementMetric({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex min-h-[86px]">
        <span className={`w-2 shrink-0 ${accent}`} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="truncate text-xl font-medium tabular-nums">{value}</p></div>
      </div>
    </div>
  );
}

function StatementIdentity({
  icon,
  rows,
  title,
}: {
  icon: ReactNode;
  rows: Array<[string, string]>;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#147514] ring-1 ring-slate-200">{icon}</span><h2 className="text-base font-medium">{title}</h2></div>
      <dl className="mt-4 space-y-3 text-sm">{rows.map(([label, value]) => <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3" key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-800">{value}</dd></div>)}</dl>
    </section>
  );
}

function StatementTableSection({
  children,
  count,
  icon,
  title,
  tone,
}: {
  children: ReactNode;
  count: number;
  icon: ReactNode;
  title: string;
  tone: 'amber' | 'blue';
}) {
  const toneClass = tone === 'blue' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700';
  return (
    <section className="border-b border-slate-200 py-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span><h2 className="text-xl font-medium">{title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>{count}</span></div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">{children}</div>
    </section>
  );
}
