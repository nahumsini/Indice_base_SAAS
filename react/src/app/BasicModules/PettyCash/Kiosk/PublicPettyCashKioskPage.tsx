import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Banknote,
  CheckCircle2,
  FileText,
  KeyRound,
  Loader2,
  Paperclip,
  Plus,
  ReceiptText,
  ShieldCheck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { useParams } from 'react-router';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import {
  pettyCashKioskApi,
  uploadPublicPettyCashAttachment,
  type PublicPettyCashBootstrapResponse,
  type PublicPettyCashIdentifyResponse,
  type PublicPettyCashReceipt,
} from './pettyCashKioskApi';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const todayInputValue = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

type ReceiptFormState = {
  amount: string;
  description: string;
  expenseDate: string;
  receiptReference: string;
};

const emptyReceiptForm = (): ReceiptFormState => ({
  amount: '',
  description: '',
  expenseDate: todayInputValue(),
  receiptReference: '',
});

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function inferContentType(file: File) {
  if (file.type) {
    return file.type;
  }

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
  const normalized = value.trim().replace(/,/g, '.');
  const parsed = Number(normalized);
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
  if (!value) {
    return emptyLabel;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReceiptAmount(receipt: PublicPettyCashReceipt) {
  return Number(receipt.total_amount ?? 0);
}

export default function PublicPettyCashKioskPage() {
  const copy = usePettyCashTranslations();
  const { fundToken = '' } = useParams();
  const [bootstrap, setBootstrap] = useState<PublicPettyCashBootstrapResponse | null>(null);
  const [identity, setIdentity] = useState<PublicPettyCashIdentifyResponse | null>(null);
  const [pin, setPin] = useState('');
  const [form, setForm] = useState<ReceiptFormState>(() => emptyReceiptForm());
  const [attachments, setAttachments] = useState<File[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<PublicPettyCashReceipt[]>([]);
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
        if (cancelled) return;
        setBootstrap(response);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(normalizeError(error, copy.publicKiosk.errors.bootstrap));
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.publicKiosk.errors.bootstrap, fundToken]);

  useEffect(() => {
    setRecentReceipts(identity?.recent_receipts ?? []);
  }, [identity]);

  const fund = identity?.fund ?? bootstrap?.fund ?? null;
  const currencyCode = fund?.currency_code ?? 'MXN';
  const amount = useMemo(() => parseAmount(form.amount), [form.amount]);
  const canIdentify = pin.trim().length > 0 && !isIdentifying;
  const canSave = form.description.trim().length > 0 && amount > 0 && !isSaving && identity?.identification_token;

  const handleIdentify = async () => {
    if (!canIdentify) return;
    setIsIdentifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await pettyCashKioskApi.identifyPublicUser(fundToken, pin.trim());
      setIdentity(response);
      setPin('');
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.identify));
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const validFiles = selectedFiles.filter(file => file.size <= maxAttachmentSizeBytes);
    setAttachments(current => ([...current, ...validFiles]));
    event.target.value = '';

    if (validFiles.length !== selectedFiles.length) {
      setErrorMessage(copy.publicKiosk.errors.oversizedFiles);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index));
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
        total_amount: amount,
      });
      const settlementLineId = response.settlement_line.id;
      if (attachments.length > 0) {
        await uploadAttachments(settlementLineId, identity.identification_token);
      }
      setIdentity(current => (current ? {
        ...current,
        fund: response.fund,
        recent_receipts: response.recent_receipts ?? current.recent_receipts,
      } : current));
      setBootstrap(current => (current ? {
        ...current,
        fund: response.fund,
      } : current));
      setRecentReceipts(response.recent_receipts ?? []);
      setForm(emptyReceiptForm());
      setAttachments([]);
      setSuccessMessage(copy.publicKiosk.success.receipt);
    } catch (error) {
      setErrorMessage(normalizeError(error, copy.publicKiosk.errors.receipt));
    } finally {
      setIsSaving(false);
    }
  };

  if (isBootstrapping) {
    return (
      <LoadingBarOverlay
        isVisible
        title={copy.publicKiosk.loading.title}
        description={copy.publicKiosk.loading.description}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#147514]/25 bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-[#147514] px-6 py-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
                <WalletCards className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-white/70">{copy.publicKiosk.header.eyebrow}</p>
                <h1 className="text-2xl font-black">{fund?.name ?? copy.publicKiosk.header.defaultFund}</h1>
                <p className="mt-1 text-sm font-semibold text-white/80">{bootstrap?.scope_label ?? fund?.scope_label ?? copy.publicKiosk.header.defaultScope}</p>
              </div>
            </div>
            <div className="rounded-lg bg-white/15 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-white/70">{copy.publicKiosk.header.currentBalance}</p>
              <p className="text-xl font-black">{formatCurrency(Number(fund?.current_balance_amount ?? 0), currencyCode)}</p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {!identity ? (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.publicKiosk.identify.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {copy.publicKiosk.identify.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 max-w-sm">
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.identify.pin}</label>
                <input
                  autoFocus
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-lg font-black outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  inputMode="numeric"
                  onChange={(event) => setPin(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleIdentify();
                    }
                  }}
                  type="password"
                  value={pin}
                />
                <button
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#147514] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0f5f0f] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canIdentify}
                  onClick={() => void handleIdentify()}
                  type="button"
                >
                  {isIdentifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {copy.publicKiosk.identify.submit}
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
                    <ReceiptText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.publicKiosk.receipt.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {copy.publicKiosk.receipt.description}
                    </p>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {identity.user.full_name}
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.concept}</label>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) => setForm(current => ({ ...current, description: event.target.value }))}
                      placeholder={copy.publicKiosk.receipt.conceptPlaceholder}
                      value={form.description}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.amount}</label>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      inputMode="decimal"
                      onChange={(event) => setForm(current => ({ ...current, amount: event.target.value }))}
                      placeholder="0.00"
                      value={form.amount}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.reference}</label>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) => setForm(current => ({ ...current, receiptReference: event.target.value }))}
                      placeholder={copy.publicKiosk.receipt.referencePlaceholder}
                      value={form.receiptReference}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.date}</label>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) => setForm(current => ({ ...current, expenseDate: event.target.value }))}
                      type="date"
                      value={form.expenseDate}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-200">{copy.publicKiosk.receipt.totalCaptured}</p>
                      <p className="text-2xl font-black text-[#147514] dark:text-emerald-300">{formatCurrency(amount, currencyCode)}</p>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                      {copy.publicKiosk.receipt.currency(currencyCode)}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Upload className="h-4 w-4 text-[#147514]" />
                    {copy.publicKiosk.receipt.attach}
                    <input className="hidden" multiple onChange={handleAttachmentChange} type="file" />
                  </label>

                  {attachments.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {attachments.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800 dark:text-white">{file.name}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                          </div>
                          <button
                            className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                            onClick={() => handleRemoveAttachment(index)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    setForm(emptyReceiptForm());
                    setAttachments([]);
                  }}
                  type="button"
                >
                  {copy.publicKiosk.receipt.clear}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#147514] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0f5f0f] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSave}
                  onClick={() => void handleCreateReceipt()}
                  type="button"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {copy.publicKiosk.receipt.submit}
                </button>
              </div>
            </section>
          )}

          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
                  <Banknote className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{copy.publicKiosk.side.fundLimit}</p>
                  <p className="text-lg font-black text-[#147514] dark:text-emerald-300">{formatCurrency(Number(fund?.limit_amount ?? 0), currencyCode)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{copy.publicKiosk.side.recentReceipts}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{recentReceipts.length}</span>
              </div>

              {recentReceipts.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                  {copy.publicKiosk.side.emptyReceipts}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {recentReceipts.map(receipt => (
                    <div key={receipt.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{receipt.description}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDate(receipt.expense_date, copy.publicKiosk.date.empty, copy.publicKiosk.date.locale)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[#147514] dark:text-emerald-300">{formatCurrency(getReceiptAmount(receipt), receipt.currency_code)}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Paperclip className="h-3.5 w-3.5" />
                        {copy.publicKiosk.side.attachments(receipt.attachment_count)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  {copy.publicKiosk.side.trace}
                </p>
              </div>
            </section>
          </aside>
        </div>

        <button
          className="fixed bottom-5 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#147514] text-white shadow-xl transition hover:bg-[#0f5f0f] md:hidden"
          onClick={() => window.scrollTo({ behavior: 'smooth', top: 0 })}
          type="button"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </main>
  );
}
