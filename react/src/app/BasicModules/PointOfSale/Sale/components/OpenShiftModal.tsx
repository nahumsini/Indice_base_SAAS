import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  DollarSign,
  LogIn,
  Monitor,
  Coins,
  StickyNote,
  Store,
  User,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';
import {
  businessCurrencyOptions,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';
import type { CashRegisterContext } from '../../shared/cashClosing.types';
import type { PosCashRegisterResponse, PosWarehouseSummary } from '../services/posBackendApi';

interface OpenShiftModalProps {
  isOpen: boolean;
  registerContext: CashRegisterContext | null;
  warehouses?: PosWarehouseSummary[];
  cashRegisters?: PosCashRegisterResponse[];
  selectedCashRegisterId?: string;
  preferredCurrencyCode?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (initialCash: number, openingNote?: string, currencyCode?: string) => void | Promise<void>;
  onSelectCashRegister?: (cashRegisterId: string) => void;
}

const quickAmounts = [0, 500, 1000, 2000, 5000];

const toId = (value: number | string | null | undefined) => (
  value === null || value === undefined ? '' : String(value)
);

const formatCurrency = (amount: number, currencyCode: string) => (
  formatBusinessCurrencyAmount(amount, currencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
);

function uniqueOptions<TItem>(
  items: TItem[],
  getId: (item: TItem) => number | string | null | undefined,
  getName: (item: TItem) => string | null | undefined,
) {
  const options = new Map<string, string>();
  items.forEach((item) => {
    const id = toId(getId(item));
    if (!id || options.has(id)) {
      return;
    }
    options.set(id, getName(item)?.trim() || 'Sin asignar');
  });
  return Array.from(options, ([id, name]) => ({ id, name }));
}

export function OpenShiftModal({
  isOpen,
  registerContext,
  warehouses = [],
  cashRegisters = [],
  selectedCashRegisterId = '',
  preferredCurrencyCode,
  isSubmitting = false,
  onClose,
  onConfirm,
  onSelectCashRegister,
}: OpenShiftModalProps) {
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(
    () => normalizeBusinessCurrencyCode(preferredCurrencyCode),
  );
  const [initialCash, setInitialCash] = useState('0.00');
  const [openingNote, setOpeningNote] = useState('');
  const [error, setError] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  const activeRegisters = useMemo(
    () => cashRegisters.filter((register) => register.active && register.status === 'ACTIVE'),
    [cashRegisters],
  );

  const selectedRegister = useMemo(
    () => activeRegisters.find((register) => toId(register.id) === selectedCashRegisterId)
      ?? activeRegisters[0]
      ?? null,
    [activeRegisters, selectedCashRegisterId],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const registerWarehouse = warehouses.find((warehouse) => warehouse.id === selectedRegister?.warehouseId);
    setSelectedUnitId(toId(selectedRegister?.unitId ?? registerWarehouse?.unitId));
    setSelectedBusinessId(toId(selectedRegister?.businessId ?? registerWarehouse?.businessId));
    setSelectedWarehouseId(toId(selectedRegister?.warehouseId ?? registerWarehouse?.id ?? warehouses[0]?.id));
    setSelectedCurrencyCode(normalizeBusinessCurrencyCode(preferredCurrencyCode));
    setInitialCash('0.00');
    setOpeningNote('');
    setError('');
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, [isOpen, preferredCurrencyCode, selectedRegister, warehouses]);

  const unitOptions = useMemo(
    () => uniqueOptions(warehouses, (warehouse) => warehouse.unitId, (warehouse) => warehouse.unitName),
    [warehouses],
  );

  const businessOptions = useMemo(() => {
    const source = selectedUnitId
      ? warehouses.filter((warehouse) => toId(warehouse.unitId) === selectedUnitId)
      : warehouses;
    return uniqueOptions(source, (warehouse) => warehouse.businessId, (warehouse) => warehouse.businessName);
  }, [selectedUnitId, warehouses]);

  const filteredWarehouses = useMemo(
    () => warehouses.filter((warehouse) => {
      const matchesUnit = !selectedUnitId || toId(warehouse.unitId) === selectedUnitId;
      const matchesBusiness = !selectedBusinessId || toId(warehouse.businessId) === selectedBusinessId;
      return matchesUnit && matchesBusiness;
    }),
    [selectedBusinessId, selectedUnitId, warehouses],
  );

  const filteredRegisters = useMemo(
    () => activeRegisters.filter((register) => {
      const warehouse = warehouses.find((candidate) => candidate.id === register.warehouseId);
      const registerUnitId = toId(register.unitId ?? warehouse?.unitId);
      const registerBusinessId = toId(register.businessId ?? warehouse?.businessId);
      const matchesUnit = !selectedUnitId || registerUnitId === selectedUnitId;
      const matchesBusiness = !selectedBusinessId || registerBusinessId === selectedBusinessId;
      const matchesWarehouse = !selectedWarehouseId || toId(register.warehouseId) === selectedWarehouseId;
      return matchesUnit && matchesBusiness && matchesWarehouse;
    }),
    [activeRegisters, selectedBusinessId, selectedUnitId, selectedWarehouseId, warehouses],
  );

  useEffect(() => {
    if (!isOpen || !onSelectCashRegister) {
      return;
    }

    const selectedExists = filteredRegisters.some((register) => toId(register.id) === selectedCashRegisterId);
    if (!selectedExists) {
      onSelectCashRegister(toId(filteredRegisters[0]?.id));
    }
  }, [filteredRegisters, isOpen, onSelectCashRegister, selectedCashRegisterId]);

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedBusinessId('');
    setSelectedWarehouseId('');
    setError('');
  };

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setSelectedWarehouseId('');
    setError('');
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setError('');
  };

  const requiresUnitSelection = unitOptions.length > 0;
  const requiresBusinessSelection = businessOptions.length > 0;
  const requiresWarehouseSelection = filteredWarehouses.length > 0;
  const hasWarehouseBlocker = warehouses.length === 0;
  const hasIncompleteContext =
    (requiresUnitSelection && !selectedUnitId)
    || (requiresBusinessSelection && !selectedBusinessId)
    || (requiresWarehouseSelection && !selectedWarehouseId);
  const hasRegisterBlocker = !hasWarehouseBlocker && !hasIncompleteContext && filteredRegisters.length === 0;

  const handleConfirm = () => {
    if (isSubmitting) {
      return;
    }

    if (warehouses.length === 0) {
      setError('Primero crea un almacén para poder abrir una caja POS.');
      return;
    }

    if (requiresUnitSelection && !selectedUnitId) {
      setError('Selecciona la unidad donde va a operar esta caja.');
      return;
    }

    if (requiresBusinessSelection && !selectedBusinessId) {
      setError('Selecciona el negocio o sucursal donde va a operar esta caja.');
      return;
    }

    if (requiresWarehouseSelection && !selectedWarehouseId) {
      setError('Selecciona el almacén desde donde se descontará inventario.');
      return;
    }

    if (filteredRegisters.length === 0 || !registerContext) {
      setError('No hay una caja activa vinculada al contexto seleccionado.');
      return;
    }

    const amount = Number(initialCash);
    if (Number.isNaN(amount) || amount < 0) {
      setError('El fondo inicial no puede ser negativo.');
      return;
    }

    onConfirm(amount, openingNote.trim() || undefined, selectedCurrencyCode);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar apertura de caja"
      eyebrow="Inicio de turno"
      icon={<LogIn className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="lg"
      subtitle="Selecciona contexto, divisa y fondo inicial para iniciar el turno."
      title="Abrir caja"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} disabled={isSubmitting} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`${registerContext ? `${registerContext.cashRegisterCode} · ${registerContext.cashRegisterName}` : 'Caja pendiente'} · ${selectedCurrencyCode} · Fondo ${formatCurrency(Number(initialCash) || 0, selectedCurrencyCode)}`}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || hasWarehouseBlocker || hasIncompleteContext || hasRegisterBlocker || !registerContext}
          className={posModalPrimaryActionClassName}
        >
          {isSubmitting ? 'Abriendo...' : 'Abrir caja'}
        </button>
      )}
    >
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <SetupTile icon={Warehouse} label="Almacén" complete={warehouses.length > 0} active={hasWarehouseBlocker} />
            <SetupTile icon={Monitor} label="Caja" complete={activeRegisters.length > 0} active={!hasWarehouseBlocker && activeRegisters.length === 0} />
            <SetupTile icon={User} label="Sesión" complete={Boolean(registerContext)} active={!registerContext && activeRegisters.length > 0} />
          </div>

          {(error || hasWarehouseBlocker || hasRegisterBlocker) && (
            <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
              <span className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {error
                    || (hasWarehouseBlocker
                      ? 'POS requiere un almacén antes de abrir caja. Crea el almacén desde Inventario y después vincula una caja.'
                      : 'No hay cajas activas para el contexto seleccionado. Crea o activa una caja vinculada al almacén.')}
                </span>
              </span>
            </div>
          )}

          <section className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">
                  Contexto operativo
                </p>
                <h3 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  Dónde va a operar esta caja
                </h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                Accesos disponibles
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                icon={Building2}
                label="Unidad"
                value={selectedUnitId}
                disabled={isSubmitting || unitOptions.length === 0}
                options={unitOptions}
                placeholder="Todas las unidades"
                onChange={handleUnitChange}
              />
              <SelectField
                icon={BriefcaseBusiness}
                label="Negocio"
                value={selectedBusinessId}
                disabled={isSubmitting || businessOptions.length === 0}
                options={businessOptions}
                placeholder="Todos los negocios"
                onChange={handleBusinessChange}
              />
              <SelectField
                icon={Warehouse}
                label="Almacén"
                value={selectedWarehouseId}
                disabled={isSubmitting || filteredWarehouses.length === 0}
                options={filteredWarehouses.map((warehouse) => ({ id: toId(warehouse.id), name: warehouse.name }))}
                placeholder="Selecciona almacén"
                onChange={handleWarehouseChange}
              />
              <SelectField
                icon={Monitor}
                label="Caja"
                value={selectedCashRegisterId}
                disabled={isSubmitting || !selectedWarehouseId || filteredRegisters.length === 0}
                options={filteredRegisters.map((register) => ({ id: toId(register.id), name: `${register.code} · ${register.name}` }))}
                placeholder="Selecciona caja"
                onChange={(value) => {
                  setError('');
                  onSelectCashRegister?.(value);
                }}
              />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">
                  Divisa y fondo inicial
                </p>
                <h3 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  Moneda del turno y efectivo inicial
                </h3>
              </div>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                  Divisa del turno
                </span>
                <span className="relative block">
                  <Coins className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedCurrencyCode}
                    onChange={(event) => {
                      setSelectedCurrencyCode(normalizeBusinessCurrencyCode(event.target.value));
                      setError('');
                    }}
                    disabled={isSubmitting}
                    className="min-h-14 w-full rounded-lg border border-gray-300 bg-white py-3 pl-14 pr-4 text-lg font-black text-gray-950 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    {businessCurrencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Esta divisa controla pagos, corte de caja y cierre del turno. Si cambias país fiscal después, debe coincidir con esta moneda.
                </span>
              </label>

              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Fondo inicial en caja
              </label>
              <div className="relative">
                <DollarSign className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  value={initialCash}
                  onChange={(event) => setInitialCash(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="0.00"
                  className="min-h-16 w-full rounded-lg border-2 border-gray-300 bg-white py-4 pl-14 pr-4 text-3xl font-black text-gray-950 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Montos rápidos</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setInitialCash(amount.toFixed(2))}
                      disabled={isSubmitting}
                      className="min-h-12 rounded-lg bg-gray-100 px-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                      {amount === 0 ? formatCurrency(0, selectedCurrencyCode).replace('.00', '') : formatCurrency(amount, selectedCurrencyCode).replace('.00', '')}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mb-2 mt-5 block text-sm font-black text-gray-700 dark:text-gray-300">
                Nota de apertura
              </label>
              <div className="relative">
                <StickyNote className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <textarea
                  value={openingNote}
                  onChange={(event) => setOpeningNote(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Opcional"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">
                  Modo operativo
                </p>
                <h3 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  Turno principal
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                  En esta versión el usuario que abre caja crea el turno principal. Las sesiones multiusuario deben vivir como cortes de cajero dentro del turno en una fase backend posterior.
                </p>
              </div>

              <div className="space-y-3">
                <ContextPill icon={Building2} label="Empresa" value={registerContext?.companyName ?? 'Empresa actual'} />
                <ContextPill icon={Store} label="Unidad" value={registerContext?.businessUnitName ?? 'N/D'} />
                <ContextPill icon={BriefcaseBusiness} label="Negocio" value={registerContext?.businessName ?? 'N/D'} />
                <ContextPill icon={Monitor} label="Caja" value={registerContext ? `${registerContext.cashRegisterCode} · ${registerContext.cashRegisterName}` : 'N/D'} />
                <ContextPill icon={Coins} label="Divisa" value={selectedCurrencyCode} />
                <ContextPill icon={User} label="Responsable" value={registerContext?.responsibleUserName ?? 'Usuario actual'} />
              </div>
            </section>
          </div>
    </PosModalFrame>
  );
}

function SetupTile({
  icon: Icon,
  label,
  complete,
  active,
}: {
  icon: LucideIcon;
  label: string;
  complete: boolean;
  active: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
      complete
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
        : active
          ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200'
          : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
    }`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-900">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black">{label}</p>
        <p className="text-xs font-bold opacity-70">{complete ? 'Listo' : active ? 'Requiere atención' : 'Pendiente'}</p>
      </div>
      {complete && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" />}
    </div>
  );
}

function SelectField({
  icon: Icon,
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="relative block">
        <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-h-12 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-black text-gray-950 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

function ContextPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
