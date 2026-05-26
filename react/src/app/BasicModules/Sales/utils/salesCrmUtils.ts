export function createSequentialId(prefix: string, nextIndex: number) {
  return `${prefix}-${String(nextIndex).padStart(3, '0')}`;
}

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
