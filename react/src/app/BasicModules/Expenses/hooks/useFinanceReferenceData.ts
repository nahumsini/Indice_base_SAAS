import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeReferenceDataService, toFinanceApiErrorMessage } from '../services';
import type {
  FinanceReferenceBusiness,
  FinanceReferenceData,
  FinanceReferenceOption,
  FinanceReferenceUnit,
  FinanceReferenceUser,
} from '../types/finance-reference.types';

const emptyReferenceData: FinanceReferenceData = {
  businesses: [],
  units: [],
  users: [],
};

const toOption = (item: FinanceReferenceBusiness | FinanceReferenceUnit | FinanceReferenceUser): FinanceReferenceOption => ({
  value: item.id,
  label: item.name,
  ...('unitId' in item && item.unitId ? { unitId: item.unitId } : {}),
  ...('businessId' in item && item.businessId ? { businessId: item.businessId } : {}),
});

const optionLabel = (options: FinanceReferenceOption[], value: string | undefined, fallback = '') => (
  options.find(option => option.value === value)?.label ?? value ?? fallback
);

export function useFinanceReferenceData(onError?: (message: string) => void) {
  const [data, setData] = useState<FinanceReferenceData>(emptyReferenceData);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingReferenceData(true);

    financeReferenceDataService.getReferenceData()
      .then(nextData => {
        if (isMounted) setData(nextData);
      })
      .catch(error => {
        if (isMounted) onError?.(toFinanceApiErrorMessage(error, 'No se pudieron cargar las referencias de organización.'));
      })
      .finally(() => {
        if (isMounted) setIsLoadingReferenceData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onError]);

  const unitOptions = useMemo(() => data.units.map(toOption), [data.units]);
  const businessOptions = useMemo(() => data.businesses.map(toOption), [data.businesses]);
  const userOptions = useMemo(() => data.users.map(toOption), [data.users]);

  const getUnitLabel = useCallback((unitId?: string) => optionLabel(unitOptions, unitId), [unitOptions]);
  const getBusinessLabel = useCallback((businessId?: string) => optionLabel(businessOptions, businessId), [businessOptions]);
  const getUserLabel = useCallback((userId?: string) => optionLabel(userOptions, userId), [userOptions]);

  return {
    businessOptions,
    businesses: data.businesses,
    currentUser: data.currentUser,
    getBusinessLabel,
    getUnitLabel,
    getUserLabel,
    isLoadingReferenceData,
    unitOptions,
    units: data.units,
    userOptions,
    users: data.users,
  };
}
