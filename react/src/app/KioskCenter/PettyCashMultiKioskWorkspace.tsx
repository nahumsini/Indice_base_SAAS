import { useKioskNavigationState } from '../components/kiosk-engine/KioskNavigationBoundary';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Banknote,
  Camera,
  CheckCircle2,
  Eye,
  FileUp,
  LoaderCircle,
  MapPin,
  Paperclip,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { KioskWorkspaceTabs } from '../components/kiosk-engine/KioskWorkspacePrimitives';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../BasicModules/Expenses/Budgets/budgetTaxCatalog';
import {
  BudgetTaxControls,
  type TaxControlDraft,
} from '../BasicModules/Expenses/components/modals/BudgetTaxControls';
import { getPettyCashTranslations } from '../BasicModules/PettyCash/translations';
import { PettyCashKioskAttachmentsModal } from '../BasicModules/PettyCash/Kiosk/components/PettyCashKioskAttachmentsModal';
import { PettyCashKioskBalanceStrip } from '../BasicModules/PettyCash/Kiosk/components/PettyCashKioskBalanceStrip';
import { PettyCashKioskIncomeCard } from '../BasicModules/PettyCash/Kiosk/components/PettyCashKioskIncomeCard';
import type {
  PublicPettyCashAttachment,
  PublicPettyCashIncomeMovement,
  PublicPettyCashPeriod,
  PublicPettyCashReceipt,
  PublicPettyCashReceiptResponse,
} from '../BasicModules/PettyCash/Kiosk/pettyCashKioskApi';
import {
  multiKioskPublicApi,
  type MultiKioskChildWorkspace,
} from '../api/multiKiosks';
import {
  type KioskPresignedUpload,
  uploadPresignedKioskFile,
} from './multiKioskWorkspaceUploads';
import {
  KioskFileDropzone,
  KioskStickyActionBar,
  KioskToolWorkspaceFrame,
  KioskWorkspaceContextBar,
  KioskWorkspaceEmptyState,
  KioskWorkspaceNotice,
  KioskWorkspaceSectionHeader,
  KioskWorkspaceSurface,
} from '../components/kiosk-engine/KioskToolWorkspace';

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const maxAttachments = 5;

const capabilities = {
  receiptCreate: 'petty-cash.receipt.create@1',
  movementsRead: 'petty-cash.movements.read@1',
  attachmentsRead: 'petty-cash.attachments.read@1',
  attachmentPresign: 'petty-cash.attachment.presign@1',
  attachmentRegister: 'petty-cash.attachment.register@1',
} as const;

type PettyCashTab = 'capture' | 'expenses' | 'income';
type ReceiptDraft = TaxControlDraft & {
  description: string;
  expenseDate: string;
  receiptReference: string;
};

interface PettyCashMultiKioskWorkspaceProps {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
}

function todayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function taxDraft(currencyCode: string): TaxControlDraft {
  const country = inferTaxCountryFromCurrency(currencyCode);
  const profile = getDefaultBudgetTaxProfile(country);
  return {
    amount: '',
    budgetCurrencyCode: currencyCode,
    taxes: '',
    taxCountry: country,
    taxEnabled: false,
    taxIncluded: false,
    taxMode: 'none',
    taxProfileId: profile?.id ?? '',
    taxRate: profile ? taxRateToPercentInput(profile.rate) : '',
    taxSpecialAmount: '',
  };
}

