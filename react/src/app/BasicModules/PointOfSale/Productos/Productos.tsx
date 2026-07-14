import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertCircle, TrendingUp, DollarSign, Box, Layers } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { buildSalesProductInputFromPointOfSale, buildSalesProductPatchFromPointOfSale } from '../../CommerceCore/posProductMutations';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { type Product, type ProductStatus } from '../shared/commercial/products';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../shared/components/PointOfSaleTitleBar';
import { AddProductModal } from './components/AddProductModal';
import { AddCompositeProductModal } from './components/AddCompositeProductModal';

export default function Productos() {
  const { createProductRecord, updateProductRecord, reloadProducts } = useSalesCrm();
  const {
    balanceLoadError,
    isLoadingInventoryBalances,
    products: sharedProducts,
    saleCurrency,
  } = usePointOfSaleCatalogProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompositeModal, setShowCompositeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [productPendingDeletion, setProductPendingDeletion] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const products = sharedProducts;

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(products.map(p => p.department));
    return Array.from(depts).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || product.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [products, searchTerm, statusFilter, departmentFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.status === 'active').length;
    const lowStock = products.filter(p => p.useInventory && p.currentStock < p.minStock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
    const avgMargin = products.length === 0 ? 0 : products.reduce((sum, p) => sum + p.profitMargin, 0) / products.length;

    return { total, active, lowStock, totalValue, avgMargin };
  }, [products]);

  const formatCurrency = (amount: number, currency = saleCurrency) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getSaleTypeLabel = (type: Product['saleType']) => {
    const labels = {
      unit: 'Por Unidad',
      bulk: 'A Granel',
      package: 'Paquete',
    };
    return labels[type];
  };

  const getStockStatus = (product: Product) => {
    if (!product.useInventory) return { label: 'N/A', color: 'gray' };
    if (product.currentStock < product.minStock) return { label: 'Bajo', color: 'red' };
    if (product.currentStock >= product.maxStock) return { label: 'Alto', color: 'blue' };
    return { label: 'Normal', color: 'green' };
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    const productId = productData.id ?? selectedProduct?.id;
    const currentProduct = productId ? products.find((product) => product.id === productId) : undefined;
    setIsSavingProduct(true);
    setNotice('');

    try {
      if (currentProduct) {
        const updatedProduct: Product = {
          ...currentProduct,
          ...productData,
          id: currentProduct.id,
          source: 'sales',
          createdAt: currentProduct.createdAt,
          updatedAt: new Date(),
        };

        await updateProductRecord(
          currentProduct.salesProductId ?? currentProduct.id,
          buildSalesProductPatchFromPointOfSale(updatedProduct, saleCurrency),
        );
        setNotice('Producto actualizado en catálogo maestro y preparado para POS.');
        await reloadProducts();
        return;
      }

      const newProduct: Product = {
        id: `product-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: saleCurrency,
        source: 'sales',
        ...productData as Product,
      };
      await createProductRecord(buildSalesProductInputFromPointOfSale(newProduct, saleCurrency));
      setNotice('Producto creado en catálogo maestro y preparado para POS.');
      await reloadProducts();
    } catch (error) {
      console.warn('[PointOfSale] Product could not be synced with Sales catalog.', error);
      setNotice('No se pudo sincronizar el producto con el catálogo maestro de Sales.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product.isComposite) {
      setShowCompositeModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const product = products.find((item) => item.id === id);
    if (!product) {
      return;
    }

    setIsSavingProduct(true);
    setNotice('');

    try {
      await updateProductRecord(product.salesProductId ?? product.id, {
        visibility: 'Internal',
        posPrepared: false,
      });
      setNotice('Producto retirado del catálogo operativo POS sin borrar el registro maestro.');
      await reloadProducts();
    } catch (error) {
      console.warn('[PointOfSale] Product could not be removed from POS catalog.', error);
      setNotice('No se pudo retirar el producto del catálogo operativo POS.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      <PointOfSaleTitleBar
        eyebrow="Catálogo POS"
        icon="🏷️"
        rhIndent
        title="Productos"
        subtitle="Catálogo compartido con Sales, optimizado para códigos, precios, disponibilidad y venta rápida."
        actions={(
          <>
          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowCompositeModal(true);
            }}
            disabled={isSavingProduct}
            className={pointOfSaleTitleBarSecondaryActionClassName}
          >
            <Layers className="w-4 h-4" />
            Producto compuesto
          </button>
          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowAddModal(true);
            }}
            disabled={isSavingProduct}
            className={pointOfSaleTitleBarPrimaryActionClassName}
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </button>
          </>
        )}
      />

      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {notice}
        </div>
      )}

      {isLoadingInventoryBalances && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          Sincronizando catálogo compartido de Sales e inventario disponible para POS.
        </div>
      )}

      {balanceLoadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {balanceLoadError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total productos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stock bajo</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Valor inventario</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(kpis.totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#C64237] dark:text-[#FFB5AE]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ganancia promedio</p>
              <p className="text-2xl font-bold text-[#C64237] dark:text-[#FFB5AE]">
                {kpis.avgMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar producto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, código de barras o descripción..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Departamento
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
            >
              <option value="all">Todos</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Código de Barras
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Departamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Tipo Venta
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Precio Costo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Ganancia
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Precio Venta
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {isLoadingInventoryBalances
                        ? 'Sincronizando catálogo compartido de Sales'
                        : searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
                        ? 'No se encontraron productos'
                        : 'No hay productos registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                        {product.barcode}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                            {product.isComposite && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#FF6B5E]/10 text-[#A7352C] dark:bg-[#FF6B5E]/10 dark:text-[#FFB5AE]">
                                <Layers className="w-3 h-3" />
                                Compuesto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.description}</p>
                          {product.isComposite && product.components && (
                            <p className="text-xs text-[#C64237] dark:text-[#FFB5AE] mt-1">
                              {product.components.length} componente{product.components.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {product.department}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {getSaleTypeLabel(product.saleType)}
                        </span>
                      </td>
	                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
	                        {formatCurrency(product.costPrice, product.currency)}
	                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#C64237] dark:text-[#FFB5AE]">
                        {product.profitMargin.toFixed(2)}%
                      </td>
	                      <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
	                        {formatCurrency(product.salePrice, product.currency)}
	                      </td>
                      <td className="px-4 py-3">
                        {product.useInventory ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              stockStatus.color === 'red'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : stockStatus.color === 'blue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {product.currentStock}
                            </span>
                            {stockStatus.color === 'red' && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {product.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            disabled={isSavingProduct}
                            className="p-1.5 text-[#C64237] hover:bg-[#FF6B5E]/10 dark:hover:bg-[#FF6B5E]/10 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductPendingDeletion(product)}
                            disabled={isSavingProduct}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filteredProducts.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {filteredProducts.length} de {products.length} producto{products.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedProduct(undefined);
        }}
        onSave={handleAddProduct}
        product={selectedProduct}
      />

      {/* Add/Edit Composite Product Modal */}
      <AddCompositeProductModal
        isOpen={showCompositeModal}
        onClose={() => {
          setShowCompositeModal(false);
          setSelectedProduct(undefined);
        }}
        onSave={handleAddProduct}
        availableProducts={products}
        product={selectedProduct}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(productPendingDeletion)}
        title="Retirar producto de POS"
        itemName={productPendingDeletion?.name}
        description="El producto se retirara del catalogo operativo POS, pero no se borrara del catalogo maestro de Sales."
        cancelLabel="Cancelar"
        confirmDisabled={isSavingProduct}
        confirmLabel="Retirar producto"
        onCancel={() => setProductPendingDeletion(null)}
        onConfirm={() => {
          if (productPendingDeletion) {
            void handleDeleteProduct(productPendingDeletion.id);
          }
          setProductPendingDeletion(null);
        }}
      />
    </div>
  );
}
