import type { Message, Participant } from './types';

/** Read cursors come from the server, including polls with no new messages. Never infer delivery. */
export function messageReceipt(message: Message, participants: Participant[]) {
  const recipients = participants.filter(p => p.userId !== message.senderUserId);
  const read = recipients.filter(p => p.lastReadMessageId >= message.id).length;
  return { read, total: recipients.length, allRead: recipients.length > 0 && read === recipients.length };
}

/** Server ids define order; retries and overlapping polls must not duplicate bubbles. */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
export function requestIdentity(previous: { fingerprint: string; key: string } | null, fingerprint: string,
  makeKey: () => string = () => crypto.randomUUID()) {
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, key: makeKey() };
}
export function pollDelay(failures: number, visible: boolean) {
  return visible ? Math.min(30_000, 3_000 * 2 ** Math.min(failures, 4)) : 30_000;
}
