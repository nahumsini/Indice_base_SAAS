import {
  ArrowRight,
  CheckCircle2,
  Circle,
  LogIn,
  Monitor,
  Plus,
  RefreshCw,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

interface PosSetupProgressProps {
  hasWarehouses: boolean;
  hasCashRegisters: boolean;
}

export function PosSetupProgress({ hasWarehouses, hasCashRegisters }: PosSetupProgressProps) {
  return (
    <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-left dark:border-orange-500/30 dark:bg-orange-500/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-normal text-orange-600 dark:text-orange-300">
            POS Setup
          </p>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
            Completa la base operativa para vender desde mostrador.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-orange-700 shadow-sm dark:bg-gray-900 dark:text-orange-300">
          {hasWarehouses ? 'Paso 2 de 3' : 'Paso 1 de 3'}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <SetupStep
          icon={Warehouse}
          title="Almacén"
          description="Define desde dónde saldrá el inventario."
          complete={hasWarehouses}
          active={!hasWarehouses}
        />
        <SetupStep
          icon={Monitor}
          title="Caja"
          description="Vincula una terminal a un almacén."
          complete={hasCashRegisters}
          active={hasWarehouses && !hasCashRegisters}
        />
        <SetupStep
          icon={LogIn}
          title="Turno"
          description="Abre caja con fondo inicial."
          complete={false}
          active={false}
        />
      </div>
    </div>
  );
}

function SetupStep({
  icon: Icon,
  title,
  description,
  complete,
  active,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  complete: boolean;
  active: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${
      complete
        ? 'border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-gray-900/60'
        : active
          ? 'border-orange-300 bg-white shadow-sm dark:border-orange-500/40 dark:bg-gray-900/60'
          : 'border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-900/30'
    }`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          complete
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : active
              ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        ) : (
          <Circle className={`h-5 w-5 ${active ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`} />
        )}
      </div>
      <p className="text-sm font-medium text-gray-950 dark:text-white">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export function FirstUseAction({
  icon: Icon,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-gray-950 dark:text-white">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onSecondary}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          {secondaryLabel}
        </button>
        <button
          type="button"
          onClick={onPrimary}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-700"
        >
          {primaryLabel === 'Crear caja' ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
