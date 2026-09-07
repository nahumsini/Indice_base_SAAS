import { useEffect, useState } from 'react';
import { BookOpenCheck, Plus, Trash2 } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { IndiceModalValidation } from '../../../components/indice-modal/IndiceModalValidation';
import { Button } from '../../../components/ui/button';
import { apiClient, ApiClientError } from '../../../lib/apiClient';
import type { AccountingReport } from './accountingReportsApi';

const base = '/api/v1/kpis/accounting-reports/manual-entries';
type Account = { id: number; code: string; name: string; type: string };
type DraftLine = { key: string; accountId: string; debit: string; credit: string };
type Preview = { previewHash: string; functionalCurrency: string; functionalTotal: number; nativeTotals: Record<string, number>; lines: Array<{ accountId: number; debit: number; credit: number; rate: number }> };
const emptyLine = (): DraftLine => ({ key: crypto.randomUUID(), accountId: '', debit: '', credit: '' });
const es = { title: 'Apertura o ajuste contable', help: 'Registra saldos documentados. Revisa la vista previa antes de publicar el asiento definitivo.', type: 'Tipo', opening: 'Apertura', adjustment: 'Ajuste', date: 'Fecha', currency: 'Moneda original', unit: 'Unidad', business: 'Negocio', none: 'Sin asignar', description: 'Motivo y soporte', reference: 'Documento de referencia', account: 'Cuenta', debit: 'Cargo', credit: 'Abono', add: 'Agregar línea', remove: 'Quitar línea', preview: 'Revisar asiento', post: 'Publicar asiento revisado', cancel: 'Cancelar', edit: 'Volver a editar', total: 'Total de cargos y abonos', error: 'No se pudo preparar el asiento.', note: 'La publicación conserva la evidencia contable. Para corregirla se requiere otro asiento documentado.' };
const en: typeof es = { title: 'Opening balance or journal adjustment', help: 'Enter documented balances. Review the preview before posting the final journal entry.', type: 'Type', opening: 'Opening', adjustment: 'Adjustment', date: 'Date', currency: 'Original currency', unit: 'Unit', business: 'Business', none: 'Unassigned', description: 'Reason and evidence', reference: 'Supporting document', account: 'Account', debit: 'Debit', credit: 'Credit', add: 'Add line', remove: 'Remove line', preview: 'Review entry', post: 'Post reviewed entry', cancel: 'Cancel', edit: 'Edit entry', total: 'Total debits and credits', error: 'Unable to prepare the entry.', note: 'Posting preserves the accounting evidence. Corrections require another documented entry.' };

export function AccountingEntryModal({ open, report, locale, onClose, onSaved }: { open: boolean; report: AccountingReport; locale: string; onClose: () => void; onSaved: () => void }) {
  const c = locale.startsWith('es') ? es : en;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [type, setType] = useState('OPENING');
  const [date, setDate] = useState(report.context.from);
  const [currency, setCurrency] = useState(report.context.functionalCurrency);
  const [unit, setUnit] = useState(''); const [business, setBusiness] = useState('');
  const [description, setDescription] = useState(''); const [reference, setReference] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [key] = useState(() => crypto.randomUUID());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; if (open) apiClient<Account[]>(`${base}/accounts`).then(data => { if (active) setAccounts(data); }).catch(() => { if (active) setError(c.error); }); return () => { active = false; }; }, [open, c.error]);
  const entry = { type, date, description, reference, idempotencyKey: key, lines: lines.map(line => ({ accountId: Number(line.accountId), unitId: unit ? Number(unit) : null, businessId: business ? Number(business) : null, currency, debit: line.debit || '0', credit: line.credit || '0' })) };
  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (!preview) setPreview(await apiClient<Preview>(`${base}/preview`, { method: 'POST', body: JSON.stringify(entry) }));
      else { await apiClient(base, { method: 'POST', body: JSON.stringify({ entry, previewHash: preview.previewHash }) }); onSaved(); }
    } catch (error) { setError(error instanceof ApiClientError ? error.message : c.error); }
    finally { setBusy(false); }
  };
  const patch = (index: number, values: Partial<DraftLine>) => setLines(current => current.map((line, at) => at === index ? { ...line, ...values } : line));
  const input = 'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  return <IndiceModalFrame open={open} busy={busy} modalType="standard-form" tone="blue" icon={<BookOpenCheck className="h-5 w-5" />} title={c.title} description={c.help} closeLabel={c.cancel} onOpenChange={next => { if (!next) onClose(); }} footer={<><Button variant="outline" disabled={busy} onClick={preview ? () => setPreview(null) : onClose}>{preview ? c.edit : c.cancel}</Button><Button disabled={busy || accounts.length === 0} onClick={() => void submit()}>{preview ? c.post : c.preview}</Button></>} footerSummary={c.note}>
    {error && <IndiceModalValidation tone="error" messages={[error]} />}
    <fieldset disabled={busy || !!preview} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><label>{c.type}<select className={input} value={type} onChange={event => setType(event.target.value)}><option value="OPENING">{c.opening}</option><option value="ADJUSTMENT">{c.adjustment}</option></select></label><label>{c.date}<input type="date" className={input} value={date} onChange={event => setDate(event.target.value)} /></label><label>{c.currency}<input className={input} maxLength={3} value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label>{c.unit}<select className={input} value={unit} onChange={event => { setUnit(event.target.value); setBusiness(''); }}><option value="">{c.none}</option>{report.organization.units.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>{c.business}<select className={input} value={business} onChange={event => setBusiness(event.target.value)}><option value="">{c.none}</option>{report.organization.units.find(item => String(item.id) === unit)?.businesses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <label className="block">{c.description}<input className={input} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="block">{c.reference}<input className={input} maxLength={160} value={reference} onChange={event => setReference(event.target.value)} /></label>
      {lines.map((line, index) => <div key={line.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"><label className="col-span-3 sm:col-span-1">{c.account}<select className={input} value={line.accountId} onChange={event => patch(index, { accountId: event.target.value })}><option value="">—</option>{accounts.filter(account => type !== 'OPENING' || !['EXPENSE', 'REVENUE'].includes(account.type)).map(account => <option value={account.id} key={account.id}>{account.code} · {account.name}</option>)}</select></label><label>{c.debit}<input inputMode="decimal" className={input} value={line.debit} onChange={event => patch(index, { debit: event.target.value })} /></label><label>{c.credit}<input inputMode="decimal" className={input} value={line.credit} onChange={event => patch(index, { credit: event.target.value })} /></label><Button type="button" variant="ghost" className="self-end" aria-label={c.remove} disabled={lines.length <= 2} onClick={() => setLines(current => current.filter((_, at) => at !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
      <Button type="button" variant="outline" disabled={lines.length >= 100} onClick={() => setLines(current => [...current, emptyLine()])}><Plus className="h-4 w-4" />{c.add}</Button>
    </fieldset>
    {preview && <section aria-live="polite" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-medium">{c.total}</p>{Object.entries(preview.nativeTotals).map(([code, amount]) => <p key={code}>{new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount)} · {code}</p>)}<p className="mt-2">{new Intl.NumberFormat(locale, { style: 'currency', currency: preview.functionalCurrency }).format(preview.functionalTotal)} · {preview.functionalCurrency}</p></section>}
  </IndiceModalFrame>;
}
