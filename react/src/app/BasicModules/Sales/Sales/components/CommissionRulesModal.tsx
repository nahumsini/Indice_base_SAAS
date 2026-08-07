import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgePercent, ChevronLeft, ChevronRight, Copy, ImageIcon, PackageSearch, Plus, Save, Search, Trash2, Users } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRule, CommissionRuleStatus, CommissionType } from '../types/commissions';
import type { SaleRecord } from '../types/salesTypes';
import type { SalesCatalogItem } from '../../types/products';
import type { SalesContextUser } from '../../salesApi';
import { formatCommissionType } from '../utils/commissionRules';
import { commissionRulesService } from '../services/commissionRulesService';
import { formatSalesCurrency } from '../utils/salesFormatters';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';

const actionClassNames = getSalesModalActionClassNames('coral');
const commissionTypes: CommissionType[] = ['fixed_per_sale', 'fixed_per_product', 'percentage_of_sale', 'percentage_of_product'];
const ruleStatuses: CommissionRuleStatus[] = ['active', 'inactive'];

function createEmptyRule(): CommissionRule {
  return {
    id: '',
    name: '',
    userId: '',
    userName: '',
    userIds: [],
    userNames: [],
    productId: '',
    productName: '',
    productIds: [],
    productNames: [],
    categoryId: '',
    categoryName: '',
    type: 'percentage_of_sale',
    value: 0,
    validFrom: '',
    validUntil: '',
    status: 'active',
    priority: 50,
    notes: '',
  };
}

type ScopeOption = { id: string; name: string; subtitle?: string; imageUrl?: string; category?: string };

function uniqueOptions(values: ScopeOption[]) {
  return Array.from(new Map(values.filter((option) => option.id && option.name).map((option) => [option.id, option])).values())
    .sort((left, right) => left.name.localeCompare(right.name));
}

