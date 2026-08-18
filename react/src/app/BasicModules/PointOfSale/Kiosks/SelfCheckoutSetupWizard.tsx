import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  PackageSearch,
  Search,
  ShieldCheck,
  Store,
  Tag,
  Warehouse,
} from 'lucide-react';
import type { PosWarehouseSummary } from '../Sale/services/posBackendApi';
import type { Product } from '../shared/commercial/products';
import type { DiscountRule } from '../shared/commercial/discounts';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

export type SelfCheckoutSetupDraft = {
  experience: 'self-checkout';
  name: string;
  warehouseId: number;
  catalogMode: 'all' | 'selected';
  productIds: string[];
  discountsEnabled: boolean;
  expiresAt: string | null;
  sessionTimeoutMinutes: number;
  supervisorExitRequired: boolean;
};

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const controlClassName = 'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950';

export function SelfCheckoutSetupWizard({
  warehouses,
  products,
  discounts,
  loadingScope,
  scopeError,
  submitting = false,
  submitError = '',
  onClose,
  onComplete,
}: {
  warehouses: PosWarehouseSummary[];
  products: Product[];
  discounts: DiscountRule[];
  loadingScope: boolean;
  scopeError: string;
  submitting?: boolean;
  submitError?: string;
  onClose: () => void;
  onComplete: (draft: SelfCheckoutSetupDraft) => void;
}) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const labels = copy.selfCheckoutSetup;
  const [step, setStep] = useState<WizardStep>(0);
  const [maxVisited, setMaxVisited] = useState<WizardStep>(0);
  const [name, setName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [catalogMode, setCatalogMode] = useState<'all' | 'selected'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discountsEnabled, setDiscountsEnabled] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(5);
  const [supervisorExitRequired, setSupervisorExitRequired] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === warehouseId);
  const activeKioskDiscounts = useMemo(() => discounts.filter((rule) => (
    rule.status === 'active'
    && rule.enabledChannels.includes('kiosk')
    && rule.startsAt <= new Date()
    && rule.endsAt >= new Date()
  )), [discounts]);
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase(locale);
    if (!query) return products.slice(0, 12);
    return products.filter((product) => (
      product.name.toLocaleLowerCase(locale).includes(query)
      || product.sku.toLocaleLowerCase(locale).includes(query)
      || product.department.toLocaleLowerCase(locale).includes(query)
    )).slice(0, 12);
  }, [locale, productSearch, products]);

  const steps = [
    { icon: CreditCard, label: labels.steps.experience },
    { icon: Store, label: labels.steps.general },
    { icon: Warehouse, label: labels.steps.assignment },
    { icon: PackageSearch, label: labels.steps.catalog },
    { icon: ShieldCheck, label: labels.steps.access },
    { icon: CheckCircle2, label: labels.steps.summary },
  ];

  const validateStep = (current: WizardStep) => {
    if (current === 1 && name.trim().length < 3) return labels.validation.name;
    if (current === 2 && !selectedWarehouse) return labels.validation.warehouse;
    if (current === 2 && (!selectedWarehouse?.unitId || !selectedWarehouse?.businessId)) return labels.validation.scope;
    if (current === 3 && catalogMode === 'selected' && selectedProductIds.length === 0) return labels.validation.products;
    if (current === 4 && expiresAt && new Date(expiresAt).getTime() <= Date.now()) return labels.validation.expiration;
    if (current === 4 && (sessionTimeoutMinutes < 1 || sessionTimeoutMinutes > 60)) return labels.validation.timeout;
    return '';
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setValidationMessage(message);
      return;
    }
    setValidationMessage('');
    const next = Math.min(step + 1, 5) as WizardStep;
    setStep(next);
    setMaxVisited((current) => Math.max(current, next) as WizardStep);
  };

  const complete = () => {
    const message = validateStep(4);
    if (message || !selectedWarehouse) {
      setValidationMessage(message || labels.validation.warehouse);
      setStep(message === labels.validation.expiration || message === labels.validation.timeout ? 4 : 2);
      return;
    }
    onComplete({
      experience: 'self-checkout',
      name: name.trim(),
      warehouseId: selectedWarehouse.id,
      catalogMode,
      productIds: catalogMode === 'all' ? [] : selectedProductIds,
      discountsEnabled,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      sessionTimeoutMinutes,
      supervisorExitRequired,
    });
  };

  const selectedProductCount = catalogMode === 'all' ? products.length : selectedProductIds.length;
  const minimumExpiration = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <PosModalFrame
      modalType="wizard"
      closeLabel={labels.close}
      eyebrow={copy.common.engine}
      icon={<CreditCard className="h-6 w-6" />}
      onClose={submitting ? () => undefined : onClose}
      title={labels.title}
      subtitle={labels.description}
      tone="coral"
      bodyClassName="p-0 sm:p-0"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={<span className="text-xs font-medium">{labels.stepCounter(step + 1, steps.length)}</span>}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          {step > 0 ? (
            <button type="button" onClick={() => { setValidationMessage(''); setStep((step - 1) as WizardStep); }} className={posModalSecondaryActionClassName}>
              <ArrowLeft className="h-4 w-4" />{labels.back}
            </button>
          ) : null}
          {step < 5 ? (
            <button type="button" onClick={goNext} className={posModalPrimaryActionClassName}>
              {labels.continue}<ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={complete} disabled={submitting} className={posModalPrimaryActionClassName}>
              <Check className="h-4 w-4" />{labels.create}
            </button>
          )}
        </div>
      )}
    >
      <nav aria-label={labels.progressLabel} className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = step === index;
            const completed = index < step;
            const available = index <= maxVisited;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => available && setStep(index as WizardStep)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex min-h-14 w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center text-[10px] font-medium leading-4 transition ${active
                    ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]'
                    : completed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500 disabled:opacity-55 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {completed ? <CheckCircle2 className="mb-1 h-4 w-4" /> : <Icon className="mb-1 h-4 w-4" />}
                  <span>{index + 1}. {item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-h-[430px] p-4 sm:p-5">
        {step === 0 ? (
          <WizardSection title={labels.experience.title} description={labels.experience.description}>
            <div className="rounded-2xl border-2 border-[#FF6B5E] bg-[#FF6B5E]/10 p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#B63B32]"><CreditCard className="h-6 w-6" /></span>
                <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-slate-950 dark:text-white">{labels.experience.optionTitle}</h4><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{labels.selected}</span></div><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{labels.experience.optionDescription}</p></div>
              </div>
            </div>
            <InfoNote icon={<LockKeyhole className="h-4 w-4" />} text={labels.experience.help} />
          </WizardSection>
        ) : null}

        {step === 1 ? (
          <WizardSection title={labels.general.title} description={labels.general.description}>
            <label className="block"><span className="text-sm font-medium">{labels.general.name}</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder={labels.general.placeholder} className={controlClassName} /><span className="mt-2 block text-xs text-slate-500">{labels.general.help}</span></label>
          </WizardSection>
        ) : null}

        {step === 2 ? (
          <WizardSection title={labels.assignment.title} description={labels.assignment.description}>
            <label className="block"><span className="text-sm font-medium">{labels.assignment.warehouse}</span><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={loadingScope} className={controlClassName}><option value="">{loadingScope ? labels.assignment.loading : labels.assignment.placeholder}</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
            {scopeError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{scopeError}</div> : null}
            {selectedWarehouse ? <div className="grid gap-3 sm:grid-cols-3"><SummaryValue label={labels.assignment.unit} value={selectedWarehouse.unitName || labels.notAssigned} /><SummaryValue label={labels.assignment.business} value={selectedWarehouse.businessName || labels.notAssigned} /><SummaryValue label={labels.assignment.warehouse} value={selectedWarehouse.name} /></div> : null}
            <InfoNote icon={<Warehouse className="h-4 w-4" />} text={labels.assignment.help} />
          </WizardSection>
        ) : null}

        {step === 3 ? (
          <WizardSection title={labels.catalog.title} description={labels.catalog.description}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard active={catalogMode === 'all'} title={labels.catalog.allProducts} description={labels.catalog.allProductsHelp(products.length)} onClick={() => setCatalogMode('all')} />
              <ChoiceCard active={catalogMode === 'selected'} title={labels.catalog.selectedProducts} description={labels.catalog.selectedProductsHelp} onClick={() => setCatalogMode('selected')} />
            </div>
            {catalogMode === 'selected' ? <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder={labels.catalog.search} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><div className="mt-3 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{visibleProducts.map((product) => { const selected = selectedProductIds.includes(product.id); return <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 dark:border-slate-700'}`}><input type="checkbox" checked={selected} onChange={() => setSelectedProductIds((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])} className="h-4 w-4 accent-[#FF6B5E]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{product.name}</span><span className="block truncate text-xs text-slate-500">{product.sku} · {formatCurrency(product.salePrice, product.currency || 'MXN', locale)}</span></span></label>; })}</div><p className="mt-3 text-xs font-medium text-slate-500">{labels.catalog.selectedCount(selectedProductIds.length)}</p></div> : null}
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={discountsEnabled} onChange={(event) => setDiscountsEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-[#FF6B5E]" /><span><span className="flex items-center gap-2 text-sm font-medium"><Tag className="h-4 w-4 text-[#B63B32]" />{labels.catalog.discounts}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{labels.catalog.discountsHelp(activeKioskDiscounts.length)}</span></span></label>
          </WizardSection>
        ) : null}

        {step === 4 ? (
          <WizardSection title={labels.access.title} description={labels.access.description}>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-medium">{labels.access.expiration}</span><input type="datetime-local" min={minimumExpiration} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={controlClassName} /><span className="mt-2 block text-xs text-slate-500">{labels.access.expirationHelp}</span></label><label><span className="text-sm font-medium">{labels.access.timeout}</span><input type="number" min={1} max={60} value={sessionTimeoutMinutes} onChange={(event) => setSessionTimeoutMinutes(Number(event.target.value))} className={controlClassName} /><span className="mt-2 block text-xs text-slate-500">{labels.access.timeoutHelp}</span></label></div>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={supervisorExitRequired} onChange={(event) => setSupervisorExitRequired(event.target.checked)} className="mt-1 h-4 w-4 accent-[#FF6B5E]" /><span><span className="text-sm font-medium">{labels.access.supervisor}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{labels.access.supervisorHelp}</span></span></label>
            <InfoNote icon={<ShieldCheck className="h-4 w-4" />} text={labels.access.protectedLinkHelp} />
          </WizardSection>
        ) : null}

        {step === 5 ? (
          <WizardSection title={labels.summary.title} description={labels.summary.description}>
            <div className="grid gap-3 sm:grid-cols-2"><SummaryValue label={labels.steps.experience} value={labels.experience.optionTitle} /><SummaryValue label={labels.general.name} value={name} /><SummaryValue label={labels.assignment.title} value={selectedWarehouse ? `${selectedWarehouse.name} · ${selectedWarehouse.unitName || labels.notAssigned} · ${selectedWarehouse.businessName || labels.notAssigned}` : labels.notAssigned} /><SummaryValue label={labels.steps.catalog} value={labels.summary.products(selectedProductCount, catalogMode === 'all')} /><SummaryValue label={labels.catalog.discounts} value={discountsEnabled ? labels.summary.discounts(activeKioskDiscounts.length) : labels.summary.disabled} /><SummaryValue label={labels.access.expiration} value={expiresAt ? new Date(expiresAt).toLocaleString(locale) : labels.summary.noExpiration} /><SummaryValue label={labels.access.timeout} value={labels.summary.timeout(sessionTimeoutMinutes)} /><SummaryValue label={labels.access.supervisor} value={supervisorExitRequired ? labels.summary.enabled : labels.summary.disabled} /></div>
            <InfoNote icon={<Clock3 className="h-4 w-4" />} text={labels.summary.creationHelp} />
          </WizardSection>
        ) : null}

        {validationMessage || submitError ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{validationMessage || submitError}</div> : null}
      </div>
    </PosModalFrame>
  );
}

function WizardSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="mx-auto max-w-3xl space-y-4"><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p></div>{children}</section>;
}

function ChoiceCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-xl border p-4 text-left ${active ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><span className="flex items-center justify-between gap-3"><strong className="text-sm font-medium">{title}</strong>{active ? <CheckCircle2 className="h-5 w-5 text-[#B63B32]" /> : null}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>;
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value}</p></div>;
}

function InfoNote({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-start gap-3 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><span className="mt-0.5 shrink-0 text-[#B63B32]">{icon}</span><span>{text}</span></div>;
}

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
