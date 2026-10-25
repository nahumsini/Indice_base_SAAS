import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadTypescript } from './helpers/hook-runtime.mjs';
const require = createRequire(import.meta.url);
const root = new URL('../src/app/BasicModules/Sales/Funneling/', import.meta.url);
const copy = loadTypescript(new URL('boardWorkbenchCopy.ts', root).pathname, () => { throw Error('Unexpected copy import'); });
function elements(root) { return [root, ...[root?.props?.children].flat(Infinity).filter(value => value && typeof value === 'object').flatMap(elements)]; }
const panel = loadTypescript(new URL('BoardCreationPanel.tsx', root).pathname, id => {
  if (id === 'react/jsx-runtime') return require(id);
  if (id === 'lucide-react') return { Plus: 'plus-icon', X: 'close-icon' };
  if (id === './BoardToolEmoji') return { BoardToolEmoji: 'artwork' };
  if (id === './boardWorkbenchCopy') return copy;
  throw Error(id);
});
test('the category disclosure preserves the document and dispatches the original creation and focus callbacks', () => {
  const content = { nodes: [{ id: 'keep', category: 'PERSON' }], connections: [{ id: 'keep-link' }], viewport: { x: 31, y: -40, zoom: .8 } };
  const before = structuredClone(content), calls = [];
  const groups = ['PERSON', 'PROCESS', 'CHANNEL', 'PRODUCT', 'FINANCE'].map(id => ({ id, label: id, addLabel: `Add ${id}`, icon: id, matches: node => node.category === id }));
  const tree = panel.BoardCreationPanel({ id: 'palette', groups, content, locale: 'es-MX', overview: 'Ver todo', disabled: false, onCreate: value => calls.push(value), onFocus: value => calls.push(value), onClose: () => calls.push('close') });
  assert.equal(tree.type, 'aside');
  assert.equal(tree.props['aria-label'], 'Agregar al tablero');
  const all = elements(tree), additions = all.filter(item => item.props?.className === 'system-domain-add');
  assert.equal(additions.length, 5);
  additions[2].props.onClick(); assert.equal(calls[0], groups[2]);
  all.find(item => item.props?.['aria-label'] === 'Ver área: PROCESS').props.onClick(); assert.equal(calls[1], 'PROCESS');
  all.find(item => item.props?.className?.includes('board-creation-overview')).props.onClick(); assert.equal(calls[2], undefined);
  let stopped = false; tree.props.onKeyDown({ key: 'Escape', stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true); assert.equal(calls.at(-1), 'close');
  assert.deepEqual(content, before);
});
test('loading keeps all category creation and focus actions disabled', () => {
  const group = { id: 'PERSON', label: 'Personas', addLabel: 'Agregar persona', icon: null, matches: () => false };
  const all = elements(panel.BoardCreationPanel({ id: 'palette', groups: [group], content: { nodes: [] }, locale: 'es', overview: 'Ver todo', disabled: true, onCreate() {}, onFocus() {}, onClose() {} }));
  for (const item of all.filter(item => ['system-domain-add', 'system-domain-focus', 'idea-board-button board-creation-overview'].includes(item.props?.className))) assert.equal(item.props.disabled, true);
  assert.equal(all.find(item => item.props?.['aria-label'] === 'Cerrar panel').props.disabled, undefined);
});
test('menu and standalone print actions use the same isolated document and preserve their availability rules', () => {
  const requests = [], messages = [];
  const { BoardPrintButton } = loadTypescript(new URL('BoardPrintButton.tsx', root).pathname, id => {
    if (id === 'react/jsx-runtime') return require(id);
    if (id.endsWith('/dropdown-menu')) return { DropdownMenuItem: 'native-menu-item' };
    if (id === './BoardToolEmoji') return { BoardToolEmoji: 'artwork' };
    if (id === './ideasBoardCopy') return { ideasBoardCopy: () => ({ title: 'Original title' }) };
    if (id === './boardCreativeCopy') return { boardCreativeCopy: () => ({ print: 'PDF', printHint: 'Ready', printError: 'Failed' }) };
    if (id === './boardPrintDocument') return { boardPrintDocument: content => JSON.stringify(content), boardPrintStyles: 'same-styles' };
    if (id.endsWith('/documentHtmlPrintEngine')) return { printDocumentHtml: request => { requests.push(request); return true; } };
    throw Error(id);
  });
  const content = { nodes: [{ id: 'node', text: 'Keep' }], connections: [], viewport: { x: 4, y: 7, zoom: 1 } };
  const props = { content, api: { photoUrl: id => id }, locale: 'es-MX', disabled: false, notify: message => messages.push(message) };
  const original = BoardPrintButton(props), menu = BoardPrintButton({ ...props, menuItem: true });
  assert.equal(original.type, 'button'); assert.equal(menu.type, 'native-menu-item');
  original.props.onClick(); menu.props.onSelect(); assert.deepEqual(requests[0], requests[1]);
  assert.deepEqual(JSON.parse(requests[1].bodyHtml), content); assert.deepEqual(messages, ['Ready', 'Ready']);
  assert.equal(BoardPrintButton({ ...props, disabled: true, menuItem: true }).props.disabled, true);
  assert.equal(BoardPrintButton({ ...props, content: { ...content, nodes: [] }, menuItem: true }).props.disabled, true);
});