function MultiScopePicker({
  icon,
  title,
  allLabel,
  searchLabel,
  options,
  allOptions,
  selectedIds,
  search,
  onSearch,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  allLabel: string;
  searchLabel: string;
  options: ScopeOption[];
  allOptions: ScopeOption[];
  selectedIds: string[];
  search: string;
  onSearch: (value: string) => void;
  onChange: (ids: string[]) => void;
}) {
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const appliesToAll = selectedIds.length === 0;
  const pageCount = Math.max(1, Math.ceil(options.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageOptions = options.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => setPage(1), [search, options.length]);
  const toggle = (id: string) => onChange(selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id]);

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-2 text-slate-950"><span className="text-[#B63B32]">{icon}</span><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-xs text-slate-500">{appliesToAll ? allLabel : `${selectedIds.length} seleccionados`}</p></div></div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(appliesToAll ? allOptions.map((item) => item.id) : [])}>{appliesToAll ? 'Seleccionar todos' : 'Aplicar a todos'}</Button>
    </div>
    <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={searchLabel} className={`${salesFieldClassName} pl-9`} /></div>
    <div className="mt-3 min-h-48 space-y-1 rounded-lg border border-slate-200 p-2">
      {pageOptions.length ? pageOptions.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 shrink-0 accent-[#FF6B5E]" checked={selectedIds.includes(option.id)} onChange={() => toggle(option.id)} />{option.imageUrl ? <img src={option.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md border border-slate-200 object-cover" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600">{option.subtitle ? <ImageIcon className="h-4 w-4" /> : option.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}<span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.name}</span>{option.subtitle ? <span className="block truncate text-xs text-slate-500">{option.subtitle}</span> : null}</span></label>) : <p className="p-3 text-center text-sm text-slate-500">No hay coincidencias.</p>}
    </div>
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{options.length.toLocaleString()} resultados · página {safePage} de {pageCount}</span><span className="flex gap-1"><Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-3 w-3" /></Button><Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-3 w-3" /></Button></span></div>
    {search && options.length > 0 ? <button type="button" className="mt-2 text-xs font-medium text-[#B63B32]" onClick={() => onChange(Array.from(new Set([...selectedIds, ...options.map((item) => item.id)])))}>Seleccionar los {options.length.toLocaleString()} resultados filtrados</button> : null}
  </section>;
}

export function CommissionRulesModal({
  open,
  rules,
  sales,
  users,
  products,
  t,
  onOpenChange,
  onDeleteRule,
  onSaveRule,
}: {
  open: boolean;
  rules: CommissionRule[];
  sales: SaleRecord[];
  users: SalesContextUser[];
  products: SalesCatalogItem[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onDeleteRule: (rule: CommissionRule) => Promise<void>;
  onSaveRule: (rule: CommissionRule) => Promise<CommissionRule>;
}) {
  const [draft, setDraft] = useState<CommissionRule>(() => createEmptyRule());
  const [exampleSaleAmount, setExampleSaleAmount] = useState(50000);
  const [exampleQuantity, setExampleQuantity] = useState(1);
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');

  useEffect(() => {
    if (open && !draft.id && !draft.name) {
      setDraft(createEmptyRule());
    }
  }, [draft.id, draft.name, open]);

  const userOptions = useMemo(() => uniqueOptions([
    ...users.map((user) => ({ id: String(user.userId ?? user.userCompanyId), name: user.name || user.email, subtitle: user.email })),
    ...sales.map((sale) => ({ id: sale.sellerId ?? sale.sellerName, name: sale.sellerName })),
  ]), [sales, users]);
  const productOptions = useMemo(
    () => uniqueOptions([
      ...products.filter((product) => product.status === 'Active').map((product) => ({ id: product.id, name: product.name, subtitle: `${product.sku || product.productCode || product.id} · ${product.category}`, category: product.category, imageUrl: product.imageUrl })),
      ...sales.flatMap((sale) => sale.saleLines.map((line) => ({ id: line.productId, name: line.productName }))),
    ]),
    [products, sales],
  );
  const visibleUsers = useMemo(() => userOptions.filter((option) => `${option.name} ${option.id}`.toLowerCase().includes(userSearch.toLowerCase())), [userOptions, userSearch]);
  const productCategories = useMemo(() => Array.from(new Set(productOptions.map((option) => option.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)), [productOptions]);
  const visibleProducts = useMemo(() => productOptions.filter((option) => {
    const matchesCategory = productCategory === 'all' || option.category === productCategory;
    const query = productSearch.toLowerCase();
    return matchesCategory && `${option.name} ${option.id} ${option.subtitle ?? ''} ${option.category ?? ''}`.toLowerCase().includes(query);
  }), [productCategory, productOptions, productSearch]);
  const [previewCommission, setPreviewCommission] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (!open || step !== 3) return;
    let cancelled = false;
    setIsPreviewing(true);
    const timeout = window.setTimeout(() => {
      void commissionRulesService.preview(draft, {
        saleAmount: Number(exampleSaleAmount) || 0,
        productAmount: Number(exampleSaleAmount) || 0,
        quantity: Number(exampleQuantity) || 0,
        currency: 'MXN',
      }).then((result) => {
        if (!cancelled) setPreviewCommission(Number(result.commissionAmount) || 0);
      }).catch(() => {
        if (!cancelled) setPreviewCommission(null);
      }).finally(() => {
        if (!cancelled) setIsPreviewing(false);
      });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [draft, exampleQuantity, exampleSaleAmount, open, step]);

  const handleSelectRule = (rule: CommissionRule) => {
    setDraft({
      ...rule,
      userIds: rule.userIds?.length ? rule.userIds : rule.userId ? [rule.userId] : [],
      userNames: rule.userNames?.length ? rule.userNames : rule.userName ? [rule.userName] : [],
      productIds: rule.productIds?.length ? rule.productIds : rule.productId ? [rule.productId] : [],
      productNames: rule.productNames?.length ? rule.productNames : rule.productName ? [rule.productName] : [],
    });
    setErrorMessage('');
    setStep(1);
  };

  const handleReset = () => {
    setDraft(createEmptyRule());
    setErrorMessage('');
    setStep(1);
  };

  const validationMessage = useMemo(() => {
    if (!draft.name.trim()) return 'Asigna un nombre a la regla.';
    if (!Number.isFinite(draft.value) || draft.value <= 0) return 'El valor de la comisión debe ser mayor que cero.';
    if (draft.type.startsWith('percentage_') && draft.value > 100) return 'El porcentaje no puede ser mayor a 100%.';
    if (draft.validFrom && draft.validUntil && draft.validUntil < draft.validFrom) return 'La fecha final no puede ser anterior a la fecha inicial.';
    if (!Number.isFinite(draft.priority) || draft.priority < 0 || draft.priority > 999) return 'La prioridad debe estar entre 0 y 999.';
    return '';
  }, [draft]);

  const conflictingRules = useMemo(() => rules.filter((rule) => {
    if (rule.id === draft.id || rule.status !== 'active' || draft.status !== 'active') return false;
    const sameScope = JSON.stringify(rule.userIds ?? []) === JSON.stringify(draft.userIds)
      && JSON.stringify(rule.productIds ?? []) === JSON.stringify(draft.productIds)
      && (rule.categoryId ?? '') === (draft.categoryId ?? '')
      && rule.type === draft.type;
    const datesOverlap = (!rule.validUntil || !draft.validFrom || rule.validUntil >= draft.validFrom)
      && (!draft.validUntil || !rule.validFrom || draft.validUntil >= rule.validFrom);
    return sameScope && datesOverlap;
  }), [draft, rules]);

  const handleSave = async () => {
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    const nextRule: CommissionRule = {
      ...draft,
      name: draft.name.trim(),
      userId: '',
      userName: '',
      productId: '',
      productName: '',
    };
    setIsSaving(true);
    setErrorMessage('');
    try {
      setDraft(await onSaveRule(nextRule));
    } catch {
      setErrorMessage('No se pudo guardar la regla. Revisa la conexión e inténtalo nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = () => {
    setDraft({ ...draft, id: '', backendId: undefined, name: `${draft.name} (copia)`, status: 'inactive' });
    setStep(1);
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    setIsSaving(true);
    try {
      await onDeleteRule(draft);
      handleReset();
    } catch {
      setErrorMessage('No se pudo eliminar la regla.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<BadgePercent className="h-6 w-6" />}
      title={t.commissions.rules.title}
      description={t.commissions.rules.description}
      closeLabel={t.common.cancel}
      modalType="large-workspace"
      bodyClassName="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"
      footer={(
        <>
          <Button type="button" variant="outline" className={actionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          {step > 1 ? <Button type="button" variant="outline" className={actionClassNames.secondary} onClick={() => setStep((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Atrás</Button> : null}
          {step < 3
            ? <Button type="button" className={actionClassNames.primary} onClick={() => setStep((current) => current + 1)}>Continuar<ChevronRight className="h-4 w-4" /></Button>
            : <Button type="button" className={actionClassNames.primary} onClick={() => void handleSave()} disabled={isSaving}><Save className="h-4 w-4" />{isSaving ? 'Guardando…' : t.commissions.rules.saveRule}</Button>}
        </>
      )}
    >
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-500">{t.commissions.rules.sections.rules}</h3>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg border-[#FF6B5E]/25 bg-white text-[#B63B32]" onClick={handleReset}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {rules.length ? rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border bg-white p-3 text-left transition-colors dark:bg-slate-800',
                    draft.id === rule.id ? 'border-[#FF6B5E]/40 ring-2 ring-[#FF6B5E]/15' : 'border-slate-200 hover:border-[#FF6B5E]/25',
                  )}
                  onClick={() => handleSelectRule(rule)}
                >
                  <p className="font-medium text-slate-950 dark:text-white">{rule.name}</p>
                  <p className="mt-1 text-xs font-normal text-slate-500">{formatCommissionType(rule.type)} · {rule.value}</p>
                  <span className={cn(
                    'mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                    rule.status === 'active'
                      ? 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]'
                      : 'border-slate-300 bg-slate-100 text-slate-500',
                  )}>
                    {t.commissions.ruleStatuses[rule.status]}
                  </span>
                </button>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-normal text-slate-500">{t.commissions.rules.noRules}</div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {['Participantes y productos', 'Forma de pago', 'Revisión'].map((label, index) => (
                <button key={label} type="button" onClick={() => setStep(index + 1)} className={cn('rounded-lg px-3 py-2 text-sm font-medium transition', step === index + 1 ? 'bg-[#FF6B5E] text-[#222831] shadow-sm' : 'text-slate-500 hover:bg-white')}>{index + 1}. {label}</button>
              ))}
            </div>

            {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{errorMessage}</div> : null}

            {step === 1 ? <div className="grid gap-4 md:grid-cols-2">
              <FormField label={t.commissions.rules.fields.ruleName}>
                <Input value={draft.name} onChange={(event) => { setErrorMessage(''); setDraft((current) => ({ ...current, name: event.target.value })); }} className={salesFieldClassName} />
              </FormField>
              <div className="md:col-span-2 rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3 text-sm text-slate-700">Define una política clara: quién puede ganar la comisión y qué productos la generan. Si no haces una selección, la política aplicará a todos.</div>
              <MultiScopePicker icon={<Users className="h-5 w-5" />} title="Colaboradores participantes" allLabel="Todos los colaboradores" searchLabel="Buscar por nombre o correo" options={visibleUsers} allOptions={userOptions} selectedIds={draft.userIds} search={userSearch} onSearch={setUserSearch} onChange={(ids) => setDraft((current) => ({ ...current, userIds: ids, userNames: userOptions.filter((item) => ids.includes(item.id)).map((item) => item.name) }))} />
              <div className="space-y-2"><FormField label="Filtrar catálogo por categoría"><Select value={productCategory} onValueChange={setProductCategory}><SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{productCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></FormField>{productCategory !== 'all' ? <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600"><span>{visibleProducts.length.toLocaleString()} productos en {productCategory}</span><Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setDraft((current) => ({ ...current, productIds: [], productNames: [], categoryId: productCategory.toLowerCase().replace(/\s+/g, '-'), categoryName: productCategory }))}>Aplicar categoría completa</Button></div> : null}<MultiScopePicker icon={<PackageSearch className="h-5 w-5" />} title={draft.categoryName ? `Categoría completa: ${draft.categoryName}` : 'Productos que generan comisión'} allLabel={draft.categoryName ? `Toda la categoría ${draft.categoryName}` : 'Todos los productos'} searchLabel="Buscar por nombre, clave o categoría" options={visibleProducts} allOptions={productOptions} selectedIds={draft.productIds} search={productSearch} onSearch={setProductSearch} onChange={(ids) => setDraft((current) => ({ ...current, productIds: ids, productNames: productOptions.filter((item) => ids.includes(item.id)).map((item) => item.name), categoryId: '', categoryName: '' }))} /></div>
              <FormField label={t.commissions.rules.fields.validFrom}>
                <Input type="date" value={draft.validFrom ?? ''} onChange={(event) => setDraft((current) => ({ ...current, validFrom: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.validUntil}>
                <Input type="date" value={draft.validUntil ?? ''} onChange={(event) => setDraft((current) => ({ ...current, validUntil: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.status}>
                <Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value as CommissionRuleStatus }))}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{ruleStatuses.map((status) => <SelectItem key={status} value={status}>{t.commissions.ruleStatuses[status]}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.priority}>
                <Input type="number" min={0} max={999} value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) }))} className={salesFieldClassName} />
              </FormField>
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                La especificidad decide primero: vendedor + producto, producto, categoría, vendedor y regla general. La prioridad sólo desempata reglas del mismo alcance.
              </div>
            </div> : null}

            {step === 2 ? <div className="grid gap-4 md:grid-cols-2">
              <FormField label={t.commissions.rules.fields.type}>
                <Select value={draft.type} onValueChange={(value) => setDraft((current) => ({ ...current, type: value as CommissionType }))}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{commissionTypes.map((type) => <SelectItem key={type} value={type}>{t.commissions.types[type]}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.value}>
                <Input type="number" min={0} max={draft.type.startsWith('percentage_') ? 100 : undefined} step="0.01" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: Number(event.target.value) }))} className={salesFieldClassName} />
              </FormField>
              <div className="md:col-span-2"><FormField label={t.commissions.rules.fields.notes}>
                <Textarea value={draft.notes ?? ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
              </FormField></div>
              <div className="md:col-span-2 rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3 text-sm text-[#B63B32]">
                {draft.type === 'fixed_per_product' ? 'El monto se paga por cada unidad vendida.' : draft.type === 'percentage_of_product' ? 'El porcentaje se aplica al subtotal de cada partida.' : draft.type === 'fixed_per_sale' ? 'El monto se paga una sola vez por venta.' : 'El porcentaje se aplica al total de la venta.'}
              </div>
            </div> : null}

            {step === 3 ? <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 p-4">
                <p className="text-sm font-medium text-[#177d66]">{t.commissions.rules.sections.preview}</p>
                <div className="mt-3 grid gap-3">
                  <FormField label="Monto de venta o partida"><Input type="number" min={0} step="0.01" value={exampleSaleAmount} onChange={(event) => setExampleSaleAmount(Number(event.target.value))} className={salesFieldClassName} /></FormField>
                  <FormField label="Cantidad"><Input type="number" min={0} step="1" value={exampleQuantity} onChange={(event) => setExampleQuantity(Number(event.target.value))} className={salesFieldClassName} /></FormField>
                </div>
                <p className="mt-4 text-xs font-medium text-[#177d66]">{t.commissions.rules.estimatedCommission}</p>
                <p className="mt-1 text-2xl font-medium text-slate-950">{isPreviewing ? 'Calculando…' : previewCommission == null ? 'No disponible' : formatSalesCurrency(previewCommission)}</p>
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-950">Resultado de la regla</p>
                <p className="text-sm text-slate-600">Participantes: {draft.userNames.length ? `${draft.userNames.length} colaboradores` : 'Todos los colaboradores'}</p>
                <p className="text-sm text-slate-600">Productos: {draft.productNames.length ? `${draft.productNames.length} productos seleccionados` : draft.categoryName || 'Todos los productos'}</p>
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Las ventas futuras de cada colaborador seleccionado generarán su comisión automáticamente cuando coincidan con esta política.</p>
                <p className="text-sm text-slate-600">Vigencia: {draft.validFrom || 'Sin inicio'} → {draft.validUntil || 'Sin fin'}</p>
                {conflictingRules.length ? <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />Coincide con {conflictingRules.length} regla(s): {conflictingRules.map((rule) => rule.name).join(', ')}. La prioridad resolverá el empate.</div> : <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">No se detectaron conflictos del mismo alcance y vigencia.</p>}
              </div>
              {draft.id ? <div className="md:col-span-2 flex flex-wrap gap-2 border-t border-slate-200 pt-4"><Button type="button" variant="outline" onClick={handleDuplicate}><Copy className="h-4 w-4" />Duplicar como inactiva</Button><Button type="button" variant="outline" className="text-rose-600" onClick={() => void handleDelete()} disabled={isSaving}><Trash2 className="h-4 w-4" />Eliminar regla</Button></div> : null}
            </div> : null}
          </section>
    </SalesModalFrame>
  );
}
