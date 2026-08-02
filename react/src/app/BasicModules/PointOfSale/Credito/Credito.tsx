import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Ban,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  WalletCards,
} from 'lucide-react';
import { usePointOfSaleCustomers } from '../../CommerceCore/usePointOfSaleCustomers';
import {
  evaluateCreditPurchase,
  getAveragePaymentTerm,
  readStoredCreditRules,
  resetStoredCreditRules,
  saveStoredCreditRules,
  type CreditRiskLevel,
  type CreditRule,
  type CreditRuleStatus,
} from '../shared/commercial/credit';
import type { Customer } from '../shared/commercial/customers';
import { CreditKpiCard } from './components/CreditKpiCard';
import { CreditRuleModal } from './components/CreditRuleModal';
import { CreditRulesTable } from './components/CreditRulesTable';
import { ReceivablesPanel } from './components/ReceivablesPanel';

type CreditView = 'policies' | 'receivables';

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

const formatCurrency = (amount: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);

function createEmptyRule(): CreditRule {
  return {
    id: `credit-new-${Date.now()}`,
    name: 'Nueva politica de credito',
    customerGroup: 'General',
    currency: 'MXN',
    creditLimit: 10000,
    paymentTermDays: 15,
    lateInterestRate: 3,
    penaltyFee: 250,
    gracePeriodDays: 3,
    blockWhenOverdue: true,
    minimumTicketAmount: 500,
    requiresApprovalAbove: 7500,
    reviewAtUtilizationPercent: 80,
    maxOpenInvoices: 3,
    riskLevel: 'medium',
    status: 'active',
    notes: '',
  };
}

function getRuleCustomer(rule: CreditRule, customerById: Map<string, Customer>) {
  return rule.customerId ? customerById.get(rule.customerId) : undefined;
}

