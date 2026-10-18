// Standalone visual fixture. Synthetic records remain in memory; no API calls or database writes.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { ProspectosKanbanColumn } from '../../src/app/BasicModules/Sales/Prospectos/kanban/ProspectosKanbanColumn';
import { getKanbanCopy } from '../../src/app/BasicModules/Sales/Prospectos/kanban/kanbanCopy';
import { getKanbanTiming, matchesKanbanAttention, sortKanbanOpportunities, type KanbanAttention, type KanbanSort } from '../../src/app/BasicModules/Sales/Prospectos/kanban/kanbanModel';
import { defaultOpportunityFlowStages as stages, type SalesOpportunity } from '../../src/app/BasicModules/Sales/types/opportunities';
import { esMX as copy } from '../../src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations';

const companies = ['Clínica Horizonte', 'Centro Médico del Valle', 'Consultorios Alameda', 'Laboratorio Punto Salud', 'Especialidades del Norte', 'Unidad Médica Integral'];
const records: SalesOpportunity[] = Array.from({ length: 72 }, (_, index) => ({
  id: String(index + 1), opportunityName: ['Programa de salud empresarial', 'Equipamiento de consultorios', 'Convenio de atención médica'][index % 3] + ' · ' + companies[index % companies.length],
  contactId: 'fixture-' + index, company: companies[index % companies.length], contactPerson: 'Contacto de prueba ' + (index + 1), phone: '', email: '',
  source: 'Manual', stage: index < 30 ? 'New' : index < 55 ? 'Contacted' : index < 65 ? 'Qualified' : 'Proposal', lifecycleStatus: 'OPEN',
  temperature: index % 3 === 0 ? 'Hot' : 'Warm', owner: ['Ana López', 'Carlos Ruiz', 'Diana Cruz'][index % 3], estimatedValue: String(1500 + index * 750), currency: 'MXN', probability: '25%',
  expectedCloseDate: '', nextAction: ['Call', 'Email', 'Meeting'][index % 3] as SalesOpportunity['nextAction'],
  nextActionDate: index % 4 === 0 ? '2026-10-17 10:00' : index % 4 === 1 ? '2026-10-18 16:30' : index % 4 === 2 ? '' : '2026-10-20 09:00',
  nextActionTimezone: 'America/Toronto', lastContact: '', files: [], notes: '', status: 'Active', createdAt: '2026-10-' + String(1 + index % 16).padStart(2, '0') + 'T12:00:00Z',
}));
function Fixture() {
  const [items, setItems] = useState(records);
  const [attention, setAttention] = useState<KanbanAttention>('all');
  const [sort, setSort] = useState<KanbanSort>('next_action');
  const [mobileStage, setMobileStage] = useState('New');
  const [dark, setDark] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const labels = getKanbanCopy('es-MX');
  const timings = useMemo(() => new Map(items.map(item => [item.id, getKanbanTiming(item, stages.find(stage => stage.key === item.stage), new Date('2026-10-18T18:00:00Z'), 'America/Toronto')])), [items]);
  const visible = sortKanbanOpportunities(items, sort, timings).filter(item => matchesKanbanAttention(timings.get(item.id)!, attention));
  return <main className={dark ? 'dark' : ''}><div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 dark:text-slate-100">
    <p className="text-xs text-slate-500">Prueba visual · Datos sintéticos en memoria · Sin conexión a registros de empresa</p>
    <div className="my-4 flex flex-wrap items-center gap-3"><h1 className="mr-auto text-xl font-medium">Kanban · 30 oportunidades en Nueva</h1><button onClick={() => setDark(!dark)}>Cambiar tema</button></div>
    <div className="mb-3 flex flex-wrap gap-3">
      <select aria-label="Ordenar por" value={sort} onChange={event => setSort(event.target.value as KanbanSort)} className="rounded border bg-white p-2 text-slate-900">{(['next_action', 'newest', 'oldest', 'amount'] as const).map(value => <option value={value} key={value}>{labels[value]}</option>)}</select>
      <select aria-label="Atención" value={attention} onChange={event => setAttention(event.target.value as KanbanAttention)} className="rounded border bg-white p-2 text-slate-900">{(['all', 'overdue', 'unscheduled'] as const).map(value => <option value={value} key={value}>{labels[value]}</option>)}</select>
      <select aria-label="Etapa móvil" value={mobileStage} onChange={event => setMobileStage(event.target.value)} className="rounded border bg-white p-2 text-slate-900 md:hidden">{stages.map(stage => <option value={stage.key} key={stage.key}>{copy.options.stages[stage.key]}</option>)}</select>
      <p role="status">{visible.length} de {items.length} oportunidades · {lastAction}</p>
    </div>
    <div className="overflow-x-auto"><div className="grid grid-cols-1 gap-3 md:grid-flow-col md:auto-cols-[304px] md:grid-cols-none">{stages.map(stage => <ProspectosKanbanColumn key={stage.key} copy={copy} labels={labels} locale="es-MX" stage={stage} stages={stages}
      opportunities={visible.filter(item => item.stage === stage.key)} allOpportunities={items} totalCount={items.filter(item => item.stage === stage.key).length} overdueCount={items.filter(item => item.stage === stage.key && timings.get(item.id)!.state === 'overdue').length} timings={timings} mobileActive={stage.key === mobileStage}
      onOverdue={() => setAttention('overdue')} register={() => {}} remember={() => {}}
      onOpenHistory={item => setLastAction('Detalle ' + item.id)} onOpenFiles={item => setLastAction('Archivos ' + item.id)} onEdit={item => setLastAction('Editar ' + item.id)}
      onNextAction={item => setLastAction('Siguiente acción ' + item.id)}
      onStageChange={(item, nextStage) => { setItems(current => current.map(record => record.id === item.id ? { ...record, stage: nextStage } : record)); setLastAction('Movida ' + item.id + ' a ' + nextStage); }}
    />)}</div></div>
  </div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
