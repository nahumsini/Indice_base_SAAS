import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Monitor, Warehouse } from 'lucide-react';
import type {
  PosCashRegisterCreatePayload,
  PosWarehouseSummary,
} from '../services/posBackendApi';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface CreateCashRegisterModalProps {
  isOpen: boolean;
  warehouses: PosWarehouseSummary[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payload: PosCashRegisterCreatePayload) => void | Promise<void>;
}

const buildDefaultCode = (warehouse?: PosWarehouseSummary) => {
  const base = warehouse?.warehouseCode || warehouse?.name || 'POS';
  return `${base.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase() || 'POS'}-01`;
};

export function CreateCashRegisterModal({
  isOpen,
  warehouses,
  isSubmitting,
  onClose,
  onConfirm,
}: CreateCashRegisterModalProps) {
  const firstWarehouse = warehouses[0];
  const [warehouseId, setWarehouseId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => String(warehouse.id) === warehouseId),
    [warehouseId, warehouses],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultWarehouse = firstWarehouse;
    setWarehouseId(defaultWarehouse ? String(defaultWarehouse.id) : '');
    setCode(buildDefaultCode(defaultWarehouse));
    setName(defaultWarehouse ? `Caja ${defaultWarehouse.name}` : 'Caja POS');
    setError('');
  }, [firstWarehouse, isOpen]);

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const nextWarehouseId = Number(warehouseId);
    const nextCode = code.trim().toUpperCase();
    const nextName = name.trim();

    if (!Number.isFinite(nextWarehouseId) || nextWarehouseId <= 0) {
      setError('Selecciona un almacen para operar esta caja.');
      return;
    }

    if (!nextCode) {
      setError('Agrega un codigo operativo para la caja.');
      return;
    }

    if (!nextName) {
      setError('Agrega un nombre claro para la caja.');
      return;
    }

    void onConfirm({
      warehouseId: nextWarehouseId,
      code: nextCode,
      name: nextName,
      status: 'ACTIVE',
      active: true,
      notes: 'Caja creada desde configuracion inicial POS.',
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar configuracion de caja"
      eyebrow="Configuración POS"
      icon={<Monitor className="h-6 w-6" />}
      isCloseDisabled={isSubmitting}
      onClose={onClose}
      size="md"
      subtitle="Vincula la caja a un almacén para poder abrir el turno."
      title="Crear caja POS"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || warehouses.length === 0}
            className={posModalPrimaryActionClassName}
          >
            <CheckCircle className="h-5 w-5" />
            {isSubmitting ? 'Creando caja...' : 'Crear caja'}
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
          Cada caja opera desde un almacen. El inventario y los cierres POS usan esa relacion como base operativa.
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Almacen
          </label>
          <div className="relative">
            <Warehouse className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              disabled={isSubmitting || warehouses.length === 0}
              className="min-h-14 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                  {warehouse.businessName ? ` - ${warehouse.businessName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {selectedWarehouse?.unitName || selectedWarehouse?.businessName
              ? `${selectedWarehouse.unitName ?? 'Unidad no asignada'} - ${selectedWarehouse.businessName ?? 'Negocio no asignado'}`
              : 'La caja heredara la unidad y negocio del almacen seleccionado.'}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Codigo de caja
            </label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isSubmitting}
              maxLength={64}
              placeholder="POS-01"
              className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nombre de caja
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              maxLength={160}
              placeholder="Caja principal"
              className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </section>
      </div>
    </PosModalFrame>
  );
}
