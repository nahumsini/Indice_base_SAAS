import { useMemo, useState, type FormEvent } from 'react';
import { Search, X, Plus, Barcode } from 'lucide-react';
import { findCatalogProductByBarcode, pointOfSaleCatalogProducts, type Product } from '../../shared/commercial/products';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
}

export function ProductSearchModal({ isOpen, onClose, onAddProduct }: ProductSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState('');
  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(pointOfSaleCatalogProducts.map((product) => product.department))).sort()],
    [],
  );

  const filteredProducts = useMemo(() => {
    let filtered = pointOfSaleCatalogProducts;

    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter((product) => product.department === selectedCategory);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(search) ||
        product.barcode.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  const handleBarcodeScan = (e: FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = findCatalogProductByBarcode(pointOfSaleCatalogProducts, barcodeInput);
    if (product) {
      onAddProduct(product);
      setBarcodeInput('');
      setError('');
    } else {
      setError('Producto no encontrado.');
      setBarcodeInput('');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleAddProduct = (product: Product) => {
    onAddProduct(product);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Buscar Productos</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Barcode Scanner */}
          <form onSubmit={handleBarcodeScan} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear código de barras..."
                className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Buscar
            </button>
          </form>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="p-5 bg-gray-50 dark:bg-gray-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-2 border-gray-200 dark:border-gray-600 hover:border-orange-500 rounded-xl transition-all text-left group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {product.barcode}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      product.currentStock > 50
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : product.currentStock > 20
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      Stock: {product.currentStock}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(product.salePrice)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Costo: {formatCurrency(product.costPrice)}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
