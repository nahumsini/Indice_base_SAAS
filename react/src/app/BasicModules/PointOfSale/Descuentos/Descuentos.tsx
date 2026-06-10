import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, CalendarClock, CheckCircle, Edit2, Plus, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  calculateDiscountPreview,
  discountRules as initialDiscountRules,
  type DiscountRule,
  type DiscountRuleStatus,
} from '../shared/commercial/discounts';

const statusLabels: Record<DiscountRuleStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Vencida',
  inactive: 'Inactiva',
};

const statusClasses: Record<DiscountRuleStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(amount);

export default function Descuentos() {
  const [rules, setRules] = useState<DiscountRule[]>(initialDiscountRules);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DiscountRuleStatus | 'all'>('all');
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);

  const filteredRules = useMemo(() => rules.filter((rule) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || rule.name.toLowerCase().includes(query)
      || rule.description.toLowerCase().includes(query)
      || rule.scope.toLowerCase().includes(query);

    return matchesSearch && (status === 'all' || rule.status === status);
  }), [rules, search, status]);

  const kpis = useMemo(() => ({
    total: rules.length,
    active: rules.filter((rule) => rule.status === 'active').length,
    scheduled: rules.filter((rule) => rule.status === 'scheduled').length,
    authorized: rules.filter((rule) => rule.requiresAuthorization).length,
  }), [rules]);

  const saveRule = (rule: DiscountRule) => {
    setRules((current) => {
      const exists = current.some((item) => item.id === rule.id);
      return exists
        ? current.map((item) => (item.id === rule.id ? rule : item))
        : [rule, ...current];
    });
    setEditingRule(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <BadgePercent className="h-3.5 w-3.5" />
            Reglas comerciales POS
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Descuentos</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Define reglas de descuento que Venta puede evaluar sin convertir esta pestaña en caja.
          </p>
        </div>
        <button
          onClick={() => setEditingRule(createEmptyRule())}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nueva regla
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={SlidersHorizontal} label="Reglas" value={kpis.total} />
        <Kpi icon={CheckCircle} label="Activas" value={kpis.active} tone="green" />
        <Kpi icon={CalendarClock} label="Programadas" value={kpis.scheduled} tone="blue" />
        <Kpi icon={ShieldCheck} label="Con autorizacion" value={kpis.authorized} tone="orange" />
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-100">
        {kpis.authorized} reglas requieren autorizacion; Venta conserva el control de cobro y solo muestra elegibilidad frontend.
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[1fr_220px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar regla, alcance o descripcion"
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as DiscountRuleStatus | 'all')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {['Regla', 'Alcance', 'Tipo', 'Valor', 'Vigencia', 'Minimo', 'Preview', 'Estatus', ''].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-950 dark:text-white">{rule.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{rule.description}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{rule.scope}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.discountType}</td>
                  <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">
                    {rule.discountType === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(rule.startsAt)} - {formatDate(rule.endsAt)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.minimumAmount ? formatCurrency(rule.minimumAmount) : '-'}</td>
                  <td className="px-4 py-3 font-bold text-orange-700 dark:text-orange-300">{formatCurrency(calculateDiscountPreview(rule, 2500))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClasses[rule.status]}`}>{statusLabels[rule.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingRule(rule)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RuleModal rule={editingRule} onClose={() => setEditingRule(null)} onSave={saveRule} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'gray' }: { icon: typeof BadgePercent; label: string; value: number; tone?: 'gray' | 'green' | 'blue' | 'orange' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p><p className="text-2xl font-black text-gray-950 dark:text-white">{value}</p></div>
      </div>
    </div>
  );
}

function RuleModal({ rule, onClose, onSave }: { rule: DiscountRule | null; onClose: () => void; onSave: (rule: DiscountRule) => void }) {
  const [draftRule, setDraftRule] = useState<DiscountRule | null>(rule);

  useEffect(() => {
    setDraftRule(rule);
  }, [rule]);

  if (!draftRule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800">
        <h3 className="text-lg font-black text-gray-950 dark:text-white">{draftRule.id.startsWith('new') ? 'Nueva regla' : 'Editar regla'}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Modal frontend-ready. Ajusta nombre y estatus para simular configuracion.</p>
        <div className="mt-4 space-y-3">
          <input value={draftRule.name} onChange={(event) => setDraftRule({ ...draftRule, name: event.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <select value={draftRule.status} onChange={(event) => setDraftRule({ ...draftRule, status: event.target.value as DiscountRuleStatus })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">Cerrar</button>
          <button onClick={() => onSave(draftRule)} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function createEmptyRule(): DiscountRule {
  return {
    id: `new-disc-${Date.now()}`,
    name: 'Nueva regla',
    description: 'Regla de descuento frontend-ready',
    scope: 'manual',
    discountType: 'percentage',
    value: 5,
    startsAt: new Date(),
    endsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    requiresAuthorization: true,
    status: 'active',
  };
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
