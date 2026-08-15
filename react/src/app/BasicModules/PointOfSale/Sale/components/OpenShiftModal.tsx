import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Coins, Loader2, LogIn, Monitor, StickyNote, Warehouse } from 'lucide-react';
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
  onEnsureWarehouseRegister?: (warehouseId: string) => Promise<string>;
}

const quickAmounts = [0, 500, 1000, 2000, 5000];
const toId = (value: number | string | null | undefined) => value == null ? '' : String(value);
const formatCurrency = (amount: number, currencyCode: string) => formatBusinessCurrencyAmount(
  amount,
  currencyCode,
  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
);

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
  onEnsureWarehouseRegister,
}: OpenShiftModalProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(() => normalizeBusinessCurrencyCode(preferredCurrencyCode));
  const [initialCash, setInitialCash] = useState('0.00');
  const [openingNote, setOpeningNote] = useState('');
  const [error, setError] = useState('');
  const [isProvisioningRegister, setIsProvisioningRegister] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const activeRegisters = useMemo(
    () => cashRegisters.filter((register) => register.active && register.status === 'ACTIVE'),
    [cashRegisters],
  );
  const availableWarehouses = useMemo(
    () => [...warehouses].sort((first, second) => first.name.localeCompare(second.name)),
    [warehouses],
  );
  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => toId(warehouse.id) === selectedWarehouseId) ?? null,
    [selectedWarehouseId, warehouses],
  );
  const warehouseRegisters = useMemo(
    () => activeRegisters
      .filter((register) => toId(register.warehouseId) === selectedWarehouseId)
      .sort((first, second) => `${first.code} ${first.name}`.localeCompare(`${second.code} ${second.name}`)),
    [activeRegisters, selectedWarehouseId],
  );
  const selectedRegister = useMemo(
    () => warehouseRegisters.find((register) => toId(register.id) === selectedCashRegisterId) ?? null,
    [selectedCashRegisterId, warehouseRegisters],
  );

  useEffect(() => {
    if (!isOpen) return;
    const register = activeRegisters.find((candidate) => toId(candidate.id) === selectedCashRegisterId);
    const initialWarehouseId = toId(register?.warehouseId ?? availableWarehouses[0]?.id ?? warehouses[0]?.id);
    setSelectedWarehouseId(initialWarehouseId);
    setSelectedCurrencyCode(normalizeBusinessCurrencyCode(preferredCurrencyCode));
    setInitialCash('0.00');
    setOpeningNote('');
    setError('');
    setIsProvisioningRegister(false);
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, [isOpen]); // Reset only when the modal opens; changing context must preserve entered cash.

  useEffect(() => {
    if (!isOpen || !onSelectCashRegister || !selectedWarehouseId) return;
    const selectedBelongsToWarehouse = warehouseRegisters.some(
      (register) => toId(register.id) === selectedCashRegisterId,
    );
    if (!selectedBelongsToWarehouse) {
      onSelectCashRegister(toId(warehouseRegisters[0]?.id));
    }
  }, [isOpen, onSelectCashRegister, selectedCashRegisterId, selectedWarehouseId, warehouseRegisters]);

  if (!isOpen) return null;

  const hasWarehouseBlocker = warehouses.length === 0;
  const hasRegisterBlocker = !hasWarehouseBlocker && activeRegisters.length === 0 && !onEnsureWarehouseRegister;
  const contextReady = Boolean(selectedWarehouse && selectedRegister && registerContext);
  const amount = Number(initialCash);
  const contextSummary = contextReady
    ? [
      selectedWarehouse.name,
      selectedWarehouse.businessName,
      `${selectedRegister.code} · ${selectedRegister.name}`,
      selectedCurrencyCode,
      registerContext.responsibleUserName,
    ].filter(Boolean).join(' · ')
    : isProvisioningRegister
      ? 'Preparando la caja predeterminada del almacén…'
      : 'Selecciona un almacén para preparar su caja';

  const handleWarehouseChange = async (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setError('');
    const existing = activeRegisters.find((register) => toId(register.warehouseId) === warehouseId);
    if (existing) {
      onSelectCashRegister?.(toId(existing.id));
      return;
    }
    if (!onEnsureWarehouseRegister) return;
    setIsProvisioningRegister(true);
    try {
      const registerId = await onEnsureWarehouseRegister(warehouseId);
      onSelectCashRegister?.(registerId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible preparar la caja del almacén.');
    } finally {
      setIsProvisioningRegister(false);
    }
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    if (hasWarehouseBlocker) {
      setError('Primero crea un almacén para poder abrir una caja POS.');
      return;
    }
    if (!selectedWarehouseId) {
      setError('Selecciona el almacén desde donde se descontará el inventario.');
      return;
    }
    if (!selectedRegister || !registerContext) {
      setError('No hay una caja activa vinculada al almacén seleccionado.');
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setError('El fondo inicial no puede ser negativo.');
      return;
    }
    void onConfirm(amount, openingNote.trim() || undefined, selectedCurrencyCode);
  };

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar apertura de caja"
      eyebrow="Inicio de turno"
      icon={<LogIn className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="md"
      subtitle="Selecciona un almacén y registra el efectivo inicial."
      title="Abrir caja"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={<button type="button" onClick={onClose} disabled={isSubmitting} className={posModalSecondaryActionClassName}>Cancelar</button>}
      footerSummary={contextReady ? `${selectedRegister.code} · ${selectedCurrencyCode} · Fondo ${formatCurrency(amount || 0, selectedCurrencyCode)}` : 'Contexto pendiente'}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || isProvisioningRegister || !contextReady || Number.isNaN(amount) || amount < 0}
          className={posModalPrimaryActionClassName}
        >
          {isSubmitting ? 'Abriendo...' : 'Abrir caja'}
        </button>
      )}
    >
      {(error || hasWarehouseBlocker || hasRegisterBlocker) ? (
        <div className="mb-4 flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-normal text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || (hasWarehouseBlocker
            ? 'POS requiere un almacén antes de abrir caja.'
            : 'No fue posible preparar una caja activa para los almacenes disponibles.')}</span>
        </div>
      ) : null}

      <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div>
          <h3 className="text-lg font-medium text-gray-950 dark:text-white">Contexto de operación</h3>
          <p className="mt-1 text-sm font-normal text-gray-600 dark:text-gray-300">El almacén precarga la unidad, el negocio y las cajas disponibles.</p>
        </div>

        <SelectField
          icon={Warehouse}
          label="Almacén"
          value={selectedWarehouseId}
          disabled={isSubmitting || availableWarehouses.length === 0}
          options={availableWarehouses.map((warehouse) => ({ id: toId(warehouse.id), name: warehouse.name }))}
          placeholder="Selecciona un almacén"
          onChange={(warehouseId) => { void handleWarehouseChange(warehouseId); }}
        />

        {isProvisioningRegister ? (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando una caja para este almacén…
          </div>
        ) : null}

        {warehouseRegisters.length > 1 ? (
          <SelectField
            icon={Monitor}
            label="Caja"
            value={selectedCashRegisterId}
            disabled={isSubmitting}
            options={warehouseRegisters.map((register) => ({ id: toId(register.id), name: `${register.code} · ${register.name}` }))}
            placeholder="Selecciona una caja"
            onChange={(cashRegisterId) => {
              onSelectCashRegister?.(cashRegisterId);
              setError('');
            }}
          />
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-950/50">
          <p className="text-xs font-normal text-gray-500 dark:text-gray-400">Contexto precargado</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{contextSummary}</p>
        </div>
      </section>

      <section className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div>
          <label htmlFor="opening-cash" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fondo inicial</label>
          <div className="relative mt-2">
            <Coins className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="opening-cash"
              ref={amountInputRef}
              type="number"
              min="0"
              step="0.01"
              value={initialCash}
              onChange={(event) => { setInitialCash(event.target.value); setError(''); }}
              disabled={isSubmitting}
              className="min-h-14 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-20 text-xl font-medium text-gray-950 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{selectedCurrencyCode}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setInitialCash(quickAmount.toFixed(2))}
                disabled={isSubmitting}
                className="min-h-10 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                {formatCurrency(quickAmount, selectedCurrencyCode).replace('.00', '')}
              </button>
            ))}
          </div>
        </div>

        <details className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">Opciones de apertura</summary>
          <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
            <label className="block">
              <span className="mb-2 block text-sm font-normal text-gray-600 dark:text-gray-300">Divisa del turno</span>
              <select
                value={selectedCurrencyCode}
                onChange={(event) => setSelectedCurrencyCode(normalizeBusinessCurrencyCode(event.target.value))}
                disabled={isSubmitting}
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                {businessCurrencyOptions.map((option) => <option key={option.code} value={option.code}>{option.code}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-normal text-gray-600 dark:text-gray-300"><StickyNote className="h-4 w-4" /> Nota de apertura</span>
              <textarea
                value={openingNote}
                onChange={(event) => setOpeningNote(event.target.value)}
                disabled={isSubmitting}
                placeholder="Opcional"
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
        </details>
      </section>
    </PosModalFrame>
  );
}

function SelectField({ icon: Icon, label, value, options, placeholder, disabled, onChange }: {
  icon: typeof Warehouse;
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-h-12 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-normal text-gray-950 focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </span>
    </label>
  );
}
