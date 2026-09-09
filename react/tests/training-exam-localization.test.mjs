import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const require = createRequire(import.meta.url);
const examPath = resolve(import.meta.dirname, '../src/app/Training/TrainingExamPanel.tsx');
const { getTrainingExamCopy } = createTypeScriptLoader()(resolve(import.meta.dirname, '../src/app/Training/translations/exam/index.ts'));
const initialNow = Date.parse('2026-09-08T12:00:00Z');
function attempt(locale, answers = { 'indice.q01': 'a' }) {
  return { id: 31, exam_code: 'indice', attempt_number: 2, status: 'IN_PROGRESS', expires_at: new Date(initialNow + 600_000).toISOString(), server_time: new Date(initialNow).toISOString(), questions: [1, 2].map(index => ({ code: `indice.q0${index}`, prompt: `${locale} question ${index}`, options: ['a', 'b', 'c'].map(code => ({ code, label: `${locale} option ${code}` })) })), answers, answered_count: Object.keys(answers).length, total_questions: 2, pass_score: 2, score: null, passed: null };
}
function descendants(element, predicate) {
  if (element == null || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => descendants(child, predicate));
  return [...(predicate(element) ? [element] : []), ...descendants(element.props?.children, predicate)];
}
function text(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (Array.isArray(element)) return element.map(text).join('');
  return typeof element === 'object' ? text(element.props?.children) : String(element);
}
function setup() {
  let locale = 'en-CA', cursor = 0, dirty = true, tree, now = initialNow, timerId = 0;
  const slots = [], effects = [], requests = [], timers = new Map();
  const changed = (left, right) => !left || !right || left.length !== right.length || left.some((value, i) => !Object.is(value, right[i]));
  const react = { ...require('react'),
    useState(initial) { const index = cursor++; if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[index].value, update => { const next = typeof update === 'function' ? update(slots[index].value) : update; if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; } }]; },
    useRef(value) { const index = cursor++; if (!slots[index]) slots[index] = { current: value }; return slots[index]; },
    useMemo(factory, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }; return slots[index].value; },
    useEffect(effect, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) { const previous = slots[index]; slots[index] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect(); }); } },
  };
  class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const apiClient = (url, options = {}) => new Promise((resolve, reject) => requests.push({ url, method: options.method ?? 'GET', body: options.body ? JSON.parse(options.body) : null, resolve, reject, settled: false }));
  const load = createTypeScriptLoader({ react, '../lib/apiClient': { apiClient }, './trainingCertificatePdf': { downloadTrainingCertificate() { throw new Error('unexpected certificate download'); } }, '../../../shared/context': { useLanguage: () => ({ currentLanguage: { code: locale } }) } }, { Date: TestDate, window: { setInterval(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearInterval(id) { timers.delete(id); } } });
  const { TrainingExamPanel } = load(examPath);
  function render() {
    for (let count = 0; dirty; count++) {
      assert.ok(count < 25, 'render/effect cycle should settle');
      dirty = false; cursor = 0;
      tree = TrainingExamPanel({ basePath: '/api/v1/platform-admin/training', exam: { code: 'indice', active_attempt_id: 31, ready: true }, title: 'Lesson', onChanged() {} });
      while (effects.length) effects.shift()();
    }
    return tree;
  }
  async function flush() { for (let index = 0; index < 12; index++) { await Promise.resolve(); render(); } }
  const pending = (method = 'GET', code) => requests.filter(request => !request.settled && request.method === method && (!code || request.url.endsWith(`locale=${code}`)));
  async function respond(request, value, failure = false) { assert.ok(request, 'expected pending request'); request.settled = true; failure ? request.reject(value) : request.resolve(value); await flush(); }
  render();
  return { requests, pending, respond, flush, get tree() { return render(); }, locale(value) { locale = value; dirty = true; return render(); }, advance(seconds) { now += seconds * 1000; [...timers.values()].filter(timer => timer.delay === 1000).forEach(timer => timer.callback()); return render(); }, async hydrate() { await respond(pending()[0], attempt('en-CA')); for (const request of pending()) await respond(request, attempt('en-CA')); }, button(label) { const result = descendants(render(), e => e.type === 'button' && (e.props['aria-label'] === label || text(e) === label))[0]; assert.ok(result, `button ${label}`); return result; }, question() { return text(descendants(render(), e => e.type === 'h5')[0]); }, checked() { return descendants(render(), e => e.type === 'input' && e.props.type === 'radio').map(e => e.props.checked); }, dispose() { for (const slot of slots) slot?.cleanup?.(); } };
}

