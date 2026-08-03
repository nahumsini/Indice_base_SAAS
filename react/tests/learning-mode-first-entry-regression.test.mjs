import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildLearningModePreferenceKey,
  defaultLearningModePreferences,
  readLearningModePreferences,
  writeLearningModePreferences,
} from '../src/app/learningMode/preferences.ts';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function createSession(userId, companyId) {
  return {
    user: { id: userId },
    company: { id: companyId },
  };
}

test('la primera entrada abre el Modo Aprendiz y comienza el recorrido', () => {
  const storage = createStorage();
  const key = buildLearningModePreferenceKey(createSession(10, 20));

  assert.deepEqual(readLearningModePreferences(storage, key), {
    version: 1,
    active: true,
    visible: true,
    step: 0,
  });
});

test('cada usuario y empresa conserva su propia preferencia', () => {
  const storage = createStorage();
  const firstKey = buildLearningModePreferenceKey(createSession(10, 20));
  const secondUserKey = buildLearningModePreferenceKey(createSession(11, 20));
  const secondCompanyKey = buildLearningModePreferenceKey(createSession(10, 21));

  writeLearningModePreferences(storage, firstKey, {
    ...defaultLearningModePreferences,
    active: false,
    visible: false,
    step: 4,
  });

  assert.equal(readLearningModePreferences(storage, firstKey).active, false);
  assert.equal(readLearningModePreferences(storage, firstKey).visible, false);
  assert.deepEqual(readLearningModePreferences(storage, secondUserKey), defaultLearningModePreferences);
  assert.deepEqual(readLearningModePreferences(storage, secondCompanyKey), defaultLearningModePreferences);
});

test('App usa preferencias de aprendizaje por sesión y no las claves globales anteriores', async () => {
  const source = await readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8');

  assert.match(source, /useLearningModePreferences\(sessionTabAccess\)/);
  assert.doesNotMatch(source, /useLocalStorageState\('indice\.app\.learningMode(?:Active|Visible)'/);
});
