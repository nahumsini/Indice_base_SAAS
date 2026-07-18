import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Package, Plus, Trash2 } from 'lucide-react';
import type { Product, ProductComponent } from '../types/product.types';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface AddCompositeProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  availableProducts: Product[];
  product?: Product;
}

const defaultCompositeProduct: Partial<Product> = {
  barcode: '',
  name: '',
  description: '',
  saleType: 'package',
  costPrice: 0,
  profitMargin: 0,
  salePrice: 0,
  wholesalePrice: 0,
  department: '',
  taxRate: 16,
  status: 'active',
  useInventory: false,
  currentStock: 0,
  minStock: 0,
  maxStock: 0,
  isComposite: true,
  components: [],
};

export function AddCompositeProductModal({
  isOpen,
  onClose,
  onSave,
  availableProducts,
  product,
}: AddCompositeProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>(defaultCompositeProduct);
  const [selectedComponents, setSelectedComponents] = useState<ProductComponent[]>([]);
  const [error, setError] = useState('');

  const simpleProducts = useMemo(
    () => availableProducts.filter((candidate) => !candidate.isComposite && candidate.status === 'active'),
    [availableProducts],
  );

  useEffect(() => {
    setError('');
    if (product?.isComposite) {
      setFormData(product);
      setSelectedComponents(product.components || []);
      return;
    }

    setFormData(defaultCompositeProduct);
    setSelectedComponents([]);
  }, [product, isOpen]);

  const calculatedCost = useMemo(() => (
    selectedComponents.reduce((total, component) => {
      const componentProduct = simpleProducts.find((candidate) => candidate.id === component.productId);
      return componentProduct ? total + (componentProduct.costPrice * component.quantity) : total;
    }, 0)
  ), [selectedComponents, simpleProducts]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      costPrice: calculatedCost,
      salePrice: calculatedCost * (1 + (current.profitMargin || 0) / 100),
    }));
  }, [calculatedCost]);

  const handleAddComponent = () => {
    if (simpleProducts.length === 0) {
      setError('No hay productos simples activos disponibles para componer.');
      return;
    }

    setError('');
    setSelectedComponents((current) => [
      ...current,
      { productId: simpleProducts[0].id, quantity: 1 },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setSelectedComponents((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleComponentChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    setSelectedComponents((current) => current.map((component, currentIndex) => {
      if (currentIndex !== index) {
        return component;
      }

      return {
        ...component,
        [field]: field === 'productId' ? value : parseFloat(value as string) || 0,
      };
    }));
  };

  const getProductById = (id: string) => simpleProducts.find((candidate) => candidate.id === id);
  const calculateSalePrice = (cost: number, margin: number) => cost * (1 + margin / 100);
  const calculateMargin = (cost: number, sale: number) => (cost === 0 ? 0 : ((sale - cost) / cost) * 100);

  const handleMarginChange = (value: number) => {
    setFormData((current) => ({
      ...current,
      profitMargin: value,
      salePrice: calculateSalePrice(current.costPrice || 0, value),
    }));
  };

  const handleSalePriceChange = (value: number) => {
    setFormData((current) => ({
      ...current,
      salePrice: value,
      profitMargin: calculateMargin(current.costPrice || 0, value),
    }));
  };

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();

    if (selectedComponents.length === 0) {
      setError('Debes agregar al menos un producto componente.');
      return;
    }

    setError('');
    onSave({
      ...formData,
      components: selectedComponents,
      costPrice: calculatedCost,
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar producto compuesto"
      eyebrow="Catálogo POS"
      icon={<Package className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle="Construye paquetes a partir de productos simples y calcula precio desde componentes."
      title={product ? 'Editar producto compuesto' : 'Nuevo producto compuesto'}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`${selectedComponents.length} componentes · MXN ${Number(formData.salePrice || 0).toFixed(2)}`}
      footer={(
        <button type="submit" form="pos-composite-product-form" className={posModalPrimaryActionClassName}>
          <CheckCircle className="h-5 w-5" />
          {product ? 'Guardar cambios' : 'Crear producto compuesto'}
        </button>
      )}
    >
      <form id="pos-composite-product-form" onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-lg border-2 border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-4 dark:border-[#FF6B5E]/35">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Productos componentes</h3>
            <button
              type="button"
              onClick={handleAddComponent}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FF6B5E] px-3 py-1.5 text-sm font-black text-white transition-colors hover:bg-[#ff5a4b]"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>
          </div>

          {selectedComponents.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <Package className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p className="font-bold">Agrega productos para crear el compuesto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedComponents.map((component, index) => {
                const componentProduct = getProductById(component.productId);
                const subtotal = componentProduct ? componentProduct.costPrice * component.quantity : 0;

                return (
                  <div key={`${component.productId}-${index}`} className="grid gap-3 rounded-lg bg-white p-3 dark:bg-gray-900 md:grid-cols-[1fr_140px_140px_44px] md:items-center">
                    <select
                      value={component.productId}
                      onChange={(event) => handleComponentChange(index, 'productId', event.target.value)}
                      className={fieldClassName}
                      required
                    >
                      {simpleProducts.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} - {candidate.barcode} (Stock: {candidate.currentStock})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={component.quantity}
                      onChange={(event) => handleComponentChange(index, 'quantity', event.target.value)}
                      className={fieldClassName}
                      placeholder="Cantidad"
                      required
                    />

                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white">${subtotal.toFixed(2)}</p>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        ${componentProduct?.costPrice.toFixed(2)} c/u
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(index)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
                      aria-label="Quitar componente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <div className="border-t-2 border-[#FF6B5E]/30 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300">Costo total del producto:</span>
                  <span className="text-xl font-black text-[#C64237] dark:text-[#FFB5AE]">${calculatedCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Codigo de barras">
            <input
              type="text"
              required
              value={formData.barcode}
              onChange={(event) => setFormData({ ...formData, barcode: event.target.value })}
              className={fieldClassName}
              placeholder="750105317394"
            />
          </Field>
          <Field label="Departamento">
            <input
              type="text"
              required
              value={formData.department}
              onChange={(event) => setFormData({ ...formData, department: event.target.value })}
              className={fieldClassName}
              placeholder="Kits y paquetes"
            />
          </Field>
          <Field label="Nombre del producto" className="md:col-span-2">
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className={fieldClassName}
              placeholder="Kit de limpieza completo"
            />
          </Field>
          <Field label="Descripcion" className="md:col-span-2">
            <textarea
              required
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              rows={2}
              className={fieldClassName}
              placeholder="Descripcion del producto compuesto"
            />
          </Field>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Precio costo">
            <MoneyInput value={calculatedCost.toFixed(2)} readOnly />
          </Field>
          <Field label="Ganancia">
            <PercentInput value={formData.profitMargin?.toFixed(2) ?? '0.00'} onChange={(value) => handleMarginChange(value)} />
          </Field>
          <Field label="Precio venta">
            <MoneyInput value={formData.salePrice?.toFixed(2) ?? '0.00'} onChange={(value) => handleSalePriceChange(value)} />
          </Field>
          <Field label="Precio mayoreo">
            <MoneyInput value={String(formData.wholesalePrice ?? 0)} onChange={(value) => setFormData({ ...formData, wholesalePrice: value })} />
          </Field>
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-100">
            Al vender este producto compuesto se descontara automaticamente el inventario de cada componente segun las cantidades especificadas.
          </p>
        </section>
      </form>
    </PosModalFrame>
  );
}

const fieldClassName = 'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white';

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-black text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
      <input
        type="number"
        required={!readOnly}
        min="0"
        step="0.01"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(parseFloat(event.target.value) || 0)}
        className={`${fieldClassName} pl-8 ${readOnly ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
      />
    </div>
  );
}

function PercentInput({ value, onChange }: { value: string; onChange: (value: number) => void }) {
  return (
    <div className="relative">
      <input
        type="number"
        required
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
        className={`${fieldClassName} pr-8`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
    </div>
  );
}
