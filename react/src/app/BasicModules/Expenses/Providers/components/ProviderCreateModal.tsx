import { Building2, Check, ChevronLeft, ChevronRight, FileText, MapPinned, Phone, UserCheck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import {
  providerStatusOptions,
  providerTypeOptions,
  type ProviderFormValues,
  type ProviderStatus,
  type ProviderType,
} from '../useProveedoresLogic';

type ProviderCreateModalProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  initialValues?: ProviderFormValues;
  submitLabel?: string;
  subtitle?: string;
  title?: string;
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
  onClose: () => void;
  onSubmit: (values: ProviderFormValues) => void | Promise<void>;
};

const steps: Array<{ id: number; label: string; icon: LucideIcon; title: string; description: string }> = [
  { id: 0, label: 'Datos', icon: Building2, title: 'Información básica del proveedor', description: 'Empieza con los datos necesarios para identificar al proveedor.' },
  { id: 1, label: 'Alcance', icon: MapPinned, title: 'Alcance financiero', description: 'Asigna unidad, negocio y cuenta contable cuando aplique.' },
  { id: 2, label: 'Contacto', icon: Phone, title: 'Datos de contacto', description: 'Registra la información de comunicación y fiscal.' },
  { id: 3, label: 'Responsables', icon: UserCheck, title: 'Responsables internos', description: 'Define quién autoriza y quién es responsable de este proveedor.' },
];
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

const initialValues: ProviderFormValues = {
  accountingAccount: '',
  address: '',
  authorizer: '',
  business: '',
  businessUnit: '',
  company: '',
  contactName: '',
  email: '',
  name: '',
  performer: '',
  phone: '',
  status: 'active',
  taxId: '',
  type: 'Servicios',
};

