import { mexicoPayrollProfileCopy } from '../mexicoPayrollProfileCopy';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Landmark,
  LoaderCircle,
  PlayCircle,
  Printer,
  Save,
  ShieldCheck,
  Wallet,
  ReceiptText,
  BadgeMinus,
  Gift,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { IndiceWorkspaceNavigation } from '../../../../../components/frontend-os/IndiceWorkspaceNavigation';
import { PayrollRunSummaryPanel } from './PayrollRunSummaryPanel';
import { IndiceModalFrame } from '../../../../../components/indice-modal';
import type {
  PayrollRunDetailResponse,
  PayrollRunLine,
  PayrollRunSummary,
} from '../../../../../api/humanResources';
import type { PayrollTranslations } from '../../translations';
import { PayrollLineInspector, type PayrollInspectorView } from './PayrollLineInspector';
import { PayrollIncentiveSelector } from './PayrollIncentiveSelector';
import { PayrollRunRoster, type PayrollRosterFilter } from './PayrollRunRoster';
import {
  isColombiaFiscalPayrollLine,
  payrollLineWarningCount,
  type PayrollLineDraft,
} from './payrollRunWorkspaceModel';
import { getPayrollRunWorkspaceText } from './payrollRunWorkspaceText';

type WorkspaceView = 'workspace' | 'export' | 'confirm-discard' | 'confirm-approve';
type PayrollContentView = 'collaborators' | 'incentives' | PayrollInspectorView;

export type PayrollRunWorkspaceDialogProps = {
  activeBusyKind: string | null;
  canApproveAction: boolean;
  canCancelAction: boolean;
  canManageReporting: boolean;
  canPrepareAction: boolean;
  canPrint: boolean;
  copy: PayrollTranslations;
  detail: PayrollRunDetailResponse | null;
  dirtyLineIds: ReadonlySet<number>;
  isOpen: boolean;
  isSaving: boolean;
  lineDraft: PayrollLineDraft | null;
  locale: string;
  notice: { tone: 'success' | 'error'; message: string } | null;
  onApprove: () => void;
  onCancel: (run: PayrollRunSummary) => void;
  onChangeDraft: (draft: PayrollLineDraft) => void;
  onClose: () => void;
  onDiscardDrafts: () => void;
  onDownloadCsv: (run: PayrollRunSummary) => void;
  onDownloadPdf: (run: PayrollRunSummary) => void;
  onIncentiveApplied: (detail: PayrollRunDetailResponse) => void;
  onOpenGovernmentReporting: (run: PayrollRunSummary) => void;
  onOpenMexicoProfile?: (line: PayrollRunLine) => void;
  onProcess: () => void;
  onPrintLine: (line: PayrollRunLine) => void;
  onSaveLine: () => void;
  onSelectLine: (value: number | null) => void;
  selectedLine: PayrollRunLine | null;
  selectedLineId: number | null;
};

const PAGE_SIZE = 20;

