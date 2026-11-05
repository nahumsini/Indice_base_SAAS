import type { ImportedContactDraft } from './contactImportUtils';
export type ContactImportResult = { imported: number; skipped: number; failed: ImportedContactDraft[]; contactIds: number[] };
/** Await each owner write; only committed contacts become duplicate candidates. */
export async function importContactDrafts(
  drafts: ImportedContactDraft[], known: { id?: string | number; email: string; phone: string }[],
  create: (draft: ImportedContactDraft) => Promise<unknown>,
  emailKey: (value: string) => string, phoneKey: (value: string) => string,
  onProgress?: (processed: number, total: number) => void,
): Promise<ContactImportResult> {
  const keys = new Set<string>();
  const contactKeys = (contact: { email: string; phone: string }) => [
    contact.email.trim() ? `email:${emailKey(contact.email)}` : '',
    phoneKey(contact.phone) ? `phone:${phoneKey(contact.phone)}` : '',
  ].filter(Boolean);
  const identities = new Map<string, Set<number>>();
  const remember = (contact: { id?: string | number; email: string; phone: string }) => {
    for (const key of contactKeys(contact)) {
      keys.add(key);
      const id = Number(contact.id);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      const matches = identities.get(key) ?? new Set<number>();
      matches.add(id);
      identities.set(key, matches);
    }
  };
  known.forEach(remember);
  const contactIds = new Set<number>();
  const result: ContactImportResult = { imported: 0, skipped: 0, failed: [], contactIds: [] };
  for (const [index, draft] of drafts.entries()) {
    const candidateKeys = contactKeys(draft);
    if (candidateKeys.some(key => keys.has(key))) {
      const matches = new Set(candidateKeys.flatMap(key => [...(identities.get(key) ?? [])]));
      if (matches.size > 1) result.failed.push(draft);
      else {
        result.skipped++;
        for (const id of matches) contactIds.add(id);
      }
    } else {
      try {
        const created = await create(draft);
        const id = created && typeof created === 'object' && 'id' in created ? Number(created.id) : undefined;
        result.imported++;
        remember({ ...draft, id });
        if (id && Number.isSafeInteger(id) && id > 0) contactIds.add(id);
      } catch { result.failed.push(draft); }
    }
    onProgress?.(index + 1, drafts.length);
  }
  result.contactIds = [...contactIds];
  return result;
}
