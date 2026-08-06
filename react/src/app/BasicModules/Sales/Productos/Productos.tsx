import { ProductCardsView } from './cards/ProductCardsView';
import { ProductCategoryManagerModal } from './components/ProductCategoryManagerModal';
import { ProductCreateModal } from './components/ProductCreateModal';
import { ProductImageCarouselModal } from './components/ProductImageCarouselModal';
import { ProductsFilters } from './components/ProductsFilters';
import { ProductsHeader } from './components/ProductsHeader';
import { ProductsInsightBar } from './components/ProductsInsightBar';
import { ProductsKpiStrip } from './components/ProductsKpiStrip';
import { ProductsViewTabs } from './components/ProductsViewTabs';
import { useProductsCatalog } from './hooks/useProductsCatalog';
import { PublicCatalogConfigModal } from './publicCatalog/PublicCatalogConfigModal';
import { ProductsCatalogTable } from './table/ProductsCatalogTable';
import { ProductsColumnsModal } from './table/ProductsColumnsModal';
import { useProductsTranslations } from './translations';
import { useMemo } from 'react';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregates } from '../../shared/kpiMonetaryApi';
import { formatBusinessCurrencyAmount } from '../../shared/businessCurrency';

export default function Productos() {
  const t = useProductsTranslations();
  const catalog = useProductsCatalog(t);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const productIds = useMemo(() => catalog.filteredProducts
    .map((product) => product.backendId)
    .filter((id): id is number => Boolean(id)), [catalog.filteredProducts]);
  const { data: monetary } = useKpiMonetaryAggregates(useMemo(() => [
    { key: 'inventory', metric: 'PRODUCT_INVENTORY_VALUE' as const, preferredCurrency, ids: productIds },
    { key: 'profit', metric: 'PRODUCT_ESTIMATED_PROFIT' as const, preferredCurrency, ids: productIds },
  ], [preferredCurrency, productIds]));
  const inventoryValueLabel = formatBusinessCurrencyAmount(monetary.inventory?.preferredTotal ?? 0, preferredCurrency);
  const estimatedProfitLabel = formatBusinessCurrencyAmount(monetary.profit?.preferredTotal ?? 0, preferredCurrency);

  return (
    <section className="space-y-5">
      <ProductsHeader
        t={t}
        onCreateProduct={catalog.handleOpenCreateProduct}
        onOpenCategoryManager={() => catalog.setIsCategoryManagerOpen(true)}
        onOpenColumns={() => catalog.setIsColumnsOpen(true)}
        onOpenPublicCatalog={() => catalog.setIsPublicCatalogOpen(true)}
      />

      <ProductsViewTabs
        activeView={catalog.activeView}
        labels={t.views}
        onViewChange={catalog.setActiveView}
      />

      <ProductsFilters
        t={t}
        search={catalog.search}
        categoryFilter={catalog.categoryFilter}
        typeFilter={catalog.typeFilter}
        statusFilter={catalog.statusFilter}
        categoryOptions={catalog.categoryOptions}
        typeOptions={catalog.typeOptions}
        statusOptions={catalog.statusOptions}
        onSearchChange={catalog.setSearch}
        onCategoryFilterChange={catalog.setCategoryFilter}
        onTypeFilterChange={catalog.setTypeFilter}
        onStatusFilterChange={catalog.setStatusFilter}
      />

      <ProductsKpiStrip
        totalCount={catalog.filteredProducts.length}
        activeCount={catalog.activeCount}
        inventoryValueLabel={inventoryValueLabel}
        estimatedProfitLabel={estimatedProfitLabel}
        readyForSalesCount={catalog.readyForSalesCount}
        posReadyCount={catalog.posReadyCount}
        publicCatalogCount={catalog.publicCatalogCount}
        typeCounts={catalog.typeCounts}
        metricLabels={t.metrics}
        typeLabels={t.typeLabels}
      />

      <ProductsInsightBar
        activeItems={catalog.activeCount}
        inventoryValueLabel={inventoryValueLabel}
        estimatedProfitLabel={estimatedProfitLabel}
        readyForSales={catalog.readyForSalesCount}
        t={t}
      />

      {catalog.activeView === 'table' ? (
        <ProductsCatalogTable
          products={catalog.sortedProducts}
          categories={catalog.catalogCategories}
          t={t}
          sortState={catalog.sortState}
          onSort={catalog.handleSort}
          onViewProduct={catalog.setCarouselProduct}
          onEditProduct={catalog.handleEditProduct}
          onDuplicateProduct={catalog.handleDuplicateProduct}
          onDeleteProduct={catalog.handleDeleteProduct}
          onToggleProductStatus={catalog.handleToggleProductStatus}
          onUpdateProductCategory={catalog.handleUpdateProductCategory}
          onUpdateProductStatus={catalog.handleUpdateProductStatus}
          onBulkSetProductStatus={catalog.handleBulkSetProductStatus}
          onBulkMarkAvailableForSales={catalog.handleBulkMarkAvailableForSales}
          onBulkRemoveFromPublicCatalog={catalog.handleBulkRemoveFromPublicCatalog}
          visibleColumns={catalog.visibleColumns}
        />
      ) : (
        <ProductCardsView
          products={catalog.sortedProducts}
          t={t}
          onEditProduct={catalog.handleEditProduct}
          onDuplicateProduct={catalog.handleDuplicateProduct}
          onDeleteProduct={catalog.handleDeleteProduct}
          onToggleProductStatus={catalog.handleToggleProductStatus}
        />
      )}

      <ProductCreateModal
        open={catalog.isCreateOpen}
        form={catalog.form}
        t={t}
        mode={catalog.editingProductId ? 'edit' : 'create'}
        catalogItems={catalog.products}
        categories={catalog.catalogCategories}
        isSaving={catalog.isSavingProduct}
        saveError={catalog.productSaveError}
        onOpenChange={catalog.handleProductModalOpenChange}
        onFormChange={catalog.setForm}
        onSubmit={catalog.handleSaveProduct}
        onQuickCreateCategory={catalog.handleQuickCreateCategory}
      />

      <ProductCategoryManagerModal
        open={catalog.isCategoryManagerOpen}
        categories={catalog.catalogCategories}
        t={t}
        onOpenChange={catalog.setIsCategoryManagerOpen}
        onCategoriesChange={catalog.setManagedCategories}
      />

      <ProductsColumnsModal
        open={catalog.isColumnsOpen}
        visibleColumns={catalog.visibleColumns}
        t={t}
        onOpenChange={catalog.setIsColumnsOpen}
        onVisibleColumnsChange={catalog.setVisibleColumns}
      />

      <PublicCatalogConfigModal
        open={catalog.isPublicCatalogOpen}
        products={catalog.availableProducts}
        t={t}
        onOpenChange={catalog.setIsPublicCatalogOpen}
      />

      <ProductImageCarouselModal
        product={catalog.carouselProduct}
        open={Boolean(catalog.carouselProduct)}
        initialIndex={0}
        t={t}
        onOpenChange={(open) => {
          if (!open) {
            catalog.setCarouselProduct(null);
          }
        }}
      />
    </section>
  );
}
