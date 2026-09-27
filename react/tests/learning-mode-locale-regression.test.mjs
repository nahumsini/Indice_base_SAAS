import assert from 'node:assert/strict';
import test from 'node:test';
import { createEnglishOverviewControl } from '../src/app/learningMode/englishOverview.ts';
import { parseLearningModePreferences } from '../src/app/learningMode/preferences.ts';
import { getLearningModeSettingsCopy } from '../src/app/learningMode/settingsCopy.ts';

const owners = [
  ['BasicModules/Expenses', 'expenses'], ['BasicModules/PettyCash', 'pettyCash'],
  ['BasicModules/Receivables', 'receivables'], ['BasicModules/Kpis', 'kpis'],
  ['BasicModules/PointOfSale', 'pointOfSale'], ['ComplementaryModules/Inventory', 'inventory'],
];
for (const [directory, prefix] of owners) {
  test(`${prefix}: English overview contains complete instructions and stable journey IDs`, async () => {
    const { [`${prefix}LearningEnglish`]: overview } = await import(`../src/app/${directory}/operationalGuidance/${prefix}LearningEnglish.ts`);
    for (const [id, copy] of Object.entries(overview)) {
      for (const field of ['label', 'objective', 'instructions', 'whenToUse', 'example']) assert.ok(copy[field]?.trim(), `${id}.${field}`);
      const control = createEnglishOverviewControl(id, copy);
      assert.equal(control.id, `${id}-overview`);
      assert.equal(control.behavior, copy.instructions);
      assert.ok(Object.values(control.tipByCharacter).every(Boolean));
      assert.ok(Object.values(control.storyByCharacter).every(Boolean));
    }
  });
}

test('English variants provide actionable loading and save errors', () => {
  for (const locale of ['en-US', 'en-CA']) {
    const copy = getLearningModeSettingsCopy(locale);
    assert.equal(copy.title, 'Learning mode');
    assert.equal(copy.retry, 'Retry');
    assert.match(copy.footerSummary, /account/);
    assert.match(copy.saveError, /could not be saved/);
    assert.match(copy.loadError, /could not be loaded/);
  }
});

test('invalid remote preference data cannot become a stored opt-in', () => {
  for (const value of [null, [], {}, { version: 2, active: true, visible: true, step: 0 },
    { version: 1, active: 'false', visible: true, step: 0 }, { version: 1, active: false, visible: true, step: NaN }]) {
    assert.equal(parseLearningModePreferences(value), null);
  }
  assert.deepEqual(parseLearningModePreferences({ version: 1, active: false, visible: true, step: -2 }),
    { version: 1, active: false, visible: true, step: 0 });
});
