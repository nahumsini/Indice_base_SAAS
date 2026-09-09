import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const root = resolve(import.meta.dirname, '../src/app');
const load = createTypeScriptLoader();
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { platformAdminMessages, getPlatformAdminTranslator } = load(resolve(root, 'PlatformAdmin/translations'));
const { systemTicketCopies, getSystemTicketCopy } = load(resolve(root, 'SystemTickets/translations.ts'));
const { trainingExamCopies, getTrainingExamCopy, formatExamMessage } = load(resolve(root, 'Training/translations/exam'));
const locales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
const tokens = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test('admin shell, ticket and exam messages cover every locale and preserve interpolation fields', () => {
  for (const catalog of [platformAdminMessages, systemTicketCopies, trainingExamCopies]) {
    assert.deepEqual(Object.keys(catalog).sort(), [...locales].sort());
    for (const locale of locales) {
      assert.deepEqual(Object.keys(catalog[locale]).sort(), Object.keys(catalog['en-CA']).sort());
      for (const [key, value] of Object.entries(catalog[locale])) {
        assert.equal(typeof value, 'string', `${locale}: ${key}`);
        assert.ok(value.trim(), `${locale}: ${key}`);
        assert.deepEqual(tokens(value), tokens(catalog['en-CA'][key]), `${locale}: ${key}`);
      }
    }
  }
  for (const locale of ['fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.notEqual(getPlatformAdminTranslator(locale)('Platform administration'), getPlatformAdminTranslator('en-CA')('Platform administration'));
    assert.notEqual(getSystemTicketCopy(locale).printTitle, getSystemTicketCopy('en-CA').printTitle);
    assert.notEqual(getTrainingExamCopy(locale).submitWarning, getTrainingExamCopy('en-CA').submitWarning);
  }
});

test('unsupported locale falls back safely and interpolation preserves literal user data', () => {
  for (const value of ['unknown', '__proto__', 'constructor']) {
    assert.equal(getPlatformAdminTranslator(value)('Language'), 'Language');
    assert.equal(getSystemTicketCopy(value), getSystemTicketCopy('en-CA'));
    assert.equal(getTrainingExamCopy(value), getTrainingExamCopy('en-CA'));
  }
  assert.equal(getPlatformAdminTranslator('fr-CA')('{p0} is ready for controlled changes.', { p0: '$& 客户' }).includes('$& 客户'), true);
  assert.equal(formatExamMessage(getTrainingExamCopy('ko-CA'), 'certificateNumber', { folio: '$& <folio>' }).includes('$& <folio>'), true);
});

test('language selector selects only the existing supported languages through the shared preference', () => {
  let currentLocale = 'fr-CA';
  const selected = [];
  const languages = locales.map(code => ({ code, name: code }));
  const ui = createTypeScriptLoader({
    '../context/LanguageContext': { languages },
    '../shared/context': { useLanguage: () => ({ currentLanguage: { code: currentLocale }, setCurrentLanguage: value => selected.push(value) }) },
    './translations/usePlatformAdminTranslations': { usePlatformAdminTranslations: () => ({ t: getPlatformAdminTranslator(currentLocale) }) },
  })(resolve(root, 'PlatformAdmin/PlatformAdminLanguageSelect.tsx'));
  function selectFrom(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(selectFrom).find(Boolean);
    return node.type === 'select' ? node : selectFrom(node.props.children);
  }
  for (const locale of locales) {
    currentLocale = locale;
    const node = ui.PlatformAdminLanguageSelect();
    const select = selectFrom(node);
    assert.equal(select.props.value, locale);
    assert.equal(select.props['aria-label'], getPlatformAdminTranslator(locale)('Language'));
    select.props.onChange({ target: { value: locale } });
  }
  assert.deepEqual(selected.map(value => value.code), locales);
  selectFrom(ui.PlatformAdminLanguageSelect()).props.onChange({ target: { value: 'unknown' } });
  assert.equal(selected.length, locales.length);
});

test('ticket exports localize operational captions and safely escape authored content', () => {
  let printed;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const printing = createTypeScriptLoader({ '../BasicModules/shared/print/documentHtmlPrintEngine': { escapeDocumentPrintHtml: escape, printDocumentHtml: value => { printed = value; } } })(resolve(root, 'SystemTickets/systemTicketPrint.ts'));
  const detail = { ticket: { folio: 'T-41', title: '<script>customer title</script>', type: 'FAILURE', priority: 'HIGH', status: 'OPEN', description: 'First line\n<customer text>', distributor_name: 'Client Name', reporter_name: 'Alex', reporter_email: 'alex@example.test', created_at: '2026-09-08T10:00:00Z', updated_at: '2026-09-08T11:00:00Z', first_responded_at: null, target_resolution_at: null, reopened_count: 0 }, events: [{ event_type: 'ASSIGNED', actor_name: 'Alex', actor_email: 'alex@example.test', created_at: '2026-09-08T10:00:00Z', visibility: 'INTERNAL' }], attachments: [] };
  for (const locale of locales) {
    const copy = getSystemTicketCopy(locale);
    printing.printSystemTicketDetail({ detail, locale });
    assert.equal(printed.locale, locale);
    for (const caption of [copy.printTitle, copy.ownerEvent, copy.internalNote, copy.traceability, copy.evidence, copy.pending]) assert.ok(printed.bodyHtml.includes(escape(caption)), `${locale}: ${caption}`);
    assert.ok(printed.bodyHtml.includes('Client Name'));
    assert.ok(printed.bodyHtml.includes('&lt;script&gt;customer title&lt;/script&gt;'));
    assert.ok(printed.bodyHtml.includes('First line<br />&lt;customer text&gt;'));
    assert.ok(!printed.bodyHtml.includes('<script>'));
  }
});

test('exam entry and certificate card render all locales while keeping holder identity and results', () => {
  let locale = 'en-CA';
  const panel = createTypeScriptLoader({
    './translations/exam/useTrainingExamCopy': { useTrainingExamCopy: () => ({ locale, copy: getTrainingExamCopy(locale), format: (key, values) => formatExamMessage(getTrainingExamCopy(locale), key, values) }) },
    '../lib/apiClient': { apiClient: () => { throw new Error('SSR must not call an API'); } },
    './trainingCertificatePdf': { downloadTrainingCertificate: async () => {} },
  })(resolve(root, 'Training/TrainingExamPanel.tsx'));
  for (const value of locales) {
    locale = value;
    const html = renderToStaticMarkup(React.createElement(panel.TrainingExamPanel, { basePath: '/api/v1/platform/training', exam: { code: 'rh', question_count: 15, duration_minutes: 20, pass_score: 12, attempts: 0, passed: false, best_score: null, active_attempt_id: null, cooldown_until: null, ready: true }, title: 'Authored assessment', onChanged() {} }));
    assert.ok(html.includes(getTrainingExamCopy(locale).start));
    assert.ok(html.includes('Authored assessment'));
    assert.ok(html.includes('12/15'));
    const card = renderToStaticMarkup(React.createElement(panel.CertificateCard, { certificate: { folio: 'CERT-41', holder_name: '김 Alex', expires_at: '2027-09-08T10:00:00Z' } }));
    assert.ok(card.includes(getTrainingExamCopy(locale).download));
    assert.ok(card.includes('김 Alex'));
    assert.ok(card.includes('CERT-41'));
  }
});

test('certificate renderer embeds CJK glyphs through the system canvas and keeps Latin text native', () => {
  const images = [], texts = [], glyphs = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ measureText: text => ({ width: [...text].length * 12 }), fillText: text => glyphs.push(text) }), toDataURL: () => 'data:image/png;base64,rendered' };
  const { certificateText } = createTypeScriptLoader({}, { document: { createElement: () => canvas } })(resolve(root, 'Training/certificateText.ts'));
  const doc = { text: (...args) => texts.push(args), addImage: (...args) => images.push(args), getFontSize: () => 12, getFont: () => ({ fontStyle: 'bold' }), getTextColor: () => '#123456', internal: { pageSize: { getWidth: () => 297 } } };
  certificateText(doc, 'Certificat de formation', 140, 68);
  assert.equal(texts.length, 1);
  assert.equal(images.length, 0);
  certificateText(doc, '교육 인증서', 140, 68, { align: 'center' });
  certificateText(doc, '培训证书', 140, 82);
  assert.deepEqual(glyphs, ['교육 인증서', '培训证书']);
  assert.equal(texts.length, 1);
  assert.equal(images.length, 2);
  assert.ok(images[0][2] < 140, 'center alignment preserved');
  assert.ok(images.every(args => args[4] > 0 && args[5] > 0));
});
