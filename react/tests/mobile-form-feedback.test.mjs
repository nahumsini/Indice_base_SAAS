import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const load = createTypeScriptLoader();
const root = resolve(import.meta.dirname, '../src/app');
const { focusFirstInvalidControl, revealModalFeedback } = load(resolve(root, 'components/indice-modal/modalFormFeedback.ts'));
const { getFormFeedbackCopy } = load(resolve(root, 'components/indice-modal/formFeedbackCopy.ts'));

test('an invalid-step attempt focuses the first visible, enabled error without touching other fields', () => {
  const calls = [];
  const control = (name, disabled = false, visible = true) => ({ matches: () => disabled, getClientRects: () => visible ? [{}] : [], focus: () => calls.push(`focus:${name}`), scrollIntoView: () => calls.push(`scroll:${name}`) });
  const fields = [control('hidden', false, false), control('disabled', true), control('name'), control('email')];
  assert.equal(focusFirstInvalidControl({ querySelectorAll: () => fields }), true);
  assert.deepEqual(calls, ['focus:name', 'scroll:name']);
  assert.equal(focusFirstInvalidControl(null), false);
  assert.equal(focusFirstInvalidControl({ querySelectorAll: () => [] }), false);
});

test('new error summaries scroll only when clipped and never take input focus', () => {
  let scrolls = 0;
  const dialog = { getBoundingClientRect: () => ({ top: 8, bottom: 820 }) };
  const body = { getBoundingClientRect: () => ({ top: 120, bottom: 700 }) };
  let rect = { top: 200, bottom: 260 };
  const alert = { getClientRects: () => [{}], closest: selector => selector.includes('indice-modal-body') ? body : dialog,
    getBoundingClientRect: () => rect, scrollIntoView: () => scrolls++, focus: () => assert.fail('typing focus must be preserved') };
  revealModalFeedback(alert);
  assert.equal(scrolls, 0);
  rect = { top: -200, bottom: -100 };
  revealModalFeedback(alert);
  assert.equal(scrolls, 1);
  // Short viewport: the growing body exceeds the dialog's visible bounds.
  body.getBoundingClientRect = () => ({ top: 120, bottom: 1400 });
  rect = { top: 900, bottom: 960 };
  revealModalFeedback(alert);
  assert.equal(scrolls, 2);
});

test('HR email labels and error messages are associated in the rendered form', () => {
  const { TextField } = load(resolve(root, 'BasicModules/HumanResources/Employees/components/CreateEmployeeModal/fields/TextField.tsx'));
  const html = renderToStaticMarkup(React.createElement(TextField, { label: 'Correo', type: 'email', required: true, value: 'bad', onChange() {}, error: 'Escribe un correo como nombre@empresa.com.' }));
  const id = html.match(/<input[^>]*\sid="([^"]+)"/)[1];
  const described = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.ok(html.includes(`for="${id}"`));
  assert.ok(html.includes(`id="${described}"`));
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-required="true"/);
  assert.match(html, /inputMode="email"/i);
  assert.match(html, /role="alert"/);
});

test('field guidance is localized across every ERP locale and keeps the missing field names', () => {
  for (const locale of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = getFormFeedbackCopy(locale);
    assert.ok(copy.required && copy.saving && copy.positiveAmount);
    assert.ok(copy.missingFields(['Fixture field']).includes('Fixture field'));
  }
  assert.equal(getFormFeedbackCopy('unknown').saving, getFormFeedbackCopy('en-CA').saving);
});
