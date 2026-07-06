import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Check, File, Landmark, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../Budgets/budgetTaxCatalog';
import { DEFAULT_FINANCE_CURRENCY, financeCurrencySelectOptions } from '../constants/financeCurrencyOptions';
import { expenseCategories } from '../data/categories.data';
import { expenseAttachmentsService, expensesService, providersService, toFinanceApiErrorMessage } from '../services';
import type { Expense, Provider } from '../types/expenses.types';
import { formatCurrency } from '../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from '../components/modals/BudgetTaxControls';

type KioskDraft = TaxControlDraft & {
  attachments: AttachmentDraft[];
  concept: string;
  dueDate: string;
  notes: string;
  providerId: string;
};

type AttachmentDraft = {
  file?: File;
  id: string;
  isLocalObjectUrl?: boolean;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
};

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15';
const MAX_ATTACHMENTS = 5;

export default function PayablesKioskPage() {
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [draft, setDraft] = useState<KioskDraft>(() => createDraft(DEFAULT_FINANCE_CURRENCY));
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmit = draft.concept.trim().length > 0 && amount > 0 && !isSubmitting;
  const canAttachMoreFiles = draft.attachments.length < MAX_ATTACHMENTS;

  useEffect(() => {
    let isMounted = true;
    providersService.getExpenseProviders()
      .then(nextProviders => {
        if (isMounted) setProviders(nextProviders);
      })
      .catch(() => {
        if (isMounted) {
          setProviders([]);
          setFailureToastMessage('No se pudieron cargar proveedores. Puedes registrar la cuenta sin proveedor asignado.');
        }
      });

    return () => {
      isMounted = false;
      revokeLocalUrls(objectUrlsRef.current);
    };
  }, []);

  const updateDraft = (updates: Partial<KioskDraft>) => {
    setDraft(current => ({ ...current, ...updates }));
  };

  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    updateDraft({
      budgetCurrencyCode,
      taxCountry,
      taxProfileId: defaultTaxProfile?.id ?? '',
      taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    });
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const availableSlots = MAX_ATTACHMENTS - draft.attachments.length;
    const nextFiles = Array.from(files).slice(0, availableSlots).map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        id: `payable-kiosk-file-${Date.now()}-${index}`,
        file,
        isLocalObjectUrl: true,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        url,
      };
    });
    updateDraft({ attachments: [...draft.attachments, ...nextFiles] });
  };

  const removeAttachment = (attachmentId: string) => {
    const attachment = draft.attachments.find(item => item.id === attachmentId);
    if (attachment?.isLocalObjectUrl && attachment.url) {
      URL.revokeObjectURL(attachment.url);
      objectUrlsRef.current.delete(attachment.url);
    }
    updateDraft({ attachments: draft.attachments.filter(item => item.id !== attachmentId) });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const now = new Date();
    const dueDate = draft.dueDate ? new Date(`${draft.dueDate}T00:00:00`) : now;
    const provider = providers.find(item => item.id === draft.providerId);
    const payableExpense: Expense = {
      id: `payable-${Date.now()}`,
      folio: `CXP-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`,
      businessUnit: '',
      business: '',
      concept: draft.concept.trim(),
      description: draft.notes.trim(),
      category: expenseCategories.find(category => category.id === 'services') ?? expenseCategories[0],
      providerId: draft.providerId,
      providerName: provider?.name,
      total,
      taxes,
      taxIncluded: draft.taxEnabled ? draft.taxIncluded : false,
      taxMode: draft.taxEnabled ? 'auto' : 'none',
      taxRate: draft.taxEnabled ? toPercentNumber(draft.taxRate) : undefined,
      amount: subtotal,
      amountPaid: 0,
      currency: draft.budgetCurrencyCode,
      dueDate,
      date: now,
      paymentMethod: 'transfer',
      status: 'pending',
      attachments: [],
      notes: draft.notes.trim(),
      type: 'payable',
      createdAt: now,
      updatedAt: now,
    };

    setIsSubmitting(true);
    try {
      const savedExpense = await expensesService.createPayableAccount(payableExpense, providers);
      for (const file of draft.attachments.map(attachment => attachment.file).filter((file): file is File => Boolean(file))) {
        await expenseAttachmentsService.upload(savedExpense.id, file);
      }
      revokeLocalUrls(objectUrlsRef.current);
      setDraft(createDraft(draft.budgetCurrencyCode));
      setSuccessToastMessage('Cuenta por pagar registrada.');
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, 'No se pudo registrar la cuenta por pagar.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <section className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <header className="bg-[#147514] px-5 py-5 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Landmark className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">Expenses kiosk</p>
              <h1 className="mt-1 text-2xl font-black">Cuenta por pagar</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/80">
                Captura credito de proveedor, evidencia y monto para programar pago futuro.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50/80 p-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Proveedor y concepto</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Proveedor">
                <select value={draft.providerId} onChange={(event) => updateDraft({ providerId: event.target.value })} className={inputClass}>
                  <option value="">Sin proveedor asignado</option>
                  {providers.filter(provider => provider.status !== 'inactive').map(provider => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha compromiso">
                <input type="date" value={draft.dueDate} onChange={(event) => updateDraft({ dueDate: event.target.value })} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Concepto" required>
                  <input
                    required
                    value={draft.concept}
                    onChange={(event) => updateDraft({ concept: event.target.value })}
                    placeholder="Ej. Insumo entregado a credito"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Importe</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monto" required>
                <input
                  required
                  min={0.01}
                  step="0.01"
                  type="number"
                  value={draft.amount}
                  onChange={(event) => updateDraft({ amount: event.target.value })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </Field>
              <Field label="Divisa" required>
                <select value={draft.budgetCurrencyCode} onChange={(event) => updateCurrency(event.target.value)} className={inputClass}>
                  {financeCurrencySelectOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
              <div className="sm:col-span-2 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 sm:grid-cols-3">
                <SummaryMetric label="Subtotal" value={formatCurrency(subtotal, draft.budgetCurrencyCode)} />
                <SummaryMetric label="Impuestos" value={formatCurrency(taxes, draft.budgetCurrencyCode)} />
                <SummaryMetric label="Total" strong value={formatCurrency(total, draft.budgetCurrencyCode)} />
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[#147514]" />
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Evidencia</h2>
            </div>
            <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed bg-slate-50 px-4 py-6 text-center transition ${
              canAttachMoreFiles
                ? 'border-[#147514]/25 hover:border-[#147514]/45 hover:bg-[#147514]/5'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70'
            }`}>
              <input
                type="file"
                multiple
                disabled={!canAttachMoreFiles}
                onChange={(event) => {
                  addAttachments(event.target.files);
                  event.target.value = '';
                }}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
                <Upload className="h-5 w-5" />
              </span>
              <span className="mt-3 text-sm font-bold text-slate-900">Subir fotografia o archivo</span>
              <span className="mt-1 text-xs font-medium text-slate-500">Comprobante, ticket, factura o fotografia del proveedor.</span>
            </label>
            {draft.attachments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {draft.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <File className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{attachment.name}</p>
                      <p className="text-xs font-medium text-slate-500">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" aria-label="Eliminar archivo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <Field label="Notas">
            <textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              placeholder="Referencia, condiciones o instrucciones de pago."
              className={`${inputClass} min-h-28 resize-y`}
            />
          </Field>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-2xl bg-[#147514] text-base font-black text-white shadow-lg shadow-[#147514]/20 hover:bg-[#105010] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Registrar cuenta por pagar
          </Button>
        </form>
      </section>

      <SuccessToast isVisible={Boolean(successToastMessage)} message={successToastMessage} onClose={() => setSuccessToastMessage('')} />
      <FailureToast isVisible={Boolean(failureToastMessage)} message={failureToastMessage} onClose={() => setFailureToastMessage('')} />
    </main>
  );
}

function createDraft(currency: string): KioskDraft {
  const budgetCurrencyCode = currency || DEFAULT_FINANCE_CURRENCY;
  const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return {
    amount: '',
    attachments: [],
    budgetCurrencyCode,
    concept: '',
    dueDate: '',
    notes: '',
    providerId: '',
    taxes: '',
    taxCountry,
    taxEnabled: false,
    taxIncluded: false,
    taxMode: 'none',
    taxProfileId: defaultTaxProfile?.id ?? '',
    taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    taxSpecialAmount: '',
  };
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function SummaryMetric({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-base ${strong ? 'font-black text-[#147514]' : 'font-bold text-slate-900'}`}>{value}</p>
    </div>
  );
}

function revokeLocalUrls(urls: Set<string>) {
  urls.forEach(url => URL.revokeObjectURL(url));
  urls.clear();
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toPercentNumber(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}
