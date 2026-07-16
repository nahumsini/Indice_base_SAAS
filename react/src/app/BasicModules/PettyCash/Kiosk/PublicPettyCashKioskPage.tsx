import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  KeyRound,
  Loader2,
  Paperclip,
  ReceiptText,
  ShieldCheck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { useParams } from 'react-router';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../../Expenses/Budgets/budgetTaxCatalog';
import { BudgetTaxControls, type TaxControlDraft } from '../../Expenses/components/modals/BudgetTaxControls';
import {
  pettyCashKioskApi,
  uploadPublicPettyCashAttachment,
  type PublicPettyCashBootstrapResponse,
  type PublicPettyCashIdentifyResponse,
  type PublicPettyCashIncomeMovement,
  type PublicPettyCashPeriod,
  type PublicPettyCashReceipt,
} from './pettyCashKioskApi';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';

const maxAttachmentSizeBytes = 10 * 1024 * 1024;

const todayInputValue = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

type ReceiptFormState = TaxControlDraft & {
  description: string;
  expenseDate: string;
  receiptReference: string;
};

type KioskTab = 'upload' | 'expenses' | 'income';

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
  return error instanceof Error && error.message ? error.message : fallback;
}

function inferContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'csv') return 'text/csv';
  if (extension === 'txt') return 'text/plain';
  return 'application/octet-stream';
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function KioskTotalTile({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${highlight ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-950 dark:text-white'}`}>{value}</p>
    </div>
  );
}

type PinKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'backspace';

function PettyCashPinKeypad({ disabled, onChange, value }: { disabled: boolean; onChange: (nextValue: string) => void; value: string }) {
  const keys: PinKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];
  const handleKey = (key: PinKey) => {
    if (disabled) return;
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    onChange(`${value}${key}`.replace(/\D/g, '').slice(0, 5));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => handleKey(key)}
          className={`flex h-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-black text-slate-950 shadow-sm transition hover:border-[#147514]/30 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-emerald-400/35 dark:hover:bg-emerald-500/10 ${key === '0' ? 'col-start-2' : ''}`}
        >
          {key === 'backspace' ? <span className="text-xs font-black uppercase tracking-wide">Borrar</span> : key}
        </button>
      ))}
    </div>
  );
}

function KioskTabButton({ active, badge, icon, label, onClick }: { active: boolean; badge?: number; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-selected={active}
      className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/20 ${active ? 'bg-[#147514] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-[#147514] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10'}`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="truncate">{label}</span>
      {typeof badge === 'number' ? (
        <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300'}`}>{badge}</span>
      ) : null}
    </button>
  );
}