export default function Credito() {
  const customers = usePointOfSaleCustomers();
  const [rules, setRules] = useState<CreditRule[]>(() => readStoredCreditRules());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CreditRuleStatus | 'all'>('all');
  const [risk, setRisk] = useState<CreditRiskLevel | 'all'>('all');
  const [previewAmount, setPreviewAmount] = useState(2500);
  const [editingRule, setEditingRule] = useState<CreditRule | null>(null);
  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState<CreditView>('policies');

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const ruleEvaluations = useMemo(() => rules.map((rule) => {
    const customer = getRuleCustomer(rule, customerById);
    return {
      rule,
      customer,
      evaluation: evaluateCreditPurchase(rule, {
        ticketAmount: previewAmount,
        currentBalance: customer?.currentBalance ?? 0,
        customerId: customer?.id,
        customerGroup: rule.customerGroup,
        customerType: customer?.customerType,
        openInvoices: customer?.currentBalance ? 1 : 0,
        overdueBalance: 0,
      }),
    };
  }), [customerById, previewAmount, rules]);

  const filteredRows = useMemo(() => ruleEvaluations.filter(({ rule, customer }) => {
    const query = search.trim().toLowerCase();
    const haystack = `${rule.id} ${rule.name ?? ''} ${rule.customerGroup ?? ''} ${customer?.name ?? ''} ${rule.notes ?? ''}`.toLowerCase();
    return (!query || haystack.includes(query))
      && (status === 'all' || rule.status === status)
      && (risk === 'all' || rule.riskLevel === risk);
  }), [risk, ruleEvaluations, search, status]);

  const kpis = useMemo(() => {
    const activeRules = rules.filter((rule) => rule.status === 'active');
    const totalLimit = rules.reduce((sum, rule) => sum + rule.creditLimit, 0);
    const exposedBalance = ruleEvaluations.reduce((sum, row) => sum + (row.customer?.currentBalance ?? 0), 0);
    const reviewCount = ruleEvaluations.filter((row) => row.evaluation.decision === 'review').length;
    const blockedCount = ruleEvaluations.filter((row) => row.evaluation.decision === 'blocked').length;
    return {
      active: activeRules.length,
      totalLimit,
      available: Math.max(0, totalLimit - exposedBalance),
      avgTerm: getAveragePaymentTerm(rules),
      reviewCount,
      blockedCount,
    };
  }, [ruleEvaluations, rules]);

  const distribution = useMemo(() => {
    const total = Math.max(1, rules.length);
    return {
      active: (rules.filter((rule) => rule.status === 'active').length / total) * 100,
      inactive: (rules.filter((rule) => rule.status === 'inactive').length / total) * 100,
      suspended: (rules.filter((rule) => rule.status === 'suspended').length / total) * 100,
    };
  }, [rules]);

  const persistRules = (nextRules: CreditRule[], message: string) => {
    setRules(nextRules);
    saveStoredCreditRules(nextRules);
    setNotice(message);
  };

  const saveRule = (rule: CreditRule) => {
    const nextRules = rules.some((item) => item.id === rule.id)
      ? rules.map((item) => (item.id === rule.id ? rule : item))
      : [rule, ...rules];
    persistRules(nextRules, `Politica "${rule.name}" guardada para venta a credito.`);
    setEditingRule(null);
  };

  const toggleStatus = (rule: CreditRule) => {
    const nextStatus: CreditRuleStatus = rule.status === 'active' ? 'inactive' : 'active';
    persistRules(
      rules.map((item) => (item.id === rule.id ? { ...item, status: nextStatus } : item)),
      `Politica "${rule.name}" ${nextStatus === 'active' ? 'activada' : 'pausada'}.`,
    );
  };

  const restoreDefaults = () => {
    setRules(resetStoredCreditRules());
    setNotice('Politicas de credito restauradas a la configuracion base.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <WalletCards className="h-3.5 w-3.5" />
            Motor de credito y cobranza POS
          </div>
          <h2 className="text-2xl font-medium text-gray-950 dark:text-white">Credito y cobranza</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Administra limites, plazos, cartera, vencimientos y abonos de ventas POS a credito.
          </p>
        </div>
        {activeView === 'policies' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={restoreDefaults} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
              <RefreshCw className="h-4 w-4" />
              Restaurar
            </button>
            <button onClick={() => setEditingRule(createEmptyRule())} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nueva politica
            </button>
          </div>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setActiveView('policies')}
          className={`min-h-10 rounded-md px-4 text-sm font-medium transition ${activeView === 'policies' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}
        >
          Politicas
        </button>
        <button
          type="button"
          onClick={() => setActiveView('receivables')}
          className={`min-h-10 rounded-md px-4 text-sm font-medium transition ${activeView === 'receivables' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}
        >
          Cuentas por cobrar
        </button>
      </div>

      {activeView === 'policies' ? (
        <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CreditKpiCard icon={ShieldCheck} label="Activas" value={String(kpis.active)} tone="green" />
        <CreditKpiCard icon={CreditCard} label="Linea total" value={formatCurrency(kpis.totalLimit)} tone="blue" />
        <CreditKpiCard icon={WalletCards} label="Disponible" value={formatCurrency(kpis.available)} />
        <CreditKpiCard icon={Timer} label="Plazo prom." value={`${kpis.avgTerm} dias`} tone="blue" />
        <CreditKpiCard icon={AlertTriangle} label="En revision" value={String(kpis.reviewCount)} tone="orange" />
        <CreditKpiCard icon={Ban} label="Bloqueadas" value={String(kpis.blockedCount)} tone="red" />
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[1.5fr_repeat(3,minmax(160px,1fr))]">
        <label className="relative min-w-0">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Buscar</span>
          <Search className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, grupo, regla o nota" className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
        </label>
        <Field label="Estado">
          <select value={status} onChange={(event) => setStatus(event.target.value as CreditRuleStatus | 'all')} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            <option value="all">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Riesgo">
          <select value={risk} onChange={(event) => setRisk(event.target.value as CreditRiskLevel | 'all')} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            <option value="all">Todos</option>
            {Object.entries(riskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Monto preview">
          <input type="number" min="0" value={previewAmount} onChange={(event) => setPreviewAmount(Number(event.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="bg-emerald-500" style={{ width: `${distribution.active}%` }} />
          <div className="bg-gray-400" style={{ width: `${distribution.inactive}%` }} />
          <div className="bg-red-500" style={{ width: `${distribution.suspended}%` }} />
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100">
          {filteredRows.length} politicas visibles; {kpis.reviewCount} requieren revision y {kpis.blockedCount} bloquean el ticket preview de {formatCurrency(previewAmount)}.
        </div>
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
            {notice}
          </div>
        )}
      </div>

      <CreditRulesTable
        rows={filteredRows}
        customerById={customerById}
        onEdit={setEditingRule}
        onToggleStatus={toggleStatus}
      />
        </>
      ) : (
        <ReceivablesPanel />
      )}

      <CreditRuleModal rule={editingRule} customers={customers} onClose={() => setEditingRule(null)} onSave={saveRule} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}
