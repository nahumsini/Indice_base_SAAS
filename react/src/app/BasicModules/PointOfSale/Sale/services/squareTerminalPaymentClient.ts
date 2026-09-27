import {
  posBackendApi,
  type PosSquareTerminalPaymentPayload,
  type PosSquareTerminalPaymentResponse,
  type PosSquareTerminalPaymentStatus,
} from './posBackendApi';
import {
  clearSquareTerminalAttempt,
  notifySquareTerminalAttemptChanged,
  prepareSquareTerminalAttempt,
  type SquareTerminalAttemptScope,
} from './squareTerminalAttemptStore';
import type { SquareTerminalRecoveryCopy } from './squareTerminalRecoveryCopy';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150;

type SquareTerminalUpdate = (message: string, response?: PosSquareTerminalPaymentResponse) => void;

export async function createSquareTerminalPaymentAndWait(
  payload: Omit<PosSquareTerminalPaymentPayload, 'idempotencyKey'>,
  recovery: { scope: SquareTerminalAttemptScope; draftIdentity: string; copy: SquareTerminalRecoveryCopy },
  onUpdate: SquareTerminalUpdate,
) {
  const attempt = await prepareSquareTerminalAttempt(recovery.scope, recovery.draftIdentity);
  let current = await posBackendApi.createSquareTerminalPayment({
    ...payload,
    idempotencyKey: attempt.requestKey,
  });
  notifySquareTerminalAttemptChanged();
  onUpdate(messageFor(current, recovery.copy), current);

  for (let poll = 0; poll < MAX_POLL_ATTEMPTS; poll += 1) {
    const terminal = normalizeSquareStatus(current.status);
    if (receiptStatus(terminal) && !(terminal === 'refunded' && !current.posTicketId)) {
      current = await approvedOrRecovered(current, recovery.copy, onUpdate);
    }
    if (terminal !== 'waiting') return finish(current, recovery.scope, attempt);
    await delay(POLL_INTERVAL_MS);
    current = await posBackendApi.recoverSquareTerminalPayment(current.intentId);
    onUpdate(messageFor(current, recovery.copy), current);
  }

  onUpdate(recovery.copy.timeout, current);
  current = await posBackendApi.recoverSquareTerminalPayment(current.intentId);
  onUpdate(messageFor(current, recovery.copy), current);
  return finish(current, recovery.scope, attempt);
}

function normalizeSquareStatus(status: string): PosSquareTerminalPaymentStatus {
  const normalized = status.trim().toLowerCase();
  return ['waiting', 'approved', 'partially_refunded', 'refunded', 'declined', 'cancelled', 'uncertain'].includes(normalized)
    ? normalized as PosSquareTerminalPaymentStatus
    : 'uncertain';
}

async function approvedOrRecovered(
  response: PosSquareTerminalPaymentResponse,
  copy: SquareTerminalRecoveryCopy,
  onUpdate: SquareTerminalUpdate,
) {
  if (response.checkout) return response;
  onUpdate(copy.finalizing, response);
  const recovered = await posBackendApi.recoverSquareTerminalPayment(response.intentId);
  onUpdate(messageFor(recovered, copy), recovered);
  return recovered;
}

function messageFor(response: PosSquareTerminalPaymentResponse, copy: SquareTerminalRecoveryCopy) {
  switch (normalizeSquareStatus(response.status)) {
    case 'waiting':
      return copy.waiting;
    case 'approved':
    case 'partially_refunded':
      return response.checkout ? copy.approved : copy.finalizing;
    case 'refunded':
      return response.posTicketId ? (response.checkout ? copy.approved : copy.finalizing) : copy.refundedReleased;
    case 'declined':
      return response.message || copy.declined;
    case 'cancelled':
      return response.message || copy.cancelled;
    case 'uncertain':
    default:
      return response.message || copy.uncertain;
  }
}

const receiptStatus = (status: PosSquareTerminalPaymentStatus) => (
  ['approved', 'partially_refunded', 'refunded'].includes(status)
);

function finish(response: PosSquareTerminalPaymentResponse, scope: SquareTerminalAttemptScope,
  attempt: Awaited<ReturnType<typeof prepareSquareTerminalAttempt>>) {
  const status = normalizeSquareStatus(response.status);
  if (status === 'declined' || status === 'cancelled' || (status === 'refunded' && !response.posTicketId)) {
    clearSquareTerminalAttempt(scope, attempt.requestKey);
  }
  return { response, attempt };
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
