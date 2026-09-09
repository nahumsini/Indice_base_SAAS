import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const require = createRequire(import.meta.url);
const locales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
const componentPath = resolve(import.meta.dirname, '../src/app/components/LocalizedLoadingBarOverlay.tsx');
const catalogPath = resolve(import.meta.dirname, '../src/app/components/loadingTranslations/index.ts');
const variants = Object.keys(createTypeScriptLoader()(catalogPath).loadingBarCopies['en-CA']);
function text(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (Array.isArray(element)) return element.map(text).join(' ');
  return typeof element === 'object' ? text(element.props?.children) : String(element);
}
function setup() {
  let language = 'en-CA', current = null;
  const frames = new Map(), pendingEffects = [], writes = [];
  const original = { body: { overflow: 'auto', paddingRight: '7px', position: 'relative', top: '10px', width: '99%' }, html: { overflow: 'scroll' } };
  const style = (name, initial) => new Proxy({ ...initial }, { set(target, property, value) { writes.push({ name, property, value }); target[property] = value; return true; } });
  const document = { body: { style: style('body', original.body) }, documentElement: { style: style('html', original.html), clientWidth: 1180 } };
  const react = { ...require('react'), useEffect(effect, deps) {
    const index = current.cursor++;
    const old = current.effects[index];
    if (!old || !deps || !old.deps || deps.length !== old.deps.length || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
      const next = { deps, cleanup: old?.cleanup };
      current.effects[index] = next;
      pendingEffects.push(() => { next.cleanup?.(); next.cleanup = effect(); });
    }
  } };
  const load = createTypeScriptLoader({ react, '../shared/context': { useLanguage: () => ({ currentLanguage: { code: language } }) } }, { document, window: { innerWidth: 1200, getComputedStyle: () => ({ paddingRight: document.body.style.paddingRight }) } });
  const { LocalizedLoadingBarOverlay } = load(componentPath);
  const catalog = load(catalogPath);
  const cleanFrame = frame => frame.effects.forEach(effect => effect?.cleanup?.());
  function expand(element, id, depth, used) {
    if (!element || typeof element.type !== 'function') return element;
    const frameId = `${id}:${depth}`;
    used.add(frameId);
    let frame = frames.get(frameId);
    if (!frame || frame.type !== element.type || frame.key !== element.key) {
      if (frame) cleanFrame(frame);
      frame = { type: element.type, key: element.key, effects: [], cursor: 0 };
      frames.set(frameId, frame);
    }
    frame.cursor = 0;
    current = frame;
    const child = element.type(element.props);
    current = null;
    return expand(child, id, depth + 1, used);
  }
  function render(props = {}, id = 'overlay') {
    const used = new Set();
    const tree = expand(require('react').createElement(LocalizedLoadingBarOverlay, { isVisible: true, variant: 'platform', ...props }), id, 0, used);
    for (const [key, frame] of frames) if (key.startsWith(`${id}:`) && !used.has(key)) { cleanFrame(frame); frames.delete(key); }
    while (pendingEffects.length) pendingEffects.shift()();
    return tree;
  }
  const unmount = (id = 'overlay') => { for (const [key, frame] of frames) if (key.startsWith(`${id}:`)) { cleanFrame(frame); frames.delete(key); } };
  return { ...catalog, render, unmount, document, writes, original, language(value) { language = value; }, dispose() { for (const frame of frames.values()) cleanFrame(frame); frames.clear(); } };
}

test('all loading variants render their selected locale with the original accessible status overlay', () => {
  const view = setup();
  try {
    for (const locale of locales) {
      view.language(locale);
      assert.ok(view.loadingBarCopies[locale], `explicit catalog for ${locale}`);
      assert.deepEqual(Object.keys(view.loadingBarCopies[locale]).sort(), [...variants].sort(), `${locale}: complete variant coverage`);
      for (const variant of variants) {
        const copy = view.getLoadingBarCopy(locale, variant);
        assert.ok(copy.title.trim(), `${locale}/${variant}: title`);
        assert.ok(copy.description.trim(), `${locale}/${variant}: description`);
        if (!locale.startsWith('en-')) assert.notEqual(copy.description, view.getLoadingBarCopy('en-CA', variant).description, `${locale}/${variant}: translated description`);
        if (locale === 'ko-CA') assert.match(copy.title + copy.description, /[가-힣]/);
        if (locale === 'zh-CA') assert.match(copy.title + copy.description, /[\p{Script=Han}]/u);
        const tree = view.render({ variant, className: 'test-overlay-marker' });
        assert.equal(tree.props.role, 'status');
        assert.equal(tree.props['aria-live'], 'polite');
        assert.equal(tree.props['aria-busy'], 'true');
        assert.ok(text(tree).includes(copy.title), `${locale}/${variant}: rendered title`);
        assert.ok(text(tree).includes(copy.description), `${locale}/${variant}: rendered description`);
        assert.match(tree.props.className, /test-overlay-marker/);
      }
    }
  } finally { view.dispose(); }
});

test('a live language change updates visible copy without remounting or releasing the shared scroll lock', () => {
  const view = setup();
  try {
    const first = view.render({ variant: 'moduleNavigation' });
    assert.equal(view.document.body.style.overflow, 'hidden');
    assert.equal(view.document.documentElement.style.overflow, 'hidden');
    assert.equal(view.document.body.style.paddingRight, '27px');
    view.writes.length = 0;
    for (const locale of ['es-MX', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
      view.language(locale);
      const next = view.render({ variant: 'moduleNavigation' });
      assert.notEqual(text(next), text(first), locale);
      assert.ok(text(next).includes(view.getLoadingBarCopy(locale, 'moduleNavigation').title));
      assert.equal(view.document.body.style.overflow, 'hidden');
    }
    assert.deepEqual(view.writes, [], 'translation changes must not restore and reacquire the page lock');
    view.unmount();
    assert.deepEqual({ ...view.document.body.style }, view.original.body);
    assert.deepEqual({ ...view.document.documentElement.style }, view.original.html);
  } finally { view.dispose(); }
});

test('unsupported locales fall back to Canadian English for every loading variant', () => {
  const view = setup();
  try {
    view.language('unconfigured-locale');
    for (const variant of variants) {
      const expected = view.getLoadingBarCopy('en-CA', variant);
      assert.deepEqual({ ...view.getLoadingBarCopy('unconfigured-locale', variant) }, { ...expected });
      const tree = view.render({ variant });
      assert.ok(text(tree).includes(expected.title));
      assert.ok(text(tree).includes(expected.description));
    }
  } finally { view.dispose(); }
});

test('visibility and overlapping localized overlays preserve scroll restoration', () => {
  const view = setup();
  try {
    assert.equal(view.render({ isVisible: false }), null);
    assert.deepEqual(view.writes, [], 'a hidden overlay must not lock scrolling');
    view.render({ variant: 'workspace' }, 'first');
    view.render({ variant: 'certificate' }, 'second');
    view.render({ variant: 'workspace', isVisible: false }, 'first');
    assert.equal(view.document.body.style.overflow, 'hidden', 'one visible overlay still owns a lock');
    assert.equal(view.document.body.style.paddingRight, '27px', 'overlapping overlays must not double the scrollbar padding');
    view.language('zh-CA');
    const active = view.render({ variant: 'certificate' }, 'second');
    assert.equal(active.props.role, 'status');
    assert.equal(view.render({ variant: 'certificate', isVisible: false }, 'second'), null);
    assert.deepEqual({ ...view.document.body.style }, view.original.body);
    assert.deepEqual({ ...view.document.documentElement.style }, view.original.html);
  } finally { view.dispose(); }
});
