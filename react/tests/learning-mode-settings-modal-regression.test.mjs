import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('el birrete abre la configuración de Modo aprendiz sin cambiarla directamente', () => {
  const header = read('src/app/components/Header.tsx');
  const app = read('src/app/App.tsx');

  assert.match(header, /setIsLearningModeSettingsOpen\(true\)/);
  assert.match(header, /<LearningModeSettingsModal/);
  assert.match(header, /aria-haspopup="dialog"/);
  assert.doesNotMatch(header, /onToggleLearningMode/);
  assert.match(app, /onSaveLearningModeSettings=\{saveLearningModeSettings\}/);
});

test('el modal usa el sistema compartido, borrador local y guardado explícito', () => {
  const modal = read('src/app/learningMode/components/LearningModeSettingsModal.tsx');

  assert.match(modal, /<IndiceModalFrame/);
  assert.match(modal, /modalType="standard-form"/);
  assert.match(modal, /tone="blue"/);
  assert.match(modal, /useState<LearningModeSettings>\(currentSettings\)/);
  assert.match(modal, /onSave\(\{/);
  assert.match(modal, /JOURNEY_STAGE_COUNT = 6/);
  assert.match(modal, /step: 0/);
  assert.match(modal, /disabled=\{!draft\.active\}/);
});

test('el guardado conserva una sola preferencia por usuario y empresa', () => {
  const preferences = read('src/app/learningMode/preferences.ts');
  const hook = read('src/app/hooks/useLearningModePreferences.ts');
  const contract = read('../docs/indice-frontend-operating-system-v2.md');

  assert.match(preferences, /indice\.app\.learningMode\.user-\$\{session\.user\.id\}\.company-\$\{session\.company\.id\}/);
  assert.match(hook, /saveLearningModeSettings/);
  assert.match(hook, /writeLearningModePreferences\(window\.localStorage, storageKey, nextPreferences\)/);
  assert.match(contract, /Global learning settings/);
});
