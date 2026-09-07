import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { IndiceModalValidation } from '../../../components/indice-modal/IndiceModalValidation';
import { Button } from '../../../components/ui/button';
import { ApiClientError } from '../../../lib/apiClient';
import { automatedReportsApi, type ReportRule, type RuleInput } from './automatedReportsApi';

export function ReportRuleModal({ rule, onClose, onSaved }: { rule: ReportRule | null; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState<RuleInput>(rule ?? { title: '', description: '', reportType: 'EXECUTIVE', cadence: 'MANUAL', status: 'draft', unitId: null, businessId: null, preferredCurrency: 'MXN', version: 0 });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const patch = (fields: Partial<RuleInput>) => setValue(current => ({ ...current, ...fields }));
  const save = async () => { setBusy(true); setError(''); try { await automatedReportsApi.save(value, rule?.id); onSaved(); } catch (error) { setError(error instanceof ApiClientError ? error.message : 'No se pudo guardar la regla.'); } finally { setBusy(false); } };
  const input = 'mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  return <IndiceModalFrame open busy={busy} modalType="standard-form" tone="blue" icon={<Settings2 className="h-5 w-5" />} title={rule ? 'Editar regla' : 'Nueva regla'} description="El informe utiliza tu alcance autorizado y conserva los datos del período completo anterior. Solo tú puedes consultar sus resultados." closeLabel="Cerrar" onOpenChange={open => { if (!open) onClose(); }} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy || !value.title.trim()} onClick={() => void save()}>Guardar regla</Button></>} footerSummary="La opción Listas activa la frecuencia elegida. Manual permite generar el informe cuando lo necesites.">
    {error && <IndiceModalValidation tone="error" messages={[error]} />}
    <fieldset disabled={busy} className="space-y-4"><label className="block">Nombre<input className={input} maxLength={140} value={value.title} onChange={event => patch({ title: event.target.value })} /></label><label className="block">Descripción<input className={input} maxLength={500} value={value.description} onChange={event => patch({ description: event.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Contenido<select className={input} value={value.reportType} onChange={event => patch({ reportType: event.target.value as RuleInput['reportType'] })}><option value="EXECUTIVE">KPIs y matrices ejecutivas</option><option value="ACCOUNTING">Estados financieros</option></select></label><label>Moneda preferida de KPIs<input className={input} maxLength={3} disabled={value.reportType === 'ACCOUNTING'} value={value.preferredCurrency} onChange={event => patch({ preferredCurrency: event.target.value.toUpperCase() })} /></label></div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Los estados financieros conservan la moneda del mayor. Las operaciones permanecen en sus monedas originales.</p>
      <div className="grid gap-4 sm:grid-cols-2"><label>Frecuencia<select className={input} value={value.cadence} onChange={event => patch({ cadence: event.target.value as RuleInput['cadence'] })}><option value="MANUAL">Manual · mes hasta ayer</option><option value="DAILY">Diaria · día anterior</option><option value="WEEKLY">Semanal · últimos 7 días completos</option><option value="MONTHLY">Mensual · mes anterior</option></select></label><label>Estado<select className={input} value={value.status} onChange={event => patch({ status: event.target.value as RuleInput['status'] })}><option value="draft">Borrador</option><option value="ready">Lista</option><option value="paused">Pausada</option></select></label></div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Alcance: {value.unitId ? `unidad ${value.unitId}${value.businessId ? `, negocio ${value.businessId}` : ''}` : 'tu alcance organizacional autorizado'}. La programación utiliza la zona horaria de la empresa y revisa tus permisos en cada ejecución.</p>
    </fieldset>
  </IndiceModalFrame>;
}
