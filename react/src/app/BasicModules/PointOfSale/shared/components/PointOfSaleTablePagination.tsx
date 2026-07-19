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
  itemLabel,
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  ...paginationProps
}: PointOfSaleTablePaginationProps) {
  return (
    <DataTablePagination
      attached={attached}
      itemLabel={itemLabel}
      pageSizeOptions={pageSizeOptions}
      {...paginationProps}
    />
  );
}
