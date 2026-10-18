import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

function setup() {
  const listeners = new Set();
  const changes = [];
  let exits = 0;
  const doc = {
    fullscreenElement: null,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    async exitFullscreen() { exits++; doc.fullscreenElement = null; doc.emit(); },
    emit() { for (const listener of listeners) listener(); },
  };
  global.document = doc;
  const element = { async requestFullscreen() { doc.fullscreenElement = element; doc.emit(); } };
  const runtime = hookRuntime();
  const { useKanbanFullscreen } = loadTypescript(resolve('src/app/BasicModules/Sales/Prospectos/kanban/useKanbanFullscreen.ts'), () => runtime.hooks);
  const onChange = value => changes.push(value);
  runtime.render(() => useKanbanFullscreen(onChange));
  runtime.result.rootRef.current = element;
  return { doc, element, runtime, changes, listeners, exits: () => exits };
}

test('native entry, button exit and browser Escape synchronize the workspace', async () => {
  const { doc, runtime, changes } = setup();
  await runtime.result.toggle(); await runtime.flush();
  assert.equal(changes.at(-1), true);
  assert.equal(doc.fullscreenElement, runtime.result.rootRef.current);
  await runtime.result.exit(); await runtime.flush();
  assert.equal(changes.at(-1), false);
  await runtime.result.toggle(); await runtime.flush();
  // The browser leaves fullscreen on Escape independently of React.
  doc.fullscreenElement = null; doc.emit(); await runtime.flush();
  assert.equal(changes.at(-1), false);
  assert.equal(runtime.result.pending, false);
  runtime.unmount(); delete global.document;
});

test('denied and unavailable requests keep the regular view and permit a retry', async () => {
  const { element, runtime, changes } = setup();
  const request = element.requestFullscreen;
  for (const unsupported of [false, true]) {
    element.requestFullscreen = unsupported ? undefined : async () => { throw new Error('Denied'); };
    await runtime.result.toggle(); await runtime.flush();
    assert.equal(runtime.result.failed, true);
    assert.equal(runtime.result.pending, false);
    assert.ok(!changes.includes(true));
  }
  element.requestFullscreen = request;
  await runtime.result.toggle(); await runtime.flush();
  assert.equal(runtime.result.failed, false);
  assert.equal(changes.at(-1), true);
  runtime.unmount(); delete global.document;
});

test('duplicate requests are blocked and a late entry is closed after navigation', async () => {
  const { doc, element, runtime, listeners, exits } = setup();
  let complete; let requests = 0;
  element.requestFullscreen = () => { requests++; return new Promise(resolve => { complete = () => { doc.fullscreenElement = element; doc.emit(); resolve(); }; }); };
  const pending = runtime.result.toggle(); await runtime.flush();
  assert.equal(runtime.result.pending, true);
  await runtime.result.toggle();
  assert.equal(requests, 1);
  runtime.unmount();
  assert.equal(listeners.size, 0);
  complete(); await pending;
  assert.equal(doc.fullscreenElement, null);
  assert.equal(exits(), 1);
  delete global.document;
});

test('navigation exits only this board and never another fullscreen workspace', async () => {
  for (const otherOwner of [false, true]) {
    const { doc, runtime, exits } = setup();
    await runtime.result.toggle(); await runtime.flush();
    if (otherOwner) doc.fullscreenElement = {};
    runtime.result.rootRef.current = null; // React detaches refs during unmount.
    runtime.unmount();
    assert.equal(exits(), otherOwner ? 0 : 1);
    delete global.document;
  }
});

test('sorting and action portals remain inside fullscreen, preserving normal and explicit containers', () => {
  const jsx = (type, props) => ({ type, props });
  const primitive = new Proxy({}, { get: (_, name) => name });
  const require = id => id === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
    : id.endsWith('/utils') ? { cn: (...classes) => classes.filter(Boolean).join(' ') } : primitive;
  const { SelectContent } = loadTypescript(resolve('src/app/components/ui/select.tsx'), require);
  const { DropdownMenuContent, DropdownMenuPortal } = loadTypescript(resolve('src/app/components/ui/dropdown-menu.tsx'), require);
  for (const element of [null, { id: 'fullscreen-board' }]) {
    global.document = { fullscreenElement: element };
    assert.equal(SelectContent({}).props.container, element ?? undefined);
    const menu = DropdownMenuContent({});
    assert.equal(menu.type(menu.props).props.container, element ?? undefined);
    const explicit = { id: 'explicit-host' };
    assert.equal(DropdownMenuPortal({ container: explicit }).props.container, explicit);
  }
  delete global.document;
  assert.equal(SelectContent({}).props.container, undefined);
  assert.equal(DropdownMenuPortal({}).props.container, undefined);
});
