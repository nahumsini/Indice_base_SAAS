import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BadgePercent, CheckCircle } from 'lucide-react';
import type { DiscountRule, DiscountRuleStatus, DiscountScope, DiscountType } from '../../shared/commercial/discounts';
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
}

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
  order: 'Ticket completo',
  manual: 'Manual',
};

const discountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Porcentaje',
  fixedAmount: 'Monto fijo',
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);
const fieldControlClassName = 'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500';

export function DiscountRuleModal({
  rule,
  categories,
  products,
  onClose,
  onSave,
}: DiscountRuleModalProps) {
  const [draft, setDraft] = useState<DiscountRule | null>(rule);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(rule);
    setError('');
  }, [rule]);

  if (!draft) {
    return null;
  }

  const updateDraft = (patch: Partial<DiscountRule>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setError('');
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError('La regla necesita nombre.');
      return;
    }

    if (draft.value <= 0) {
      setError('El descuento debe ser mayor a cero.');
      return;
    }

    if (draft.discountType === 'percentage' && draft.value > 100) {
      setError('El porcentaje no puede ser mayor a 100%.');
      return;
    }

    if (draft.endsAt < draft.startsAt) {
      setError('La fecha final debe ser posterior al inicio.');
      return;
    }

    if (draft.scope === 'product' && !draft.productId) {
      setError('Selecciona el producto al que aplica la regla.');
      return;
    }

    if (draft.scope === 'category' && !draft.category) {
      setError('Selecciona la categoria a la que aplica la regla.');
      return;
    }

    onSave(draft);
  };

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar regla de descuento"
      eyebrow="Descuentos POS"
      icon={<BadgePercent className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle="Define alcance, vigencia y control operativo para POS."
      title={draft.id.startsWith('new') ? 'Nueva regla de descuento' : 'Editar regla de descuento'}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`${draft.name.trim() || 'Regla sin nombre'} · ${draft.discountType === 'percentage' ? `${draft.value}%` : `MXN ${draft.value.toFixed(2)}`}`}
      footer={(
        <button type="button" onClick={handleSave} className={posModalPrimaryActionClassName}>
          <CheckCircle className="h-5 w-5" />
          Guardar regla
        </button>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre">
            <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className={fieldControlClassName} />
          </Field>
          <Field label="Estado">
            <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as DiscountRuleStatus })} className={fieldControlClassName}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Descripcion">
          <textarea
            value={draft.description}
            onChange={(event) => updateDraft({ description: event.target.value })}
            rows={3}
            className={`${fieldControlClassName} min-h-[92px]`}
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Alcance">
            <select value={draft.scope} onChange={(event) => updateDraft({ scope: event.target.value as DiscountScope })} className={fieldControlClassName}>
              {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select value={draft.discountType} onChange={(event) => updateDraft({ discountType: event.target.value as DiscountType })} className={fieldControlClassName}>
              {Object.entries(discountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label={draft.discountType === 'percentage' ? 'Porcentaje' : 'Monto'}>
            <input type="number" min="0" step="0.01" value={draft.value} onChange={(event) => updateDraft({ value: Number(event.target.value) })} className={fieldControlClassName} />
          </Field>
          <Field label="Prioridad">
            <input type="number" value={draft.priority ?? 0} onChange={(event) => updateDraft({ priority: Number(event.target.value) })} className={fieldControlClassName} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Monto minimo">
            <input type="number" min="0" value={draft.minimumAmount ?? ''} onChange={(event) => updateDraft({ minimumAmount: event.target.value ? Number(event.target.value) : undefined })} className={fieldControlClassName} />
          </Field>
          <Field label="Tope de descuento">
            <input type="number" min="0" value={draft.maximumDiscountAmount ?? ''} onChange={(event) => updateDraft({ maximumDiscountAmount: event.target.value ? Number(event.target.value) : undefined })} className={fieldControlClassName} />
          </Field>
          <Field label="Cliente">
            <select value={draft.customerType ?? ''} onChange={(event) => updateDraft({ customerType: event.target.value ? event.target.value as DiscountRule['customerType'] : undefined })} className={fieldControlClassName}>
              <option value="">Cualquier cliente</option>
              <option value="individual">Individual</option>
              <option value="business">Empresa</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Producto">
            <select value={draft.productId ?? ''} onChange={(event) => updateDraft({ productId: event.target.value || undefined })} className={fieldControlClassName} disabled={draft.scope !== 'product'}>
              <option value="">Seleccionar producto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={draft.category ?? ''} onChange={(event) => updateDraft({ category: event.target.value || undefined })} className={fieldControlClassName} disabled={draft.scope !== 'category'}>
              <option value="">Seleccionar categoria</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Inicio">
            <input type="date" value={toDateInputValue(draft.startsAt)} onChange={(event) => updateDraft({ startsAt: new Date(`${event.target.value}T00:00:00`) })} className={fieldControlClassName} />
          </Field>
          <Field label="Fin">
            <input type="date" value={toDateInputValue(draft.endsAt)} onChange={(event) => updateDraft({ endsAt: new Date(`${event.target.value}T23:59:59`) })} className={fieldControlClassName} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Toggle checked={draft.requiresAuthorization} label="Requiere autorizacion" onChange={(checked) => updateDraft({ requiresAuthorization: checked })} />
          <Toggle checked={Boolean(draft.stackable)} label="Puede combinarse" onChange={(checked) => updateDraft({ stackable: checked })} />
        </div>
      </div>
    </PosModalFrame>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-black uppercase text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-black text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
    </label>
  );
}
