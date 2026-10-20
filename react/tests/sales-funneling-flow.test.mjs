import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadTypescript } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/BasicModules/Sales/Funneling/', import.meta.url);
const campaignModel = loadTypescript(new URL('campaignModel.ts', root).pathname, id => { throw Error(id); });
const { validateFunnel, previewConversion, moveStage, duplicateFunnel, normalizeFunnelView, selectVisibleFunnel } = loadTypescript(new URL('funnelModel.ts', root).pathname, id => { if (id === './campaignModel') return campaignModel; throw Error(id); });

const plan = () => ({ id: 'saved-plan', version: 4, name: 'Campaign', objective: 'Appointments', audience: 'Adults', channel: 'EMAIL', notes: '', status: 'PLANNED', updatedAt: '', estimatedConversion: 10,
  stages: [{ name: 'Attract', action: 'Invite', measure: 'People reached', target: 100 }, { name: 'Convert', action: 'Follow up', measure: 'Appointments', target: 10 }] });

test('drafts permit unanswered targets while defined plans require actionable planning details', () => {
  const draft = plan(); draft.status = 'DRAFT'; draft.objective = ''; draft.stages[1].target = null;
  assert.equal(validateFunnel(draft), null);
  assert.equal(previewConversion(draft.stages), null);
  draft.status = 'PLANNED'; assert.equal(validateFunnel(draft), 'incomplete');
  assert.equal(validateFunnel(plan()), null);
});
test('targets refer to a shrinking cohort and cannot contain negative, fractional or inflated counts', () => {
  for (const target of [-1, 0.5, 101, 10000001, NaN]) {
    const candidate = plan(); candidate.stages[1].target = target;
    assert.equal(validateFunnel(candidate), 'targets');
    assert.equal(previewConversion(candidate.stages), null);
  }
  const candidate = plan(); candidate.stages.splice(1, 0, { name: 'Interest', action: '', measure: '', target: null });
  candidate.stages[2].target = 200; assert.equal(validateFunnel(candidate), 'targets');
});
test('conversion preview distinguishes no target, a zero base, and a true zero target', () => {
  const candidate = plan();
  assert.equal(previewConversion(candidate.stages), 10);
  candidate.stages[0].target = 300; assert.equal(previewConversion(candidate.stages), 3.33);
  candidate.stages[0].target = 4000; candidate.stages[1].target = 107; assert.equal(previewConversion(candidate.stages), 2.68);
  candidate.stages[1].target = 0; assert.equal(previewConversion(candidate.stages), 0);
  candidate.stages[0].target = 0; assert.equal(previewConversion(candidate.stages), null);
});
test('reordering moves the complete stage and preserves the original until committed', () => {
  const candidate = plan(); const moved = moveStage(candidate.stages, 1, -1);
  assert.equal(moved[0].name, 'Convert'); assert.equal(moved[0].target, 10);
  assert.equal(candidate.stages[0].name, 'Attract');
  assert.deepEqual(moveStage(candidate.stages, 0, -1), candidate.stages);
  assert.deepEqual(moveStage(candidate.stages, 1, 1), candidate.stages);
});
test('duplicating creates an independent draft without the source identity or version', () => {
  const source = plan(); const copy = duplicateFunnel(source, 'Campaign copy');
  assert.equal(copy.version, 0); assert.equal(copy.status, 'DRAFT'); assert.equal(copy.id, undefined);
  copy.stages[0].target = 200; assert.equal(source.stages[0].target, 100);
  assert.equal(copy.name, 'Campaign copy');
});
test('stage boundaries and required names remain explicit', () => {
  const candidate = plan(); candidate.stages = [candidate.stages[0]];
  assert.equal(validateFunnel(candidate), 'required');
  candidate.stages = Array.from({ length: 13 }, () => plan().stages[0]); assert.equal(validateFunnel(candidate), 'required');
  candidate.stages = plan().stages; candidate.stages[0].name = '  '; assert.equal(validateFunnel(candidate), 'required');
});
test('navigation uses its own native permission and keeps the operational CRM boundary separate', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/app/access/tabScopeCatalog.ts'), /funneling: 'funneling'/);
  assert.match(read('../src/app/BasicModules/Sales/Ventas.tsx'), /activeTab === 'mailing' \|\| activeTab === 'funneling' \? workspace/);
  assert.match(read('../src/app/BasicModules/Sales/Funneling/FunnelEditor.tsx'), /modalType="operational-workspace"/);
  const api = read('../src/app/BasicModules/Sales/Funneling/funnelApi.ts');
  assert.match(api, /\/api\/v1\/sales\/funnels/);
  assert.doesNotMatch(api, /mailing|send|launch|salesApi/);
});

test('diagram selection follows the filtered page without retaining unavailable records', () => {
  const first = plan(); const second = { ...plan(), id: 'second', name: 'Second' };
  assert.equal(selectVisibleFunnel([first, second], second.id), second);
  assert.equal(selectVisibleFunnel([first], second.id), first);
  assert.equal(selectVisibleFunnel([second], null), second);
  assert.equal(selectVisibleFunnel([], first.id), null);
});
test('view restoration accepts the diagram and normalizes stale or unknown modes', () => {
  assert.equal(normalizeFunnelView('funnel'), 'funnel');
  for (const value of ['list', 'kanban', '', null, undefined, {}, 1]) assert.equal(normalizeFunnelView(value), 'list');
});
test('both views share workspace state and saved estimates without persisting selected records', () => {
  const read = name => readFileSync(new URL(`../src/app/BasicModules/Sales/Funneling/${name}`, import.meta.url), 'utf8');
  const workspace = read('Funneling.tsx'); const diagram = read('FunnelView.tsx');
  assert.match(workspace, /IndiceWorkspaceNavigation variant="views"/);
  assert.match(workspace, /urlFields: \{ view: 'view' \}/);
  assert.match(workspace, /const defaults = \{[^\n]+view:/);
  assert.doesNotMatch(workspace.match(/const defaults = .*/)[0], /selectedId|stages|editor/);
  assert.match(diagram, /plan\.stageEstimates/);
  assert.match(diagram, /plan\.estimatedConversion/);
  assert.match(diagram, /aria-pressed=\{selected === index\}/);
  assert.match(diagram, /copy\.schematicHint/);
  assert.doesNotMatch(diagram, /funnelApi|previewConversion|fetch\(/);
});
