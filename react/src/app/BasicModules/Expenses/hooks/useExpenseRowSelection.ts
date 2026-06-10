import { useCallback, useMemo, useState } from 'react';

export function useExpenseRowSelection<TId extends string>() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<TId>>(() => new Set<TId>());

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set<TId>());
  }, []);

  const isSelected = useCallback((id: TId) => selectedIds.has(id), [selectedIds]);

  const toggleSelection = useCallback((id: TId, checked?: boolean) => {
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

  const toggleAllVisible = useCallback((visibleIds: readonly TId[], checked?: boolean) => {
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

  const pruneSelection = useCallback((loadedIds: readonly TId[]) => {
    const loadedIdSet = new Set(loadedIds);

    setSelectedIds((currentIds) => {
      const nextIds = new Set(Array.from(currentIds).filter((id) => loadedIdSet.has(id)));
      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, []);

  const visibleSelectionState = useCallback((visibleIds: readonly TId[]) => {
    const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;

    return {
      allVisibleSelected: visibleIds.length > 0 && selectedVisibleCount === visibleIds.length,
      selectedVisibleCount,
      someVisibleSelected: selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length,
    };
  }, [selectedIds]);

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
