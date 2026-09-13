export function resolvePublicCatalogContactLabel(
  value: string | null | undefined,
  currentLocaleDefault: string,
  localizedDefaults: readonly string[],
) {
  const normalizedValue = value?.trim() ?? '';
  const isKnownDefault = localizedDefaults.some(
    (localizedDefault) => localizedDefault.trim() === normalizedValue,
  );

  return !normalizedValue || isKnownDefault ? currentLocaleDefault : normalizedValue;
}
