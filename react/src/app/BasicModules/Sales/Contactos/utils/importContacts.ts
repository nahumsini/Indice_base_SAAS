import type { ImportedContactDraft } from './contactImportUtils';
export type ContactImportResult = { imported: number; skipped: number; failed: ImportedContactDraft[] };
/** Await each owner write; only committed contacts become duplicate candidates. */
export async function importContactDrafts(
  drafts: ImportedContactDraft[], known: { email: string; phone: string }[],
  create: (draft: ImportedContactDraft) => Promise<unknown>,
  emailKey: (value: string) => string, phoneKey: (value: string) => string,
  onProgress?: (processed: number, total: number) => void,
): Promise<ContactImportResult> {
  const keys = new Set<string>();
  const contactKeys = (contact: { email: string; phone: string }) => [
    contact.email.trim() ? `email:${emailKey(contact.email)}` : '',
    phoneKey(contact.phone) ? `phone:${phoneKey(contact.phone)}` : '',
  ].filter(Boolean);
  known.forEach(contact => contactKeys(contact).forEach(key => keys.add(key)));
  const result: ContactImportResult = { imported: 0, skipped: 0, failed: [] };
  for (const [index, draft] of drafts.entries()) {
    const candidateKeys = contactKeys(draft);
    if (candidateKeys.some(key => keys.has(key))) result.skipped++;
    else {
      try {
        await create(draft);
        result.imported++;
        candidateKeys.forEach(key => keys.add(key));
      } catch { result.failed.push(draft); }
    }
    onProgress?.(index + 1, drafts.length);
  }
  return result;
}
