import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Calculator, FileText, X } from 'lucide-react';
import type { ProviderOption, PurchaseOrder, SupplierInvoicePayload } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

const COMMON_CURRENCIES = ['MXN', 'USD', 'CAD', 'EUR'];
const TAX_RATE_OPTIONS = [
  { label: 'Exento', value: 0 },
  { label: 'IVA 8%', value: 8 },
  { label: 'IVA 16%', value: 16 },
  { label: 'Manual', value: -1 },
];

export function SupplierInvoiceModal({
  onClose,
  onSubmit,
  orders,
  providers,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: SupplierInvoicePayload) => Promise<unknown>;
  orders: PurchaseOrder[];
  providers: ProviderOption[];
  saving: boolean;
}) {
  const openOrders = useMemo(() => orders.filter((order) => order.status !== 'CANCELLED'), [orders]);
  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currencyCode, setCurrencyCode] = useState(openOrders[0]?.currencyCode ?? 'MXN');
  const [subtotalAmount, setSubtotalAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(16);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [documentUrl, setDocumentUrl] = useState('');
  const [submittedByName, setSubmittedByName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const order = openOrders.find((candidate) => String(candidate.id) === purchaseOrderId);
    if (!order) return;
    setProviderId(String(order.providerId));
    setCurrencyCode(order.currencyCode);
    setSubtotalAmount(numberFrom(order.subtotalAmount));
    const nextSubtotal = numberFrom(order.subtotalAmount);
    const nextTax = numberFrom(order.taxAmount);
    setTaxAmount(nextTax);
    setTaxRate(nextSubtotal > 0 ? Number(((nextTax / nextSubtotal) * 100).toFixed(2)) : 16);
    setTotalAmount(numberFrom(order.totalAmount));
  }, [openOrders, purchaseOrderId]);

  const currencyOptions = useMemo(() => Array.from(new Set([
    openOrders[0]?.currencyCode ?? 'MXN',
    ...openOrders.map((order) => order.currencyCode),
    ...COMMON_CURRENCIES,
  ].filter(Boolean))).map((currency) => currency.toUpperCase()), [openOrders]);

  const updateSubtotal = (value: string) => {
    const nextSubtotal = Number(value);
    setSubtotalAmount(nextSubtotal);
    if (taxRate >= 0) {
      const nextTax = Number((nextSubtotal * (taxRate / 100)).toFixed(2));
      setTaxAmount(nextTax);
      setTotalAmount(Number((nextSubtotal + nextTax).toFixed(2)));
    }
  };

  const updateTaxRate = (value: string) => {
    const nextRate = Number(value);
    setTaxRate(nextRate);
    if (nextRate >= 0) {
      const nextTax = Number((subtotalAmount * (nextRate / 100)).toFixed(2));
      setTaxAmount(nextTax);
      setTotalAmount(Number((subtotalAmount + nextTax).toFixed(2)));
    }
  };

  const updateTaxAmount = (value: string) => {
    const nextTax = Number(value);
    setTaxAmount(nextTax);
    setTaxRate(-1);
    setTotalAmount(Number((subtotalAmount + nextTax).toFixed(2)));
  };

  const updateTotalAmount = (value: string) => {
    setTotalAmount(Number(value));
    setTaxRate(-1);
  };

  const submit = async () => {
    if (!providerId || !invoiceNumber.trim()) return;
    try {
      await onSubmit({
        providerId: Number(providerId),
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : null,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || null,
        dueDate: dueDate || null,
        subtotalAmount,
        taxAmount,
        totalAmount,
        currencyCode,
        documentUrl: documentUrl || null,
        submittedByName: submittedByName || null,
        notes: notes || null,
      });
      onClose();
    } catch {
      // The parent workspace displays the backend error without losing captured invoice data.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="bg-[#FF6B5E] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Cuentas por pagar POS</p>
              <h3 className="text-2xl font-bold">Factura de proveedor</h3>
              <p className="mt-1 text-sm font-medium text-white/85">Registro tipo kiosko para que compras revise y autorice pago.</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20" aria-label="Close modal">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#B63B32]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-950 dark:text-white">Datos fiscales</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Relaciona la factura con proveedor, orden y fechas de pago.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Orden relacionada" value={purchaseOrderId} onChange={setPurchaseOrderId}>
                <option value="">Sin orden</option>
                {openOrders.map((order) => (
                  <option key={order.id} value={order.id}>{order.folio} - {order.providerName} - {formatMoney(order.totalAmount, order.currencyCode)}</option>
                ))}
              </Select>
              <Select label="Proveedor" value={providerId} onChange={setProviderId}>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </Select>
              <Input label="Numero de factura" value={invoiceNumber} onChange={setInvoiceNumber} />
              <Select label="Divisa" value={currencyCode} onChange={setCurrencyCode}>
                {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </Select>
              <Input label="Fecha factura" type="date" value={invoiceDate} onChange={setInvoiceDate} />
              <Input label="Vencimiento" type="date" value={dueDate} onChange={setDueDate} />
            </div>
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#B63B32]">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-950 dark:text-white">Importes e impuesto</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">El impuesto se calcula desde la tasa seleccionada; usa manual cuando la factura no cuadre.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_180px_1fr_1fr]">
              <Input label="Subtotal" type="number" value={String(subtotalAmount)} onChange={updateSubtotal} />
              <Select label="Impuesto" value={String(taxRate)} onChange={updateTaxRate}>
                {TAX_RATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Input label="Importe impuesto" type="number" value={String(taxAmount)} onChange={updateTaxAmount} />
              <Input label="Total factura" type="number" value={String(totalAmount)} onChange={updateTotalAmount} />
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 p-4 text-sm md:grid-cols-3">
              <SummaryMetric label="Subtotal" value={formatMoney(subtotalAmount, currencyCode)} />
              <SummaryMetric label="Impuesto" value={formatMoney(taxAmount, currencyCode)} />
              <SummaryMetric label="Total" value={formatMoney(totalAmount, currencyCode)} strong />
            </div>
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Documento URL" value={documentUrl} onChange={setDocumentUrl} />
              <Input label="Enviado por" value={submittedByName} onChange={setSubmittedByName} />
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-3 bg-[#FF6B5E] px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/85">Total factura {formatMoney(totalAmount, currencyCode)}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">Cancelar</button>
            <button type="button" disabled={saving || !providerId || !invoiceNumber.trim()} onClick={() => void submit()} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#B63B32] disabled:cursor-not-allowed disabled:opacity-60">Registrar factura</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        {children}
      </select>
    </label>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
    </label>
  );
}

function SummaryMetric({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B63B32]/75">{label}</p>
      <p className={`mt-1 ${strong ? 'text-xl' : 'text-lg'} font-black text-slate-950 dark:text-white`}>{value}</p>
    </div>
  );
}