const formatCurrency = (value: number, locale: string, currency: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const formatDate = (value: string, locale: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
};

const normalizedSearchValue = (line: PayrollRunLine) => [
  line.user_name,
  line.user_code,
  line.position_title,
  line.department,
  line.unit_name,
  line.business_name,
].filter(Boolean).join(' ').toLocaleLowerCase();

export function PayrollRunWorkspaceDialog({
  activeBusyKind,
  canApproveAction,
  canCancelAction,
  canManageReporting,
  canPrepareAction,
  canPrint,
  copy,
  detail,
  dirtyLineIds,
  isOpen,
  isSaving,
  lineDraft,
  locale,
  notice,
  onApprove,
  onCancel,
  onChangeDraft,
  onClose,
  onDiscardDrafts,
  onDownloadCsv,
  onDownloadPdf,
  onIncentiveApplied,
  onOpenGovernmentReporting,
  onOpenMexicoProfile,
  onProcess,
  onPrintLine,
  onSaveLine,
  onSelectLine,
  selectedLine,
  selectedLineId,
}: PayrollRunWorkspaceDialogProps) {
  const text = getPayrollRunWorkspaceText(locale);
  const [view, setView] = useState<WorkspaceView>('workspace');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PayrollRosterFilter>('all');
  const [page, setPage] = useState(1);
  const [contentView, setContentView] = useState<PayrollContentView>('collaborators');

  useEffect(() => {
    setView('workspace');
    setQuery('');
    setFilter('all');
    setPage(1);
    setContentView('collaborators');
  }, [detail?.run.id]);

  useEffect(() => {
    if (detail && detail.run.status !== 'draft' && detail.run.status !== 'processed') setView('workspace');
  }, [detail?.run.status]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const filteredLines = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return (detail?.lines ?? []).filter((line) => {
      if (normalizedQuery && !normalizedSearchValue(line).includes(normalizedQuery)) return false;
      if (filter === 'warnings' && payrollLineWarningCount(line) === 0) return false;
      if (filter === 'modified' && !dirtyLineIds.has(line.id)) return false;
      return true;
    });
  }, [detail?.lines, dirtyLineIds, filter, query]);

  const pageCount = Math.max(1, Math.ceil(filteredLines.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleLines = filteredLines.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const runCurrency = detail?.run.currency_code || 'USD';
  const nativeTotals = detail?.run.native_totals_by_currency;
  const hasMultipleCurrencies = Object.keys(nativeTotals ?? {}).length > 1;
  const netSummary = detail
    ? Object.entries(nativeTotals && Object.keys(nativeTotals).length > 0
      ? nativeTotals : { [runCurrency]: detail.run.net_amount })
      .map(([currency, amount]) => formatCurrency(amount, locale, currency)).join(' · ')
    : '—';
  const warningCount = useMemo(
    () => (detail?.lines ?? []).reduce((total, line) => total + payrollLineWarningCount(line), 0),
    [detail?.lines],
  );
  const selectedLineIsDirty = selectedLine ? dirtyLineIds.has(selectedLine.id) : false;
  const runHasColombiaFiscalLines = detail?.lines.some(isColombiaFiscalPayrollLine) ?? false;
  const isEditableDraft = detail?.run.status === 'draft' || detail?.run.status === 'processed';
  const canProcess = Boolean(isEditableDraft && canPrepareAction);
  const canApprove = Boolean(isEditableDraft && canApproveAction && !detail?.lines.some(line => line.include_in_fiscal && line.statutory_compliance === false));
  const canCancel = Boolean(
    detail
    && canCancelAction
    && (detail.run.status === 'draft' || detail.run.status === 'processed'),
  );

  const requestClose = () => {
    if (dirtyLineIds.size > 0) {
      setView('confirm-discard');
      return;
    }
    onClose();
  };

  const openLineView = (lineId: number, nextView: PayrollInspectorView) => {
    onSelectLine(lineId);
    setContentView(nextView);
  };

  const selectFirstDirty = () => {
    const firstDirtyLine = detail?.lines.find((line) => dirtyLineIds.has(line.id));
    if (firstDirtyLine) openLineView(firstDirtyLine.id, 'adjustments');
  };

  const contentTitle = contentView === 'breakdown'
    ? text.breakdown
    : contentView === 'incentives'
      ? text.incentives
      : contentView === 'deductions'
        ? text.discounts
        : contentView === 'adjustments'
          ? text.adjustments
          : null;

  const title = view === 'confirm-discard'
    ? text.confirmDiscard
    : view === 'export'
      ? text.export
      : detail
        ? contentTitle && selectedLine
          ? `${contentTitle} · ${selectedLine.user_name}`
          : `${text.review.title} #${detail.run.id}`
        : copy.labels.detail;
  const description = view === 'confirm-discard'
    ? text.discardDescription
    : view === 'export'
      ? text.exportDescription
      : detail
        ? `${formatDate(detail.run.period_start_date, locale)} → ${formatDate(detail.run.period_end_date, locale)}`
        : copy.labels.currentRun;

  const footerLeading = view === 'workspace' && contentView === 'collaborators' ? (
    <Button type="button" variant="outline" onClick={requestClose} disabled={isSaving}>{copy.labels.close}</Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        if (view === 'workspace') setContentView('collaborators');
        else setView('workspace');
      }}
      disabled={isSaving}
    >
      <ArrowLeft className="h-4 w-4" />
      {text.back}
    </Button>
  );

  const footerSummary = view === 'workspace' && detail ? (
    dirtyLineIds.size > 0
      ? `${text.modified}: ${dirtyLineIds.size} · ${text.warnings}: ${warningCount}`
      : `${text.collaborators}: ${detail.run.users_count} · ${text.warnings}: ${warningCount}`
  ) : undefined;

  let footerActions = null;
  if (view === 'confirm-discard') {
    footerActions = (
      <Button
        type="button"
        data-modal-destructive="true"
        onClick={() => {
          onDiscardDrafts();
          onClose();
        }}
      >
        {text.discard}
      </Button>
    );
  } else if (view === 'workspace' && detail) {
    footerActions = (
      <>
        {contentView === 'collaborators' ? (
          <Button type="button" variant="outline" onClick={() => setView('export')} disabled={isSaving}>
            <Download className="h-4 w-4" />
            {text.export}
          </Button>
        ) : null}
        {contentView === 'breakdown' && selectedLine ? (
          <Button type="button" onClick={() => onPrintLine(selectedLine)} disabled={isSaving || !canPrint}>
            {activeBusyKind === 'download-pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {text.print}
          </Button>
        ) : null}
        {(contentView === 'adjustments' || contentView === 'deductions') && selectedLineIsDirty && isEditableDraft && canPrepareAction ? (
          <Button type="button" onClick={onSaveLine} disabled={isSaving || !selectedLine}>
            {activeBusyKind === 'save-line' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {copy.labels.saveLine}
          </Button>
        ) : contentView === 'collaborators' && dirtyLineIds.size > 0 ? (
          <Button type="button" onClick={selectFirstDirty} disabled={isSaving}>{text.openPending}</Button>
        ) : null}
        {contentView === 'collaborators' && dirtyLineIds.size === 0 && canProcess ? (
          <Button type="button" onClick={onProcess} disabled={isSaving}>
            {activeBusyKind === 'process-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {copy.labels.process}
          </Button>
        ) : null}
        {contentView === 'collaborators' && dirtyLineIds.size === 0 && canApprove ? (
          <Button type="button" onClick={() => setView('confirm-approve')} disabled={isSaving}>
            {activeBusyKind === 'approve-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {copy.labels.approve}
          </Button>
        ) : null}
      </>
    );
  }

  if (view === 'confirm-approve' && detail) {
    const returnToReview = () => { if (!isSaving) setView('workspace'); };
    return (
      <IndiceModalFrame
        open={isOpen}
        onOpenChange={(open) => { if (!open) returnToReview(); }}
        modalType="confirmation"
        tone="aqua"
        busy={isSaving}
        icon={<ShieldCheck className="h-5 w-5" />}
        title={`${text.confirmApproval} #${detail.run.id}`}
        description={text.approvalDescription}
        closeLabel={copy.labels.close}
        footerLeading={<Button type="button" variant="outline" onClick={returnToReview} disabled={isSaving}>{text.back}</Button>}
        footer={<Button type="button" onClick={onApprove} disabled={isSaving || !canApprove || dirtyLineIds.size > 0}>
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {copy.labels.approve}
        </Button>}
      >
        <div className="space-y-4 p-5">
          {notice?.tone === 'error' ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{notice.message}</p> : null}
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              [text.collaborators, String(detail.run.users_count)],
              [copy.labels.net, netSummary],
              [text.warnings, String(warningCount)],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 font-medium tabular-nums text-slate-900 dark:text-white">{value}</dd></div>)}
          </dl>
        </div>
      </IndiceModalFrame>
    );
  }

  return (
    <IndiceModalFrame
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      modalType="operational-workspace"
      tone="aqua"
      busy={isSaving}
      icon={<Wallet className="h-5 w-5" />}
      title={title}
      description={description}
      closeLabel={copy.labels.close}
      contentClassName="z-[140] max-h-[92dvh]"
      bodyClassName="overflow-y-auto p-0"
      footerLeading={footerLeading}
      footerSummary={footerSummary}
      footer={footerActions}
    >
      {view === 'confirm-discard' ? (
        <div className="flex h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">{text.confirmDiscard}</h3>
            <p className="mt-2 text-sm font-normal text-slate-500 dark:text-slate-400">{text.discardDescription}</p>
            <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-300">{dirtyLineIds.size} {text.modified.toLocaleLowerCase()}</p>
          </div>
        </div>
      ) : view === 'export' && detail ? (
        <div className="flex h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDownloadCsv(detail.run)}
              className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-[#59C3A5] hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#177D66]">
                {activeBusyKind === 'download-csv' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              </span>
              <span className="mt-4 block text-base font-medium text-slate-900 dark:text-white">{copy.labels.exportCsv}</span>
              <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">{text.exportCsvDescription}</span>
            </button>
            <button
              type="button"
              disabled={isSaving || !canPrint}
              onClick={() => onDownloadPdf(detail.run)}
              className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-[#59C3A5] hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#177D66]">
                {activeBusyKind === 'download-pdf' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
              </span>
              <span className="mt-4 block text-base font-medium text-slate-900 dark:text-white">{copy.labels.exportPdf}</span>
              <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">{text.exportPdfDescription}</span>
            </button>
            {runHasColombiaFiscalLines && canManageReporting ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onOpenGovernmentReporting(detail.run)}
                className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-[#59C3A5] hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#177D66]">
                  <Landmark className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-medium text-slate-900 dark:text-white">{text.governmentReportingTitle}</span>
                <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">{text.governmentReportingDescription}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : detail ? (
        <div className="flex min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
          {notice ? (
            <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`mx-5 mt-4 shrink-0 rounded-lg border px-4 py-3 text-sm font-normal ${notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200'
            }`}
            >
              {notice.message}
            </div>
          ) : null}

          {contentView === 'collaborators' ? (
            <PayrollRunSummaryPanel
              copy={copy} run={detail.run} text={text} netSummary={netSummary}
              grossSummary={hasMultipleCurrencies ? '—' : formatCurrency(detail.run.gross_amount, locale, runCurrency)}
              deductionsSummary={hasMultipleCurrencies ? '—' : formatCurrency(detail.run.deductions_amount, locale, runCurrency)}
              warningCount={warningCount} dirtyCount={dirtyLineIds.size} filter={filter} busy={isSaving}
              onChangeFilter={setFilter}
              onCancel={canCancel ? () => onCancel(detail.run) : undefined}
            />
          ) : (
            <div className="px-4 pt-4 sm:px-5">
              {selectedLine?.country_code === 'MX' && onOpenMexicoProfile ? <Button type="button" variant="outline" className="mb-3"
                disabled={isSaving || dirtyLineIds.size > 0} onClick={() => onOpenMexicoProfile(selectedLine)}>
                <Landmark className="h-4 w-4" />{mexicoPayrollProfileCopy(locale).title}
              </Button> : null}
              <IndiceWorkspaceNavigation<Exclude<PayrollContentView, 'collaborators'>>
                ariaLabel={text.review.title} tone="aqua" variant="views" value={contentView}
                onValueChange={setContentView}
                items={[
                  { id: 'breakdown', label: text.breakdown, icon: <ReceiptText />, disabled: isSaving },
                  { id: 'deductions', label: text.discounts, icon: <BadgeMinus />, disabled: isSaving },
                  { id: 'adjustments', label: text.adjustments, icon: <SlidersHorizontal />, disabled: isSaving },
                  { id: 'incentives', label: text.review.pendingConcepts, icon: <Gift />, disabled: isSaving },
                ]}
              />
            </div>
          )}

          <div className="flex min-h-0 p-4 sm:p-5">
            {contentView === 'collaborators' ? (
              <PayrollRunRoster
                busy={isSaving}
                canEdit={detail.run.status === 'draft' && canPrepareAction}
                copy={copy}
                currencyFallback={runCurrency}
                dirtyLineIds={dirtyLineIds}
                editDisabledReason={detail.run.status === 'draft' ? text.incentivePermissionLocked : text.incentiveRunLocked}
                filter={filter}
                lines={visibleLines}
                locale={locale}
                onChangeFilter={setFilter}
                onChangeQuery={setQuery}
                onNextPage={() => setPage((current) => Math.min(pageCount, current + 1))}
                onOpenAdjustments={(lineId) => openLineView(lineId, 'adjustments')}
                onOpenBreakdown={(lineId) => openLineView(lineId, 'breakdown')}
                onOpenDeductions={(lineId) => openLineView(lineId, 'deductions')}
                onOpenIncentives={(lineId) => {
                  onSelectLine(lineId);
                  setContentView('incentives');
                }}
                onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
                page={safePage}
                pageCount={pageCount}
                query={query}
                text={text}
                totalFiltered={filteredLines.length}
              />
            ) : contentView === 'incentives' ? (
              selectedLine ? (
                <PayrollIncentiveSelector
                  line={selectedLine}
                  locale={locale}
                  onApplied={onIncentiveApplied}
                  run={detail.run}
                  text={text}
                />
              ) : null
            ) : (
              <PayrollLineInspector
                copy={copy}
                currencyFallback={runCurrency}
                draft={lineDraft}
                isDirty={selectedLineIsDirty}
                isEditable={detail.run.status === 'draft' && canPrepareAction}
                line={selectedLine}
                locale={locale}
                onChangeDraft={onChangeDraft}
                text={text}
                view={contentView}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-sm font-normal text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          {copy.loading}
        </div>
      )}
    </IndiceModalFrame>
  );
}
