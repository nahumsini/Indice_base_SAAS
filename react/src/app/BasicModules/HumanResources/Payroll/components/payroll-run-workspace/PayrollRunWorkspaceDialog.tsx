import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Download,
  FileText,
  Info,
  Landmark,
  LoaderCircle,
  PlayCircle,
  Printer,
  Save,
  ShieldCheck,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
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

type WorkspaceView = 'workspace' | 'export' | 'confirm-discard';
type PayrollContentView = 'collaborators' | 'incentives' | PayrollInspectorView;

export type PayrollRunWorkspaceDialogProps = {
  activeBusyKind: string | null;
  canApproveAction: boolean;
  canCancelAction: boolean;
  canManageReporting: boolean;
  canPayAction: boolean;
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
  onPay: () => void;
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
  canPayAction,
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
  onPay,
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
  const warningCount = useMemo(
    () => (detail?.lines ?? []).reduce((total, line) => total + payrollLineWarningCount(line), 0),
    [detail?.lines],
  );
  const selectedLineIsDirty = selectedLine ? dirtyLineIds.has(selectedLine.id) : false;
  const runHasColombiaFiscalLines = detail?.lines.some(isColombiaFiscalPayrollLine) ?? false;
  const canProcess = detail?.run.status === 'draft' && canPrepareAction;
  const canApprove = detail?.run.status === 'processed' && canApproveAction;
  const canPay = detail?.run.status === 'approved' && canPayAction;
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
          : `${copy.labels.detail} #${detail.run.id}`
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
      ? `${dirtyLineIds.size} ${text.modified.toLocaleLowerCase()} · ${warningCount} ${text.warnings.toLocaleLowerCase()}`
      : `${detail.run.users_count} ${text.collaborators.toLocaleLowerCase()} · ${warningCount} ${text.warnings.toLocaleLowerCase()}`
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
        {contentView === 'collaborators' && canCancel ? (
          <Button type="button" variant="outline" data-modal-destructive="true" onClick={() => onCancel(detail.run)} disabled={isSaving}>
            <Ban className="h-4 w-4" />
            {copy.runActions.cancel}
          </Button>
        ) : null}
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
        {(contentView === 'adjustments' || contentView === 'deductions') && selectedLineIsDirty && detail.run.status === 'draft' && canPrepareAction ? (
          <Button type="button" onClick={onSaveLine} disabled={isSaving || !selectedLine}>
            {activeBusyKind === 'save-line' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {copy.labels.saveLine}
          </Button>
        ) : contentView === 'collaborators' && dirtyLineIds.size > 0 ? (
          <Button type="button" onClick={selectFirstDirty} disabled={isSaving}>{text.openPending}</Button>
        ) : contentView === 'collaborators' && canProcess ? (
          <Button type="button" onClick={onProcess} disabled={isSaving}>
            {activeBusyKind === 'process-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {copy.labels.process}
          </Button>
        ) : contentView === 'collaborators' && canApprove ? (
          <Button type="button" onClick={onApprove} disabled={isSaving}>
            {activeBusyKind === 'approve-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {copy.labels.approve}
          </Button>
        ) : contentView === 'collaborators' && canPay ? (
          <Button type="button" onClick={onPay} disabled={isSaving}>
            {activeBusyKind === 'mark-paid' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {copy.labels.pay}
          </Button>
        ) : null}
      </>
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
      contentClassName="z-[140] h-[min(92dvh,960px)]"
      bodyClassName="overflow-hidden p-0"
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
        <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
          {notice ? (
            <div className={`mx-5 mt-4 shrink-0 rounded-lg border px-4 py-3 text-sm font-normal ${notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200'
            }`}
            >
              {notice.message}
            </div>
          ) : null}

          {contentView === 'collaborators' ? (
          <div className="shrink-0 px-5 pt-4">
            <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-[1.1fr_repeat(5,minmax(0,0.72fr))]">
              <div className="border-b border-slate-200 px-4 py-3 sm:col-span-2 xl:col-span-1 xl:border-b-0 xl:border-r dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#59C3A5]/15 px-2.5 py-1 text-xs font-medium text-[#177D66] dark:text-[#B8F2E3]">{copy.statuses[detail.run.status]}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode]}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{copy.frequencies[detail.run.pay_period]}</span>
                </div>
                <div className="mt-2 flex items-start gap-2 text-xs font-normal text-[#177D66] dark:text-[#B8F2E3]">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{copy.labels.nativeCurrencyNotice}</span>
                </div>
              </div>
              {[
                [copy.labels.employees, String(detail.run.users_count)],
                [text.earningsTotal, formatCurrency(detail.run.gross_amount, locale, runCurrency)],
                [text.deductionsTotal, formatCurrency(detail.run.deductions_amount, locale, runCurrency)],
                [copy.labels.net, formatCurrency(detail.run.net_amount, locale, runCurrency)],
                [text.warnings, String(warningCount)],
              ].map(([label, value], index) => (
                <div key={label} className={`px-4 py-3 ${index < 4 ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-medium tabular-nums text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          <div className="flex min-h-0 flex-1 p-5">
            {contentView === 'collaborators' ? (
              <PayrollRunRoster
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