function HistoryHeader({ count, description, icon, onNext, onPrevious, title }: { count: number; description: string; icon: ReactNode; onNext: () => void; onPrevious: () => void; title: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button aria-label="Anterior" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#147514]/30 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" onClick={onPrevious} type="button"><ChevronLeft className="h-4 w-4" /></button>
        <button aria-label="Siguiente" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#147514]/30 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" onClick={onNext} type="button"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function scrollSlider(container: HTMLDivElement | null, direction: -1 | 1) {
  if (!container) return;
  const card = container.querySelector<HTMLElement>('[data-history-card]');
  container.scrollBy({ behavior: 'smooth', left: direction * ((card?.offsetWidth ?? container.clientWidth) + 12) });
}

export default function PublicPettyCashKioskPage() {
  const copy = usePettyCashTranslations();
  const { fundToken = '' } = useParams();
  const expenseSliderRef = useRef<HTMLDivElement>(null);
  const incomeSliderRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<PublicPettyCashBootstrapResponse | null>(null);
  const [identity, setIdentity] = useState<PublicPettyCashIdentifyResponse | null>(null);
  const [pin, setPin] = useState('');
  const [form, setForm] = useState<ReceiptFormState>(() => emptyReceiptForm());
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<KioskTab>('upload');
  const [periods, setPeriods] = useState<PublicPettyCashPeriod[]>([]);
  const [expenses, setExpenses] = useState<PublicPettyCashReceipt[]>([]);
  const [incomeMovements, setIncomeMovements] = useState<PublicPettyCashIncomeMovement[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
  const isAuthenticated = Boolean(identity);
  const canIdentify = pin.trim().length > 0 && !isIdentifying;
  const canSave = form.description.trim().length > 0 && amount > 0 && !isSaving && Boolean(identity?.identification_token);
  const selectedPeriod = periods.find(period => period.period_key === selectedPeriodKey) ?? null;
  const filteredExpenses = useMemo(
    () => expenses.filter(item => item.period_key === selectedPeriodKey).sort((left, right) => `${right.expense_date}-${right.id}`.localeCompare(`${left.expense_date}-${left.id}`)),
    [expenses, selectedPeriodKey],
  );
  const filteredIncomeMovements = useMemo(
    () => incomeMovements.filter(item => item.period_key === selectedPeriodKey).sort((left, right) => `${right.movement_date}-${right.id}`.localeCompare(`${left.movement_date}-${left.id}`)),
    [incomeMovements, selectedPeriodKey],
  );

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
      setPin('');
      setActiveTab('upload');
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.identify));
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const validFiles = selectedFiles.filter(file => file.size <= maxAttachmentSizeBytes);
    setAttachments(current => [...current, ...validFiles]);
    event.target.value = '';
    if (validFiles.length !== selectedFiles.length) setErrorMessage(copy.publicKiosk.errors.oversizedFiles);
  };

  const uploadAttachments = async (settlementLineId: number, identificationToken: string) => {
    for (const file of attachments) {
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
    }
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
      if (attachments.length > 0) await uploadAttachments(settlementLineId, identity.identification_token);

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
        attachment_count: attachments.length,
        status: attachments.length > 0 ? 'RECEIPT_ATTACHED' : 'DRAFT',
      };
      const responseExpenses = response.expenses?.length
        ? normalizeReceipts(response.expenses).map(item => item.id === settlementLineId ? { ...item, attachment_count: attachments.length } : item)
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
      setActiveTab('expenses');
      setSuccessMessage(copy.publicKiosk.success.receipt);
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.receipt));
    } finally {
      setIsSaving(false);
    }
  };

  if (isBootstrapping) {
    return <LoadingBarOverlay isVisible title={copy.publicKiosk.loading.title} description={copy.publicKiosk.loading.description} />;
  }

  return (
    <main className="min-h-[100dvh] bg-slate-100 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] border border-[#147514]/25 bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-[#147514] px-5 py-6 text-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15"><WalletCards className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">{copy.publicKiosk.header.eyebrow}</p>
                <h1 className="mt-1 truncate text-2xl font-black leading-tight">{isAuthenticated ? (fund?.name ?? copy.publicKiosk.header.defaultFund) : copy.publicKiosk.header.secureAccess}</h1>
                <p className="mt-1 truncate text-sm font-semibold text-white/80">{isAuthenticated ? (bootstrap?.scope_label ?? fund?.scope_label ?? copy.publicKiosk.header.defaultScope) : copy.publicKiosk.header.secureDescription}</p>
              </div>
            </div>
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/15 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/70">{copy.publicKiosk.header.currentBalance}</p>
                  <p className="mt-1 truncate text-lg font-black">{formatCurrency(Number(fund?.current_balance_amount ?? 0), currencyCode)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/70">{copy.publicKiosk.side.fundLimit}</p>
                  <p className="mt-1 truncate text-lg font-black">{formatCurrency(Number(fund?.limit_amount ?? 0), currencyCode)}</p>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {errorMessage ? <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{errorMessage}</div> : null}
        {successMessage ? <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{successMessage}</div> : null}

        {!identity ? (
          <div className="bg-slate-50 p-4 sm:p-5 dark:bg-slate-950/40">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300"><KeyRound className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.publicKiosk.identify.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{copy.publicKiosk.identify.description}</p>
                </div>
              </div>
              <div className="mt-6 rounded-[22px] border border-emerald-100 bg-emerald-50/55 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#147514] dark:text-emerald-300">{copy.publicKiosk.identify.capture}</p>
                    <p className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">{copy.publicKiosk.identify.pin}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#147514] text-white shadow-sm"><KeyRound className="h-5 w-5" /></span>
                </div>
                <div className="grid gap-3">
                  <input
                    autoFocus
                    autoComplete="off"
                    aria-label={copy.publicKiosk.identify.pin}
                    className="h-16 rounded-xl border border-[#147514]/25 bg-white px-4 text-center text-2xl font-black tracking-[0.42em] text-slate-950 shadow-inner outline-none transition placeholder:tracking-normal focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-emerald-400/25 dark:bg-slate-950 dark:text-white"
                    inputMode="numeric"
                    maxLength={5}
                    onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    onKeyDown={event => {
                      if (event.key === 'Enter') void handleIdentify();
                    }}
                    placeholder={copy.publicKiosk.identify.placeholder}
                    type="password"
                    value={pin}
                  />
                  <button className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#147514] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0f5f0f] disabled:cursor-not-allowed disabled:opacity-45" disabled={!canIdentify} onClick={() => void handleIdentify()} type="button">
                    {isIdentifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {copy.publicKiosk.identify.submit}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4"><PettyCashPinKeypad disabled={isIdentifying} onChange={setPin} value={pin} /></div>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#147514]" />
                <p>{copy.publicKiosk.identify.privacy}</p>
              </div>
            </section>
          </div>
        ) : (
          <div className="bg-slate-50 p-3 sm:p-4 dark:bg-slate-950/40">
            <nav aria-label={copy.publicKiosk.tabs.label} className="grid grid-cols-3 gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900" role="tablist">
              <KioskTabButton active={activeTab === 'upload'} icon={<Upload className="h-4 w-4" />} label={copy.publicKiosk.tabs.upload} onClick={() => setActiveTab('upload')} />
              <KioskTabButton active={activeTab === 'expenses'} badge={filteredExpenses.length} icon={<ReceiptText className="h-4 w-4" />} label={copy.publicKiosk.tabs.expenses} onClick={() => setActiveTab('expenses')} />
              <KioskTabButton active={activeTab === 'income'} badge={filteredIncomeMovements.length} icon={<Banknote className="h-4 w-4" />} label={copy.publicKiosk.tabs.income} onClick={() => setActiveTab('income')} />
            </nav>

            {activeTab !== 'upload' ? (
              <section className="mt-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400" htmlFor="petty-cash-kiosk-period"><CalendarDays className="h-4 w-4 text-[#147514]" />{copy.publicKiosk.history.period}</label>
                <select id="petty-cash-kiosk-period" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setSelectedPeriodKey(event.target.value)} value={selectedPeriodKey}>
                  {periods.length === 0 ? <option value="">{copy.publicKiosk.history.noPeriods}</option> : periods.map(period => <option key={period.id} value={period.period_key}>{formatPeriodLabel(period, copy.publicKiosk.date.locale)}</option>)}
                </select>
                {selectedPeriod ? <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.publicKiosk.history.periodHint(selectedPeriod.period_key)}</p> : null}
              </section>
            ) : null}

            {activeTab === 'upload' ? (
              <section className="mt-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900" role="tabpanel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300"><ReceiptText className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.publicKiosk.receipt.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{copy.publicKiosk.receipt.description}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{identity.user.full_name}</div>
                </div>

                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.concept}<input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder={copy.publicKiosk.receipt.conceptPlaceholder} value={form.description} /></label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.amount}<input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" inputMode="decimal" onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="0.00" value={form.amount} /></label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.reference}<input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setForm(current => ({ ...current, receiptReference: event.target.value }))} placeholder={copy.publicKiosk.receipt.referencePlaceholder} value={form.receiptReference} /></label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.date}<input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setForm(current => ({ ...current, expenseDate: event.target.value }))} type="date" value={form.expenseDate} /></label>
                  </div>

                  <div className="mt-5"><BudgetTaxControls compact draft={form} onDraftChange={updates => setForm(current => ({ ...current, ...updates }))} /></div>
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="grid grid-cols-3 gap-2">
                      <KioskTotalTile label="Subtotal" value={formatCurrency(totals.subtotalAmount, currencyCode)} />
                      <KioskTotalTile label="Impuestos" value={formatCurrency(totals.taxAmount, currencyCode)} />
                      <KioskTotalTile highlight label="Total" value={formatCurrency(totals.totalAmount, currencyCode)} />
                    </div>
                    <div className="mt-3 rounded-full bg-white px-4 py-2 text-center text-sm font-black text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">{copy.publicKiosk.receipt.currency(currencyCode)}</div>
                  </div>

                  <label className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#147514]/35 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Upload className="h-4 w-4 text-[#147514]" />{copy.publicKiosk.receipt.attach}<input className="hidden" multiple onChange={handleAttachmentChange} type="file" /></label>
                  {attachments.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {attachments.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="min-w-0"><p className="truncate text-sm font-black text-slate-800 dark:text-white">{file.name}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p></div>
                          <button aria-label={copy.common.deleteAttachment} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" onClick={() => setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))} type="button"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="-mx-5 mt-5 flex items-center gap-3 border-t border-slate-200 px-5 pt-4 dark:border-slate-700">
                  <button className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => { setForm(emptyReceiptForm(currencyCode)); setAttachments([]); }} type="button">{copy.publicKiosk.receipt.clear}</button>
                  <button className="inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#147514] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0f5f0f] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave} onClick={() => void handleCreateReceipt()} type="button">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{copy.publicKiosk.receipt.submit}</button>
                </div>
              </section>
            ) : null}

            {activeTab === 'expenses' ? (
              <section className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" role="tabpanel">
                <HistoryHeader count={filteredExpenses.length} description={copy.publicKiosk.history.expensesDescription} icon={<ReceiptText className="h-5 w-5" />} onNext={() => scrollSlider(expenseSliderRef.current, 1)} onPrevious={() => scrollSlider(expenseSliderRef.current, -1)} title={copy.publicKiosk.history.expensesTitle} />
                {filteredExpenses.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">{copy.publicKiosk.history.emptyExpenses}</div>
                ) : (
                  <div ref={expenseSliderRef} className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredExpenses.map(receipt => (
                      <article key={receipt.id} data-history-card className="min-w-[88%] snap-start rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{formatDate(receipt.expense_date, copy.publicKiosk.date.empty, copy.publicKiosk.date.locale)}</p><h3 className="mt-2 line-clamp-2 text-lg font-black text-slate-900 dark:text-white">{receipt.description}</h3></div><p className="shrink-0 text-lg font-black text-[#147514] dark:text-emerald-300">{formatCurrency(getReceiptAmount(receipt), receipt.currency_code)}</p></div>
                        <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{copy.publicKiosk.history.reference}</p><p className="mt-1 truncate text-sm font-bold text-slate-700 dark:text-slate-200">{receipt.receipt_reference || copy.common.noReference}</p></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{copy.publicKiosk.history.status}</p><p className="mt-1 truncate text-sm font-bold text-[#147514] dark:text-emerald-300">{copy.status.line[receipt.status as keyof typeof copy.status.line] ?? receipt.status}</p></div></div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1.5"><Paperclip className="h-4 w-4" />{copy.publicKiosk.side.attachments(receipt.attachment_count)}</span><span>{copy.publicKiosk.history.newestFirst}</span></div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'income' ? (
              <section className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" role="tabpanel">
                <HistoryHeader count={filteredIncomeMovements.length} description={copy.publicKiosk.history.incomeDescription} icon={<Banknote className="h-5 w-5" />} onNext={() => scrollSlider(incomeSliderRef.current, 1)} onPrevious={() => scrollSlider(incomeSliderRef.current, -1)} title={copy.publicKiosk.history.incomeTitle} />
                {filteredIncomeMovements.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">{copy.publicKiosk.history.emptyIncome}</div>
                ) : (
                  <div ref={incomeSliderRef} className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredIncomeMovements.map(movement => (
                      <article key={movement.id} data-history-card className="min-w-[88%] snap-start rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-700/70 dark:text-emerald-300/70">{formatDate(movement.movement_date, copy.publicKiosk.date.empty, copy.publicKiosk.date.locale)}</p><h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{copy.status.movement[movement.type]}</h3></div><p className="shrink-0 text-lg font-black text-sky-600 dark:text-sky-300">+{formatCurrency(Number(movement.amount), movement.currency_code)}</p></div>
                        <div className="mt-4 rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{copy.publicKiosk.history.reference}</p><p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{movement.reference || copy.common.noReference}</p></div>
                        <p className="mt-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{copy.publicKiosk.history.newestFirst}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
