import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTypescript } from './helpers/hook-runtime.mjs';

const { resolveOpportunityWorkspaceFlowId, countOpportunityFlowAssignments } = loadTypescript(
  resolve('src/app/BasicModules/Sales/Prospectos/utils/prospectosFlowWorkspace.ts'),
  () => { throw new Error('Workspace helpers must not fetch or mutate business data.'); },
);
const flows = [{ id: 1, defaultFlow: true }, { id: 2, defaultFlow: false }];

test('a remembered active flow wins over the empty company default', () => {
  assert.equal(resolveOpportunityWorkspaceFlowId(2, flows, 1), 2);
});

test('missing, invalid, removed and foreign flow identifiers fall back to the current catalogue', () => {
  for (const value of [null, undefined, 0, -1, 2.5, NaN, Infinity, '2', {}, 99]) {
    assert.equal(resolveOpportunityWorkspaceFlowId(value, flows, 1), 1);
  }
  assert.equal(resolveOpportunityWorkspaceFlowId(2, [{ id: 3, defaultFlow: true }], 3), 3);
  assert.equal(resolveOpportunityWorkspaceFlowId(2, [], null), null);
  assert.equal(resolveOpportunityWorkspaceFlowId(null, flows, 99), 1);
});

test('counts use only authoritative assignments from the supplied visible records', () => {
  const records = [{ flowId: 2 }, { flowId: 2 }, { flowId: 99 }, {}, { flowId: 0 }];
  const counts = countOpportunityFlowAssignments(records, flows);
  assert.equal(counts.get(1), 0);
  assert.equal(counts.get(2), 2);
  assert.equal(counts.has(99), false);
  assert.deepEqual(records, [{ flowId: 2 }, { flowId: 2 }, { flowId: 99 }, {}, { flowId: 0 }]);
});

test('confirmed reassignment changes both counts without copying or deleting an opportunity', () => {
  const before = [{ id: 'a', flowId: 1 }, { id: 'b', flowId: 1 }];
  const after = before.map(row => row.id === 'a' ? { ...row, flowId: 2 } : row);
  const counts = countOpportunityFlowAssignments(after, flows);
  assert.equal(counts.get(1), 1);
  assert.equal(counts.get(2), 1);
  assert.deepEqual(after.map(row => row.id), before.map(row => row.id));
});

test('the page reuses scoped memory, validates its catalogue, and does not reset the flow with filters', () => {
  const source = readFileSync('src/app/BasicModules/Sales/Prospectos/Prospectos.tsx', 'utf8');
  assert.match(source, /flowId: 'flow'/);
  assert.match(source, /enabled: flowCatalogReady/);
  assert.match(source, /flowCatalogReady && !workspaceReady/);
  assert.match(source, /IndiceViewState variant="loading"/);
  assert.match(source, /resolveOpportunityWorkspaceFlowId\(restored\.flowId/);
  assert.match(source, /opportunityBelongsToCurrentUser\(opportunity, currentUserCompanyId, currentOwnerNames\)/);
  const clear = source.slice(source.indexOf('const handleClearFilters'), source.indexOf('const handleClearFilters') + 400);
  assert.doesNotMatch(clear, /setSelectedFlowId/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test('success feedback waits for the authoritative save and uses the returned destination', () => {
  const source = readFileSync('src/app/BasicModules/Sales/Prospectos/Prospectos.tsx', 'utf8');
  const handler = source.slice(source.indexOf('const handleOpportunityFlowChange'), source.indexOf('const pendingDeleteQuotesCount'));
  assert.ok(handler.indexOf('await updateOpportunityRecord') < handler.indexOf('setFlowReassignment({'));
  assert.match(handler, /savedOpportunity\.flowId/);
  assert.doesNotMatch(handler, /setSelectedFlowId|salesApi\.delete/);
});

test('flow feedback and navigation counts are localized in every supported locale', () => {
  const { prospectosTranslations } = loadTypescript(
    resolve('src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations.ts'),
    () => ({}),
  );
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = prospectosTranslations[locale].flow;
    assert.match(copy.reassigned('Test A', 'Test Flow'), /Test A/);
    assert.match(copy.reassigned('Test A', 'Test Flow'), /Test Flow/);
    assert.match(copy.emptyFlow('Test Flow'), /Test Flow/);
    assert.match(copy.opportunities(10), /10/);
    assert.ok(copy.viewFlow && copy.reassignedDescription && copy.otherFlowsDescription && copy.close);
  }
  for (const locale of ['es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.notEqual(prospectosTranslations[locale].flow.reassignedDescription, prospectosTranslations['en-CA'].flow.reassignedDescription);
  }
});
