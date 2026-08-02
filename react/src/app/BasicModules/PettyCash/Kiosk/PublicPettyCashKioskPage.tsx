import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Banknote,
  Clock3,
  MapPin,
  ReceiptText,
} from 'lucide-react';
import { useParams } from 'react-router';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { KioskIdentityGate } from '../../../components/kiosk-engine/KioskIdentityGate';
import { KioskWorkspaceTabs } from '../../../components/kiosk-engine/KioskWorkspacePrimitives';
import { useKioskSessionBoundary } from '../../../components/kiosk-engine/useKioskSessionBoundary';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../../Expenses/Budgets/budgetTaxCatalog';
import type { TaxControlDraft } from '../../Expenses/components/modals/BudgetTaxControls';
import {
  pettyCashKioskApi,
  uploadPublicPettyCashAttachment,
  type PublicPettyCashAttachment,
  type PublicPettyCashBootstrapResponse,
  type PublicPettyCashIdentifyResponse,
  type PublicPettyCashIncomeMovement,
  type PublicPettyCashPeriod,
  type PublicPettyCashReceipt,
} from './pettyCashKioskApi';
import { PettyCashKioskAttachmentsModal } from './components/PettyCashKioskAttachmentsModal';
import { PettyCashKioskExpenseCard } from './components/PettyCashKioskExpenseCard';
import { PettyCashKioskIncomeCard } from './components/PettyCashKioskIncomeCard';
import {
  PettyCashKioskEmptyState,
  PettyCashKioskIdentityCard,
  PettyCashKioskSummaryStrip,
  PettyCashKioskToolbar,
  PettyCashReceiptModal,
  type PettyCashReceiptDraft,
} from './components/PettyCashKioskWorkspace';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const maxAttachments = 5;

const todayInputValue = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

type ReceiptFormState = PettyCashReceiptDraft;

type KioskTab = 'expenses' | 'income';

const createKioskTaxDraft = (currencyCode = 'MXN'): TaxControlDraft => {
  const country = inferTaxCountryFromCurrency(currencyCode);
  const defaultProfile = getDefaultBudgetTaxProfile(country);

  return {
    amount: '',
    budgetCurrencyCode: currencyCode,
    taxes: '',
    taxCountry: country,
    taxEnabled: false,
    taxIncluded: false,
    taxMode: 'none',
    taxProfileId: defaultProfile?.id ?? '',
    taxRate: defaultProfile ? taxRateToPercentInput(defaultProfile.rate) : '',
    taxSpecialAmount: '',
  };
};

const emptyReceiptForm = (currencyCode = 'MXN'): ReceiptFormState => ({
  ...createKioskTaxDraft(currencyCode),
  amount: '',
  description: '',
  expenseDate: todayInputValue(),
  receiptReference: '',
});

function normalizeError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) return fallback;
  return /credential validation failed|invalid (?:employee )?pin|pin (?:is )?invalid|internal server|object storage|idempotency-key|upload failed|unable to/i.test(error.message)
    ? fallback
    : error.message;
}

function inferContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  if (extension === 'doc') return 'application/msword';
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'xls') return 'application/vnd.ms-excel';
  if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (extension === 'csv') return 'text/csv';
  if (extension === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function isSupportedAttachment(file: File) {
  return file.size > 0
    && file.size <= maxAttachmentSizeBytes
    && inferContentType(file) !== 'application/octet-stream';
}

function parseAmount(value: string) {
  const parsed = Number(value.trim().replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null | undefined, emptyLabel: string, locale: string) {
  if (!value) return emptyLabel;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function periodKeyFromDate(value?: string | null) {
  return value?.match(/^\d{4}-\d{2}/)?.[0] ?? '';
}

function createPeriodFromKey(periodKey: string, index: number): PublicPettyCashPeriod {
  const [year, month] = periodKey.split('-').map(Number);
  const periodStart = `${periodKey}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    id: -(index + 1),
    period_key: periodKey,
    period_start: periodStart,
    period_end: `${periodKey}-${String(lastDay).padStart(2, '0')}`,
    status: 'OPEN',
    currency_code: 'MXN',
  };
}

function normalizeReceipts(receipts: PublicPettyCashReceipt[]) {
  return receipts.map(receipt => ({
    ...receipt,
    period_key: receipt.period_key || periodKeyFromDate(receipt.expense_date),
  }));
}

function buildPeriodOptions(
  periods: PublicPettyCashPeriod[],
  expenses: PublicPettyCashReceipt[],
  incomeMovements: PublicPettyCashIncomeMovement[],
) {
  const periodMap = new Map(periods.map(period => [period.period_key, period]));
  const inferredKeys = [
    ...expenses.map(item => item.period_key || periodKeyFromDate(item.expense_date)),
    ...incomeMovements.map(item => item.period_key || periodKeyFromDate(item.movement_date)),
  ].filter(Boolean);

  inferredKeys.forEach((periodKey, index) => {
    if (!periodMap.has(periodKey)) periodMap.set(periodKey, createPeriodFromKey(periodKey, index));
  });

  return Array.from(periodMap.values()).sort((left, right) => right.period_key.localeCompare(left.period_key));
}

function getDefaultPeriodKey(periods: PublicPettyCashPeriod[]) {
  return periods.find(period => period.status === 'OPEN')?.period_key ?? periods[0]?.period_key ?? '';
}

function formatPeriodLabel(period: PublicPettyCashPeriod, locale: string) {
  const start = formatDate(period.period_start, period.period_key, locale);
  const end = formatDate(period.period_end, period.period_key, locale);
  return `${start} – ${end}`;
}

function getReceiptAmount(receipt: PublicPettyCashReceipt) {
  return Number(receipt.total_amount ?? 0);
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function getKioskTaxBreakdown(form: Pick<ReceiptFormState, 'amount' | 'taxes' | 'taxEnabled' | 'taxIncluded'>) {
  const enteredAmount = Math.max(0, parseAmount(form.amount));
  const taxAmount = form.taxEnabled ? Math.max(0, parseAmount(form.taxes)) : 0;
  const subtotalAmount = form.taxEnabled && form.taxIncluded ? Math.max(0, enteredAmount - taxAmount) : enteredAmount;
  const totalAmount = form.taxEnabled && !form.taxIncluded ? enteredAmount + taxAmount : enteredAmount;

  return {
    subtotalAmount: roundMoney(subtotalAmount),
    taxAmount: roundMoney(taxAmount),
    totalAmount: roundMoney(totalAmount),
  };
}

export default function PublicPettyCashKioskPage() {
  const copy = usePettyCashTranslations();
  const { fundToken = '' } = useParams();
  const [bootstrap, setBootstrap] = useState<PublicPettyCashBootstrapResponse | null>(null);
  const [identity, setIdentity] = useState<PublicPettyCashIdentifyResponse | null>(null);
  const [pin, setPin] = useState('');
  const [form, setForm] = useState<ReceiptFormState>(() => emptyReceiptForm());
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<KioskTab>('expenses');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [periods, setPeriods] = useState<PublicPettyCashPeriod[]>([]);
  const [expenses, setExpenses] = useState<PublicPettyCashReceipt[]>([]);
  const [incomeMovements, setIncomeMovements] = useState<PublicPettyCashIncomeMovement[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentReceipt, setAttachmentReceipt] = useState<PublicPettyCashReceipt | null>(null);
  const [receiptAttachments, setReceiptAttachments] = useState<PublicPettyCashAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState('');
  const [receiptToDelete, setReceiptToDelete] = useState<PublicPettyCashReceipt | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const expireSession = useCallback(() => {
    setIdentity(null);
    setPin('');
    setIsReceiptModalOpen(false);
    setSessionMessage(copy.publicKiosk.session.expired);
  }, [copy.publicKiosk.session.expired]);
  const { isOnline, isSessionExpiring } = useKioskSessionBoundary({
    active: Boolean(identity),
    expiresAt: identity?.expires_at,
    inactivityTimeoutSeconds: bootstrap?.inactivity_timeout_seconds ?? 900,
    onExpire: expireSession,
  });

  useEffect(() => {
    let cancelled = false;
    setIsBootstrapping(true);
    setErrorMessage('');

    pettyCashKioskApi.getPublicBootstrap(fundToken)
      .then((response) => {
        if (!cancelled) setBootstrap(response);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(normalizeError(error, copy.publicKiosk.errors.bootstrap));
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.publicKiosk.errors.bootstrap, fundToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!identity) return;
    const nextExpenses = normalizeReceipts(identity.expenses ?? identity.recent_receipts ?? []);
    const nextIncomeMovements = identity.income_movements ?? [];
    const nextPeriods = buildPeriodOptions(identity.periods ?? [], nextExpenses, nextIncomeMovements);
    setExpenses(nextExpenses);
    setIncomeMovements(nextIncomeMovements);
    setPeriods(nextPeriods);
    setSelectedPeriodKey(current => (nextPeriods.some(period => period.period_key === current) ? current : getDefaultPeriodKey(nextPeriods)));
  }, [identity]);

  const fund = identity?.fund ?? bootstrap?.fund ?? null;
  const currencyCode = fund?.currency_code ?? 'MXN';
  const totals = useMemo(() => getKioskTaxBreakdown(form), [form]);
  const amount = totals.totalAmount;
  const canIdentify = pin.trim().length === 5 && !isIdentifying;
  const canSave = form.description.trim().length > 0 && amount > 0 && !isSaving && Boolean(identity?.identification_token);
  const filteredExpenses = useMemo(
    () => expenses.filter(item => item.period_key === selectedPeriodKey).sort((left, right) => `${right.expense_date}-${right.id}`.localeCompare(`${left.expense_date}-${left.id}`)),
    [expenses, selectedPeriodKey],
  );
  const filteredIncomeMovements = useMemo(
    () => incomeMovements.filter(item => item.period_key === selectedPeriodKey).sort((left, right) => `${right.movement_date}-${right.id}`.localeCompare(`${left.movement_date}-${left.id}`)),
    [incomeMovements, selectedPeriodKey],
  );
  const periodIncomeTotal = useMemo(
    () => filteredIncomeMovements.reduce((total, movement) => total + Number(movement.amount ?? 0), 0),
    [filteredIncomeMovements],
  );
  const periodExpenseTotal = useMemo(
    () => filteredExpenses.reduce((total, receipt) => total + getReceiptAmount(receipt), 0),
    [filteredExpenses],
  );
  const currentBalance = Number(fund?.current_balance_amount ?? 0);
  const fundLimit = Number(fund?.limit_amount ?? 0);
  const utilizationPercent = fundLimit > 0 ? (currentBalance / fundLimit) * 100 : 0;
  const identityInitials = identity?.user.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'ID';
  const scopeLabel = fund?.scope_label || bootstrap?.scope_label || copy.publicKiosk.header.defaultScope;
  const currentTimeLabel = currentTime.toLocaleTimeString(copy.publicKiosk.date.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    setForm(current => {
      if (current.budgetCurrencyCode === currencyCode) return current;
      return { ...current, ...createKioskTaxDraft(currencyCode), amount: current.amount };
    });
  }, [currencyCode]);

  const handleIdentify = async () => {
    if (!canIdentify) return;
    setIsIdentifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await pettyCashKioskApi.identifyPublicUser(fundToken, pin.trim());
      setIdentity(response);
      setSessionMessage('');
      setPin('');
      setActiveTab('expenses');
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.identify));
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const availableSlots = Math.max(0, maxAttachments - attachments.length);
    const validFiles = selectedFiles
      .filter(isSupportedAttachment)
      .slice(0, availableSlots);
    setAttachments(current => [...current, ...validFiles].slice(0, maxAttachments));
    event.target.value = '';
    if (validFiles.length !== selectedFiles.length) setErrorMessage(copy.publicKiosk.errors.invalidFiles);
  };

  const uploadAttachments = async (settlementLineId: number, identificationToken: string) => {
    let registeredCount = 0;
    let failedCount = 0;
    for (const file of attachments) {
      try {
        const contentType = inferContentType(file);
        const upload = await pettyCashKioskApi.presignPublicAttachmentUpload(fundToken, settlementLineId, {
          content_type: contentType,
          file_name: file.name,
          identification_token: identificationToken,
          size_bytes: file.size,
        });
        await uploadPublicPettyCashAttachment(upload.upload_url, file, contentType, upload.upload_headers);
        await pettyCashKioskApi.registerPublicAttachment(fundToken, settlementLineId, {
          identification_token: identificationToken,
          mime_type: contentType,
          object_key: upload.object_key,
          original_filename: file.name,
          size_bytes: file.size,
        });
        registeredCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    return { failedCount, registeredCount };
  };

  const handleCreateReceipt = async () => {
    if (!identity?.identification_token || !canSave) return;
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await pettyCashKioskApi.createPublicReceipt(fundToken, {
        attachment_count: 0,
        currency_code: currencyCode,
        description: form.description.trim(),
        expense_date: form.expenseDate || null,
        identification_token: identity.identification_token,
        receipt_reference: form.receiptReference.trim() || null,
        subtotal_amount: totals.subtotalAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
      });
      const settlementLineId = response.settlement_line.id;
      const uploadResult = attachments.length > 0
        ? await uploadAttachments(settlementLineId, identity.identification_token)
        : { failedCount: 0, registeredCount: 0 };

      const statement = response.statement as { periodKey?: string; period_key?: string };
      const savedPeriodKey = statement.period_key ?? statement.periodKey ?? periodKeyFromDate(form.expenseDate);
      const fallbackReceipt: PublicPettyCashReceipt = {
        id: settlementLineId,
        statement_id: Number((response.statement as { id?: number }).id ?? 0) || undefined,
        period_key: savedPeriodKey,
        description: form.description.trim(),
        receipt_reference: form.receiptReference.trim() || null,
        total_amount: totals.totalAmount,
        currency_code: currencyCode,
        expense_date: form.expenseDate,
        attachment_count: uploadResult.registeredCount,
        status: uploadResult.registeredCount > 0 ? 'RECEIPT_ATTACHED' : 'DRAFT',
        can_delete: true,
      };
      const responseExpenses = response.expenses?.length
        ? normalizeReceipts(response.expenses).map(item => item.id === settlementLineId ? {
            ...item,
            attachment_count: uploadResult.registeredCount,
            status: uploadResult.registeredCount > 0 ? 'RECEIPT_ATTACHED' : item.status,
          } : item)
        : [fallbackReceipt, ...expenses.filter(item => item.id !== settlementLineId)];
      const nextPeriods = buildPeriodOptions(response.periods ?? periods, responseExpenses, response.income_movements ?? incomeMovements);

      setIdentity(current => current ? {
        ...current,
        fund: response.fund,
        recent_receipts: response.recent_receipts ?? current.recent_receipts,
        periods: nextPeriods,
        expenses: responseExpenses,
        income_movements: response.income_movements ?? current.income_movements ?? [],
      } : current);
      setBootstrap(current => current ? { ...current, fund: response.fund } : current);
      setSelectedPeriodKey(savedPeriodKey || getDefaultPeriodKey(nextPeriods));
      setForm(emptyReceiptForm(currencyCode));
      setAttachments([]);
      setIsReceiptModalOpen(false);
      setActiveTab('expenses');
      setSuccessMessage(uploadResult.failedCount > 0
        ? copy.publicKiosk.success.receiptPartial(uploadResult.failedCount)
        : copy.publicKiosk.success.receipt);
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.receipt));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSession = () => {
    setIdentity(null);
    setPin('');
    setForm(emptyReceiptForm(currencyCode));
    setAttachments([]);
    setIsReceiptModalOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
    setSessionMessage('');
    setActiveTab('expenses');
  };

  const handleViewAttachments = async (receipt: PublicPettyCashReceipt) => {
    setAttachmentReceipt(receipt);
    setReceiptAttachments([]);
    setAttachmentsError('');
    if (!identity?.identification_token) {
      setAttachmentsError(copy.reconciliation.errors.attachmentsLoad);
      return;
    }

    setIsLoadingAttachments(true);
    try {
      const response = await pettyCashKioskApi.listPublicAttachments(
        fundToken,
        receipt.id,
        identity.identification_token,
      );
      setReceiptAttachments(response.items ?? []);
    } catch (error) {
      setAttachmentsError(normalizeError(error, copy.reconciliation.errors.attachmentsLoad));
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete || !identity?.identification_token) return;
    setIsDeletingReceipt(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await pettyCashKioskApi.deletePublicReceipt(
        fundToken,
        receiptToDelete.id,
        identity.identification_token,
      );
      const nextExpenses = normalizeReceipts(response.expenses ?? []);
      const nextIncomeMovements = response.income_movements ?? [];
      const nextPeriods = buildPeriodOptions(response.periods ?? periods, nextExpenses, nextIncomeMovements);

      setIdentity(current => current ? {
        ...current,
        fund: response.fund,
        recent_receipts: response.recent_receipts ?? current.recent_receipts,
        periods: nextPeriods,
        expenses: nextExpenses,
        income_movements: nextIncomeMovements,
      } : current);
      setBootstrap(current => current ? { ...current, fund: response.fund } : current);
      setReceiptToDelete(null);
      setSuccessMessage(copy.publicKiosk.success.deleted);
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.reconciliation.errors.receiptDelete));
    } finally {
      setIsDeletingReceipt(false);
    }
  };

  return (
    <>
      <KioskPublicShell
        banners={!isOnline ? <div role="alert" className="bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-900">{copy.publicKiosk.session.offline}</div> : null}
        errorMessage={isReceiptModalOpen ? '' : errorMessage}
        header={(<header className="border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[10px] font-medium text-[#147514] dark:text-emerald-300">{copy.publicKiosk.header.eyebrow}</p>
          <h1 className="mt-1 line-clamp-2 break-words text-xl font-medium leading-tight tracking-tight text-slate-950 dark:text-white">
            {fund?.name ?? copy.publicKiosk.header.defaultFund}
          </h1>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{scopeLabel}</span></span>
            <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{currentTimeLabel}</span>
          </div>
        </header>)}
        loadingOverlay={<LoadingBarOverlay isVisible={isBootstrapping} title={copy.publicKiosk.loading.title} description={copy.publicKiosk.loading.description} />}
        maxWidthClassName="max-w-[480px]"
        minimalContent={!identity}
        sessionExpiredMessage={sessionMessage || (isSessionExpiring ? copy.publicKiosk.session.expiring : null)}
        successMessage={successMessage}
      >

        {!identity ? (
          <KioskIdentityGate
            backspaceLabel={copy.publicKiosk.identify.backspace}
            clearLabel={copy.common.clear}
            description={copy.publicKiosk.identify.description}
            disabled={!isOnline || isBootstrapping}
            isSubmitting={isIdentifying}
            onPinChange={setPin}
            onSubmit={() => void handleIdentify()}
            pinAriaLabel={copy.publicKiosk.identify.pin}
            pinLength={5}
            pinValue={pin}
            privacyMessage={copy.publicKiosk.identify.privacy}
            submitLabel={copy.publicKiosk.identify.submit}
            title={copy.publicKiosk.identify.title}
            tone="green"
          />
        ) : (
          <div className="space-y-3 bg-slate-50 p-3 dark:bg-slate-950/40">
            <KioskWorkspaceTabs<KioskTab>
              activeValue={activeTab}
              ariaLabel={copy.publicKiosk.tabs.label}
              items={[
                { badge: filteredExpenses.length, icon: <ReceiptText className="h-4 w-4" />, label: copy.publicKiosk.tabs.expenses, value: 'expenses' },
                { badge: filteredIncomeMovements.length, icon: <Banknote className="h-4 w-4" />, label: copy.publicKiosk.tabs.income, value: 'income' },
              ]}
              onChange={setActiveTab}
              tone="green"
            />

            <PettyCashKioskIdentityCard
              balanceLabel={copy.publicKiosk.metrics.currentBalance}
              balanceValue={formatCurrency(currentBalance, currencyCode)}
              detail={identity.user.position_title || identity.user.department || copy.publicKiosk.header.secureAccess}
              fundLimitLabel={copy.publicKiosk.metrics.fundLimit}
              fundLimitValue={formatCurrency(fundLimit, currencyCode)}
              initials={identityInitials}
              name={identity.user.full_name}
              onReset={handleResetSession}
              resetLabel={copy.publicKiosk.workspace.reset}
              scopeLabel={scopeLabel}
              utilizationPercent={utilizationPercent}
              verifiedLabel={copy.publicKiosk.workspace.identified}
            />

            <PettyCashKioskSummaryStrip
              balanceLabel={copy.publicKiosk.metrics.currentBalance}
              balanceValue={formatCurrency(currentBalance, currencyCode)}
              expenseLabel={copy.publicKiosk.metrics.periodExpenses}
              expenseValue={formatCurrency(periodExpenseTotal, currencyCode)}
              incomeLabel={copy.publicKiosk.metrics.periodIncome}
              incomeValue={formatCurrency(periodIncomeTotal, currencyCode)}
            />

            <PettyCashKioskToolbar
              createLabel={copy.publicKiosk.receipt.title}
              formatPeriod={period => formatPeriodLabel(period, copy.publicKiosk.date.locale)}
              noPeriodsLabel={copy.publicKiosk.history.noPeriods}
              onCreate={() => { setErrorMessage(''); setSuccessMessage(''); setIsReceiptModalOpen(true); }}
              onPeriodChange={setSelectedPeriodKey}
              periodLabel={copy.publicKiosk.history.period}
              periods={periods}
              selectedPeriodKey={selectedPeriodKey}
            />

            {activeTab === 'expenses' ? (
              <section className="space-y-2" role="tabpanel" aria-label={copy.publicKiosk.history.expensesTitle}>
                <div className="flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0"><h2 className="text-sm font-medium text-slate-950 dark:text-white">{copy.publicKiosk.history.expensesTitle}</h2><p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{copy.publicKiosk.history.expensesDescription}</p></div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-900">{filteredExpenses.length}</span>
                </div>
                {filteredExpenses.length === 0 ? (
                  <PettyCashKioskEmptyState body={copy.publicKiosk.history.expensesDescription} icon={<ReceiptText className="h-6 w-6" />} title={copy.publicKiosk.history.emptyExpenses} />
                ) : (
                  <div className="grid gap-2">
                    {filteredExpenses.map(receipt => (
                      <PettyCashKioskExpenseCard
                        key={receipt.id}
                        amount={formatCurrency(getReceiptAmount(receipt), receipt.currency_code)}
                        attachmentsLabel={copy.publicKiosk.side.attachments(receipt.attachment_count)}
                        date={formatDate(receipt.expense_date, copy.publicKiosk.date.empty, copy.publicKiosk.date.locale)}
                        deleteLabel={copy.reconciliation.receipts.delete}
                        noReferenceLabel={copy.common.noReference}
                        onDelete={() => setReceiptToDelete(receipt)}
                        onViewAttachments={() => void handleViewAttachments(receipt)}
                        receipt={receipt}
                        referenceLabel={copy.publicKiosk.history.reference}
                        statusLabel={copy.status.line[receipt.status as keyof typeof copy.status.line] ?? receipt.status}
                        statusTitle={copy.publicKiosk.history.status}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'income' ? (
              <section className="space-y-2" role="tabpanel" aria-label={copy.publicKiosk.history.incomeTitle}>
                <div className="flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0"><h2 className="text-sm font-medium text-slate-950 dark:text-white">{copy.publicKiosk.history.incomeTitle}</h2><p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{copy.publicKiosk.history.incomeDescription}</p></div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-900">{filteredIncomeMovements.length}</span>
                </div>
                {filteredIncomeMovements.length === 0 ? (
                  <PettyCashKioskEmptyState body={copy.publicKiosk.history.incomeDescription} icon={<Banknote className="h-6 w-6" />} title={copy.publicKiosk.history.emptyIncome} />
                ) : (
                  <div className="grid gap-2">
                    {filteredIncomeMovements.map(movement => (
                      <PettyCashKioskIncomeCard
                        key={movement.id}
                        amount={`+${formatCurrency(Number(movement.amount), movement.currency_code)}`}
                        date={formatDate(movement.movement_date, copy.publicKiosk.date.empty, copy.publicKiosk.date.locale)}
                        movement={movement}
                        noReferenceLabel={copy.common.noReference}
                        referenceLabel={copy.publicKiosk.history.reference}
                        title={copy.status.movement[movement.type]}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </KioskPublicShell>

      <PettyCashReceiptModal
        attachments={attachments}
        canSave={canSave}
        copy={copy}
        currencyCode={currencyCode}
        errorMessage={errorMessage}
        form={form}
        isOpen={isReceiptModalOpen}
        isSaving={isSaving}
        onAttachmentChange={handleAttachmentChange}
        onClear={() => { setForm(emptyReceiptForm(currencyCode)); setAttachments([]); setErrorMessage(''); }}
        onClose={() => { if (!isSaving) { setIsReceiptModalOpen(false); setErrorMessage(''); } }}
        onFormChange={updates => setForm(current => ({ ...current, ...updates }))}
        onRemoveAttachment={index => setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))}
        onSubmit={() => void handleCreateReceipt()}
        totals={{
          subtotal: formatCurrency(totals.subtotalAmount, currencyCode),
          taxes: formatCurrency(totals.taxAmount, currencyCode),
          total: formatCurrency(totals.totalAmount, currencyCode),
        }}
      />

      <PettyCashKioskAttachmentsModal
        attachments={receiptAttachments}
        closeLabel={copy.common.close}
        description={copy.publicKiosk.side.trace}
        emptyLabel={copy.publicKiosk.attachments.empty}
        errorMessage={attachmentsError}
        isLoading={isLoadingAttachments}
        locale={copy.publicKiosk.date.locale}
        onClose={() => setAttachmentReceipt(null)}
        openFileLabel={copy.publicKiosk.attachments.openFile}
        receipt={attachmentReceipt}
        title={copy.publicKiosk.attachments.title}
        uploadedByLabel={copy.publicKiosk.attachments.uploadedBy}
      />

      <ConfirmDeleteDialog
        cancelLabel={copy.common.cancel}
        confirmDisabled={isDeletingReceipt}
        confirmLabel={copy.reconciliation.receipts.deleteConfirm}
        description={copy.reconciliation.receipts.deleteDescription}
        isVisible={Boolean(receiptToDelete)}
        itemName={receiptToDelete?.description}
        onCancel={() => { if (!isDeletingReceipt) setReceiptToDelete(null); }}
        onConfirm={() => void handleDeleteReceipt()}
        title={copy.reconciliation.receipts.deleteTitle}
      />
    </>
  );
}
