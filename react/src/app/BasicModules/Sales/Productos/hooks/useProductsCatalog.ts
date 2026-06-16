import { useCallback, useMemo, useState, type SetStateAction } from 'react';
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
  normalizeProductCategoryDirectory,
} from '../utils/productCategories';
import { getProductGalleryImages, persistProductImageDrafts, registerPersistedProductImages } from '../utils/productImages';
import { buildProductForm, buildProductInput, initialProductForm } from '../utils/productForm';
import { sortProducts } from '../utils/productFormatters';
import { getProductAvailability, getProductInventoryValue, getProductProfit } from '../utils/productOperationalStatus';

type FilterValue = 'all' | string;
const productCategoriesStorageKey = 'indice.sales.products.categoryDirectory';

function readStoredProductCategories(): ProductCategoryConfig[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(productCategoriesStorageKey);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? normalizeProductCategoryDirectory(parsedValue as ProductCategoryConfig[])
      : [];
  } catch {
    return [];
  }
}

function persistProductCategories(categories: ProductCategoryConfig[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    productCategoriesStorageKey,
    JSON.stringify(normalizeProductCategoryDirectory(categories)),
  );
}

export function useProductsCatalog(t: ProductsTranslations) {
  const {
    products,
    addProduct,
    updateProduct,
    createProductRecord,
    updateProductRecord,
    reloadProducts,
  } = useSalesCrm();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPublicCatalogOpen, setIsPublicCatalogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [managedCategories, setManagedCategoriesState] = useState<ProductCategoryConfig[]>(readStoredProductCategories);
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
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productSaveError, setProductSaveError] = useState<string | null>(null);

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
  const publicCatalogCount = filteredProducts.filter((product) => (
    getProductAvailability(product).includes('sales') && getProductGalleryImages(product).length > 0
  )).length;
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
  const updateManagedCategories = useCallback((nextValue: SetStateAction<ProductCategoryConfig[]>) => {
    setManagedCategoriesState((currentCategories) => {
      const resolvedCategories = typeof nextValue === 'function'
        ? nextValue(currentCategories)
        : nextValue;
      const normalizedCategories = normalizeProductCategoryDirectory(resolvedCategories);

      persistProductCategories(normalizedCategories);
      return normalizedCategories;
    });
  }, []);

  const categoryOptions = [
    { value: 'all', label: t.filters.allCategories },
    ...buildProductCategoryOptions(catalogCategories, t),
  ];
  const defaultCategoryValue = useMemo(
    () => catalogCategories.find((category) => category.isActive)?.value ?? initialProductForm.category,
    [catalogCategories],
  );
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
    setForm({ ...initialProductForm, category: defaultCategoryValue });
  };

  const handleProductModalOpenChange = (open: boolean) => {
    setIsCreateOpen(open);

    if (!open) {
      resetProductModal();
      setProductSaveError(null);
    }
  };

  const handleOpenCreateProduct = () => {
    resetProductModal();
    setProductSaveError(null);
    setIsCreateOpen(true);
  };

  const handleEditProduct = (product: SalesCatalogItem) => {
    setEditingProductId(product.id);
    setForm(buildProductForm(product));
    setProductSaveError(null);
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
    void updateProductRecord(product.id, {
      category: category as SalesCatalogItem['category'],
    }).catch(() => {
      updateProduct(product.id, {
        category: category as SalesCatalogItem['category'],
      });
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
    updateManagedCategories((current) => [...current, nextCategory]);
    setForm((current) => ({ ...current, category: nextCategory.value }));
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      return;
    }

    setIsSavingProduct(true);
    setProductSaveError(null);

    try {
      const uploadedImages = await persistProductImageDrafts(form.uploadedImages);
      const productInput = buildProductInput(
        { ...form, uploadedImages },
        editingProduct?.thumbnailTone ?? 'coral',
      );
      const savedProduct = editingProductId
        ? await updateProductRecord(editingProductId, productInput)
        : await createProductRecord(productInput);
      const persistedProductId = savedProduct.backendId ?? Number(savedProduct.id);

      const hasNewUploads = uploadedImages.some((image) => image.source === 'upload' && image.objectKey);
      if (Number.isFinite(persistedProductId)) {
        await registerPersistedProductImages(persistedProductId, uploadedImages);
        if (hasNewUploads) {
          await reloadProducts();
        }
      }

      handleProductModalOpenChange(false);
    } catch (error) {
      console.warn('[Sales] product image save failed', error);
      setProductSaveError('No se pudo guardar el producto con sus imagenes. Intenta de nuevo.');
    } finally {
      setIsSavingProduct(false);
    }
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
    isSavingProduct,
    isPublicCatalogOpen,
    managedCategories,
    posReadyCount,
    products,
    productSaveError,
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
    setManagedCategories: updateManagedCategories,
    setForm,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    setVisibleColumns,
  };
}
