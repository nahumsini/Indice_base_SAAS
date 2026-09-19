export interface HrCollectionResponse<TItem> {
  items: TItem[];
  count?: number;
  page?: number;
  size?: number;
  total_count?: number;
  total_pages?: number;
}

export class IncompleteHrKpiSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompleteHrKpiSourceError';
  }
}

/**
 * Loads a complete source without assuming every HR endpoint implements paging.
 * Non-paginated permission responses stop after the first complete response;
 * paginated assets/records are deduplicated and fail closed if metadata and rows
 * cannot be reconciled.
 */
export async function loadCompleteHrCollection<
  TItem,
  TResponse extends HrCollectionResponse<TItem>,
>({
  fetchPage,
  itemKey,
  pageSize,
}: {
  fetchPage: (page: number, size: number) => Promise<TResponse>;
  itemKey: (item: TItem) => string | number;
  pageSize: number;
}): Promise<TResponse> {
  const firstPage = await fetchPage(1, pageSize);
  const uniqueItems = new Map<string | number, TItem>();
  firstPage.items.forEach((item) => uniqueItems.set(itemKey(item), item));

  const declaredTotal = firstPage.total_count ?? firstPage.count ?? firstPage.items.length;
  if (uniqueItems.size >= declaredTotal) {
    return {
      ...firstPage,
      items: [...uniqueItems.values()],
      count: uniqueItems.size,
      total_count: declaredTotal,
    };
  }

  const declaredPages = firstPage.total_pages;
  if (declaredPages == null) {
    throw new IncompleteHrKpiSourceError(
      `HR KPI source returned ${uniqueItems.size} of ${declaredTotal} rows without pagination metadata.`,
    );
  }

  for (let page = 2; page <= declaredPages && uniqueItems.size < declaredTotal; page += 1) {
    const before = uniqueItems.size;
    const nextPage = await fetchPage(page, pageSize);
    nextPage.items.forEach((item) => uniqueItems.set(itemKey(item), item));
    if (uniqueItems.size === before && nextPage.items.length > 0) {
      throw new IncompleteHrKpiSourceError(`HR KPI source repeated page ${page}.`);
    }
  }

  if (uniqueItems.size < declaredTotal) {
    throw new IncompleteHrKpiSourceError(
      `HR KPI source returned ${uniqueItems.size} of ${declaredTotal} declared rows.`,
    );
  }

  return {
    ...firstPage,
    items: [...uniqueItems.values()],
    count: uniqueItems.size,
    total_count: declaredTotal,
  };
}
