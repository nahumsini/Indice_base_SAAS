import { useMemo, useState } from 'react';
import { AlertTriangle, CreditCard, Edit2, ShieldCheck, Timer, WalletCards } from 'lucide-react';
import {
  creditRules as initialCreditRules,
  getAveragePaymentTerm,
  type CreditRiskLevel,
  type CreditRule,
  type CreditRuleStatus,
} from '../shared/commercial/credit';
import { commercialCustomers } from '../shared/commercial/customers';

const statusLabels: Record<CreditRuleStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
};

const riskLabels: Record<CreditRiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(amount);

export default function Credito() {
  const [rules, setRules] = useState(initialCreditRules);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CreditRuleStatus | 'all'>('all');
  const [editingRule, setEditingRule] = useState<CreditRule | null>(null);

  const customerById = useMemo(
    () => new Map(commercialCustomers.map((customer) => [customer.id, customer])),
    [],
  );

  const filteredRules = useMemo(() => rules.filter((rule) => {
    const customerName = rule.customerId ? customerById.get(rule.customerId)?.name ?? '' : '';
    const haystack = `${rule.id} ${rule.customerGroup ?? ''} ${customerName} ${rule.notes ?? ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && (status === 'all' || rule.status === status);
  }), [customerById, query, rules, status]);

  const kpis = useMemo(() => ({
    active: rules.filter((rule) => rule.status === 'active').length,
    totalLimit: rules.reduce((sum, rule) => sum + rule.creditLimit, 0),
    customersWithCredit: new Set(rules.map((rule) => rule.customerId).filter(Boolean)).size,
    suspended: rules.filter((rule) => rule.status === 'suspended').length,
    avgTerm: getAveragePaymentTerm(rules),
  }), [rules]);

  const saveRule = (rule: CreditRule) => {
    setRules((current) => current.map((candidate) => (candidate.id === rule.id ? rule : candidate)));
    setEditingRule(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <WalletCards className="h-3.5 w-3.5" />
            Politicas de credito
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Reglas de credito</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Define limites, plazos y bloqueo para clientes con venta a credito.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={ShieldCheck} label="Activas" value={String(kpis.active)} />
        <Kpi icon={CreditCard} label="Limite total" value={formatCurrency(kpis.totalLimit)} />
        <Kpi icon={WalletCards} label="Clientes" value={String(kpis.customersWithCredit)} />
        <Kpi icon={AlertTriangle} label="Suspendidas" value={String(kpis.suspended)} tone="red" />
        <Kpi icon={Timer} label="Plazo prom." value={`${kpis.avgTerm} dias`} tone="blue" />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100">
        Esta pantalla prepara politicas de credito; no genera cobranza ni asientos contables.
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[1fr_220px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente, grupo o nota"
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as CreditRuleStatus | 'all')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {['Regla', 'Cliente / grupo', 'Limite', 'Plazo', 'Interes mora', 'Gracia', 'Bloqueo', 'Riesgo', 'Estado', ''].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRules.map((rule) => {
                const customerName = rule.customerId ? customerById.get(rule.customerId)?.name : null;
                return (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{rule.id}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{customerName ?? rule.customerGroup ?? 'General'}</td>
                    <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{formatCurrency(rule.creditLimit)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.paymentTermDays} dias</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.lateInterestRate}%</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.gracePeriodDays} dias</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{rule.blockWhenOverdue ? 'Si' : 'No'}</td>
                    <td className="px-4 py-3"><RiskBadge risk={rule.riskLevel} /></td>
                    <td className="px-4 py-3"><StatusBadge status={rule.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditingRule(rule)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreditRuleModal rule={editingRule} onClose={() => setEditingRule(null)} onSave={saveRule} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'gray' }: { icon: typeof CreditCard; label: string; value: string; tone?: 'gray' | 'red' | 'blue' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p><p className="text-lg font-black text-gray-950 dark:text-white">{value}</p></div></div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: CreditRiskLevel }) {
  const classes = risk === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : risk === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${classes}`}>{riskLabels[risk]}</span>;
}

function StatusBadge({ status }: { status: CreditRuleStatus }) {
  const classes = status === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${classes}`}>{statusLabels[status]}</span>;
}

function CreditRuleModal({ rule, onClose, onSave }: { rule: CreditRule | null; onClose: () => void; onSave: (rule: CreditRule) => void }) {
  const [draftLimit, setDraftLimit] = useState(rule?.creditLimit ?? 0);
  if (!rule) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800">
        <h3 className="text-lg font-black text-gray-950 dark:text-white">Editar regla de credito</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajuste frontend-only del limite de credito.</p>
        <input type="number" value={draftLimit} onChange={(event) => setDraftLimit(Number(event.target.value))} className="mt-4 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">Cerrar</button>
          <button onClick={() => onSave({ ...rule, creditLimit: draftLimit })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Guardar</button>
        </div>
      </div>
    </div>
  );
}
