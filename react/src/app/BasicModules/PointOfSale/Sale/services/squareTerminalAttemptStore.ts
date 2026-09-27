export interface SquareTerminalAttemptScope {
  companyId: number | string;
  cashRegisterId: number | string;
  shiftId: number | string;
}
export interface SquareTerminalAttempt { requestKey: string; draftHash: string }
export const SQUARE_TERMINAL_ATTEMPT_CHANGED = 'indice:square-terminal-attempt-changed';
const KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const HASH = /^[a-f0-9]{64}$/;

export function squareTerminalAttemptStorageKey(scope: SquareTerminalAttemptScope) {
  return ['indice:pos:square-attempt:v1', scope.companyId, scope.cashRegisterId, scope.shiftId]
    .map((part) => encodeURIComponent(String(part))).join(':');
}
export function readSquareTerminalAttempt(scope: SquareTerminalAttemptScope): SquareTerminalAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(squareTerminalAttemptStorageKey(scope));
    const value = raw ? JSON.parse(raw) as Record<string, unknown> : null;
    if (!value || !KEY.test(String(value.requestKey)) || !HASH.test(String(value.draftHash))) return null;
    return { requestKey: String(value.requestKey), draftHash: String(value.draftHash) };
  } catch { return null; }
}
export async function prepareSquareTerminalAttempt(scope: SquareTerminalAttemptScope, identity: string) {
  const draftHash = await hashSquareTerminalDraft(identity);
  const existing = readSquareTerminalAttempt(scope);
  if (existing) {
    if (existing.draftHash !== draftHash) throw new Error('SQUARE_DIFFERENT_DRAFT_PENDING');
    return existing;
  }
  const attempt = { requestKey: createRequestKey(), draftHash };
  window.sessionStorage.setItem(squareTerminalAttemptStorageKey(scope), JSON.stringify(attempt));
  notifySquareTerminalAttemptChanged();
  return attempt;
}
export function clearSquareTerminalAttempt(scope: SquareTerminalAttemptScope, requestKey: string) {
  const current = readSquareTerminalAttempt(scope);
  if (!current || current.requestKey !== requestKey) return false;
  window.sessionStorage.removeItem(squareTerminalAttemptStorageKey(scope));
  notifySquareTerminalAttemptChanged();
  return true;
}
export async function matchesSquareTerminalDraft(attempt: SquareTerminalAttempt, identity: string) {
  return attempt.draftHash === await hashSquareTerminalDraft(identity);
}
async function hashSquareTerminalDraft(identity: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function createRequestKey() {
  if (typeof crypto.randomUUID === 'function') return `indice-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `indice-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
export function notifySquareTerminalAttemptChanged() {
  if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(SQUARE_TERMINAL_ATTEMPT_CHANGED));
}
