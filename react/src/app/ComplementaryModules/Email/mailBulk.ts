import type { MailboxMessage } from './mailboxApi';
/** Execute existing versioned provider operations serially, never retry ambiguous outcomes. */
export async function organizeMail(messages: MailboxMessage[], apply: (message: MailboxMessage) => Promise<MailboxMessage>,
  onResult: (message: MailboxMessage) => void, onProgress: (done: number) => void, active: () => boolean) {
  const failed: string[] = []; let completed = 0;
  for (const message of messages) {
    if (!active()) break;
    try { const result = await apply(message); if (active()) onResult(result); completed++; }
    catch { failed.push(message.id); }
    if (!active()) break;
    onProgress(completed + failed.length);
  }
  return { completed, failed };
}
