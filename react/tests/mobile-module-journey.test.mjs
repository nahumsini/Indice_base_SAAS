import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const path = resolve(import.meta.dirname, '../src/app/components/frontend-os/useMobileModuleNavigation.ts');
const { revealCurrentNavigationItem } = loadTypescript(path, () => ({}));

test('active tab reveals only the horizontal rail when clipped, retaining visible positions', () => {
  const calls = [];
  let item = { left: 400, right: 520, width: 120 };
  const rail = { clientWidth: 300, scrollLeft: 100, querySelector: () => ({ getBoundingClientRect: () => item }),
    getBoundingClientRect: () => ({ left: 10, right: 310 }), scrollTo: value => calls.push(value) };
  revealCurrentNavigationItem(rail);
  assert.deepEqual(calls, [{ left: 400, behavior: 'auto' }]);
  item = { left: 20, right: 140, width: 120 };
  revealCurrentNavigationItem(rail);
  assert.equal(calls.length, 1);
  item = { left: -100, right: 20, width: 120 };
  revealCurrentNavigationItem(rail);
  assert.deepEqual(calls[1], { left: -100, behavior: 'auto' });
  revealCurrentNavigationItem(null);
  revealCurrentNavigationItem({ clientWidth: 0, querySelector: () => ({}) });
});

test('phone tab changes reset content once, reveal deferred navigation, and clean up frames', () => {
  const runtime = hookRuntime();
  const resets = [], reveals = [], canceled = [];
  let scheduled, frame = 0;
  const listeners = new Set();
  const previous = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: true }), requestAnimationFrame: fn => { scheduled = fn; return ++frame; }, cancelAnimationFrame: id => canceled.push(id), addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  try {
    const { useMobileModuleNavigation } = loadTypescript(path, () => runtime.hooks);
    const body = { current: { scrollTo: value => resets.push(value) } };
    const rail = { current: { clientWidth: 300, scrollLeft: 0, querySelector: () => ({ getBoundingClientRect: () => ({ left: 500, right: 600, width: 100 }) }), getBoundingClientRect: () => ({ left: 0, right: 300 }), scrollTo: value => reveals.push(value) } };
    let route = 'inventory/products', navigation = 'products';
    const render = () => runtime.render(() => useMobileModuleNavigation(route, navigation, rail, body));
    render(); scheduled();
    assert.equal(resets.length, 1);
    assert.equal(reveals.length, 1);
    render();
    assert.equal(resets.length, 1);
    navigation = 'products|warehouses'; render();
    assert.equal(resets.length, 1, 'permission/catalog updates must not reset form scroll');
    route = 'inventory/warehouses'; render(); scheduled();
    assert.equal(resets.length, 2);
    assert.deepEqual(resets[1], { top: 0, left: 0, behavior: 'auto' });
    const beforeResize = reveals.length;
    for (const listener of listeners) { listener(); listener(); }
    scheduled();
    assert.equal(reveals.length, beforeResize + 1);
    assert.equal(resets.length, 2, 'rotation must preserve the content position');
    for (const listener of listeners) listener();
    runtime.unmount();
    assert.deepEqual(canceled, [2, 5]);
    assert.equal(listeners.size, 0);
  } finally { globalThis.window = previous; }
});

test('desktop navigation leaves scroll and rail position untouched', () => {
  const runtime = hookRuntime();
  const previous = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false }), requestAnimationFrame: () => assert.fail('desktop must retain position') };
  try {
    const { useMobileModuleNavigation } = loadTypescript(path, () => runtime.hooks);
    runtime.render(() => useMobileModuleNavigation('sales/clients', '', undefined, { current: { scrollTo: () => assert.fail('desktop must retain position') } }));
    runtime.unmount();
  } finally { globalThis.window = previous; }
});
