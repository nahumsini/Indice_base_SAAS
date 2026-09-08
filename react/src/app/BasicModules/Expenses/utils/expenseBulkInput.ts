export function parseMoney(input: string, currency: string) {
  let value = input.trim();
  if (value.toUpperCase().startsWith(currency.toUpperCase())) value = value.slice(currency.length).trim();
  value = value.replace(/^\$\s*/, '').replace(/\s/g, '');
  if (!value || /[^\d,.-]/.test(value) || value.includes('-')) return Number.NaN;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) return Number(value.replace(/,/g, ''));
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) return Number(value.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(\.\d{1,2})?$/.test(value)) return Number(value);
  if (/^\d+(,\d{1,2})$/.test(value)) return Number(value.replace(',', '.'));
  return Number.NaN;
}

export function parseDate(input: string) {
  const value = input.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const localMatch = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(value);
  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  const parts = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : localMatch
      ? [localMatch[3], localMatch[2].padStart(2, '0'), localMatch[1].padStart(2, '0')]
      : compactMatch
        ? [compactMatch[1], compactMatch[2], compactMatch[3]]
        : null;
  if (!parts && /^\d{5}$/.test(value)) {
    const serial = Number(value);
    const excelDate = new Date(Date.UTC(1899, 11, 30 + serial));
    return excelDate.toISOString().slice(0, 10);
  }
  if (!parts) return '';
  const result = `${parts[0]}-${parts[1]}-${parts[2]}`;
  const date = new Date(`${result}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== result ? '' : result;
}

export const displayDate = (iso: string) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';

