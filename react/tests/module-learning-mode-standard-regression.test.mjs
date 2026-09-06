import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('la guía modular compartida conserva títulos y usa el estándar compacto persistente', () => {
  const guideSource = read('src/app/learningMode/components/ModuleLearningGuide.tsx');
  const journeySource = read('src/app/learningMode/components/ModuleLearningJourneyNav.tsx');
  const bridgeSource = read('src/app/learningMode/components/LearningModeHeaderActions.tsx');
  const progressSource = read('src/app/learningMode/useModuleLearningProgress.ts');

  assert.match(guideSource, /<Collapsible/);
  assert.match(guideSource, /Aprender más/);
  assert.match(guideSource, /Ya entendí/);
  assert.match(guideSource, /Cómo usar esta parte/);
  assert.match(guideSource, /Ver caso real/);
  assert.match(progressSource, /company-\$\{session\.company\.id\}:user-\$\{session\.user\.id\}/);
  assert.match(progressSource, /storedState\.storageKey === storageKey/);
  assert.match(journeySource, /IndiceHorizontalScrollControls/);
  assert.match(journeySource, /prefers-reduced-motion/);
  assert.doesNotMatch(bridgeSource, /createPortal/);
  assert.match(bridgeSource, /return children/);
});

test('los módulos enseñan un recorrido lógico navegable sin sustituir sus operaciones', () => {
  const governedModules = [
    ['src/app/BasicModules/ProcessesTasks/ProcessesTasks.tsx', 'src/app/BasicModules/ProcessesTasks/operationalGuidance/components/OperationalModuleGuide.tsx'],
    ['src/app/BasicModules/Sales/Ventas.tsx', 'src/app/BasicModules/Sales/operationalGuidance/components/OperationalModuleGuide.tsx'],
    ['src/app/ComplementaryModules/Inventory/Multiinventarios.tsx'],
    ['src/app/BasicModules/Expenses/ExpensesModule.tsx'],
    ['src/app/BasicModules/PettyCash/CajaChica.tsx'],
    ['src/app/BasicModules/Receivables/index.tsx'],
    ['src/app/BasicModules/Kpis/Kpis.tsx'],
  ];

  governedModules.forEach((paths) => {
    const source = paths.map(read).join('\n');
    const label = paths[0];
    assert.match(source, /activeJourneyId=/, `${label} no identifica la etapa activa`);
    assert.match(source, /journey=/, `${label} no presenta el flujo completo`);
    assert.match(source, /onJourneyChange=/, `${label} no permite navegar el flujo`);
    assert.match(source, /contextSignal=/, `${label} no explica el contexto del paso`);
  });
});

test('POS excluye Venta y el inventario explica catálogo, almacén, existencia y recepción', () => {
  const posSource = read('src/app/BasicModules/PointOfSale/PuntoDeVenta.tsx');
  const inventorySource = read('src/app/ComplementaryModules/Inventory/Multiinventarios.tsx');
  const posJourney = posSource.match(/pointOfSaleLearningJourneyOrder[^=]*= \[([\s\S]*?)\];/)?.[1] ?? '';

  assert.doesNotMatch(posJourney, /'sale'/);
  assert.match(posSource, /learningModeActive && activeTab !== 'sale'/);
  assert.match(posSource, /LearningModeHeaderActionsProvider active=\{showLearningGuide\}/);
  assert.match(inventorySource, /producto \+ almacén/);
  assert.match(inventorySource, /solo entonces aumenta el inventario/);
  assert.ok(
    inventorySource.indexOf("'products',") < inventorySource.indexOf("'warehouses',")
      && inventorySource.indexOf("'warehouses',") < inventorySource.indexOf("'inventory',")
      && inventorySource.indexOf("'providers',") < inventorySource.indexOf("'purchase-orders',"),
    'El recorrido de inventario debe mantener producto, almacén, inventario, proveedor y compra.',
  );
});

test('el Dashboard conserva seis etapas y las presenta como sesiones didácticas', () => {
  const journeyModel = read('src/app/Dashboard/operationalJourney.ts');
  const journeyView = read('src/app/Dashboard/components/OperationalJourney.tsx');
  const spanishCopy = read('src/app/Dashboard/translations/es-MX.ts');
  const stageIds = [
    'company_setup',
    'human_resources',
    'operations',
    'finance',
    'commercial',
    'analytics',
  ];

  stageIds.forEach((stageId) => assert.match(journeyModel, new RegExp(`id: "${stageId}"`)));
  assert.match(journeyView, /stageEmoji/);
  assert.match(journeyView, /copy\.sessionLabel/);
  assert.match(journeyView, /copy\.goalLabel/);
  assert.match(spanishCopy, /sessionLabel: "Sesión"/);
  assert.match(spanishCopy, /goalLabel: "Lo que vas a lograr"/);
});
