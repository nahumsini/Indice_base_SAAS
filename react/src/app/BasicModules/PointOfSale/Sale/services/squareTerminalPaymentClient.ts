import {
  posBackendApi,
  type PosSquareTerminalPaymentPayload,
  type PosSquareTerminalPaymentResponse,
  type PosSquareTerminalPaymentStatus,
} from './posBackendApi';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150;

type SquareTerminalUpdate = (message: string, response?: PosSquareTerminalPaymentResponse) => void;

export async function createSquareTerminalPaymentAndWait(
  payload: Omit<PosSquareTerminalPaymentPayload, 'idempotencyKey'>,
  onUpdate: SquareTerminalUpdate,
) {
  let current = await posBackendApi.createSquareTerminalPayment({
    ...payload,
    idempotencyKey: createSquareIdempotencyKey(),
  });
  onUpdate(messageFor(current), current);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const terminal = normalizeSquareStatus(current.status);
    if (terminal === 'approved') return approvedOrRecovered(current, onUpdate);
    if (terminal === 'declined' || terminal === 'cancelled' || terminal === 'uncertain') return current;
    await delay(POLL_INTERVAL_MS);
    current = await posBackendApi.recoverSquareTerminalPayment(current.intentId);
    onUpdate(messageFor(current), current);
  }

  onUpdate('Square Terminal timed out locally. Verifying the payment with the backend...', current);
  return posBackendApi.recoverSquareTerminalPayment(current.intentId);
}

function normalizeSquareStatus(status: string): PosSquareTerminalPaymentStatus {
  const normalized = status.trim().toLowerCase();
  return ['waiting', 'approved', 'declined', 'cancelled', 'uncertain'].includes(normalized)
    ? normalized as PosSquareTerminalPaymentStatus
    : 'uncertain';
}

async function approvedOrRecovered(
  response: PosSquareTerminalPaymentResponse,
  onUpdate: SquareTerminalUpdate,
) {
  if (response.checkout) return response;
  onUpdate('Square approved the card. Completing the POS sale on the backend...', response);
  const recovered = await posBackendApi.recoverSquareTerminalPayment(response.intentId);
  onUpdate(messageFor(recovered), recovered);
  return recovered;
}

function messageFor(response: PosSquareTerminalPaymentResponse) {
  switch (normalizeSquareStatus(response.status)) {
    case 'waiting':
      return 'Payment request sent to Square Terminal. Waiting for the customer...';
    case 'approved':
      return response.checkout
        ? 'Square payment approved and POS sale completed.'
        : 'Square payment approved. Finalizing POS sale...';
    case 'declined':
      return response.message || 'Square Terminal declined the payment.';
    case 'cancelled':
      return response.message || 'Square Terminal payment was cancelled.';
    case 'uncertain':
    default:
      return response.message || 'Square payment is uncertain. Use recovery before charging again.';
  }
}

function createSquareIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `indice-${crypto.randomUUID()}`;
  }
  return `indice-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
