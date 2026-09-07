import { useEffect, useState } from 'react';
import { commissionSelections, loadCommissionSummary, type CommissionSummary } from '../services/commissionSummaryApi';
import type { CommissionRecord } from '../types/commissions';

export function useCommissionSummary(records: CommissionRecord[], preferredCurrency: string) {
  let selections: ReturnType<typeof commissionSelections> = [];
  let invalid = false;
  try { selections = commissionSelections(records); } catch { invalid = true; }
  // Include observed snapshots to refresh after a same-selection status/amount update.
  const key = JSON.stringify([preferredCurrency, selections, records.map(r => [r.status, r.commissionAmount, r.saleAmount])]);
  const [state, setState] = useState<{ key: string; data: CommissionSummary | null; error: boolean }>({ key: '', data: null, error: false });
  useEffect(() => {
    let active = true;
    if (invalid) { setState({ key, data: null, error: true }); return; }
    void loadCommissionSummary(preferredCurrency, selections)
      .then(data => { if (active) setState({ key, data, error: false }); })
      .catch(() => { if (active) setState({ key, data: null, error: true }); });
    return () => { active = false; };
  }, [key, invalid]);
  // Never show the previous company's/currency's/filter's result while a new request is pending.
  return state.key === key ? state : { key, data: null, error: invalid };
}
