export function compactText(value?: string | null) {
  return value?.trim() ?? '';
}

export function normalizeTextKey(value?: string | null) {
  return compactText(value).toLowerCase();
}
