import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BadgePercent, CalendarClock, CheckCircle, CircleDollarSign, ShieldCheck, Target } from 'lucide-react';
import {
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
  type IndiceModalWizardStep,
} from '../../../../components/indice-modal';
import type { DiscountChannel, DiscountRule, DiscountScope, DiscountType } from '../../shared/commercial/discounts';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface ProductOption {
  id: string;
  name: string;
}

interface DiscountRuleModalProps {
  rule: DiscountRule | null;
  categories: string[];
  products: ProductOption[];
  onClose: () => void;
  onSave: (rule: DiscountRule) => void;
  isSaving?: boolean;
}

type DiscountWizardStepId = 'benefit' | 'reach' | 'review';

const wizardSteps: readonly IndiceModalWizardStep<DiscountWizardStepId>[] = [
  { id: 'benefit', label: 'Regla y beneficio' },
  { id: 'reach', label: 'Alcance y canales' },
  { id: 'review', label: 'Vigencia y revisión' },
];

const scopeLabels: Record<DiscountScope, string> = {
  product: 'Producto específico',
  category: 'Categoría completa',
  customer: 'Tipo de cliente',
  order: 'Ticket completo',
  manual: 'Aplicación manual',
};

const scopeDescriptions: Record<DiscountScope, string> = {
  product: 'Solo se aplica al producto seleccionado.',
  category: 'Se aplica a los productos de una categoría.',
  customer: 'Segmenta la promoción por tipo de cliente.',
  order: 'Calcula el descuento sobre el total del ticket.',
  manual: 'Un usuario autorizado decide cuándo aplicarlo.',
};

const discountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Porcentaje',
  fixedAmount: 'Monto fijo',
};

const channelLabels: Record<DiscountChannel, string> = {
  pos: 'Punto de venta',
  sales: 'Ventas',
  kiosk: 'Kioscos',
  publicCatalog: 'Catálogo público',
};

const channelDescriptions: Record<DiscountChannel, string> = {
  pos: 'Disponible para el equipo que cobra en caja.',
  sales: 'Disponible en cotizaciones y ventas asistidas.',
  kiosk: 'Visible en experiencias de autoservicio.',
  publicCatalog: 'Publicada para compras desde el catálogo.',
};

const stepContent: Record<DiscountWizardStepId, { title: string; description: string; icon: ReactNode }> = {
  benefit: {
    title: 'Define la regla y su beneficio',
    description: 'Dale un nombre reconocible y establece cuánto descuenta y desde qué monto puede aplicarse.',
    icon: <CircleDollarSign className="h-5 w-5" />,
  },
  reach: {
    title: 'Elige dónde aplica',
    description: 'Selecciona el alcance comercial y los canales que podrán consumir esta promoción.',
    icon: <Target className="h-5 w-5" />,
  },
  review: {
    title: 'Programa y revisa la publicación',
    description: 'Define la vigencia, configura los controles y confirma el resultado antes de guardar.',
    icon: <CalendarClock className="h-5 w-5" />,
  },
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);
const fieldControlClassName = 'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500';

