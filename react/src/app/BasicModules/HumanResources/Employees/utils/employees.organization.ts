export const normalizeOptionLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

export const mergeTextOptions = (...optionGroups: ReadonlyArray<ReadonlyArray<string>>) => {
  const optionMap = new Map<string, string>();

  optionGroups.flat().forEach((option) => {
    const normalized = normalizeOptionLabel(option);
    if (!normalized) {
      return;
    }

    const key = normalized.toLocaleLowerCase();
    if (!optionMap.has(key)) {
      optionMap.set(key, normalized);
    }
  });

  return Array.from(optionMap.values());
};

export const normalizeOrganizationLabel = (value?: string | null) =>
  normalizeOptionLabel(value ?? '').toLocaleLowerCase();

export const isCorporateHeadquartersLabel = (label?: string | null) => {
  const normalized = normalizeOrganizationLabel(label);
  return normalized === 'corporate office'
    || normalized === 'headquarter'
    || normalized === 'headquarters'
    || normalized === 'oficina corporativa'
    || normalized === 'sede corporativa';
};

export const isCorporateOfficeUnitLabel = (label?: string | null) => isCorporateHeadquartersLabel(label);

export const getUnitHeadquartersLabel = (unitLabel?: string | null) => (
  `${normalizeOptionLabel(unitLabel ?? '') || 'Unit'} headquarters`
);

export const isUnitHeadquartersLabel = (businessLabel?: string | null, unitLabel?: string | null) => {
  const normalizedBusiness = normalizeOrganizationLabel(businessLabel);
  const normalizedUnit = normalizeOptionLabel(unitLabel ?? '');
  if (!normalizedBusiness || !normalizedUnit) {
    return false;
  }

  return normalizedBusiness === normalizeOrganizationLabel(getUnitHeadquartersLabel(normalizedUnit))
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} headquarter`)
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} sede`)
    || normalizedBusiness === normalizeOrganizationLabel(`sede ${normalizedUnit}`);
};
