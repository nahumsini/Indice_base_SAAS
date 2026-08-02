import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import {
  calculateDiscountPreview,
  getEligibleDiscountRules,
  readStoredDiscountRules,
  resetStoredDiscountRules,
  saveStoredDiscountRules,
  type DiscountRule,
  type DiscountRuleStatus,
  type DiscountScope,
} from '../shared/commercial/discounts';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../shared/components/PointOfSaleTitleBar';
import { DiscountKpiCard } from './components/DiscountKpiCard';
import { DiscountRuleModal } from './components/DiscountRuleModal';
import { useLearningModeHeaderActions } from '../../../learningMode';

const statusLabels: Record<DiscountRuleStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Vencida',
  inactive: 'Inactiva',
};

const scopeLabels: Record<DiscountScope, string> = {
  product: 'Producto',
  category: 'Categoria',
  customer: 'Cliente',
  order: 'Ticket',
  manual: 'Manual',
};

const statusClasses: Record<DiscountRuleStatus, string> = {
  active: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-300',
  scheduled: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-900/30 dark:text-blue-300',
  expired: 'border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-900/30 dark:text-red-300',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

const formatCurrency = (amount: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);

export default function Descuentos() {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const { products, saleCurrency } = usePointOfSaleCatalogProducts();
  const [rules, setRules] = useState<DiscountRule[]>(() => readStoredDiscountRules());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DiscountRuleStatus | 'all'>('all');
  const [scope, setScope] = useState<DiscountScope | 'all'>('all');
  const [previewAmount, setPreviewAmount] = useState(2500);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => (
    Array.from(new Set(products.map((product) => product.department).filter(Boolean))).sort()
  ), [products]);

  const productOptions = useMemo(() => (
    products.map((product) => ({ id: product.id, name: product.name })).sort((a, b) => a.name.localeCompare(b.name))
  ), [products]);

  const filteredRules = useMemo(() => rules.filter((rule) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || rule.name.toLowerCase().includes(query)
      || rule.description.toLowerCase().includes(query)
      || rule.scope.toLowerCase().includes(query)
      || (rule.category ?? '').toLowerCase().includes(query);

    return matchesSearch
      && (status === 'all' || rule.status === status)
      && (scope === 'all' || rule.scope === scope);
  }), [rules, scope, search, status]);
  const rulesPaginationResetKey = useMemo(
    () => `${search}:${status}:${scope}:${filteredRules.map((rule) => rule.id).join('|')}`,
    [filteredRules, scope, search, status],
  );
  const rulesPagination = useTablePagination({
    resetKey: rulesPaginationResetKey,
    rows: filteredRules,
  });

  const activeEligibleRules = useMemo(() => getEligibleDiscountRules(rules, {
    amount: previewAmount,
    scope: 'order',
  }), [previewAmount, rules]);

  const kpis = useMemo(() => ({
    total: rules.length,
    active: rules.filter((rule) => rule.status === 'active').length,
    scheduled: rules.filter((rule) => rule.status === 'scheduled').length,
    authorized: rules.filter((rule) => rule.requiresAuthorization).length,
    previewImpact: activeEligibleRules.reduce((sum, rule) => sum + calculateDiscountPreview(rule, previewAmount), 0),
  }), [activeEligibleRules, previewAmount, rules]);

  const persistRules = (nextRules: DiscountRule[], message: string) => {
    setRules(nextRules);
    saveStoredDiscountRules(nextRules);
    setNotice(message);
  };

  const saveRule = (rule: DiscountRule) => {
    const nextRules = rules.some((item) => item.id === rule.id)
      ? rules.map((item) => (item.id === rule.id ? rule : item))
      : [rule, ...rules];

    persistRules(nextRules, `Regla "${rule.name}" guardada y disponible para POS.`);
    setEditingRule(null);
  };

  const toggleRuleStatus = (rule: DiscountRule) => {
    const nextStatus: DiscountRuleStatus = rule.status === 'active' ? 'inactive' : 'active';
    persistRules(
      rules.map((item) => (item.id === rule.id ? { ...item, status: nextStatus } : item)),
      `Regla "${rule.name}" ${nextStatus === 'active' ? 'activada' : 'desactivada'}.`,
    );
  };

  const restoreDefaults = () => {
    const defaultRules = resetStoredDiscountRules();
    setRules(defaultRules);
    setNotice('Reglas de descuento restauradas a la configuracion base.');
  };

  return (
    <div className="space-y-5">
      <PointOfSaleTitleBar
        eyebrow="Motor comercial POS"
        icon="🏷️"
        rhIndent
        title="Descuentos"
        subtitle="Configura reglas, controla autorizaciones y aplica promociones elegibles desde Venta."
        actions={(
          <>
          <button
            onClick={restoreDefaults}
            className={pointOfSaleTitleBarSecondaryActionClassName}
          >
            <RefreshCw className="h-4 w-4" />
            Restaurar
          </button>
          <button
            onClick={() => setEditingRule(createEmptyRule())}
            className={pointOfSaleTitleBarPrimaryActionClassName}
          >
            <Plus className="h-4 w-4" />
            Nueva regla
          </button>
          </>
        )}
      />

      {!learningModeActive ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <DiscountKpiCard icon={SlidersHorizontal} label="Reglas" value={String(kpis.total)} />
            <DiscountKpiCard icon={CheckCircle} label="Activas" value={String(kpis.active)} tone="green" />
            <DiscountKpiCard icon={CalendarClock} label="Programadas" value={String(kpis.scheduled)} tone="blue" />
            <DiscountKpiCard icon={ShieldCheck} label="Con autorizacion" value={String(kpis.authorized)} tone="orange" />
            <DiscountKpiCard icon={Tag} label="Impacto preview" value={formatCurrency(kpis.previewImpact, saleCurrency)} tone="orange" />
          </div>
          <div className="rounded-[20px] border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm font-medium text-[#7C5604] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10 dark:text-[#FAD76A]">
            {activeEligibleRules.length} reglas aplican al ticket ejemplo de {formatCurrency(previewAmount, saleCurrency)}.
          </div>
        </>
      ) : null}

      {notice && (
        <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {notice}
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <h3 className="text-base font-medium text-slate-800 dark:text-white">Filtros</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(160px,1fr))]">
          <label className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar regla, alcance, categoria o descripcion"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as DiscountRuleStatus | 'all')} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white">
            <option value="all">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={scope} onChange={(event) => setScope(event.target.value as DiscountScope | 'all')} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white">
            <option value="all">Todos los alcances</option>
            {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input
            type="number"
            min="0"
            value={previewAmount}
            onChange={(event) => setPreviewAmount(Number(event.target.value))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
            aria-label="Monto de ticket para preview"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1160px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-gray-900/40">
              <tr>
                {['Regla', 'Alcance', 'Descuento', 'Condicion', 'Vigencia', 'Preview', 'Control', 'Estado', 'Acciones'].map((header) => (
                  <th key={header} className={`px-5 py-5 text-sm font-medium text-slate-500 dark:text-slate-400 ${header === 'Acciones' ? 'text-right' : 'text-left'}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rulesPagination.paginatedRows.map((rule) => (
                <tr key={rule.id} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-950 dark:text-white">{rule.name}</p>
                    <p className="line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">{rule.description}</p>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{scopeLabels[rule.scope]}</td>
                  <td className="px-5 py-4 font-medium text-slate-950 dark:text-white">{formatDiscount(rule, saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCondition(rule, saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(rule.startsAt)} - {formatDate(rule.endsAt)}</td>
                  <td className="px-5 py-4 font-medium text-[#B63B32] dark:text-[#FFB0AA]">{formatCurrency(calculateDiscountPreview(rule, previewAmount), saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{rule.requiresAuthorization ? 'Supervisor' : 'Caja'}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[rule.status]}`}>{statusLabels[rule.status]}</span></td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-gray-900">
                      <button onClick={() => toggleRuleStatus(rule)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-[#FF6B5E]/35 hover:bg-[#FFF3F1] hover:text-[#B63B32] dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-[#FF6B5E]/10">
                        {rule.status === 'active' ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => setEditingRule(rule)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20" aria-label={`Editar regla ${rule.name}`} title="Editar regla">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRules.length === 0 && (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-700 dark:text-slate-200">Sin reglas con esos filtros</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajusta filtros o crea una regla comercial.</p>
            </div>
          )}
        </div>
        <PointOfSaleTablePagination {...rulesPagination} itemLabel="reglas" />
      </div>

      <DiscountRuleModal
        rule={editingRule}
        categories={categories}
        products={productOptions}
        onClose={() => setEditingRule(null)}
        onSave={saveRule}
      />
    </div>
  );
}

function createEmptyRule(): DiscountRule {
  return {
    id: `new-disc-${Date.now()}`,
    name: 'Nueva promocion',
    description: 'Regla comercial disponible para el punto de venta.',
    scope: 'order',
    discountType: 'percentage',
    value: 5,
    startsAt: new Date(),
    endsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    requiresAuthorization: false,
    stackable: false,
    priority: 1,
    status: 'active',
  };
}

function formatDiscount(rule: DiscountRule, currency: string) {
  return rule.discountType === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value, currency);
}

function formatCondition(rule: DiscountRule, currency: string) {
  const parts = [
    rule.minimumAmount ? `Min. ${formatCurrency(rule.minimumAmount, currency)}` : null,
    rule.maximumDiscountAmount ? `Tope ${formatCurrency(rule.maximumDiscountAmount, currency)}` : null,
    rule.category ? rule.category : null,
    rule.customerType ? `Cliente ${rule.customerType}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Sin condicion';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
