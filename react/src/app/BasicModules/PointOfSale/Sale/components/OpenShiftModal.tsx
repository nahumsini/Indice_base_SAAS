import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Coins, LogIn, Monitor, StickyNote, Warehouse } from 'lucide-react';
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
}: OpenShiftModalProps) {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(() => normalizeBusinessCurrencyCode(preferredCurrencyCode));
  const [initialCash, setInitialCash] = useState('0.00');
  const [openingNote, setOpeningNote] = useState('');
  const [error, setError] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  const warehousesById = useMemo(
    () => new Map(warehouses.map((warehouse) => [toId(warehouse.id), warehouse])),
    [warehouses],
  );
  const eligibleRegisters = useMemo(
    () => cashRegisters
      .filter((register) => register.active && register.status === 'ACTIVE' && warehousesById.has(toId(register.warehouseId)))
      .sort((first, second) => {
        const firstWarehouse = warehousesById.get(toId(first.warehouseId))?.name ?? '';
        const secondWarehouse = warehousesById.get(toId(second.warehouseId))?.name ?? '';
        return `${firstWarehouse} ${first.code} ${first.name}`.localeCompare(`${secondWarehouse} ${second.code} ${second.name}`);
      }),
    [cashRegisters, warehousesById],
  );
  const selectedRegister = useMemo(
    () => eligibleRegisters.find((register) => toId(register.id) === selectedCashRegisterId) ?? null,
    [eligibleRegisters, selectedCashRegisterId],
  );
  const selectedWarehouse = useMemo(
    () => selectedRegister ? warehousesById.get(toId(selectedRegister.warehouseId)) ?? null : null,
    [selectedRegister, warehousesById],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCurrencyCode(normalizeBusinessCurrencyCode(preferredCurrencyCode));
    setInitialCash('0.00');
    setOpeningNote('');
    setError('');
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, [isOpen]); // Reset only when the modal opens; changing context must preserve entered cash.

  useEffect(() => {
    if (!isOpen || !onSelectCashRegister) return;
    const selectedIsEligible = eligibleRegisters.some(
      (register) => toId(register.id) === selectedCashRegisterId,
    );
    if (!selectedIsEligible) {
      onSelectCashRegister(toId(eligibleRegisters[0]?.id));
    }
  }, [eligibleRegisters, isOpen, onSelectCashRegister, selectedCashRegisterId]);

  if (!isOpen) return null;

  const hasRegisterBlocker = eligibleRegisters.length === 0;
  const registerContextMatchesSelection = toId(registerContext?.cashRegisterId) === toId(selectedRegister?.id);
  const contextReady = Boolean(selectedWarehouse && selectedRegister && registerContext && registerContextMatchesSelection);
  const amount = Number(initialCash);
  const contextSummary = contextReady
    ? [
      `${selectedRegister.code} · ${selectedRegister.name}`,
      selectedWarehouse.name,
      selectedWarehouse.unitName,
      selectedWarehouse.businessName,
      selectedCurrencyCode,
      registerContext.responsibleUserName,
    ].filter(Boolean).join(' · ')
    : 'Selecciona una caja POS disponible';

  const handleConfirm = () => {
    if (isSubmitting) return;
    if (!selectedRegister || !selectedWarehouse || !registerContext || !registerContextMatchesSelection) {
      setError('Selecciona una caja POS activa y disponible.');
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
      closeLabel="Cerrar apertura de turno"
      eyebrow="Inicio de turno"
      icon={<LogIn className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="md"
      subtitle="Selecciona una caja POS y registra el fondo inicial."
      title="Abrir turno"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={<button type="button" onClick={onClose} disabled={isSubmitting} className={posModalSecondaryActionClassName}>Cancelar</button>}
      footerSummary={contextReady ? `${selectedRegister.code} · ${selectedCurrencyCode} · Fondo ${formatCurrency(amount || 0, selectedCurrencyCode)}` : 'Contexto pendiente'}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || !contextReady || Number.isNaN(amount) || amount < 0}
          className={posModalPrimaryActionClassName}
        >
          {isSubmitting ? 'Abriendo...' : 'Abrir turno'}
        </button>
      )}
    >
      {(error || hasRegisterBlocker) ? (
        <div className="mb-4 flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-normal text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || 'No hay cajas POS activas disponibles. Crea una en Cajas y turnos.'}</span>
        </div>
      ) : null}

      <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div>
          <h3 className="text-lg font-medium text-gray-950 dark:text-white">Caja de operación</h3>
          <p className="mt-1 text-sm font-normal text-gray-600 dark:text-gray-300">Cada caja conserva su almacén, unidad y negocio. Si un almacén tiene varias cajas, aparecen por separado.</p>
        </div>

        <SelectField
          icon={Monitor}
          label="Caja POS"
          value={selectedCashRegisterId}
          disabled={isSubmitting || hasRegisterBlocker}
          options={eligibleRegisters.map((register) => {
            const warehouse = warehousesById.get(toId(register.warehouseId));
            return {
              id: toId(register.id),
              name: `${register.code} · ${register.name}${warehouse ? ` · ${warehouse.name}` : ''}`,
            };
          })}
          placeholder="Selecciona una caja POS"
          onChange={(cashRegisterId) => {
            onSelectCashRegister?.(cashRegisterId);
            setError('');
          }}
        />

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