function emptyDraft(currencyCode: string): ReceiptDraft {
  return {
    ...taxDraft(currencyCode),
    description: '',
    expenseDate: todayInputValue(),
    receiptReference: '',
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.trim().replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function taxBreakdown(form: ReceiptDraft) {
  const entered = Math.max(0, parseAmount(form.amount));
  const tax = form.taxEnabled ? Math.max(0, parseAmount(form.taxes)) : 0;
  return {
    subtotalAmount: roundMoney(form.taxEnabled && form.taxIncluded ? Math.max(0, entered - tax) : entered),
    taxAmount: roundMoney(tax),
    totalAmount: roundMoney(form.taxEnabled && !form.taxIncluded ? entered + tax : entered),
  };
}

function formatCurrency(value: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null | undefined, emptyLabel: string, locale: string) {
  if (!value) return emptyLabel;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function periodKeyFromDate(value?: string | null) {
  return value?.match(/^\d{4}-\d{2}/)?.[0] ?? '';
}

function inferredPeriod(periodKey: string, index: number): PublicPettyCashPeriod {
  const [year, month] = periodKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    id: -(index + 1),
    period_key: periodKey,
    period_start: `${periodKey}-01`,
    period_end: `${periodKey}-${String(lastDay).padStart(2, '0')}`,
    status: 'OPEN',
    currency_code: 'MXN',
  };
}

function periodOptions(
  periods: PublicPettyCashPeriod[],
  expenses: PublicPettyCashReceipt[],
  income: PublicPettyCashIncomeMovement[],
) {
  const byKey = new Map(periods.map(period => [period.period_key, period]));
  [...expenses.map(item => item.period_key || periodKeyFromDate(item.expense_date)),
    ...income.map(item => item.period_key || periodKeyFromDate(item.movement_date))]
    .filter(Boolean)
    .forEach((periodKey, index) => {
      if (!byKey.has(periodKey)) byKey.set(periodKey, inferredPeriod(periodKey, index));
    });
  return [...byKey.values()].sort((left, right) => right.period_key.localeCompare(left.period_key));
}

function inferContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv', txt: 'text/plain',
  };
  return extension ? byExtension[extension] ?? 'application/octet-stream' : 'application/octet-stream';
}

function safeError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  return /internal server|status\s*500|unexpected server|object storage|idempotency-key|upload failed/i.test(error.message)
    ? fallback
    : error.message;
}

function csrfFor(token: string) {
  try {
    return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  } catch {
    return '';
  }
}

function settlementLineId(response: PublicPettyCashReceiptResponse) {
  return Number(response.settlement_line?.id ?? 0);
}

