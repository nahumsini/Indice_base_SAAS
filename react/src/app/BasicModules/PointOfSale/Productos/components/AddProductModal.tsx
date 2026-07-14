import { useState, useEffect } from 'react';
import { Check, Package } from 'lucide-react';
import { Product } from '../types/product.types';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  product?: Product;
}

export function AddProductModal({ isOpen, onClose, onSave, product }: AddProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    barcode: '',
    name: '',
    description: '',
    saleType: 'unit',
    costPrice: 0,
    profitMargin: 0,
    salePrice: 0,
    wholesalePrice: 0,
    department: '',
    supplierId: '',
    taxRate: 16,
    cfdi: '',
    status: 'active',
    useInventory: true,
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    isComposite: false,
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        barcode: '',
        name: '',
        description: '',
        saleType: 'unit',
        costPrice: 0,
        profitMargin: 0,
        salePrice: 0,
        wholesalePrice: 0,
        department: '',
        supplierId: '',
        taxRate: 16,
        cfdi: '',
        status: 'active',
        useInventory: true,
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        isComposite: false,
      });
    }
  }, [product, isOpen]);

  const calculateSalePrice = (cost: number, margin: number) => {
    return cost * (1 + margin / 100);
  };

  const calculateMargin = (cost: number, sale: number) => {
    if (cost === 0) return 0;
    return ((sale - cost) / cost) * 100;
  };

  const handleCostChange = (value: number) => {
    setFormData(prev => {
      const newSalePrice = calculateSalePrice(value, prev.profitMargin || 0);
      return {
        ...prev,
        costPrice: value,
        salePrice: newSalePrice,
      };
    });
  };

  const handleMarginChange = (value: number) => {
    setFormData(prev => {
      const newSalePrice = calculateSalePrice(prev.costPrice || 0, value);
      return {
        ...prev,
        profitMargin: value,
        salePrice: newSalePrice,
      };
    });
  };

  const handleSalePriceChange = (value: number) => {
    setFormData(prev => {
      const newMargin = calculateMargin(prev.costPrice || 0, value);
      return {
        ...prev,
        salePrice: value,
        profitMargin: newMargin,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <PosModalFrame
      closeLabel="Cerrar producto"
      eyebrow="Catalogo POS"
      footerClassName={posModalModuleFooterClassName}
      icon={<Package className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle="Configura codigos, precios e inventario para venta rapida."
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      tone="coral"
      footer={(
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pos-product-form"
            className={posModalPrimaryActionClassName}
          >
            <Check className="h-4 w-4" />
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      )}
    >
        <form id="pos-product-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Código de Barras *
                </label>
                <input
                  type="text"
                  required
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="750105317394"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  CFDI
                </label>
                <input
                  type="text"
                  value={formData.cfdi}
                  onChange={(e) => setFormData({ ...formData, cfdi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="Trapeador"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Descripción *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="Descripción del producto"
                />
              </div>
            </div>

            {/* Sale Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Se vende *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saleType"
                    value="unit"
                    checked={formData.saleType === 'unit'}
                    onChange={(e) => setFormData({ ...formData, saleType: e.target.value as any })}
                    className="w-4 h-4 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Por Unidad/Pza</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saleType"
                    value="bulk"
                    checked={formData.saleType === 'bulk'}
                    onChange={(e) => setFormData({ ...formData, saleType: e.target.value as any })}
                    className="w-4 h-4 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">A Granel (Usa Decimales)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saleType"
                    value="package"
                    checked={formData.saleType === 'package'}
                    onChange={(e) => setFormData({ ...formData, saleType: e.target.value as any })}
                    className="w-4 h-4 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Como paquete (kit)</span>
                </label>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Precio Costo *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Ganancia *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.profitMargin?.toFixed(2)}
                    onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Precio Venta *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.salePrice?.toFixed(2)}
                    onChange={(e) => handleSalePriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Precio Mayoreo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Impuesto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                />
              </div>
            </div>

            {/* Department & Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="Para el hogar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                  placeholder="115"
                />
              </div>
            </div>

            {/* Inventory Section */}
            <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useInventory}
                    onChange={(e) => setFormData({ ...formData, useInventory: e.target.checked })}
                    className="w-4 h-4 text-[#FF6B5E] rounded focus:ring-[#FF6B5E]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Este producto SI utiliza inventario
                  </span>
                </label>
              </div>

              {formData.useInventory && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Hay (en este momento)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Máximo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
    </PosModalFrame>
  );
}
