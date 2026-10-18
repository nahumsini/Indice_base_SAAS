import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';

const root = resolve(import.meta.dirname, '../src/app');
const read = path => readFileSync(resolve(root, path), 'utf8');
class ApiClientError extends Error {
  constructor(status) { super(`Synthetic HTTP ${status}`); this.status = status; }
}
const session = (type = 'DISTRIBUTOR', role = 'superadmin') => ({
  user: { id: 42, role }, company: { id: 8, commercial_account_type: type, active: true },
});
const setup = (actor, failure) => {
  const calls = [];
  const load = createTypeScriptLoader({
    '../api/auth': { authApi: { getSessionOrNull: async () => actor } },
    '../lib/apiClient': { ApiClientError, apiClient: async path => {
      calls.push(path); if (failure) throw failure; return { completed_item_codes: [] };
    } },
    'react-router': { redirect: location => ({ location }) },
  });
  return { ...load(resolve(root, 'Training/trainingAccess.ts')), calls };
};

test('training requires a real session and never queries protected data in public demo', async () => {
  for (const [actor, location] of [[null, '/login'], [{ ...session(), demoMode: true }, '/dashboard']]) {
    const access = setup(actor);
    assert.equal((await access.requireTrainingSession()).location, location);
    assert.equal(access.calls.length, 0);
  }
});

test('distributor training is authorized by its own backend, never platform administration', async () => {
  const access = setup(session());
  assert.equal((await access.requireTrainingSession()).portal, 'distributor');
  assert.deepEqual(access.calls, ['/api/v1/distributor-portal/training']);
});

test('platform learners retain their existing PLATFORM_VIEW boundary, without creating grants', async () => {
  const access = setup(session('SUPER_ADMIN', 'root'));
  assert.equal((await access.requireTrainingSession()).portal, 'root');
  assert.deepEqual(access.calls, ['/api/v1/platform-admin/training']);
});

test('denied access does not fall back to platform APIs or trust a requested portal', async () => {
  for (const actor of [session(), session('DISTRIBUTOR', 'user'), session('SUPER_ADMIN', 'user')]) {
    const access = setup(actor, new ApiClientError(403));
    assert.equal((await access.requireTrainingSession({ request: { url: 'https://local/training?portal=root' } })).location, '/dashboard');
    assert.equal(access.calls.length, 1);
    assert.equal(access.calls[0], actor.company.commercial_account_type === 'DISTRIBUTOR'
      ? '/api/v1/distributor-portal/training' : '/api/v1/platform-admin/training');
  }
});

test('expired sessions return to login, unexpected backend failures stay visible', async () => {
  const expired = setup(session(), new ApiClientError(401));
  assert.equal((await expired.requireTrainingSession()).location, '/login');
  const error = new ApiClientError(503);
  await assert.rejects(setup(session(), error).requireTrainingSession(), failure => failure === error);
});

test('legacy training URLs redirect only the exact old sections to the protected workspace', () => {
  const access = setup(null);
  for (const path of ['/platform-admin?section=training', '/distributor-portal?tab=training']) {
    assert.equal(access.getLegacyTrainingDestination(`https://local${path}`), '/training');
  }
  for (const path of ['/platform-admin?section=customers', '/distributor-portal?tab=tickets', '/platform-admin?tab=training', '/training?section=training']) {
    assert.equal(access.getLegacyTrainingDestination(`https://local${path}`), null);
  }
});

test('training discovery excludes demo and ordinary members, not independent platform viewers', () => {
  const { canDiscoverTraining } = setup(null);
  assert.equal(canDiscoverTraining(session()), true);
  assert.equal(canDiscoverTraining(session('DISTRIBUTOR', 'user')), false);
  assert.equal(canDiscoverTraining(session('SUPER_ADMIN', 'user')), false);
  assert.equal(canDiscoverTraining(session('SUPER_ADMIN', 'user'), 'PLATFORM_SUPPORT'), true);
  assert.equal(canDiscoverTraining({ ...session(), demoMode: true }, 'PLATFORM_ROOT'), false);
});