export function PettyCashMultiKioskWorkspace({
  token,
  kioskId,
  workspace,
  locale,
  onAuthorizationFailure,
  onRefresh,
}: PettyCashMultiKioskWorkspaceProps) {
  const copy = getPettyCashTranslations(locale);
  const bootstrap = workspace.bootstrap;
  const fund = bootstrap?.fund;
  const currencyCode = fund?.currency_code ?? 'MXN';
  const displayLocale = copy.publicKiosk.date.locale;
  const [activeTab, setActiveTab] = useState<PettyCashTab>('capture');
  const [form, setForm] = useState<ReceiptDraft>(() => emptyDraft(currencyCode));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [pendingReceiptId, setPendingReceiptId] = useState<number | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attachmentReceipt, setAttachmentReceipt] = useState<PublicPettyCashReceipt | null>(null);
  const [receiptAttachments, setReceiptAttachments] = useState<PublicPettyCashAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  useKioskNavigationState({ busy: isSaving, dirty: JSON.stringify(form) !== JSON.stringify(emptyDraft(currencyCode)) || attachments.length > 0 || pendingReceiptId !== null });
  const [attachmentsError, setAttachmentsError] = useState('');
  const receiptInFlightRef = useRef(false);

  const expenses = useMemo(() => (bootstrap?.expenses ?? []).map(receipt => ({
    ...receipt,
    period_key: receipt.period_key || periodKeyFromDate(receipt.expense_date),
  })), [bootstrap?.expenses]);
  const income = bootstrap?.income_movements ?? [];
  const periods = useMemo(
    () => periodOptions(bootstrap?.periods ?? [], expenses, income),
    [bootstrap?.periods, expenses, income],
  );

  useEffect(() => {
    setSelectedPeriodKey(current => periods.some(period => period.period_key === current)
      ? current
      : periods.find(period => period.status === 'OPEN')?.period_key ?? periods[0]?.period_key ?? '');
  }, [periods]);

  useEffect(() => {
    setForm(current => current.budgetCurrencyCode === currencyCode
      ? current
      : { ...emptyDraft(currencyCode), description: current.description, amount: current.amount });
  }, [currencyCode]);

  useEffect(() => {
    setActiveTab('capture');
    setForm(emptyDraft(currencyCode));
    setAttachments([]);
    setPendingReceiptId(null);
    setErrorMessage('');
    setSuccessMessage('');
    setAttachmentReceipt(null);
  }, [workspace.session.id, currencyCode]);

  const totals = useMemo(() => taxBreakdown(form), [form]);
  const filteredExpenses = useMemo(
    () => expenses
      .filter(item => !selectedPeriodKey || item.period_key === selectedPeriodKey)
      .sort((left, right) => `${right.expense_date}-${right.id}`.localeCompare(`${left.expense_date}-${left.id}`)),
    [expenses, selectedPeriodKey],
  );
  const filteredIncome = useMemo(
    () => income
      .filter(item => !selectedPeriodKey || item.period_key === selectedPeriodKey)
      .sort((left, right) => `${right.movement_date}-${right.id}`.localeCompare(`${left.movement_date}-${left.id}`)),
    [income, selectedPeriodKey],
  );
  const periodExpenses = filteredExpenses.reduce((total, receipt) => total + Number(receipt.total_amount ?? 0), 0);
  const periodIncome = filteredIncome.reduce((total, movement) => total + Number(movement.amount ?? 0), 0);
  const granted = workspace.session.capabilities;
  const hasCapability = (capability: string) => granted.includes(capability);
  const canAttach = hasCapability(capabilities.attachmentPresign)
    && hasCapability(capabilities.attachmentRegister);
  const retryingEvidence = pendingReceiptId !== null;
  const canCreate = retryingEvidence
    ? canAttach && attachments.length > 0 && !isSaving
    : hasCapability(capabilities.receiptCreate)
      && form.description.trim().length > 0
      && totals.totalAmount > 0
      && !isSaving;

  const action = async <T,>(capability: string, payload: Record<string, unknown>) => {
    try {
      return await multiKioskPublicApi.action<T>(token, kioskId, capability, payload, csrfFor(token));
    } catch (error) {
      onAuthorizationFailure(error);
      throw error;
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canAttach) {
      setErrorMessage(copy.publicKiosk.errors.invalidFiles);
      event.target.value = '';
      return;
    }
    const selected = Array.from(event.target.files ?? []);
    const available = Math.max(0, maxAttachments - attachments.length);
    const valid = selected.filter(file => file.size > 0
      && file.size <= maxAttachmentSizeBytes
      && inferContentType(file) !== 'application/octet-stream').slice(0, available);
    setAttachments(current => [...current, ...valid].slice(0, maxAttachments));
    if (valid.length !== selected.length) setErrorMessage(copy.publicKiosk.errors.invalidFiles);
    event.target.value = '';
  };

  const uploadAttachments = async (receiptId: number, files: File[]) => {
    const failedFiles: File[] = [];
    for (const file of files) {
      try {
        const contentType = inferContentType(file);
        const logicalFileId = `${file.name}:${file.size}:${file.lastModified}`;
        const upload = await action<KioskPresignedUpload>(capabilities.attachmentPresign, {
          resource_id: receiptId,
          file_name: file.name,
          original_filename: file.name,
          content_type: contentType,
          mime_type: contentType,
          size_bytes: file.size,
          logical_file_id: logicalFileId,
        });
        await uploadPresignedKioskFile(upload, file, contentType);
        await action<PublicPettyCashAttachment>(capabilities.attachmentRegister, {
          resource_id: receiptId,
          object_key: upload.object_key,
          original_filename: file.name,
          mime_type: contentType,
          size_bytes: file.size,
          logical_file_id: logicalFileId,
        });
      } catch (error) {
        if (onAuthorizationFailure(error)) throw error;
        failedFiles.push(file);
      }
    }
    return failedFiles;
  };

  const handleCreateReceipt = async () => {
    if (!canCreate || receiptInFlightRef.current) return;
    receiptInFlightRef.current = true;
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      let receiptId = pendingReceiptId;
      if (receiptId === null) {
        const response = await action<PublicPettyCashReceiptResponse>(capabilities.receiptCreate, {
          attachment_count: 0,
          currency_code: currencyCode,
          description: form.description.trim(),
          expense_date: form.expenseDate || null,
          receipt_reference: form.receiptReference.trim() || null,
          subtotal_amount: totals.subtotalAmount,
          tax_amount: totals.taxAmount,
          total_amount: totals.totalAmount,
        });
        receiptId = settlementLineId(response);
      }
      if (receiptId <= 0) throw new Error(copy.publicKiosk.errors.receipt);
      const failedFiles = attachments.length > 0
        ? await uploadAttachments(receiptId, attachments)
        : [];
      if (failedFiles.length > 0) {
        setPendingReceiptId(receiptId);
        setAttachments(failedFiles);
        setSuccessMessage(copy.publicKiosk.success.receiptPartial(failedFiles.length));
        await onRefresh().catch(() => undefined);
        return;
      }
      setPendingReceiptId(null);
      setForm(emptyDraft(currencyCode));
      setAttachments([]);
      setActiveTab('expenses');
      setSuccessMessage(copy.publicKiosk.success.receipt);
      try {
        await onRefresh();
      } catch (error) {
        if (onAuthorizationFailure(error)) return;
        // The receipt is already committed; reopening the child reconciles its history.
      }
    } catch (error) {
      setErrorMessage(safeError(error, copy.publicKiosk.errors.receipt));
    } finally {
      receiptInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const handleViewAttachments = async (receipt: PublicPettyCashReceipt) => {
    setAttachmentReceipt(receipt);
    setReceiptAttachments([]);
    setAttachmentsError('');
    if (!hasCapability(capabilities.attachmentsRead)) {
      setAttachmentsError(copy.reconciliation.errors.attachmentsLoad);
      return;
    }
    setIsLoadingAttachments(true);
    try {
      const response = await action<{ items: PublicPettyCashAttachment[]; count: number }>(
        capabilities.attachmentsRead,
        { resource_id: receipt.id },
      );
      setReceiptAttachments(response.items ?? []);
    } catch (error) {
      setAttachmentsError(safeError(error, copy.reconciliation.errors.attachmentsLoad));
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  if (!fund || !bootstrap?.user) {
    return (
      <KioskToolWorkspaceFrame personal>
        <KioskWorkspaceNotice kind="error">{copy.publicKiosk.errors.bootstrap}</KioskWorkspaceNotice>
      </KioskToolWorkspaceFrame>
    );
  }

  return (
    <KioskToolWorkspaceFrame personal>
      <KioskWorkspaceContextBar
        density="compact"
        description={bootstrap.user.position_title || bootstrap.user.department || copy.publicKiosk.header.secureAccess}
        eyebrow={copy.publicKiosk.workspace.identified}
        icon={<span aria-hidden="true" className="text-2xl">🔐</span>}
        meta={(
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="h-4 w-4 shrink-0 text-[#147514]" />
          <span className="truncate">{bootstrap.scope_label || fund.scope_label}</span>
          </div>
        )}
        title={bootstrap.user.full_name}
        tone="green"
      />

      <PettyCashKioskBalanceStrip
        personal
        currentBalance={{
          label: copy.publicKiosk.metrics.currentBalance,
          value: formatCurrency(Number(fund.current_balance_amount ?? 0), currencyCode, displayLocale),
          tone: 'green',
        }}
        fundLimit={{
          label: copy.publicKiosk.metrics.fundLimit,
          value: formatCurrency(Number(fund.limit_amount ?? 0), currencyCode, displayLocale),
          tone: 'slate',
        }}
        periodExpenses={{
          label: copy.publicKiosk.metrics.periodExpenses,
          value: formatCurrency(periodExpenses, currencyCode, displayLocale),
          tone: 'orange',
        }}
        periodIncome={{
          label: copy.publicKiosk.metrics.periodIncome,
          value: formatCurrency(periodIncome, currencyCode, displayLocale),
          tone: 'blue',
        }}
      />

      <KioskWorkspaceTabs<PettyCashTab>
        density="comfortable" sticky={false}
        mobileLayout="row"
        activeValue={activeTab}
        ariaLabel={copy.publicKiosk.tabs.label}
        items={[
          { icon: <span aria-hidden="true" className="text-2xl">💰</span>, label: copy.publicKiosk.tabs.upload, value: 'capture' },
          { badge: filteredExpenses.length, icon: <span aria-hidden="true" className="text-2xl">🧾</span>, label: copy.publicKiosk.tabs.expenses, value: 'expenses' },
          { badge: filteredIncome.length, icon: <span aria-hidden="true" className="text-2xl">💵</span>, label: copy.publicKiosk.tabs.income, value: 'income' },
        ]}
        onChange={(tab) => {
          setActiveTab(tab);
          setErrorMessage('');
          setSuccessMessage('');
        }}
        tone="green"
      />

      {errorMessage ? <KioskWorkspaceNotice kind="error">{errorMessage}</KioskWorkspaceNotice> : null}
      {successMessage ? <KioskWorkspaceNotice kind="success">{successMessage}</KioskWorkspaceNotice> : null}

      {activeTab === 'capture' ? (
        <section className="space-y-4 pb-28 md:pb-0" role="tabpanel" aria-label={copy.publicKiosk.receipt.title}>
          <KioskWorkspaceSurface>
            <KioskWorkspaceSectionHeader
              description={copy.publicKiosk.receipt.description}
              icon={<span aria-hidden="true" className="text-2xl">🧾</span>}
              title={copy.publicKiosk.receipt.title}
              tone="green"
            />
            <div className="mt-4 grid gap-3">
              <label className="space-y-1.5" htmlFor={`petty-multi-${kioskId}-description`}><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.concept}</span><input id={`petty-multi-${kioskId}-description`} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder={copy.publicKiosk.receipt.conceptPlaceholder} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="space-y-1.5" htmlFor={`petty-multi-${kioskId}-amount`}><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.amount}</span><input id={`petty-multi-${kioskId}-amount`} inputMode="decimal" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="0.00" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950" /></label>
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                <label className="space-y-1.5" htmlFor={`petty-multi-${kioskId}-reference`}><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.reference}</span><input id={`petty-multi-${kioskId}-reference`} value={form.receiptReference} onChange={event => setForm(current => ({ ...current, receiptReference: event.target.value }))} placeholder={copy.publicKiosk.receipt.referencePlaceholder} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#147514] dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="space-y-1.5" htmlFor={`petty-multi-${kioskId}-date`}><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.date}</span><input id={`petty-multi-${kioskId}-date`} type="date" value={form.expenseDate} onChange={event => setForm(current => ({ ...current, expenseDate: event.target.value }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#147514] dark:border-slate-700 dark:bg-slate-950" /></label>
              </div>
            </div>
          </KioskWorkspaceSurface>

          <KioskWorkspaceSurface>
            <KioskWorkspaceSectionHeader
              description={copy.publicKiosk.receipt.currency(currencyCode)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              title={copy.publicKiosk.workspace.calculation}
              tone="green"
            />
            <div className="mt-3">
            <BudgetTaxControls compact draft={form} onDraftChange={updates => setForm(current => ({ ...current, ...updates }))} />
            </div>
            <div className="mt-3 grid grid-cols-1 divide-y divide-emerald-100 min-[430px]:grid-cols-3 min-[430px]:divide-x min-[430px]:divide-y-0 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/70 text-center dark:divide-emerald-500/20 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              {[[copy.publicKiosk.workspace.subtotal, totals.subtotalAmount], [copy.publicKiosk.workspace.taxes, totals.taxAmount], [copy.common.total, totals.totalAmount]].map(([label, value]) => <div key={String(label)} className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 min-[430px]:block"><p className="truncate text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-base font-medium text-slate-950 dark:text-white">{formatCurrency(Number(value), currencyCode, displayLocale)}</p></div>)}
            </div>
          </KioskWorkspaceSurface>

          <KioskWorkspaceSurface>
            <KioskWorkspaceSectionHeader
              description={copy.publicKiosk.workspace.evidenceDescription}
              icon={<span aria-hidden="true" className="text-2xl">📸</span>}
              title={copy.publicKiosk.workspace.evidenceTitle}
              tone="green"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <KioskFileDropzone accept="image/*" capture="environment" density="compact" disabled={!canAttach || isSaving} icon={<span aria-hidden="true" className="text-2xl">📸</span>} onChange={handleAttachmentChange} title={copy.publicKiosk.workspace.takePhoto} tone="green" />
              <KioskFileDropzone accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" density="compact" disabled={!canAttach || isSaving} icon={<span aria-hidden="true" className="text-2xl">📁</span>} multiple onChange={handleAttachmentChange} title={copy.publicKiosk.workspace.chooseFile} tone="green" />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">{copy.publicKiosk.workspace.evidenceHint}</p>
            {attachments.length > 0 ? <div className="mt-3 grid gap-2">{attachments.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Paperclip className="h-4 w-4 shrink-0 text-[#147514]" /><span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{file.name}</span><button type="button" aria-label={copy.common.deleteAttachment} disabled={isSaving || (retryingEvidence && attachments.length === 1)} onClick={() => setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))} className="grid h-9 w-9 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-4 w-4" /></button></div>)}</div> : null}
          </KioskWorkspaceSurface>

          <KioskStickyActionBar position="contained" className="fixed inset-x-3 bottom-[var(--employee-navigation-height,0px)] z-30 mx-auto max-w-[31rem] md:static md:mx-0" summary={retryingEvidence ? copy.publicKiosk.workspace.evidenceHint : undefined}>
            <Button type="button" disabled={!canCreate} onClick={() => void handleCreateReceipt()} className="h-14 w-full gap-2 rounded-xl bg-[#147514] text-base font-medium text-white hover:bg-[#0f5f0f] disabled:opacity-45">
              {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {retryingEvidence ? copy.publicKiosk.receipt.retryEvidence : copy.publicKiosk.receipt.submit}
            </Button>
          </KioskStickyActionBar>
        </section>
      ) : null}

      {activeTab !== 'capture' ? (
        <KioskWorkspaceSurface className="p-3 sm:p-3">
          <label className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
            <WalletCards className="h-4 w-4 shrink-0 text-[#147514]" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.publicKiosk.history.period}</span><select aria-label={copy.publicKiosk.history.period} value={selectedPeriodKey} onChange={event => setSelectedPeriodKey(event.target.value)} className="mt-0.5 h-7 w-full bg-transparent text-sm font-medium text-slate-950 outline-none dark:text-white">{periods.length === 0 ? <option value="">{copy.publicKiosk.history.noPeriods}</option> : periods.map(period => <option key={period.id} value={period.period_key}>{formatDate(period.period_start, period.period_key, displayLocale)} – {formatDate(period.period_end, period.period_key, displayLocale)}</option>)}</select></span>
          </label>
        </KioskWorkspaceSurface>
      ) : null}

      {activeTab === 'expenses' ? (
        <section className="space-y-2" role="tabpanel" aria-label={copy.publicKiosk.history.expensesTitle}>
          {filteredExpenses.length === 0 ? <KioskWorkspaceEmptyState description={copy.publicKiosk.history.emptyExpenses} icon={<span aria-hidden="true" className="text-2xl">🧾</span>} tone="green" /> : filteredExpenses.map(receipt => (
            <article key={receipt.id} data-personal-tool-card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-slate-500">{formatDate(receipt.expense_date, copy.publicKiosk.date.empty, displayLocale)}</p><h3 className="mt-1 break-words text-base font-medium text-slate-950 dark:text-white">{receipt.description}</h3></div><p className="break-words text-base font-medium text-rose-700 dark:text-rose-300">{formatCurrency(Number(receipt.total_amount), receipt.currency_code, displayLocale)}</p></div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-[#147514]">{copy.status.line[receipt.status as keyof typeof copy.status.line] ?? receipt.status}</span><button type="button" onClick={() => void handleViewAttachments(receipt)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:text-[#147514] dark:border-slate-700 dark:text-slate-200">{receipt.attachment_count > 0 ? <Eye className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}{copy.publicKiosk.side.attachments(receipt.attachment_count)}</button></div>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'income' ? (
        <section className="space-y-2" role="tabpanel" aria-label={copy.publicKiosk.history.incomeTitle}>
          {filteredIncome.length === 0 ? <KioskWorkspaceEmptyState description={copy.publicKiosk.history.emptyIncome} icon={<span aria-hidden="true" className="text-2xl">💵</span>} tone="green" /> : filteredIncome.map(movement => (
            <PettyCashKioskIncomeCard personal key={movement.id} amount={`+${formatCurrency(Number(movement.amount), movement.currency_code, displayLocale)}`} date={formatDate(movement.movement_date, copy.publicKiosk.date.empty, displayLocale)} movement={movement} noReferenceLabel={copy.common.noReference} referenceLabel={copy.publicKiosk.history.reference} title={copy.status.movement[movement.type]} />
          ))}
        </section>
      ) : null}

      <PettyCashKioskAttachmentsModal
        personal
        attachments={receiptAttachments}
        closeLabel={copy.common.close}
        description={copy.publicKiosk.side.trace}
        emptyLabel={copy.publicKiosk.attachments.empty}
        errorMessage={attachmentsError}
        isLoading={isLoadingAttachments}
        locale={displayLocale}
        onClose={() => setAttachmentReceipt(null)}
        openFileLabel={copy.publicKiosk.attachments.openFile}
        receipt={attachmentReceipt}
        title={copy.publicKiosk.attachments.title}
        uploadedByLabel={copy.publicKiosk.attachments.uploadedBy}
      />
    </KioskToolWorkspaceFrame>
  );
}
