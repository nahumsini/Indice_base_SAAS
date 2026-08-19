import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle,
  Edit2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
} from 'lucide-react';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import {
  calculateDiscountPreview,
  getEligibleDiscountRules,
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
import { useDiscountRules } from './hooks/useDiscountRules';

const statusLabels: Record<DiscountRuleStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Vencida',
  paused: 'Pausada',
  archived: 'Archivada',
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
  paused: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-300',
  archived: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

const formatCurrency = (amount: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);

export default function Descuentos() {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const { products, saleCurrency } = usePointOfSaleCatalogProducts();
  const { rules, isLoading, isSaving, error, reload, save, toggle, remove } = useDiscountRules();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DiscountRuleStatus | 'all'>('all');
  const [scope, setScope] = useState<DiscountScope | 'all'>('all');
  const [previewAmount, setPreviewAmount] = useState(2500);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [rulePendingDeletion, setRulePendingDeletion] = useState<DiscountRule | null>(null);
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => (
    Array.from(new Set(products.map((product) => product.department).filter(Boolean))).sort()
  ), [products]);

  const productOptions = useMemo(() => (
    products
      .filter((product) => product.salesProductBackendId)
      .map((product) => ({ id: String(product.salesProductBackendId), name: product.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
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

  const saveRule = async (rule: DiscountRule) => {
    try {
      const saved = await save({ ...rule, currencyCode: saleCurrency });
      setNotice(`Regla "${saved.name}" guardada para ${formatChannels(saved)}.`);
      setEditingRule(null);
    } catch {
      // The hook exposes the backend message in the page and keeps the modal open.
    }
  };

  const toggleRuleStatus = async (rule: DiscountRule) => {
    try {
      const saved = await toggle(rule);
      setNotice(`Regla "${saved.name}" ${saved.status === 'active' ? 'activada' : 'pausada'}.`);
    } catch {
      // The hook exposes the backend message.
    }
  };

  const deleteRule = async () => {
    if (!rulePendingDeletion) return;
    try {
      const ruleName = rulePendingDeletion.name;
      await remove(rulePendingDeletion);
      setRulePendingDeletion(null);
      setNotice(`Regla "${ruleName}" eliminada.`);
    } catch {
      // The hook exposes the backend message and keeps the confirmation open.
    }
  };

  return (
    <div className="space-y-5">
      <PointOfSaleTitleBar
        eyebrow="Política comercial de productos"
        icon="🏷️"
        rhIndent
        title="Descuentos"
        subtitle="Configura promociones una vez y habilítalas para POS, Ventas, kioscos o catálogo público."
        actions={(
          <>
          <button
            onClick={() => void reload()}
            disabled={isLoading || isSaving}
            className={pointOfSaleTitleBarSecondaryActionClassName}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
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

      {error && (
        <div role="alert" className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-gray-800">
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-gray-900/40">
              <tr>
                {['Regla', 'Alcance', 'Canales', 'Descuento', 'Condicion', 'Vigencia', 'Preview', 'Control', 'Estado', 'Acciones'].map((header) => (
                  <th key={header} className={`px-5 py-5 text-sm font-medium text-slate-500 dark:text-slate-400 ${header === 'Acciones' ? 'text-right' : 'text-left'}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-500">Cargando reglas de descuento...</td></tr>
              ) : null}
              {rulesPagination.paginatedRows.map((rule) => (
                <tr key={rule.id} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-950 dark:text-white">{rule.name}</p>
                    <p className="line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">{rule.description}</p>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{scopeLabels[rule.scope]}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatChannels(rule)}</td>
                  <td className="px-5 py-4 font-medium text-slate-950 dark:text-white">{formatDiscount(rule, saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCondition(rule, saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(rule.startsAt)} - {formatDate(rule.endsAt)}</td>
                  <td className="px-5 py-4 font-medium text-[#B63B32] dark:text-[#FFB0AA]">{formatCurrency(calculateDiscountPreview(rule, previewAmount), saleCurrency)}</td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{rule.requiresAuthorization ? 'Supervisor' : 'Caja'}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[rule.status]}`}>{statusLabels[rule.status]}</span></td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-gray-900">
                      <button
                        disabled={isSaving || rule.status === 'archived' || rule.status === 'expired'}
                        onClick={() => void toggleRuleStatus(rule)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 ${rule.status === 'active' ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10'}`}
                        aria-label={rule.status === 'active' ? `Pausar regla ${rule.name}` : `Activar regla ${rule.name}`}
                        title={rule.status === 'active' ? 'Pausar regla' : 'Activar regla'}
                      >
                        {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setEditingRule(rule)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] transition hover:bg-[#FF6B5E]/20 dark:border-[#FF6B5E]/30 dark:text-[#FFB0AA]" aria-label={`Editar regla ${rule.name}`} title="Editar regla">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => setRulePendingDeletion(rule)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        aria-label={`Eliminar regla ${rule.name}`}
                        title="Eliminar regla"
                      >
                        <Trash2 className="h-4 w-4" />
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
        onSave={(rule) => void saveRule(rule)}
        isSaving={isSaving}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(rulePendingDeletion)}
        title="¿Eliminar esta regla de descuento?"
        itemName={rulePendingDeletion?.name}
        description="La regla dejará de mostrarse y de aplicarse en todos los canales. Las ventas anteriores conservarán su historial."
        cancelLabel="Cancelar"
        confirmLabel="Eliminar regla"
        confirmDisabled={isSaving}
        onCancel={() => setRulePendingDeletion(null)}
        onConfirm={() => void deleteRule()}
      />
    </div>
  );
}

function createEmptyRule(): DiscountRule {
  return {
    id: `new-disc-${Date.now()}`,
    name: 'Nueva promocion',
    description: 'Regla comercial compartida por los canales habilitados.',
    scope: 'order',
    discountType: 'percentage',
    value: 5,
    currencyCode: 'MXN',
    startsAt: new Date(),
    endsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    requiresAuthorization: false,
    stackable: false,
    priority: 1,
    status: 'active',
    enabledChannels: ['pos', 'sales'],
  };
}

function formatChannels(rule: DiscountRule) {
  const labels = {
    pos: 'POS',
    sales: 'Ventas',
    kiosk: 'Kioscos',
    publicCatalog: 'Catálogo',
  } as const;
  return rule.enabledChannels.map((channel) => labels[channel]).join(' · ') || 'Sin publicar';
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
