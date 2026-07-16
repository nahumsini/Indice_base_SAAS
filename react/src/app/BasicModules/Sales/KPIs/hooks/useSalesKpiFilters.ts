import { useEffect, useState } from 'react';

export function useSalesKpiFilters() {
  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [businessFilter, businessUnitFilter, pageSize, search, sellerFilter]);

  return {
    businessFilter,
    businessUnitFilter,
    page,
    pageSize,
    search,
    sellerFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setPage,
    setPageSize,
    setSearch,
    setSellerFilter,
  };
}
