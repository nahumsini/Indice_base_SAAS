import { useState, useMemo } from 'react';
import { Search, TrendingDown, TrendingUp, Package, AlertTriangle, DollarSign, Activity, History } from 'lucide-react';
import { pointOfSaleCatalogProducts as mockProducts, type Product } from '../shared/commercial/products';
import {
  commercialInventoryMovements as mockMovements,
  getCommercialStockStatus,
  type InventoryMovement,
  type StockStatus,
} from '../shared/commercial/inventory';
import { AdjustInventoryModal } from './components/AdjustInventoryModal';
import { MovementHistoryModal } from './components/MovementHistoryModal';

export default function Inventario() {
  const [products] = useState<Product[]>(mockProducts.filter(p => !p.isComposite));
  const [movements, setMovements] = useState<InventoryMovement[]>(mockMovements);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(products.map(p => p.department));
    return Array.from(depts).sort();
  }, [products]);

  // Get stock status for a product
  const getStockStatus = getCommercialStockStatus;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        product.department.toLowerCase().includes(searchTerm.toLowerCase());

      const status = getStockStatus(product);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || product.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [products, searchTerm, statusFilter, departmentFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
    const lowStock = products.filter(p => getStockStatus(p) === 'bajo').length;
    const outOfStock = products.filter(p => getStockStatus(p) === 'agotado').length;
    const overStock = products.filter(p => getStockStatus(p) === 'exceso').length;

    // Today's movements
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovements = movements.filter(m => {
      const movDate = new Date(m.date);
      movDate.setHours(0, 0, 0, 0);
      return movDate.getTime() === today.getTime();
    });

    const entriesToday = todayMovements.filter(m => m.type === 'entrada').length;
    const exitsToday = todayMovements.filter(m => m.type === 'salida' || m.type === 'venta').length;

    return {
      totalValue,
      lowStock,
      outOfStock,
      overStock,
      entriesToday,
      exitsToday,
      totalMovements: todayMovements.length,
    };
  }, [products, movements]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusColor = (status: StockStatus) => {
    const colors = {
      normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      bajo: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      agotado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      exceso: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[status];
  };

  const getStatusLabel = (status: StockStatus) => {
    const labels = {
      normal: 'Normal',
      bajo: 'Stock Bajo',
      agotado: 'Agotado',
      exceso: 'Exceso',
    };
    return labels[status];
  };

  const handleAdjustInventory = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  const handleViewHistory = (product: Product) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
  };

  const handleSaveAdjustment = (productId: string, newStock: number, movement: Omit<InventoryMovement, 'id'>) => {
    // Update product stock
    const updatedProducts = products.map(p =>
      p.id === productId ? { ...p, currentStock: newStock } : p
    );

    // Add movement
    const newMovement: InventoryMovement = {
      ...movement,
      id: `mov-${Date.now()}`,
    };
    setMovements([newMovement, ...movements]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📦 Inventario
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Control y seguimiento de existencias
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stock bajo</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Agotados</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.outOfStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Exceso stock</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{kpis.overStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entradas hoy</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.entriesToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Salidas hoy</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpis.exitsToday}</p>
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
                placeholder="Nombre, código de barras o departamento..."
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
              Estado de stock
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="normal">Normal</option>
              <option value="bajo">Stock Bajo</option>
              <option value="agotado">Agotado</option>
              <option value="exceso">Exceso</option>
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
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Departamento
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Stock Actual
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Máximo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Valor Stock
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
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
                        ? 'No se encontraron productos'
                        : 'No hay productos en inventario'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const stockValue = product.currentStock * product.costPrice;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                        {product.barcode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {product.department}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        {product.minStock}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        {product.maxStock}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(stockValue)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAdjustInventory(product)}
                            className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium rounded transition-colors"
                            title="Ajustar inventario"
                          >
                            Ajustar
                          </button>
                          <button
                            onClick={() => handleViewHistory(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Ver historial"
                          >
                            <History className="w-4 h-4" />
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
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Valor total filtrado: {formatCurrency(filteredProducts.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0))}
            </p>
          </div>
        )}
      </div>

      {/* Adjust Inventory Modal */}
      {selectedProduct && (
        <AdjustInventoryModal
          isOpen={showAdjustModal}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedProduct(undefined);
          }}
          product={selectedProduct}
          onSave={handleSaveAdjustment}
        />
      )}

      {/* Movement History Modal */}
      {selectedProduct && (
        <MovementHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedProduct(undefined);
          }}
          product={selectedProduct}
          movements={movements.filter(m => m.productId === selectedProduct.id)}
        />
      )}
    </div>
  );
}
