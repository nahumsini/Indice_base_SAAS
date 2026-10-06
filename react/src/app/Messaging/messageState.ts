import type { Message } from './types';

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