export function ProviderCreateModal({
  accountingAccountOptions,
  businessOptions,
  initialValues: formInitialValues = initialValues,
  submitLabel = 'Guardar proveedor',
  subtitle,
  title = 'Agregar proveedor',
  unitOptions,
  userOptions,
  onClose,
  onSubmit,
}: ProviderCreateModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ProviderFormValues>(formInitialValues);
  const availableBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !values.businessUnit || option.unitId === values.businessUnit)
  ), [businessOptions, values.businessUnit]);
  const selectableAccountingAccountOptions = useMemo(() => (
    accountingAccountOptions.length > 0 ? accountingAccountOptions : [{ value: '', label: 'Sin cuentas activas' }]
  ), [accountingAccountOptions]);
  const canContinue = values.name.trim().length > 0;
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercentage = `${((stepIndex + 1) / steps.length) * 100}%`;

  useEffect(() => {
    if (!values.business) return;
    if (availableBusinessOptions.some(option => option.value === values.business)) return;
    setValues(current => ({ ...current, business: '' }));
  }, [availableBusinessOptions, values.business]);

  useEffect(() => {
    if (accountingAccountOptions.length === 0) return;
    if (accountingAccountOptions.some(option => option.value === values.accountingAccount)) return;
    setValues(current => ({ ...current, accountingAccount: accountingAccountOptions[0].value }));
  }, [accountingAccountOptions, values.accountingAccount]);

  const update = <K extends keyof ProviderFormValues>(field: K, value: ProviderFormValues[K]) => {
    setValues(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue) return;
    if (!isLastStep) {
      setStepIndex(current => current + 1);
      return;
    }
    void onSubmit({ ...values, name: values.name.trim(), company: values.company.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white dark:bg-[#147514]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#147514] shadow-sm">
                Paso {stepIndex + 1} de {steps.length}
              </div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                {subtitle ?? 'Registra alcance, contacto y responsables en un solo flujo.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Paso {stepIndex + 1} de {steps.length}
          </p>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-[#147514] transition-all duration-300 ease-out" style={{ width: progressPercentage }} />
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[720px] grid-cols-4 gap-3">
              {steps.map((step) => {
                const StepIcon = step.icon;
                const isActive = stepIndex === step.id;
                const isCompleted = stepIndex > step.id;
                return (
                  <button key={step.id} type="button" onClick={() => canContinue && setStepIndex(step.id)} className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${isActive ? 'border-[#147514]/40 bg-[#147514]/10 text-[#147514] shadow-sm' : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#147514]/25 hover:bg-white hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-[#147514] text-white' : isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'}`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : isActive ? '●' : '○'}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <StepIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{step.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <StepCard description={currentStep.description} icon={currentStep.icon} title={currentStep.title}>
            {stepIndex === 0 ? <BasicStep values={values} update={update} /> : null}
            {stepIndex === 1 ? <ScopeStep accountingAccountOptions={selectableAccountingAccountOptions} businessOptions={availableBusinessOptions} unitOptions={unitOptions} values={values} update={update} /> : null}
            {stepIndex === 2 ? <ContactStep values={values} update={update} /> : null}
            {stepIndex === 3 ? <OwnerStep userOptions={userOptions} values={values} update={update} /> : null}
          </StepCard>
        </div>

        <div className="flex flex-col gap-3 bg-[#147514] px-6 py-3 dark:bg-[#147514] sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">Cancelar</button>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button type="button" onClick={() => setStepIndex(current => Math.max(0, current - 1))} disabled={stepIndex === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50">
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
            <button type="submit" disabled={!canContinue} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
              {isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isLastStep ? submitLabel : 'Siguiente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StepCard({ children, description, icon: Icon, title }: { children: React.ReactNode; description: string; icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function BasicStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <FieldGroup title="Identidad">
        <TextField label="Nombre del proveedor" required value={values.name} onChange={(value) => update('name', value)} />
        <TextField label="Empresa / razón social" value={values.company} onChange={(value) => update('company', value)} />
      </FieldGroup>
      <FieldGroup title="Clasificación">
        <SelectField label="Tipo de proveedor" value={values.type} options={providerTypeOptions} onChange={(value) => update('type', value as ProviderType)} />
        <SelectField label="Estado" value={values.status} options={providerStatusOptions} onChange={(value) => update('status', value as ProviderStatus)} />
      </FieldGroup>
    </div>
  );
}

function ScopeStep({ accountingAccountOptions, businessOptions, unitOptions, values, update }: StepProps & { accountingAccountOptions: FinanceReferenceOption[]; businessOptions: FinanceReferenceOption[]; unitOptions: FinanceReferenceOption[] }) {
  return (
    <FieldGroup title="Asignación">
      <SelectField label="Unidad" value={values.businessUnit} options={unitOptions} onChange={(value) => update('businessUnit', value)} includeEmpty />
      <SelectField label="Negocio" value={values.business} options={businessOptions} onChange={(value) => update('business', value)} includeEmpty />
      <SelectField label="Cuenta contable" value={values.accountingAccount} options={accountingAccountOptions} onChange={(value) => update('accountingAccount', value)} />
    </FieldGroup>
  );
}

function ContactStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <FieldGroup title="Contacto">
        <TextField label="Contacto principal" value={values.contactName} onChange={(value) => update('contactName', value)} />
        <TextField label="Correo" type="email" value={values.email} onChange={(value) => update('email', value)} />
        <TextField label="Teléfono" value={values.phone} onChange={(value) => update('phone', value)} />
        <TextField label="RFC / ID fiscal" value={values.taxId} onChange={(value) => update('taxId', value)} />
      </FieldGroup>
      <FieldGroup title="Ubicación">
        <TextField label="Dirección" value={values.address} onChange={(value) => update('address', value)} />
      </FieldGroup>
    </div>
  );
}

function OwnerStep({ userOptions, values, update }: StepProps & { userOptions: FinanceReferenceOption[] }) {
  return (
    <FieldGroup title="Responsables">
      <SelectField label="Autoriza" value={values.authorizer} options={userOptions} onChange={(value) => update('authorizer', value)} includeEmpty />
      <SelectField label="Responsable" value={values.performer} options={userOptions} onChange={(value) => update('performer', value)} includeEmpty />
    </FieldGroup>
  );
}

type StepProps = {
  values: ProviderFormValues;
  update: <K extends keyof ProviderFormValues>(field: K, value: ProviderFormValues[K]) => void;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function FieldGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({ label, onChange, required, type = 'text', value }: { label: string; onChange: (value: string) => void; required?: boolean; type?: string; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function SelectField({ includeEmpty = false, label, onChange, options, value }: { includeEmpty?: boolean; label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  return (
    <label>
      <FieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {includeEmpty ? <option value="">Sin asignar</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
