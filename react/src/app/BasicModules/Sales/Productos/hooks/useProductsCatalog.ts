import { useMemo, useState } from 'react';
import {
  productStatuses,
  productTypes,
  useSalesCrm,
} from '../../salesCrmContext';
import type { SalesCatalogItem } from '../../types';
import { defaultProductTableVisibleColumns, type ProductTableColumnId } from '../table/ProductsColumnsModal';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';
import type { ProductFormState, ProductSortColumn, ProductSortState, ProductView } from '../types/productosTypes';
import {
  buildCatalogProductCategories,
  buildProductCategoryOptions,
  createProductCategory,
} from '../utils/productCategories';
import { buildProductForm, buildProductInput, initialProductForm } from '../utils/productForm';
import { sortProducts } from '../utils/productFormatters';
import { getProductAvailability, getProductInventoryValue, getProductProfit } from '../utils/productOperationalStatus';

type FilterValue = 'all' | string;

export function useProductsCatalog(t: ProductsTranslations) {
  const { products, addProduct, updateProduct } = useSalesCrm();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPublicCatalogOpen, setIsPublicCatalogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [managedCategories, setManagedCategories] = useState<ProductCategoryConfig[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [carouselProduct, setCarouselProduct] = useState<SalesCatalogItem | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [activeView, setActiveView] = useState<ProductView>('table');
  const [sortState, setSortState] = useState<ProductSortState>({ columnId: 'name', direction: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState<ProductTableColumnId[]>(defaultProductTableVisibleColumns);
  const [form, setForm] = useState<ProductFormState>(initialProductForm);

  const availableProducts = useMemo(
    () => products.filter((product) => !deletedProductIds.includes(product.id)),
    [deletedProductIds, products],
  );

  const filteredProducts = useMemo(() => availableProducts.filter((product) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      product.name,
      product.sku,
      product.category,
      product.type,
      product.description,
      product.imageAlt ?? '',
      ...(product.gallery ?? []).map((image) => image.alt ?? ''),
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  }), [availableProducts, categoryFilter, search, statusFilter, typeFilter]);

  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortState), [filteredProducts, sortState]);
  const activeCount = filteredProducts.filter((product) => product.status === 'Active').length;
  const inventoryValue = filteredProducts.reduce((total, product) => total + getProductInventoryValue(product), 0);
  const estimatedProfit = filteredProducts.reduce((total, product) => total + getProductProfit(product), 0);
  const readyForSalesCount = filteredProducts.filter((product) => getProductAvailability(product).includes('sales')).length;
  const posReadyCount = filteredProducts.filter((product) => getProductAvailability(product).includes('pos')).length;
  const publicCatalogCount = filteredProducts.filter((product) => getProductAvailability(product).includes('sales') && Boolean(product.imageUrl || product.gallery?.length)).length;
  const typeCounts = productTypes.map((type) => ({
    type,
    count: filteredProducts.filter((product) => product.type === type).length,
  }));
  const editingProduct = editingProductId ? availableProducts.find((product) => product.id === editingProductId) ?? null : null;
  const existingCategoryValues = useMemo(
    () => availableProducts.map((product) => product.category),
    [availableProducts],
  );
  const catalogCategories = useMemo(
    () => buildCatalogProductCategories({
      t,
      managedCategories,
      extraValues: existingCategoryValues,
    }),
    [existingCategoryValues, managedCategories, t],
  );

  const categoryOptions = [
    { value: 'all', label: t.filters.allCategories },
    ...buildProductCategoryOptions(catalogCategories, t),
  ];
  const typeOptions = [
    { value: 'all', label: t.filters.allTypes },
    ...productTypes.map((type) => ({ value: type, label: t.typeLabels[type] })),
  ];
  const statusOptions = [
    { value: 'all', label: t.filters.allStatuses },
    ...productStatuses.map((status) => ({ value: status, label: t.statusLabels[status] })),
  ];

  const handleSort = (columnId: ProductSortColumn) => {
    setSortState((current) => ({
      columnId,
      direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const resetProductModal = () => {
    setEditingProductId(null);
    setForm(initialProductForm);
  };

  const handleProductModalOpenChange = (open: boolean) => {
    setIsCreateOpen(open);

    if (!open) {
      resetProductModal();
    }
  };

  const handleOpenCreateProduct = () => {
    resetProductModal();
    setIsCreateOpen(true);
  };

  const handleEditProduct = (product: SalesCatalogItem) => {
    setEditingProductId(product.id);
    setForm(buildProductForm(product));
    setIsCreateOpen(true);
  };

  const handleDuplicateProduct = (product: SalesCatalogItem) => {
    const { id: _id, lastUpdated: _lastUpdated, ...productInput } = product;
    const suffix = String(availableProducts.length + 1).padStart(2, '0');

    addProduct({
      ...productInput,
      name: `${product.name} copy`,
      sku: `${product.sku}-COPY-${suffix}`,
    });
  };

  const handleDeleteProduct = (product: SalesCatalogItem) => {
    setDeletedProductIds((current) => Array.from(new Set([...current, product.id])));
    if (carouselProduct?.id === product.id) {
      setCarouselProduct(null);
    }
  };

  const handleToggleProductStatus = (product: SalesCatalogItem) => {
    updateProduct(product.id, {
      status: product.status === 'Active' ? 'Inactive' : 'Active',
    });
  };

  const handleUpdateProductCategory = (product: SalesCatalogItem, category: string) => {
    updateProduct(product.id, {
      category: category as SalesCatalogItem['category'],
    });
  };

  const handleUpdateProductStatus = (product: SalesCatalogItem, status: SalesCatalogItem['status']) => {
    updateProduct(product.id, { status });
  };

  const handleBulkSetProductStatus = (productIds: string[], status: 'Active' | 'Inactive') => {
    productIds.forEach((productId) => updateProduct(productId, { status }));
  };

  const handleBulkMarkAvailableForSales = (productIds: string[]) => {
    productIds.forEach((productId) => {
      const product = availableProducts.find((item) => item.id === productId);

      updateProduct(productId, {
        status: 'Active',
        ...(product?.visibility === 'Internal' ? { visibility: 'Commercial' as const } : {}),
      });
    });
  };

  const handleBulkRemoveFromPublicCatalog = (productIds: string[]) => {
    productIds.forEach((productId) => updateProduct(productId, { visibility: 'Internal' }));
  };

  const handleQuickCreateCategory = (name: string) => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return;
    }

    const existingCategory = catalogCategories.find((category) => (
      category.value.toLowerCase() === normalizedName.toLowerCase() || category.name.toLowerCase() === normalizedName.toLowerCase()
    ));

    if (existingCategory) {
      setForm((current) => ({ ...current, category: existingCategory.value }));
      return;
    }

    const nextCategory = createProductCategory(normalizedName, managedCategories.length);
    setManagedCategories((current) => [...current, nextCategory]);
    setForm((current) => ({ ...current, category: nextCategory.value }));
  };

  const handleSaveProduct = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      return;
    }

    const productInput = buildProductInput(form, editingProduct?.thumbnailTone ?? 'coral');

    if (editingProductId) {
      updateProduct(editingProductId, productInput);
    } else {
      addProduct(productInput);
    }

    handleProductModalOpenChange(false);
  };

  return {
    activeCount,
    activeView,
    availableProducts,
    carouselProduct,
    catalogCategories,
    categoryFilter,
    categoryOptions,
    editingProductId,
    estimatedProfit,
    filteredProducts,
    form,
    inventoryValue,
    isCategoryManagerOpen,
    isColumnsOpen,
    isCreateOpen,
    isPublicCatalogOpen,
    managedCategories,
    posReadyCount,
    products,
    publicCatalogCount,
    readyForSalesCount,
    search,
    sortedProducts,
    sortState,
    statusFilter,
    statusOptions,
    typeCounts,
    typeFilter,
    typeOptions,
    visibleColumns,
    handleDeleteProduct,
    handleDuplicateProduct,
    handleEditProduct,
    handleOpenCreateProduct,
    handleProductModalOpenChange,
    handleQuickCreateCategory,
    handleSaveProduct,
    handleSort,
    handleToggleProductStatus,
    handleUpdateProductCategory,
    handleUpdateProductStatus,
    handleBulkSetProductStatus,
    handleBulkMarkAvailableForSales,
    handleBulkRemoveFromPublicCatalog,
    setActiveView,
    setCarouselProduct,
    setCategoryFilter,
    setIsCategoryManagerOpen,
    setIsColumnsOpen,
    setIsPublicCatalogOpen,
    setManagedCategories,
    setForm,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    setVisibleColumns,
  };
}
