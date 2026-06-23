import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { ProviderOption, PurchaseOrder, SupplierInvoicePayload } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

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
    setTaxAmount(numberFrom(order.taxAmount));
    setTotalAmount(numberFrom(order.totalAmount));
  }, [openOrders, purchaseOrderId]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">Factura de proveedor</h3>
              <p className="mt-1 text-sm font-medium text-white/85">Registro tipo kiosko para que compras revise y autorice pago.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-4 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950 md:grid-cols-2">
          <Select label="Orden relacionada" value={purchaseOrderId} onChange={setPurchaseOrderId}>
            <option value="">Sin orden</option>
            {openOrders.map((order) => (
              <option key={order.id} value={order.id}>{order.folio} · {order.providerName} · {formatMoney(order.totalAmount, order.currencyCode)}</option>
            ))}
          </Select>
          <Select label="Proveedor" value={providerId} onChange={setProviderId}>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </Select>
          <Input label="Numero de factura" value={invoiceNumber} onChange={setInvoiceNumber} />
          <Input label="Divisa" value={currencyCode} onChange={(value) => setCurrencyCode(value.toUpperCase().slice(0, 3))} />
          <Input label="Fecha factura" type="date" value={invoiceDate} onChange={setInvoiceDate} />
          <Input label="Vencimiento" type="date" value={dueDate} onChange={setDueDate} />
          <Input label="Subtotal" type="number" value={String(subtotalAmount)} onChange={(value) => setSubtotalAmount(Number(value))} />
          <Input label="Impuesto" type="number" value={String(taxAmount)} onChange={(value) => setTaxAmount(Number(value))} />
          <Input label="Total" type="number" value={String(totalAmount)} onChange={(value) => setTotalAmount(Number(value))} />
          <Input label="Documento URL" value={documentUrl} onChange={setDocumentUrl} />
          <Input label="Enviado por" value={submittedByName} onChange={setSubmittedByName} />
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </main>

        <footer className="flex justify-end gap-3 bg-orange-500 px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">Cancelar</button>
          <button type="button" disabled={saving || !providerId || !invoiceNumber.trim()} onClick={() => void submit()} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-orange-700 disabled:cursor-not-allowed disabled:opacity-60">Registrar factura</button>
        </footer>
      </div>
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        {children}
      </select>
    </label>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
    </label>
  );
}
