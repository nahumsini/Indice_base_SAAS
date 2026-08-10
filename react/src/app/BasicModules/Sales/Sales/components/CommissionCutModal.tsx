import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarRange, CheckCircle2, Hand, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { salesApi } from '../../salesApi';
import type { SaleRecord } from '../types/salesTypes';
import { formatSalesCurrency } from '../utils/salesFormatters';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import type { SalesRecordsTranslations } from '../translations';

const actions = getSalesModalActionClassNames('coral');
const iso = (date: Date) => date.toISOString().slice(0, 10);
type CutMode = 'manual' | 'automatic';
type Cadence = 'weekly' | 'semimonthly' | 'monthly';
type CutSchedule = { id: number; name: string; cadence: Cadence; status: 'active' | 'paused'; nextRunDate: string; lastRunAt?: string | null };

export function CommissionCutModal({ open, sales, t, onOpenChange, onCreated }: { open: boolean; sales: SaleRecord[]; t: SalesRecordsTranslations; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const copy = t.commissionWorkspace.cutsPanel;
  const cadenceCopy = copy.cadence;
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const today = new Date();
  const [mode, setMode] = useState<CutMode>('manual');
  const [periodStart, setPeriodStart] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(iso(today));
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [scheduleName, setScheduleName] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>();
  const [schedules, setSchedules] = useState<CutSchedule[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<'not_configured' | 'active' | 'paused'>('not_configured');
  const [nextRunDate, setNextRunDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const eligible = useMemo(() => sales.filter((sale) => sale.commissionStatus === 'calculated' && sale.saleDate >= periodStart && sale.saleDate <= periodEnd && sale.commissionAmount > 0), [periodEnd, periodStart, sales]);
  const totals = useMemo(() => Object.entries(eligible.reduce<Record<string, number>>((result, sale) => ({ ...result, [sale.currency]: (result[sale.currency] ?? 0) + sale.commissionAmount }), {})), [eligible]);
  const employees = new Set(eligible.map((sale) => sale.sellerUserCompanyId ?? sale.sellerId)).size;

  useEffect(() => {
    if (!open) return;
    setError('');
    void salesApi.getCommissionCutSchedule().then((response) => {
      setSchedules(response.items);
      const schedule = response.items[0];
      if (schedule) selectSchedule(schedule);
      else newSchedule();
    }).catch(() => setError(copy.scheduleLoadError));
  }, [open]);

  const submit = async () => {
    setSaving(true); setError('');
    try {
      if (mode === 'manual') {
        await salesApi.createCommissionCut({ periodStart, periodEnd, preferredCurrency });
        onCreated();
      } else {
        const schedule = await salesApi.saveCommissionCutSchedule({ id: selectedScheduleId, name: scheduleName, cadence, status: 'active', preferredCurrency });
        setSelectedScheduleId(schedule.id); setScheduleName(schedule.name);
        setScheduleStatus(schedule.status); setNextRunDate(schedule.nextRunDate);
        setSchedules((current) => current.some((item) => item.id === schedule.id) ? current.map((item) => item.id === schedule.id ? schedule : item) : [...current, schedule]);
      }
      onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.saveError); }
    finally { setSaving(false); }
  };

  const pause = async () => {
    setSaving(true); setError('');
    try { const schedule = await salesApi.saveCommissionCutSchedule({ id: selectedScheduleId, name: scheduleName, cadence, status: 'paused', preferredCurrency }); setScheduleStatus(schedule.status); setNextRunDate(schedule.nextRunDate); setSchedules((current) => current.map((item) => item.id === schedule.id ? schedule : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : copy.pauseError); }
    finally { setSaving(false); }
  };

  function selectSchedule(schedule: CutSchedule) {
    setSelectedScheduleId(schedule.id); setScheduleName(schedule.name); setCadence(schedule.cadence);
    setScheduleStatus(schedule.status); setNextRunDate(schedule.nextRunDate);
  }

  function newSchedule() {
    setSelectedScheduleId(undefined); setScheduleName(''); setCadence('monthly');
    setScheduleStatus('not_configured'); setNextRunDate('');
  }

  const removeSchedule = async () => {
    if (!selectedScheduleId) return;
    setSaving(true); setError('');
    try {
      await salesApi.deleteCommissionCutSchedule(selectedScheduleId);
      const remaining = schedules.filter((item) => item.id !== selectedScheduleId);
      setSchedules(remaining); if (remaining[0]) selectSchedule(remaining[0]); else newSchedule();
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.removeError); }
    finally { setSaving(false); }
  };

  const manualDisabled = !eligible.length || periodEnd < periodStart;
  return <SalesModalFrame open={open} onOpenChange={onOpenChange} icon={<CalendarRange className="h-6 w-6" />} title={copy.modalTitle} description={copy.modalDescription} closeLabel={t.common.close} modalType="standard-form" footer={<><Button type="button" variant="outline" className={actions.secondary} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>{mode === 'automatic' && selectedScheduleId ? <Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={saving} onClick={() => void removeSchedule()}><Trash2 className="h-4 w-4" />{t.commissionWorkspace.common.delete}</Button> : null}{mode === 'automatic' && scheduleStatus === 'active' ? <Button type="button" variant="outline" className={actions.secondary} disabled={saving} onClick={() => void pause()}>{t.commissionWorkspace.common.pause}</Button> : null}<Button type="button" className={actions.primary} disabled={saving || (mode === 'manual' ? manualDisabled : !scheduleName.trim())} onClick={() => void submit()}>{mode === 'manual' ? <Send className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}{saving ? t.commissionWorkspace.common.saving : mode === 'manual' ? copy.closeAndSend : selectedScheduleId ? copy.saveChanges : copy.createAutomation}</Button></>}>
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setMode('manual')} className={`rounded-xl border p-4 text-left transition ${mode === 'manual' ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 shadow-sm' : 'border-slate-200 bg-white hover:border-[#FF6B5E]/40'}`}><span className="flex items-center gap-2 font-medium text-slate-950"><Hand className="h-5 w-5 text-[#B63B32]" />{copy.manual}</span><span className="mt-2 block text-sm text-slate-600">{copy.manualDescription}</span></button>
        <button type="button" onClick={() => setMode('automatic')} className={`rounded-xl border p-4 text-left transition ${mode === 'automatic' ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 shadow-sm' : 'border-slate-200 bg-white hover:border-[#FF6B5E]/40'}`}><span className="flex items-center gap-2 font-medium text-slate-950"><CalendarClock className="h-5 w-5 text-[#B63B32]" />{copy.automatic}</span><span className="mt-2 block text-sm text-slate-600">{copy.automaticDescription}</span></button>
      </div>

      {mode === 'manual' ? <>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label={copy.start}><Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className={salesFieldClassName} /></FormField><FormField label={copy.end}><Input type="date" value={periodEnd} min={periodStart} onChange={(event) => setPeriodEnd(event.target.value)} className={salesFieldClassName} /></FormField></div>
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div><span className="text-slate-500">{copy.columns.commissions}</span><strong className="mt-1 block text-lg">{eligible.length}</strong></div><div><span className="text-slate-500">{copy.columns.employees}</span><strong className="mt-1 block text-lg">{employees}</strong></div><div><span className="text-slate-500">{copy.amount}</span>{totals.map(([currency, amount]) => <strong key={currency} className="mt-1 block">{formatSalesCurrency(amount, currency)}</strong>)}</div></div>
      </> : <>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{copy.saved}</p><p className="text-xs text-slate-500">{copy.configured(schedules.length)}</p></div><Button type="button" size="sm" variant="outline" className="bg-white" onClick={newSchedule}><Plus className="h-4 w-4" />{copy.new}</Button></div>
          {schedules.length ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{schedules.map((schedule) => <button key={schedule.id} type="button" onClick={() => selectSchedule(schedule)} className={`min-w-44 rounded-lg border bg-white p-3 text-left ${selectedScheduleId === schedule.id ? 'border-[#FF6B5E] ring-1 ring-[#FF6B5E]/30' : 'border-slate-200'}`}><strong className="block truncate text-sm text-slate-900">{schedule.name}</strong><span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{cadenceCopy[schedule.cadence].title}</span><span className={schedule.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}>{schedule.status === 'active' ? copy.active : copy.paused}</span></span></button>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">{copy.none}</p>}
        </div>
        <FormField label={copy.automationName}><Input value={scheduleName} maxLength={120} placeholder={copy.automationPlaceholder} onChange={(event) => setScheduleName(event.target.value)} className={salesFieldClassName} /></FormField>
        <div><p className="mb-2 text-sm font-medium text-slate-700">{copy.frequency}</p><div className="grid gap-2 sm:grid-cols-3">{(Object.keys(cadenceCopy) as Cadence[]).map((value) => <button key={value} type="button" onClick={() => setCadence(value)} className={`rounded-xl border p-3 text-left ${cadence === value ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white'}`}><strong className="block text-sm">{cadenceCopy[value].title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{cadenceCopy[value].detail}</span></button>)}</div></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><div className="flex items-center justify-between gap-3"><span>{copy.currentStatus}</span><strong>{scheduleStatus === 'active' ? copy.active : scheduleStatus === 'paused' ? copy.paused : copy.notConfigured}</strong></div>{nextRunDate ? <div className="mt-2 flex items-center justify-between gap-3"><span>{copy.nextRun}</span><strong>{nextRunDate}</strong></div> : null}<p className="mt-3 text-xs leading-5 text-blue-700">{copy.emptyRun}</p></div>
      </>}

      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /><p>{copy.audit}</p></div>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
    </div>
  </SalesModalFrame>;
}
