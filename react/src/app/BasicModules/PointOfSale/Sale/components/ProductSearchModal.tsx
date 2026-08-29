import { useMemo, useState, type FormEvent } from 'react';
import { Barcode, Plus, Search } from 'lucide-react';
import { findCatalogProductByBarcode, type Product } from '../../shared/commercial/products';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  products: Product[];
  isLoading?: boolean;
  error?: string | null;
  currency?: string;
}

export function ProductSearchModal({
  isOpen,
  onClose,
  onAddProduct,
  products,
  isLoading = false,
  error = null,
  currency = 'MXN',
}: ProductSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanError, setScanError] = useState('');
  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map((product) => product.department))).sort()],
    [products],
  );

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter((product) => product.department === selectedCategory);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(search)
        || product.barcode.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  const handleBarcodeScan = (event: FormEvent) => {
    event.preventDefault();
    if (!barcodeInput.trim()) {
      return;
    }

    const product = findCatalogProductByBarcode(products, barcodeInput);
    if (product) {
      onAddProduct(product);
      setBarcodeInput('');
      setScanError('');
    } else {
      setScanError('Producto no encontrado en el catalogo compartido.');
      setBarcodeInput('');
    }
  };

  const formatCurrency = (amount: number, productCurrency?: string) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: productCurrency || currency,
  }).format(amount);
  const formatQuantity = (amount: number, product: Product) => {
    const normalized = Number(amount.toFixed(3));
    return (product.allowsDecimalQuantity || !Number.isInteger(normalized))
      ? normalized.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : String(normalized);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="operational-workspace"
      closeLabel="Cerrar busqueda de productos"
      eyebrow="Catálogo POS"
      icon={<Search className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle="Busca por código, nombre o categoría y agrega productos al ticket."
      title="Buscar productos"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white/85">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        {(error || scanError) ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error || scanError}
          </div>
        ) : null}

        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <form onSubmit={handleBarcodeScan} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                placeholder="Escanear codigo de barras..."
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-base font-medium text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 rounded-lg bg-[#FF6B5E] px-6 py-3 text-sm font-medium text-[#222831] transition hover:bg-[#ff5a4b]"
            >
              Buscar
            </button>
          </form>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre o codigo..."
              className="min-h-12 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-base font-medium text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`min-h-10 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-[#FF6B5E] text-[#222831] shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Cargando catalogo compartido de Sales...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            No hay productos disponibles para POS con los filtros actuales.
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onAddProduct(product)}
                className="group rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/10 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-[#FF6B5E]/10"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">
                      {product.barcode}
                    </span>
                    <span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${
                      product.currentStock > 50
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : product.currentStock > 20
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      Stock: {formatQuantity(product.currentStock, product)} {product.unitLabel ?? ''}
                    </span>
                  </div>
                  <p className="min-h-[2.5rem] text-sm font-medium text-gray-900 line-clamp-2 dark:text-white">
                    {product.name}
                  </p>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-medium text-[#C64237] dark:text-[#FFB5AE]">
                        {formatCurrency(product.salePrice, product.currency)}
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">/ {product.unitLabel ?? 'uds'}</span>
                      </p>
                      <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                        Costo: {formatCurrency(product.costPrice, product.currency)}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF6B5E] text-[#222831] opacity-0 transition-opacity group-hover:opacity-100">
                      <Plus className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </PosModalFrame>
  );
}
