import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertCircle, TrendingUp, DollarSign, Box, Layers } from 'lucide-react';
import { buildSalesProductInputFromPointOfSale, buildSalesProductPatchFromPointOfSale } from '../../CommerceCore/posProductMutations';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { type Product, type ProductStatus } from '../shared/commercial/products';
import { AddProductModal } from './components/AddProductModal';
import { AddCompositeProductModal } from './components/AddCompositeProductModal';

export default function Productos() {
  const { addProduct, updateProduct } = useSalesCrm();
  const { balanceLoadError, products: sharedProducts, saleCurrency } = usePointOfSaleCatalogProducts();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompositeModal, setShowCompositeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [notice, setNotice] = useState('');

  const products = useMemo(() => {
    const sharedProductIds = new Set(sharedProducts.map((product) => product.id));
    const localProductById = new Map(localProducts.map((product) => [product.id, product]));
    const mergedProducts = [
      ...sharedProducts.map((product) => localProductById.get(product.id) ?? product),
      ...localProducts.filter((product) => !sharedProductIds.has(product.id)),
    ];

    return mergedProducts.filter((product) => !deletedProductIds.includes(product.id));
  }, [deletedProductIds, localProducts, sharedProducts]);

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
    const avgMargin = products.reduce((sum, p) => sum + p.profitMargin, 0) / products.length;

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

  const handleAddProduct = (productData: Partial<Product>) => {
    const productId = productData.id ?? selectedProduct?.id;
    const currentProduct = productId ? products.find((product) => product.id === productId) : undefined;

    if (currentProduct) {
      const updatedProduct: Product = {
        ...currentProduct,
        ...productData,
        id: currentProduct.id,
        source: currentProduct.source,
        createdAt: currentProduct.createdAt,
        updatedAt: new Date(),
      };

      if (currentProduct.source === 'sales') {
        updateProduct(
          currentProduct.salesProductId ?? currentProduct.id,
          buildSalesProductPatchFromPointOfSale(updatedProduct, saleCurrency),
        );
        setNotice('Producto actualizado en catálogo maestro y preparado para POS.');
      } else {
        setLocalProducts((current) => [
          updatedProduct,
          ...current.filter((product) => product.id !== updatedProduct.id),
        ]);
        setNotice('Producto local POS actualizado.');
      }
      return;
    }

    const newProduct: Product = {
      id: `product-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: saleCurrency,
      source: 'pos_mock',
      ...productData as Product,
    };
    addProduct(buildSalesProductInputFromPointOfSale(newProduct, saleCurrency));
    setNotice('Producto creado en catálogo maestro y preparado para POS.');
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product.isComposite) {
      setShowCompositeModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const product = products.find((item) => item.id === id);
    if (product?.source === 'sales') {
      updateProduct(product.salesProductId ?? product.id, {
        visibility: 'Internal',
        posPrepared: false,
      });
      setNotice('Producto retirado del catálogo operativo POS sin borrar el registro maestro.');
      return;
    }

    setLocalProducts((current) => current.filter((product) => product.id !== id));
    setDeletedProductIds((current) => Array.from(new Set([...current, id])));
    setNotice('Producto oculto del catálogo operativo POS.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🛍️ Productos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu catálogo de productos e inventario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowCompositeModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all shadow-sm"
          >
            <Layers className="w-4 h-4" />
            Agregar producto compuesto
          </button>
          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {notice}
        </div>
      )}

      {balanceLoadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {balanceLoadError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ganancia promedio</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {kpis.avgMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                      {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <Layers className="w-3 h-3" />
                                Compuesto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.description}</p>
                          {product.isComposite && product.components && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
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
                      <td className="px-4 py-3 text-sm font-semibold text-purple-600 dark:text-purple-400">
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
                            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
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
    </div>
  );
}
