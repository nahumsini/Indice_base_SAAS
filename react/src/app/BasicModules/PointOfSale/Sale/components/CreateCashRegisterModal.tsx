import { useEffect, useMemo, useState } from 'react';
import { Monitor, Warehouse, X } from 'lucide-react';
import type {
  PosCashRegisterCreatePayload,
  PosWarehouseSummary,
} from '../services/posBackendApi';

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
      setError('Selecciona un almacén para operar esta caja.');
      return;
    }

    if (!nextCode) {
      setError('Agrega un código operativo para la caja.');
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
      notes: 'Caja creada desde configuración inicial POS.',
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-gray-950 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Monitor className="h-6 w-6 text-white" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">Crear caja POS</h2>
              <p className="truncate text-sm font-semibold text-white/70">
                Vincula la caja a un almacén para poder abrir turno.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Cerrar configuración de caja"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
            Cada caja opera desde un almacén. El inventario y los cierres POS usarán esa relación como base operativa.
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
              Almacén
            </label>
            <div className="relative">
              <Warehouse className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                disabled={isSubmitting || warehouses.length === 0}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                    {warehouse.businessName ? ` · ${warehouse.businessName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {selectedWarehouse?.unitName || selectedWarehouse?.businessName
                ? `${selectedWarehouse.unitName ?? 'Unidad no asignada'} · ${selectedWarehouse.businessName ?? 'Negocio no asignado'}`
                : 'La caja heredará la unidad y negocio del almacén seleccionado.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Código de caja
              </label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isSubmitting}
                maxLength={64}
                placeholder="POS-01"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-black uppercase text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                Nombre de caja
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                maxLength={160}
                placeholder="Caja principal"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || warehouses.length === 0}
            className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando caja...' : 'Crear caja'}
          </button>
        </div>
      </div>
    </div>
  );
}
