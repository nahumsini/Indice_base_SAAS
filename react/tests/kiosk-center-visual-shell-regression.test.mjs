import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('el Centro de kioscos conserva su header contextual durante el desplazamiento', () => {
  const center = read('src/app/KioskCenter/MultiKioskCenterPage.tsx');

  assert.match(center, /data-kiosk-center-sticky-header/);
  assert.match(center, /sticky top-0 z-30/);
  assert.match(center, /backdrop-blur-xl/);
  assert.match(center, /IndiceAdminWorkspaceHeader/);
  assert.match(center, /backLabel=\{workspaceCopy\.backToDashboard\}/);
  assert.match(center, /className="min-w-max flex-nowrap"/);
  assert.match(center, /activeViewCopy\.description/);
  assert.match(center, /tone="blue"/);
  assert.doesNotMatch(center, /tone="aqua"/);
});

test('el acceso de creación permanece visible pero conserva la autorización vigente', () => {
  const center = read('src/app/KioskCenter/MultiKioskCenterPage.tsx');

  assert.match(center, /<IndiceTitleBar[\s\S]*actions=\{canManageGlobal/);
  assert.match(center, /aria-label=\{adminCopy\.center\.create\}/);
  assert.match(center, /canManageMultiKiosks\(getCachedAuthSession\(\)\)/);
});

test('los filtros anteceden a los indicadores operativos', () => {
  const center = read('src/app/KioskCenter/MultiKioskCenterPage.tsx');
  const filterPosition = center.indexOf('<IndiceFilterBar');
  const kpiPosition = center.indexOf('<KioskStatusNavigator');

  assert.ok(filterPosition > 0);
  assert.ok(kpiPosition > filterPosition);
});

test('las tarjetas reflejan el tema sin sustituir estados ni acciones explícitas', () => {
  const center = read('src/app/KioskCenter/MultiKioskCenterPage.tsx');
  const navigator = read('src/app/KioskCenter/components/KioskStatusNavigator.tsx');
  const contract = read('../docs/kiosk-standard-engine-v2.md');

  for (const theme of ['indice-blue', 'indice-green', 'indice-yellow', 'indice-coral']) {
    assert.match(center, new RegExp(`'${theme}'`));
  }
  assert.match(center, /data-kiosk-theme=\{item\.theme_key\}/);
  assert.match(center, /<StatusBadge status=\{item\.status\}/);
  assert.match(center, /<IndiceTableActionGroup/);
  assert.match(navigator, /data-kiosk-status-navigator/);
  assert.match(contract, /Shell administrativo persistente/);
  assert.match(contract, /azul Índice para navegación, selección/);
});
