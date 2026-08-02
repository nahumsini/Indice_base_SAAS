import { useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesCatalogItem } from '../../types';
import { useProductRowSelection } from '../hooks/useProductRowSelection';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';
import type { ProductSortColumn, ProductSortState } from '../types/productosTypes';
import { buildProductCategoryOptions } from '../utils/productCategories';
import type { ProductTableColumnId } from './ProductsColumnsModal';
import { ProductBulkActionsBar } from './ProductBulkActionsBar';
import { ProductTableHeader, type ProductColumn } from './ProductTableHeader';
import { ProductTableRow } from './ProductTableRow';

export function ProductsCatalogTable({
  products,
  categories,
  t,
  sortState,
  onSort,
  onViewProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onToggleProductStatus,
  onUpdateProductCategory,
  onUpdateProductStatus,
  onBulkSetProductStatus,
  onBulkMarkAvailableForSales,
  onBulkRemoveFromPublicCatalog,
  visibleColumns = [],
}: {
  products: SalesCatalogItem[];
  categories: ProductCategoryConfig[];
  t: ProductsTranslations;
  sortState: ProductSortState;
  onSort: (columnId: ProductSortColumn) => void;
  onViewProduct: (product: SalesCatalogItem) => void;
  onEditProduct: (product: SalesCatalogItem) => void;
  onDuplicateProduct: (product: SalesCatalogItem) => void;
  onDeleteProduct: (product: SalesCatalogItem) => void;
  onToggleProductStatus: (product: SalesCatalogItem) => void;
  onUpdateProductCategory: (product: SalesCatalogItem, category: string) => void;
  onUpdateProductStatus: (product: SalesCatalogItem, status: SalesCatalogItem['status']) => void;
  onBulkSetProductStatus: (productIds: string[], status: 'Active' | 'Inactive') => void;
  onBulkMarkAvailableForSales: (productIds: string[]) => void;
  onBulkRemoveFromPublicCatalog: (productIds: string[]) => void;
  visibleColumns?: ProductTableColumnId[];
}) {
  const rowSelection = useProductRowSelection();
  const allProductIds = useMemo(() => products.map((product) => product.id), [products]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedProducts,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${sortState.columnId}:${sortState.direction}:${products.map((product) => product.id).join('|')}`,
    rows: products,
  });
  const visibleProductIds = useMemo(() => paginatedProducts.map((product) => product.id), [paginatedProducts]);
  const visibleSelection = useMemo(
    () => rowSelection.visibleSelectionState(visibleProductIds),
    [rowSelection, visibleProductIds],
  );
  const selectedProducts = useMemo(
    () => products.filter((product) => rowSelection.selectedIds.has(product.id)),
    [products, rowSelection.selectedIds],
  );
  const selectedProductIds = useMemo(() => selectedProducts.map((product) => product.id), [selectedProducts]);
  const categoryOptions = useMemo(
    () => buildProductCategoryOptions(categories, t),
    [categories, t],
  );
  const columns = useMemo<ProductColumn[]>(() => [
    { id: 'name', sortColumn: 'name', label: t.table.columns.item, className: 'w-[500px]' },
    ...(visibleColumns.includes('sku') ? [{ id: 'sku', sortColumn: 'sku' as ProductSortColumn, label: t.table.columns.sku, className: 'w-[220px]' }] : []),
    ...(visibleColumns.includes('category') ? [{ id: 'category', sortColumn: 'category' as ProductSortColumn, label: t.table.columns.category, className: 'w-[220px]' }] : []),
    ...(visibleColumns.includes('type') ? [{ id: 'type', sortColumn: 'type' as ProductSortColumn, label: t.table.columns.type, className: 'w-[150px]' }] : []),
    ...(visibleColumns.includes('price') ? [{ id: 'price', sortColumn: 'price' as ProductSortColumn, label: t.table.columns.price, className: 'w-[130px]' }] : []),
    ...(visibleColumns.includes('cost') ? [{ id: 'cost', sortColumn: 'cost' as ProductSortColumn, label: t.table.columns.cost, className: 'w-[130px]' }] : []),
    ...(visibleColumns.includes('profit') ? [{ id: 'profit', sortColumn: 'profit' as ProductSortColumn, label: t.table.columns.profit, className: 'w-[150px]' }] : []),
    ...(visibleColumns.includes('status') ? [{ id: 'status', sortColumn: 'status' as ProductSortColumn, label: t.table.columns.status, className: 'w-[150px]' }] : []),
    ...(visibleColumns.includes('visibility') ? [{ id: 'visibility', label: t.table.columns.visibility, className: 'w-[150px]' }] : []),
    ...(visibleColumns.includes('availableIn') ? [{ id: 'availableIn', label: t.table.columns.availableIn, className: 'w-[210px]' }] : []),
    ...(visibleColumns.includes('lastUpdated') ? [{ id: 'lastUpdated', sortColumn: 'lastUpdated' as ProductSortColumn, label: t.table.columns.updated, className: 'w-[150px]' }] : []),
  ], [t, visibleColumns]);

  useEffect(() => {
    rowSelection.pruneSelection(allProductIds);
  }, [allProductIds, rowSelection]);

  const runBulkAction = (action: (ids: string[]) => void) => {
    if (selectedProductIds.length === 0) {
      return;
    }

    action(selectedProductIds);
    rowSelection.clearSelection();
  };

  return (
    <div className="space-y-3">
      <ProductBulkActionsBar
        selectedCount={rowSelection.selectedCount}
        t={t}
        onSetActive={() => runBulkAction((ids) => onBulkSetProductStatus(ids, 'Active'))}
        onSetInactive={() => runBulkAction((ids) => onBulkSetProductStatus(ids, 'Inactive'))}
        onMarkAvailableForSales={() => runBulkAction(onBulkMarkAvailableForSales)}
        onRemoveFromPublicCatalog={() => runBulkAction(onBulkRemoveFromPublicCatalog)}
        onClearSelection={rowSelection.clearSelection}
      />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table className="min-w-[1860px] table-fixed">
            <TableHeader>
              <ProductTableHeader
                columns={columns}
                sortState={sortState}
                t={t}
                allVisibleSelected={visibleSelection.allVisibleSelected}
                someVisibleSelected={visibleSelection.someVisibleSelected}
                onSort={onSort}
                onToggleAllVisible={(checked) => rowSelection.toggleAllVisible(visibleProductIds, checked)}
              />
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 3} className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.map((product) => (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  selected={rowSelection.isSelected(product.id)}
                  visibleColumns={visibleColumns}
                  categoryOptions={categoryOptions}
                  t={t}
                  onSelectionChange={(checked) => rowSelection.toggleSelection(product.id, checked)}
                  onViewProduct={onViewProduct}
                  onEditProduct={onEditProduct}
                  onDuplicateProduct={onDuplicateProduct}
                  onDeleteProduct={onDeleteProduct}
                  onToggleProductStatus={onToggleProductStatus}
                  onUpdateProductCategory={onUpdateProductCategory}
                  onUpdateProductStatus={onUpdateProductStatus}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={currentPage}
          itemLabel="productos"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
