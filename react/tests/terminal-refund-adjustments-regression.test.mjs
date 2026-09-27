import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const paymentAccounts = read('src/app/BasicModules/Expenses/PaymentAccounts/PaymentAccounts.tsx');
const panel = read('src/app/BasicModules/Expenses/PaymentAccounts/components/TerminalRefundAdjustmentsPanel.tsx');
const copy = read('src/app/BasicModules/Expenses/PaymentAccounts/terminalRefundAdjustmentsCopy.ts');

function serviceHarness() {
  const requests = [];
  const load = createTypeScriptLoader({
    '../../../lib/apiClient': {
      apiClient: async (url, options) => {
        requests.push({ url, options });
        return [];
      },
    },
  });
  const { terminalRefundAdjustmentsService } = load(resolve(root,
    'src/app/BasicModules/Expenses/services/terminal-refund-adjustments.service.ts'));
  return { requests, service: terminalRefundAdjustmentsService };
}

test('refund adjustments are scoped to the finance workspace and hidden on owner denial', () => {
  assert.match(paymentAccounts, /headerTone === 'green' \? <TerminalRefundAdjustmentsPanel \/> : null/);
  assert.match(panel, /failure instanceof ApiClientError && failure\.status === 403/);
  assert.match(panel, /if \(hidden\) return null/);
});

test('refund review and posting use explicit versioned finance mutations', async () => {
  const { requests, service } = serviceHarness();
  await service.list('FAILED');
  await service.approve(41, 'Provider refund verified', 7);
  await service.post(41, 8);

  assert.equal(requests[0].url, '/api/v1/finance/terminal-refund-adjustments?state=FAILED');
  assert.deepEqual(JSON.parse(JSON.stringify(requests[1])), {
    url: '/api/v1/finance/terminal-refund-adjustments/41/approve',
    options: { method: 'POST', body: JSON.stringify({ reason: 'Provider refund verified', version: 7 }) },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(requests[2])), {
    url: '/api/v1/finance/terminal-refund-adjustments/41/post',
    options: { method: 'POST', body: JSON.stringify({ version: 8 }) },
  });
});

test('refund workflow requires an audit reason and only retries local posting failures', () => {
  assert.match(panel, /reason\.length < 8/);
  assert.match(panel, /item\.state === 'APPROVED' \|\| item\.state === 'FAILED'/);
  assert.match(panel, /item\.state === 'FAILED' \? copy\.retry : copy\.post/);
  assert.match(copy, /Posting updates Indice finance only\. It never sends another refund to Mercado Pago/);
  assert.match(copy, /Ingresa al menos 8 caracteres para la auditoría/);
});