test('switching an active exam localizes only selected questions and ignores outdated locale responses', async () => {
  const view = setup();
  try {
    await view.hydrate();
    view.button('Go to question 2').props.onClick();
    view.button(getTrainingExamCopy('en-CA').reviewLater).props.onClick();
    view.advance(30);
    view.locale('fr-CA'); const french = view.pending('GET', 'fr-CA')[0];
    view.locale('ko-CA'); const korean = view.pending('GET', 'ko-CA')[0];
    await view.respond(korean, attempt('ko-CA', {}));
    await view.respond(french, attempt('fr-CA', {}));
    assert.equal(view.question(), 'ko-CA question 2');
    assert.match(view.button(getTrainingExamCopy('ko-CA').reviewLater).props.className, /border-amber-300/);
    assert.equal(text(descendants(view.tree, e => e.type === 'div' && e.props.className?.includes('font-mono'))[0]), '09:30');
    const firstQuestion = descendants(view.tree, e => e.type === 'button' && e.props['aria-label'])[0];
    firstQuestion.props.onClick();
    assert.deepEqual(view.checked(), [true, false, false], 'saved answers survive a translation response with stale empty answers');
    assert.ok(view.requests.every(request => request.method === 'GET'), 'localization must not start, save or submit an attempt');
  } finally { view.dispose(); }
});

test('a save started before two language switches resolves to the latest locale without clearing the selected answer', async () => {
  const view = setup();
  try {
    await view.hydrate();
    view.button('Go to question 2').props.onClick();
    descendants(view.tree, e => e.type === 'input')[1].props.onChange();
    const save = view.pending('PATCH')[0];
    assert.deepEqual(save.body, { questionCode: 'indice.q02', optionCode: 'b' });
    view.locale('fr-CA');
    await view.respond(view.pending('GET', 'fr-CA')[0], attempt('fr-CA'));
    assert.deepEqual(view.checked(), [false, true, false]);
    await view.respond(save, attempt('en-CA', { 'indice.q01': 'a', 'indice.q02': 'b' }));
    const translatedSave = view.pending('GET', 'fr-CA')[0];
    view.locale('zh-CA');
    await view.respond(translatedSave, attempt('fr-CA', { 'indice.q01': 'a', 'indice.q02': 'b' }));
    for (const request of view.pending('GET', 'zh-CA')) await view.respond(request, attempt('zh-CA', { 'indice.q01': 'a', 'indice.q02': 'b' }));
    assert.equal(view.question(), 'zh-CA question 2');
    assert.deepEqual(view.checked(), [false, true, false]);
    assert.equal(view.requests.filter(request => request.method === 'PATCH').length, 1);
    assert.equal(view.requests.filter(request => request.method === 'POST').length, 0);
  } finally { view.dispose(); }
});

test('a failed answer save and its retained error follow the current language', async () => {
  const view = setup();
  try {
    await view.hydrate();
    descendants(view.tree, e => e.type === 'input')[1].props.onChange();
    const save = view.pending('PATCH')[0];
    view.locale('fr-CA');
    await view.respond(view.pending('GET', 'fr-CA')[0], attempt('fr-CA'));
    await view.respond(save, new Error('provider detail must not be rendered'), true);
    assert.equal(text(descendants(view.tree, e => e.props.role === 'alert')[0]), getTrainingExamCopy('fr-CA').answerFailed);
    view.locale('pt-BR');
    assert.equal(text(descendants(view.tree, e => e.props.role === 'alert')[0]), getTrainingExamCopy('pt-BR').answerFailed);
  } finally { view.dispose(); }
});
