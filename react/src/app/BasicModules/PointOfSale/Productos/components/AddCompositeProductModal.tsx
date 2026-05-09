import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { Product, ProductComponent } from '../types/product.types';

interface AddCompositeProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  availableProducts: Product[];
  product?: Product;
}

export function AddCompositeProductModal({
  isOpen,
  onClose,
  onSave,
  availableProducts,
  product
}: AddCompositeProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
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
  });

  const [selectedComponents, setSelectedComponents] = useState<ProductComponent[]>([]);

  // Filter only simple products (non-composite)
  const simpleProducts = useMemo(() => {
    return availableProducts.filter(p => !p.isComposite && p.status === 'active');
  }, [availableProducts]);

  useEffect(() => {
    if (product && product.isComposite) {
      setFormData(product);
      setSelectedComponents(product.components || []);
    } else {
      setFormData({
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
      });
      setSelectedComponents([]);
    }
  }, [product, isOpen]);

  // Calculate total cost from components
  const calculatedCost = useMemo(() => {
    return selectedComponents.reduce((total, comp) => {
      const product = simpleProducts.find(p => p.id === comp.productId);
      if (product) {
        return total + (product.costPrice * comp.quantity);
      }
      return total;
    }, 0);
  }, [selectedComponents, simpleProducts]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      costPrice: calculatedCost,
      salePrice: calculatedCost * (1 + (prev.profitMargin || 0) / 100),
    }));
  }, [calculatedCost]);

  const handleAddComponent = () => {
    if (simpleProducts.length > 0) {
      setSelectedComponents([
        ...selectedComponents,
        { productId: simpleProducts[0].id, quantity: 1 }
      ]);
    }
  };

  const handleRemoveComponent = (index: number) => {
    setSelectedComponents(selectedComponents.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const newComponents = [...selectedComponents];
    if (field === 'productId') {
      newComponents[index].productId = value as string;
    } else {
      newComponents[index].quantity = parseFloat(value as string) || 0;
    }
    setSelectedComponents(newComponents);
  };

  const getProductById = (id: string) => {
    return simpleProducts.find(p => p.id === id);
  };

  const calculateSalePrice = (cost: number, margin: number) => {
    return cost * (1 + margin / 100);
  };

  const calculateMargin = (cost: number, sale: number) => {
    if (cost === 0) return 0;
    return ((sale - cost) / cost) * 100;
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

    if (selectedComponents.length === 0) {
      alert('Debes agregar al menos un producto componente');
      return;
    }

    const productData = {
      ...formData,
      components: selectedComponents,
      costPrice: calculatedCost,
    };

    onSave(productData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {product ? 'Editar Producto Compuesto' : 'Nuevo Producto Compuesto'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Components Section */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Productos Componentes
                </h3>
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar producto
                </button>
              </div>

              {selectedComponents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay productos agregados. Agrega productos para crear el compuesto.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedComponents.map((component, index) => {
                    const product = getProductById(component.productId);
                    const subtotal = product ? product.costPrice * component.quantity : 0;

                    return (
                      <div key={index} className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex-1">
                          <select
                            value={component.productId}
                            onChange={(e) => handleComponentChange(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            required
                          >
                            {simpleProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} - {p.barcode} (Stock: {p.currentStock})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-32">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={component.quantity}
                            onChange={(e) => handleComponentChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            placeholder="Cantidad"
                            required
                          />
                        </div>

                        <div className="w-32 text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${subtotal.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${product?.costPrice.toFixed(2)} c/u
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="border-t-2 border-purple-200 dark:border-purple-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Costo Total del Producto:
                      </span>
                      <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        ${calculatedCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="750105317394"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Kits y Paquetes"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Kit de Limpieza Completo"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Descripción del producto compuesto"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Precio Costo (calculado)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={calculatedCost.toFixed(2)}
                    readOnly
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
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
                    className="w-full pr-8 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Nota:</strong> Al vender este producto compuesto, se descontará automáticamente el inventario
                de cada producto componente según las cantidades especificadas. Los productos compuestos no manejan
                su propio inventario.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            {product ? 'Guardar cambios' : 'Crear producto compuesto'}
          </button>
        </div>
      </div>
    </div>
  );
}