export function DiscountRuleModal({
  rule,
  categories,
  products,
  onClose,
  onSave,
  isSaving = false,
}: DiscountRuleModalProps) {
  const [draft, setDraft] = useState<DiscountRule | null>(rule);
  const [activeStep, setActiveStep] = useState<DiscountWizardStepId>('benefit');
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(rule);
    setActiveStep('benefit');
    setError('');
  }, [rule]);

  const activeStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);
  const productName = useMemo(
    () => products.find((product) => product.id === draft?.productId)?.name,
    [draft?.productId, products],
  );

  if (!draft) return null;

  const updateDraft = (patch: Partial<DiscountRule>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setError('');
  };

  const updateScope = (scope: DiscountScope) => {
    updateDraft({
      scope,
      productId: scope === 'product' ? draft.productId : undefined,
      category: scope === 'category' ? draft.category : undefined,
      customerType: scope === 'customer' ? draft.customerType : undefined,
    });
  };

  const validateStep = (step: DiscountWizardStepId) => {
    if (step === 'benefit') {
      if (!draft.name.trim()) return 'Escribe un nombre para identificar la regla.';
      if (draft.value <= 0) return 'El descuento debe ser mayor a cero.';
      if (draft.discountType === 'percentage' && draft.value > 100) return 'El porcentaje no puede ser mayor a 100%.';
      if ((draft.minimumAmount ?? 0) < 0) return 'El monto mínimo no puede ser negativo.';
      if ((draft.maximumDiscountAmount ?? 0) < 0) return 'El tope de descuento no puede ser negativo.';
    }

    if (step === 'reach') {
      if (draft.scope === 'product' && !draft.productId) return 'Selecciona el producto al que aplica la regla.';
      if (draft.scope === 'category' && !draft.category) return 'Selecciona la categoría a la que aplica la regla.';
      if (draft.scope === 'customer' && !draft.customerType) return 'Selecciona el tipo de cliente al que aplica la regla.';
      if (draft.enabledChannels.length === 0) return 'Habilita al menos un canal comercial.';
    }

    if (step === 'review' && draft.endsAt < draft.startsAt) return 'La fecha final debe ser igual o posterior al inicio.';
    return '';
  };

  const continueWizard = () => {
    const validationError = validateStep(activeStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextStep = wizardSteps[activeStepIndex + 1];
    if (nextStep) {
      setActiveStep(nextStep.id);
      setError('');
    }
  };

  const goBack = () => {
    const previousStep = wizardSteps[activeStepIndex - 1];
    if (previousStep) {
      setActiveStep(previousStep.id);
      setError('');
    }
  };

  const handleSave = () => {
    for (const step of wizardSteps) {
      const validationError = validateStep(step.id);
      if (validationError) {
        setActiveStep(step.id);
        setError(validationError);
        return;
      }
    }
    onSave(draft);
  };

  const discountLabel = draft.discountType === 'percentage' ? `${draft.value}%` : `MXN ${draft.value.toFixed(2)}`;
  const step = stepContent[activeStep];

  return (
    <PosModalFrame
      modalType="wizard"
      closeLabel="Cerrar regla de descuento"
      eyebrow="Política comercial de productos"
      icon={<BadgePercent className="h-6 w-6" />}
      isCloseDisabled={isSaving}
      onClose={onClose}
      subtitle="Configura una promoción clara y publícala solo en los canales correctos."
      title={String(draft.id).startsWith('new') ? 'Nueva regla de descuento' : 'Editar regla de descuento'}
      tone="coral"
      bodyClassName="overscroll-contain [scrollbar-gutter:stable]"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" disabled={isSaving} onClick={onClose} className={posModalSecondaryActionClassName}>Cancelar</button>
      )}
      footerSummary={<WizardFooterProgress current={activeStepIndex + 1} label={wizardSteps[activeStepIndex]?.label ?? ''} total={wizardSteps.length} />}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          {activeStep !== 'benefit' ? (
            <button type="button" disabled={isSaving} onClick={goBack} className={posModalSecondaryActionClassName}>
              <ArrowLeft className="h-5 w-5" /> Atrás
            </button>
          ) : null}
          {activeStep === 'review' ? (
            <button type="button" disabled={isSaving} onClick={handleSave} className={posModalPrimaryActionClassName}>
              <CheckCircle className="h-5 w-5" /> {isSaving ? 'Guardando...' : 'Guardar regla'}
            </button>
          ) : (
            <button type="button" disabled={isSaving} onClick={continueWizard} className={posModalPrimaryActionClassName}>
              Continuar <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="sticky top-0 z-20 -mx-1 bg-[#F7F8FA] px-1 pb-2 dark:bg-[#111827]">
          <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} progressLabel="Progreso de la regla de descuento" steps={wizardSteps} />
        </div>

        {error ? <IndiceModalValidation title="Revisa este paso" messages={[error]} /> : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#C43C31] dark:text-[#FFAAA2]" aria-hidden="true">{step.icon}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-slate-950 dark:text-white">{step.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{step.description}</p>
            </div>
          </header>

          <div className="space-y-5 p-5">
            {activeStep === 'benefit' ? <BenefitStep draft={draft} onChange={updateDraft} /> : null}
            {activeStep === 'reach' ? <ReachStep categories={categories} draft={draft} products={products} onChange={updateDraft} onScopeChange={updateScope} /> : null}
            {activeStep === 'review' ? <ReviewStep discountLabel={discountLabel} draft={draft} productName={productName} onChange={updateDraft} /> : null}
          </div>
        </section>
      </div>
    </PosModalFrame>
  );
}

