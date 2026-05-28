import { useCallback, useMemo, useState } from 'react';

type ProductSelectionId = string;

export function useProductRowSelection() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ProductSelectionId>>(() => new Set<ProductSelectionId>());

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set<ProductSelectionId>());
  }, []);

  const isSelected = useCallback((id: ProductSelectionId) => selectedIds.has(id), [selectedIds]);

  const toggleSelection = useCallback((id: ProductSelectionId, checked?: boolean) => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const shouldSelect = checked ?? !nextIds.has(id);

      if (shouldSelect) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }

      return nextIds;
    });
  }, []);

  const toggleAllVisible = useCallback((visibleIds: readonly ProductSelectionId[], checked?: boolean) => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => nextIds.has(id));
      const shouldSelect = checked ?? !allVisibleSelected;

      visibleIds.forEach((id) => {
        if (shouldSelect) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      });

      return nextIds;
    });
  }, []);

  const pruneSelection = useCallback((loadedIds: readonly ProductSelectionId[]) => {
    const loadedIdSet = new Set(loadedIds);

    setSelectedIds((currentIds) => {
      const nextIds = new Set(Array.from(currentIds).filter((id) => loadedIdSet.has(id)));
      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, []);

  const visibleSelectionState = useCallback(
    (visibleIds: readonly ProductSelectionId[]) => {
      const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;

      return {
        allVisibleSelected: visibleIds.length > 0 && selectedVisibleCount === visibleIds.length,
        selectedVisibleCount,
        someVisibleSelected: selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length,
      };
    },
    [selectedIds],
  );

  return {
    clearSelection,
    isSelected,
    pruneSelection,
    selectedCount: selectedIds.size,
    selectedIdList,
    selectedIds,
    toggleAllVisible,
    toggleSelection,
    visibleSelectionState,
  };
}
