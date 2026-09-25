import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/shared/kpiMonetaryApi.ts');
for (const batch of [false, true]) {
  test(`${batch ? 'batch' : 'single'} monetary requests cancel obsolete work, ignore late responses and retain retry`, async t => {
    const runtime = hookRuntime();
    t.after(() => runtime.unmount());
    const requests = [];
    const api = loadTypescript(path, id => id === 'react' ? runtime.hooks : {
      apiClient: (url, init) => new Promise((resolve, reject) => requests.push({ url, ...init, resolve, reject })),
    });
    let ids = ['1'];
    runtime.render(() => {
      const query = { metric: 'EXPENSE_TOTAL', preferredCurrency: 'MXN', ids };
      return batch ? api.useKpiMonetaryAggregates([{ ...query, key: 'total' }]) : api.useKpiMonetaryAggregate(query);
    });
    await runtime.flush();
    assert.equal(requests.length, 1);
    ids = ['1']; runtime.render(); await runtime.flush();
    assert.equal(requests.length, 1, 'equivalent filters do not request again');
    ids = ['2']; runtime.render(); await runtime.flush();
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].signal.aborted, false);
    const amount = { preferredTotal: 200 };
    requests[1].resolve(batch ? { results: { total: amount } } : amount);
    await runtime.flush();
    requests[0].resolve(batch ? { results: { total: { preferredTotal: 100 } } } : { preferredTotal: 100 });
    await runtime.flush();
    assert.deepEqual(runtime.result.data, batch ? { total: amount } : amount);
    assert.equal(runtime.result.loading, false);
    runtime.result.refresh(); await runtime.flush();
    requests[2].reject(new Error('offline')); await runtime.flush();
    assert.equal(runtime.result.error.message, 'offline');
    runtime.result.refresh(); await runtime.flush();
    assert.equal(runtime.result.error, null);
    assert.equal(requests.length, 4);
    runtime.unmount();
    assert.equal(requests[3].signal.aborted, true);
    requests[3].reject(new DOMException('Aborted', 'AbortError'));
    await runtime.flush();
    assert.equal(runtime.result.error, null, 'unmounted cancellation is not displayed as a request failure');
  });
}
