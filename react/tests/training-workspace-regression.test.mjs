import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const training = readFileSync(new URL('../src/app/Training/TrainingWorkspace.tsx', import.meta.url), 'utf8');
const induction = readFileSync(new URL('../src/app/Training/IndiceInduction.tsx', import.meta.url), 'utf8');
const rootPortal = readFileSync(new URL('../src/app/PlatformAdmin/PlatformAdminPage.tsx', import.meta.url), 'utf8');
const distributorPortal = readFileSync(new URL('../src/app/DistributorPortal/DistributorPortalPage.tsx', import.meta.url), 'utf8');

test('el programa publica siete sesiones y conserva el proceso comercial completo', () => {
  assert.match(training, /number: 7, title: 'Proceso comercial y acompañamiento'/);
  assert.match(training, /Escuchar durante aproximadamente 20 minutos/);
  assert.match(training, /Negociar agregando valor/);
  assert.match(training, /Construir una relación de 60 meses/);
  assert.equal((training.match(/number: \d, title:/g) ?? []).length, 7);
});

test('root y distribuidores reutilizan el mismo workspace con progreso persistente', () => {
  assert.match(rootPortal, /TrainingWorkspace portal="root"/);
  assert.match(distributorPortal, /TrainingWorkspace portal="distributor"/);
  assert.match(training, /method: 'PATCH'/);
  assert.match(training, /completed_item_codes/);
});

test('la inducción explica la metodología los mercados y los módulos básicos', () => {
  assert.match(training, /Inducción a Índice/);
  assert.match(training, /programa práctico/i);
  assert.match(induction, /aria-label="Pilares de Índice"/);
  assert.match(induction, /aria-label="Mercados"/);
  assert.match(induction, /aria-label="Módulos básicos"/);
  assert.match(induction, /México/);
  assert.match(induction, /Colombia/);
  assert.match(induction, /Canadá/);
  assert.match(induction, /Estados Unidos/);
  assert.match(induction, /Brasil/);
});
