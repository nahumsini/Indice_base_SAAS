import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, WalletCards } from 'lucide-react';
import type { CreditRiskLevel, CreditRule, CreditRuleStatus } from '../../shared/commercial/credit';
import type { Customer } from '../../shared/commercial/customers';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface CreditRuleModalProps {
  rule: CreditRule | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (rule: CreditRule) => void;
}

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

const customerGroupOptions = ['General', 'Frequent retail', 'Business', 'Wholesale', 'VIP'];
const currencyOptions = ['MXN', 'USD', 'CAD', 'COP', 'BRL'];
const fieldClassName = 'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500';

export function CreditRuleModal({ rule, customers, onClose, onSave }: CreditRuleModalProps) {
  const [draft, setDraft] = useState<CreditRule | null>(rule);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(rule);
    setError('');
  }, [rule]);

  if (!draft) {
    return null;
  }

  const updateDraft = (patch: Partial<CreditRule>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setError('');
  };

  const handleSave = () => {
    if (!draft.name?.trim()) {
      setError('La politica necesita nombre.');
      return;
    }

    if (draft.creditLimit <= 0) {
      setError('El limite de credito debe ser mayor a cero.');
      return;
    }

    if (draft.paymentTermDays < 0 || draft.gracePeriodDays < 0) {
      setError('Los plazos no pueden ser negativos.');
      return;
    }

    if (draft.reviewAtUtilizationPercent && draft.reviewAtUtilizationPercent > 100) {
      setError('El umbral de revision no puede superar 100%.');
      return;
    }

    onSave(draft);
  };

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar política de crédito"
      eyebrow="Crédito POS"
      icon={<WalletCards className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle="Define plazos, límite, riesgo y bloqueo para venta a crédito."
      title={draft.id.startsWith('credit-new') ? 'Nueva política de crédito' : 'Editar política de crédito'}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`${draft.name?.trim() || 'Política sin nombre'} · ${draft.currency ?? 'MXN'} ${draft.creditLimit.toLocaleString('es-MX')}`}
      footer={(
        <button type="button" onClick={handleSave} className={posModalPrimaryActionClassName}>
          <CheckCircle className="h-5 w-5" />
          Guardar política
        </button>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <Field label="Nombre">
            <input value={draft.name ?? ''} onChange={(event) => updateDraft({ name: event.target.value })} className={fieldClassName} />
          </Field>
          <Field label="Estado">
            <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as CreditRuleStatus })} className={fieldClassName}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Riesgo">
            <select value={draft.riskLevel} onChange={(event) => updateDraft({ riskLevel: event.target.value as CreditRiskLevel })} className={fieldClassName}>
              {Object.entries(riskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Cliente especifico">
            <select value={draft.customerId ?? ''} onChange={(event) => updateDraft({ customerId: event.target.value || undefined })} className={fieldClassName}>
              <option value="">Cualquier cliente</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </Field>
          <Field label="Grupo">
            <select value={draft.customerGroup ?? 'General'} onChange={(event) => updateDraft({ customerGroup: event.target.value === 'General' ? undefined : event.target.value })} className={fieldClassName}>
              {customerGroupOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Limite">
            <input type="number" min="0" value={draft.creditLimit} onChange={(event) => updateDraft({ creditLimit: Number(event.target.value) })} className={fieldClassName} />
          </Field>
          <Field label="Moneda">
            <select value={draft.currency ?? 'MXN'} onChange={(event) => updateDraft({ currency: event.target.value })} className={fieldClassName}>
              {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </Field>
          <Field label="Plazo dias">
            <input type="number" min="0" value={draft.paymentTermDays} onChange={(event) => updateDraft({ paymentTermDays: Number(event.target.value) })} className={fieldClassName} />
          </Field>
          <Field label="Gracia dias">
            <input type="number" min="0" value={draft.gracePeriodDays} onChange={(event) => updateDraft({ gracePeriodDays: Number(event.target.value) })} className={fieldClassName} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Mora %">
            <input type="number" min="0" step="0.01" value={draft.lateInterestRate} onChange={(event) => updateDraft({ lateInterestRate: Number(event.target.value) })} className={fieldClassName} />
          </Field>
          <Field label="Penalizacion">
            <input type="number" min="0" value={draft.penaltyFee} onChange={(event) => updateDraft({ penaltyFee: Number(event.target.value) })} className={fieldClassName} />
          </Field>
          <Field label="Monto minimo">
            <input type="number" min="0" value={draft.minimumTicketAmount ?? ''} onChange={(event) => updateDraft({ minimumTicketAmount: event.target.value ? Number(event.target.value) : undefined })} className={fieldClassName} />
          </Field>
          <Field label="Aprobar arriba de">
            <input type="number" min="0" value={draft.requiresApprovalAbove ?? ''} onChange={(event) => updateDraft({ requiresApprovalAbove: event.target.value ? Number(event.target.value) : undefined })} className={fieldClassName} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Revision por uso %">
            <input type="number" min="0" max="100" value={draft.reviewAtUtilizationPercent ?? 80} onChange={(event) => updateDraft({ reviewAtUtilizationPercent: Number(event.target.value) })} className={fieldClassName} />
          </Field>
          <Field label="Facturas abiertas max.">
            <input type="number" min="0" value={draft.maxOpenInvoices ?? ''} onChange={(event) => updateDraft({ maxOpenInvoices: event.target.value ? Number(event.target.value) : undefined })} className={fieldClassName} />
          </Field>
          <Toggle checked={draft.blockWhenOverdue} label="Bloquear con vencido" onChange={(checked) => updateDraft({ blockWhenOverdue: checked })} />
        </div>

        <Field label="Notas operativas">
          <textarea value={draft.notes ?? ''} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} className={`${fieldClassName} min-h-[92px]`} />
        </Field>
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
