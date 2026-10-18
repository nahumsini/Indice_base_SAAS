import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../Inventory/services/inventoryApi';
import type { InventoryWarehouse } from '../../Inventory/types/inventoryTypes';

// Refresh on every opening: warehouse assignments can change in Inventory while Sales stays mounted.
export function useSalesWarehouses(open: boolean) {
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void inventoryApi.loadWarehouses()
      .then((items) => { if (!cancelled) setWarehouses(items); })
      .catch(() => {
        if (cancelled) return;
        setWarehouses([]);
        setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, revision]);

  return { warehouses, loading, error, reload };
}
