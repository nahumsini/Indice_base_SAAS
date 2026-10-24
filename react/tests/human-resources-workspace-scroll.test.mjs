import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Run the real owner effect with bounded DOM stand-ins; no business APIs or records.
const source = ts.createSourceFile('HumanResources.tsx', readFileSync(new URL('../src/app/BasicModules/HumanResources/HumanResources.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function find(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useLayoutEffect') callback = node.arguments[0].getText(source);
  ts.forEachChild(node, find);
}
find(source);
assert.ok(callback, 'The HR scroll lifecycle must remain covered');
const compiled = ts.transpileModule(`module.exports = ${callback}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function mount({ saved = 900, phone = false, loaded = true } = {}) {
  const listeners = new Map(), frames = new Map();
  const memory = new Map(saved == null ? [] : [['control', saved]]);
  const restoring = { current: null };
  let observer, nextFrame = 0;
  const viewport = {
    scrollTop: 0, clientHeight: 700, scrollHeight: 1000,
    addEventListener(event, callback) { listeners.set(event, callback); },
    removeEventListener(event) { listeners.delete(event); },
    scrollTo({ top }) { this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight)); listeners.get('scroll')?.(); },
  };
  class ResizeObserver {
    observed = new Set();
    constructor(callback) { this.callback = callback; observer = this; }
    observe(node) { this.observed.add(node); }
    disconnect() { this.observed.clear(); }
  }
  const context = {
    module: { exports: {} }, isAccessLoaded: loaded, activeTab: 'control',
    mainContentRef: { current: { closest: () => viewport } },
    tabScrollPositionsRef: { current: memory }, restoringTabRef: restoring, ResizeObserver,
    window: { matchMedia: () => ({ matches: phone }), requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id) },
  };
  vm.runInNewContext(compiled, context);
  const cleanup = context.module.exports();
  return { viewport, memory, listeners, frames, cleanup, resize() { if (observer.observed.size) observer.callback(); }, flush() { for (const [id, fn] of frames) { frames.delete(id); fn(); } } };
}

test('a retained tab waits for its asynchronously loaded height before restoring its saved position', () => {
  const state = mount();
  assert.equal(state.viewport.scrollTop, 300);
  assert.equal(state.memory.get('control'), 900, 'A loading-state clamp must not replace the saved position');
  state.viewport.scrollHeight = 1800;
  state.resize(); state.flush();
  assert.equal(state.viewport.scrollTop, 900);
  assert.equal(state.memory.get('control'), 900);
  state.cleanup();
});

test('user scrolling cancels pending restoration so late data cannot pull the user away', () => {
  const state = mount();
  state.listeners.get('wheel')();
  state.viewport.scrollTo({ top: 120 });
  state.viewport.scrollHeight = 1800;
  state.resize(); state.flush();
  assert.equal(state.viewport.scrollTop, 120);
  assert.equal(state.memory.get('control'), 120);
  state.cleanup();
});

test('phone navigation and first visits start at the heading', () => {
  for (const options of [{ phone: true }, { saved: null }]) {
    const state = mount(options);
    assert.equal(state.viewport.scrollTop, 0);
    state.cleanup();
  }
});

test('leaving a tab removes observers, input listeners and pending frame work', () => {
  const state = mount(); state.resize();
  assert.equal(state.frames.size, 1);
  state.cleanup(); state.resize();
  assert.equal(state.listeners.size, 0);
  assert.equal(state.frames.size, 0);
});

test('unresolved module access does not attach a viewport lifecycle', () => {
  const state = mount({ loaded: false });
  assert.equal(state.cleanup, undefined);
  assert.equal(state.listeners.size, 0);
});
