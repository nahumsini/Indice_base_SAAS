import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';

type PointOfSaleTablePaginationProps = {
  attached?: boolean;
  className?: string;
  currentPage: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
};

export function PointOfSaleTablePagination({
  attached = true,
  itemLabel = 'registros',
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  ...paginationProps
}: PointOfSaleTablePaginationProps) {
  return (
    <DataTablePagination
      attached={attached}
      itemLabel={itemLabel}
      labels={{
        next: 'Siguiente',
        page: (currentPage, totalPages) => `${currentPage} / ${totalPages}`,
        previous: 'Anterior',
        rowsPerPage: 'Filas por pagina',
        showing: (pageStart, pageEnd, totalCount, label) => (
          `Mostrando ${pageStart}-${pageEnd} de ${totalCount} ${label}`
        ),
      }}
      pageSizeOptions={pageSizeOptions}
      {...paginationProps}
    />
  );
}
