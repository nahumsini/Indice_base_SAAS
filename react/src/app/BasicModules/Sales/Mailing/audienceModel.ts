import type { MailingContact } from "./mailingApi";
export const audienceLimit = 500;
/** Returns null instead of silently truncating a recipient choice. */
export function mergeAudience<T extends MailingContact>(
  selected: T[],
  incoming: T[],
): T[] | null {
  const merged = [
    ...new Map([...selected, ...incoming].map((row) => [row.id, row])).values(),
  ];
  return merged.length <= audienceLimit ? merged : null;
}
export function audienceQuery(
  filters: {
    search: string;
    source: string;
    owner: string;
    tag: string;
    eligibility: string;
    listId: string;
  },
  sort: string,
  direction: string,
) {
  const query = new URLSearchParams({ sort, direction });
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") query.set(key, value);
  });
  return query;
}