function BenefitStep({ draft, onChange }: { draft: DiscountRule; onChange: (patch: Partial<DiscountRule>) => void }) {
  return (
    <>
      <Field label="Nombre de la promoción" helper="Usa un nombre que el equipo pueda reconocer en caja y reportes." required>
        <input autoFocus value={draft.name} placeholder="Ejemplo: Limpieza semanal" onChange={(event) => onChange({ name: event.target.value })} className={fieldControlClassName} />
      </Field>
      <Field label="Descripción" helper="Explica brevemente para quién o en qué situación debe utilizarse.">
        <textarea value={draft.description} placeholder="Ejemplo: 10% en productos de limpieza para compras mayores a $300." onChange={(event) => onChange({ description: event.target.value })} rows={3} className={`${fieldControlClassName} min-h-[92px] resize-y`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de descuento" helper="Elige si reduces un porcentaje o una cantidad fija." required>
          <select value={draft.discountType} onChange={(event) => onChange({ discountType: event.target.value as DiscountType })} className={fieldControlClassName}>
            {Object.entries(discountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label={draft.discountType === 'percentage' ? 'Porcentaje' : 'Monto del descuento'} helper={draft.discountType === 'percentage' ? 'Ingresa un valor entre 0.01 y 100.' : 'Se descontará esta cantidad en MXN.'} required>
          <input type="number" min="0" max={draft.discountType === 'percentage' ? 100 : undefined} step="0.01" value={draft.value} onChange={(event) => onChange({ value: Number(event.target.value) })} className={fieldControlClassName} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Compra mínima" helper="Déjalo vacío si aplica desde cualquier monto.">
          <input type="number" min="0" step="0.01" placeholder="Sin mínimo" value={draft.minimumAmount ?? ''} onChange={(event) => onChange({ minimumAmount: event.target.value ? Number(event.target.value) : undefined })} className={fieldControlClassName} />
        </Field>
        <Field label="Tope de descuento" helper="Limita el ahorro máximo; vacío significa sin tope.">
          <input type="number" min="0" step="0.01" placeholder="Sin tope" value={draft.maximumDiscountAmount ?? ''} onChange={(event) => onChange({ maximumDiscountAmount: event.target.value ? Number(event.target.value) : undefined })} className={fieldControlClassName} />
        </Field>
      </div>
    </>
  );
}

function ReachStep({ categories, draft, products, onChange, onScopeChange }: {
  categories: string[];
  draft: DiscountRule;
  products: ProductOption[];
  onChange: (patch: Partial<DiscountRule>) => void;
  onScopeChange: (scope: DiscountScope) => void;
}) {
  return (
    <>
      <Field label="Alcance de la promoción" helper={scopeDescriptions[draft.scope]} required>
        <select value={draft.scope} onChange={(event) => onScopeChange(event.target.value as DiscountScope)} className={fieldControlClassName}>
          {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      {draft.scope === 'product' ? (
        <Field label="Producto" helper="La regla se evaluará únicamente al agregar este producto." required>
          <select value={draft.productId ?? ''} onChange={(event) => onChange({ productId: event.target.value || undefined })} className={fieldControlClassName}>
            <option value="">Seleccionar producto</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
      ) : null}
      {draft.scope === 'category' ? (
        <Field label="Categoría" helper="Todos los productos actuales y futuros de la categoría podrán recibirla." required>
          <select value={draft.category ?? ''} onChange={(event) => onChange({ category: event.target.value || undefined })} className={fieldControlClassName}>
            <option value="">Seleccionar categoría</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </Field>
      ) : null}
      {draft.scope === 'customer' ? (
        <Field label="Tipo de cliente" helper="La promoción se mostrará solo al segmento seleccionado." required>
          <select value={draft.customerType ?? ''} onChange={(event) => onChange({ customerType: event.target.value ? event.target.value as DiscountRule['customerType'] : undefined })} className={fieldControlClassName}>
            <option value="">Seleccionar tipo de cliente</option>
            <option value="individual">Persona</option>
            <option value="business">Empresa</option>
          </select>
        </Field>
      ) : null}
      <section aria-labelledby="discount-channel-heading">
        <div className="mb-3">
          <h3 id="discount-channel-heading" className="text-sm font-medium text-slate-800 dark:text-slate-100">Canales habilitados</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">Elige todos los lugares donde esta regla podrá calcularse.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(channelLabels) as Array<[DiscountChannel, string]>).map(([channel, label]) => (
            <Toggle
              key={channel}
              checked={draft.enabledChannels.includes(channel)}
              label={label}
              description={channelDescriptions[channel]}
              onChange={(checked) => onChange({
                enabledChannels: checked ? Array.from(new Set([...draft.enabledChannels, channel])) : draft.enabledChannels.filter((candidate) => candidate !== channel),
              })}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function ReviewStep({ discountLabel, draft, productName, onChange }: {
  discountLabel: string;
  draft: DiscountRule;
  productName?: string;
  onChange: (patch: Partial<DiscountRule>) => void;
}) {
  const targetLabel = draft.scope === 'product'
    ? productName ?? 'Producto pendiente'
    : draft.scope === 'category'
      ? draft.category ?? 'Categoría pendiente'
      : draft.scope === 'customer'
        ? draft.customerType === 'business' ? 'Clientes empresa' : 'Clientes persona'
        : scopeLabels[draft.scope];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inicio" helper="La regla estará disponible desde esta fecha." required>
          <input type="date" value={toDateInputValue(draft.startsAt)} onChange={(event) => event.target.value && onChange({ startsAt: new Date(`${event.target.value}T00:00:00`) })} className={fieldControlClassName} />
        </Field>
        <Field label="Fin" helper="Después de esta fecha dejará de aplicarse." required>
          <input type="date" value={toDateInputValue(draft.endsAt)} onChange={(event) => event.target.value && onChange({ endsAt: new Date(`${event.target.value}T23:59:59`) })} className={fieldControlClassName} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={draft.requiresAuthorization} label="Requiere autorización" description="Solicita aprobación antes de aplicar el descuento." onChange={(checked) => onChange({ requiresAuthorization: checked })} />
        <Toggle checked={Boolean(draft.stackable)} label="Puede combinarse" description="Permite acumularla con otras promociones elegibles." onChange={(checked) => onChange({ stackable: checked })} />
      </div>
      <Field label="Prioridad de aplicación" helper="Cuando coincidan varias reglas, se evalúa primero el número más alto.">
        <input type="number" min="0" value={draft.priority ?? 0} onChange={(event) => onChange({ priority: Number(event.target.value) })} className={fieldControlClassName} />
      </Field>
      <IndiceModalSummary
        columns={2}
        description="Esta es la configuración que se enviará al guardar la regla."
        icon={<ShieldCheck className="h-5 w-5" />}
        items={[
          { id: 'name', label: 'Promoción', value: draft.name || 'Sin nombre', emphasized: true },
          { id: 'discount', label: 'Beneficio', value: discountLabel, emphasized: true },
          { id: 'reach', label: 'Se aplica a', value: targetLabel },
          { id: 'channels', label: 'Canales', value: draft.enabledChannels.map((channel) => channelLabels[channel]).join(', ') || 'Sin canales' },
          { id: 'condition', label: 'Compra mínima', value: draft.minimumAmount ? `MXN ${draft.minimumAmount.toFixed(2)}` : 'Sin mínimo' },
          { id: 'control', label: 'Control', value: draft.requiresAuthorization ? 'Con autorización' : 'Aplicación automática' },
        ]}
        title="Resumen de publicación"
        variant="accent"
      />
    </>
  );
}

function Field({ label, helper, required = false, children }: { label: string; helper?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required ? <span className="text-[#C43C31]"> *</span> : null}</span>
      {children}
      {helper ? <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</span> : null}
    </label>
  );
}

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex min-h-[76px] cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 transition ${checked ? 'border-[#FF6B5E] bg-[#FF6B5E]/5' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
    </label>
  );
}

function WizardFooterProgress({ current, label, total }: { current: number; label: string; total: number }) {
  return (
    <div className="hidden min-w-0 rounded-xl bg-white/20 px-3 py-1.5 sm:block">
      <p className="text-[11px] leading-4 text-[#222831]/65">Paso {current} de {total}</p>
      <p className="max-w-48 truncate text-sm font-medium leading-5 text-[#222831]">{label}</p>
    </div>
  );
}
