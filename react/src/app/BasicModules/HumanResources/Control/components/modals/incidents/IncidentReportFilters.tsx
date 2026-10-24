import type { AttendanceControlAssignment } from '../../../../../../api/humanResources';
import { Button } from '../../../../../../components/ui/button';
import { IndiceFilterBar, IndiceFilterField, IndiceFilterSelect, getIndiceFilterControlClassName } from '../../../../../../components/frontend-os/IndiceFilterBar';
import type { IncidentReportPeriod, IncidentReportQuery } from '../../../types/incidentReport';
import type { IncidentReportCopy } from '../../../translations/incidentReportCopy';
import type { IncidentReportEmployee } from '../../../types/incidentReport';

interface Props {
  copy: IncidentReportCopy; period: IncidentReportPeriod; anchor: string; query: IncidentReportQuery;
  assignments: AttendanceControlAssignment[]; employees: IncidentReportEmployee[]; loading: boolean; valid: boolean;
  onPeriod: (value: IncidentReportPeriod) => void; onAnchor: (value: string) => void;
  onQuery: (value: IncidentReportQuery) => void; onGenerate: () => void;
}
export function IncidentReportFilters({ copy, period, anchor, query, assignments, employees, loading, valid, onPeriod, onAnchor, onQuery, onGenerate }: Props) {
  const people = new Map(assignments.map(a => [a.user_company_id, {
    id: a.user_company_id, name: a.user_name, unitId: a.unit_id, unitName: a.unit_name,
    businessId: a.business_id, businessName: a.business_name,
  }]));
  employees.forEach(e => people.set(e.person.id, e.person));
  const roster = [...people.values()];
  const options = (key: 'unit' | 'business') => [...new Map(roster
    .filter(p => key !== 'business' || !query.unitId || p.unitId === query.unitId)
    .filter(p => p[`${key}Id`] != null)
    .map(p => [String(p[`${key}Id`]), p[`${key}Name`] || copy.unassigned])).entries()]
    .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  const fieldClass = getIndiceFilterControlClassName('aqua');
  const idValue = (value: string) => value === 'all' ? undefined : Number(value);
  return <IndiceFilterBar title={copy.filters} gridClassName="md:grid-cols-3">
    <IndiceFilterSelect label={copy.period} tone="aqua" value={period} onValueChange={v => onPeriod(v as IncidentReportPeriod)}
      options={(['week', 'fortnight', 'month', 'custom'] as const).map(value => ({ value, label: copy[value] }))} />
    {period !== 'custom' ? <IndiceFilterField label={copy.anchor}>
      <input type="date" className={fieldClass} value={anchor} onChange={e => onAnchor(e.target.value)} />
    </IndiceFilterField> : null}
    <div className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 ${period === 'custom' ? 'md:col-span-2' : ''}`}>
      <IndiceFilterField label={copy.from}><input type="date" className={fieldClass} value={query.from}
        onChange={e => { onPeriod('custom'); onQuery({ ...query, from: e.target.value }); }} /></IndiceFilterField>
      <IndiceFilterField label={copy.to}><input type="date" className={fieldClass} value={query.to}
        onChange={e => { onPeriod('custom'); onQuery({ ...query, to: e.target.value }); }} /></IndiceFilterField>
    </div>
    <IndiceFilterSelect label={copy.unit} tone="aqua" value={String(query.unitId ?? 'all')}
      onValueChange={v => onQuery({ ...query, unitId: idValue(v), businessId: undefined, employeeId: undefined })}
      options={[{ value: 'all', label: copy.allUnits }, ...options('unit')]} />
    <IndiceFilterSelect label={copy.business} tone="aqua" value={String(query.businessId ?? 'all')}
      onValueChange={v => onQuery({ ...query, businessId: idValue(v), employeeId: undefined })}
      options={[{ value: 'all', label: copy.allBusinesses }, ...options('business')]} />
    <IndiceFilterSelect label={copy.employee} tone="aqua" value={String(query.employeeId ?? 'all')}
      onValueChange={v => onQuery({ ...query, employeeId: idValue(v) })}
      options={[{ value: 'all', label: copy.allEmployees }, ...roster
        .filter(p => (!query.unitId || p.unitId === query.unitId) && (!query.businessId || p.businessId === query.businessId))
        .map(p => ({ value: String(p.id), label: p.name })).sort((a, b) => a.label.localeCompare(b.label))]} />
    <div className="flex min-w-0 flex-col gap-3 md:col-span-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400" role={!valid ? 'alert' : undefined}>{!valid ? copy.invalidRange : copy.recordHint}</p>
      <Button className="min-h-11 whitespace-normal rounded-xl bg-[#177D66] px-5 text-white hover:bg-[#136B57]" disabled={!valid || loading} onClick={onGenerate}>
        {loading ? copy.loading : copy.generate}
      </Button>
    </div>
  </IndiceFilterBar>;
}