test('the dedicated route is protected and legacy redirects happen before admin context loading', () => {
  const routes = read('routes.tsx');
  assert.match(routes, /path: '\/training',[\s\S]*?loader: requireTrainingSession/);
  for (const guard of ['requirePlatformAdminSession', 'requireDistributorPortalSession']) {
    const body = routes.split(`const ${guard} =`)[1].split('\n};')[0];
    assert.ok(body.indexOf('getLegacyTrainingDestination') < body.indexOf('getRouteSessionOrNull'));
  }
  const page = read('Training/TrainingPage.tsx');
  assert.match(page, /useLoaderData<TrainingRouteData>/);
  assert.match(page, /TrainingWorkspace portal=\{portal\}/);
  assert.doesNotMatch(page, /platformAdminApi|distributorPortalApi|commercial_account_type|useSearchParams/);
  assert.doesNotMatch(read('PlatformAdmin/PlatformAdminPage.tsx'), /TrainingWorkspace|id: "training"/);
  assert.match(read('Dashboard/components/SystemToolsSection.tsx'), /navigate\('\/training'\)/);
  assert.doesNotMatch(read('components/Header.tsx'), /navigate\('\/training'\)/);
  assert.match(read('DistributorPortal/DistributorPortalPage.tsx'), /to="\/training"/);
  const entrypoint = readFileSync(resolve(root, '../main.tsx'), 'utf8');
  assert.match(routes, /id: 'training-centre',[\s\S]*?path: '\/training'/);
  assert.match(entrypoint, /standaloneWorkspaceRouteIds = new Set\(\['training-centre'\]\)/);
  assert.match(entrypoint, /standaloneWorkspaceRouteIds\.has\(match\.route\.id\)/);
  assert.match(entrypoint, /Boolean\(getLegacyTrainingDestination/);
});

test('standalone training identity is localized in all supported languages', () => {
  const load = createTypeScriptLoader();
  const { getTrainingWorkspaceCopy, trainingWorkspaceCopies } = load(resolve(root, 'Training/translations/workspace.ts'));
  const locales = ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
  assert.deepEqual(Object.keys(trainingWorkspaceCopies).sort(), locales.sort());
  for (const locale of locales) {
    for (const key of ['title', 'subtitle', 'backToErp', 'language']) {
      assert.ok(getTrainingWorkspaceCopy(locale)[key]?.trim(), `${locale}: ${key}`);
    }
  }
});

test('system tool cards preserve individual role and portal boundaries', () => {
  const load = createTypeScriptLoader({
    '../api/auth': { authApi: {} },
    '../lib/apiClient': { ApiClientError, apiClient: async () => { throw new Error('Unexpected transport'); } },
    'react-router': { redirect: location => ({ location }) },
  });
  const { getSystemToolVisibility } = load(resolve(root, 'Dashboard/systemToolAccess.ts'));
  for (const actor of [null, { ...session(), demoMode: true }]) {
    assert.equal(Object.values(getSystemToolVisibility(actor, 'PLATFORM_ROOT')).some(Boolean), false);
  }
  const member = getSystemToolVisibility(session('CUSTOMER', 'user'));
  assert.equal(Object.values(member).some(Boolean), false);
  const admin = getSystemToolVisibility(session('CUSTOMER', 'admin'));
  assert.equal(admin.subscription, true);
  assert.equal(admin.platformAdmin, false);
  assert.equal(admin.training, false);
  const distributor = getSystemToolVisibility(session('DISTRIBUTOR', 'admin'));
  assert.equal(distributor.subscription, true);
  assert.equal(distributor.training, true);
  assert.equal(distributor.platformAdmin, false);
  const rootAccess = getSystemToolVisibility(session('SUPER_ADMIN', 'root'));
  assert.equal(rootAccess.subscription, true);
  assert.equal(rootAccess.platformAdmin, true);
  assert.equal(rootAccess.training, true);
  const viewer = getSystemToolVisibility(session('CUSTOMER', 'user'), 'PLATFORM_SUPPORT');
  assert.equal(viewer.training, true);
  assert.equal(viewer.subscription, false);
  assert.equal(viewer.platformAdmin, false);
  const platformRoot = getSystemToolVisibility(session('SUPER_ADMIN', 'admin'), 'PLATFORM_ROOT');
  assert.equal(platformRoot.platformAdmin, true);
  assert.equal(getSystemToolVisibility(session('SUPER_ADMIN', 'user'), 'PLATFORM_ROOT').platformAdmin, false);
});
