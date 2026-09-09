import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const training = readFileSync(new URL('../src/app/Training/TrainingWorkspace.tsx', import.meta.url), 'utf8');
const induction = readFileSync(new URL('../src/app/Training/IndiceInduction.tsx', import.meta.url), 'utf8');
const trainingProgramSpanish = readFileSync(new URL('../src/app/Training/translations/program/es-MX.ts', import.meta.url), 'utf8');
const inductionTranslations = readFileSync(new URL('../src/app/Training/translations/induction.ts', import.meta.url), 'utf8');
const rootPortal = readFileSync(new URL('../src/app/PlatformAdmin/PlatformAdminPage.tsx', import.meta.url), 'utf8');
const distributorPortal = readFileSync(new URL('../src/app/DistributorPortal/DistributorPortalPage.tsx', import.meta.url), 'utf8');

test('el programa publica siete sesiones y conserva el proceso comercial completo', () => {
  assert.match(training, /id: 'comercial', number: 7, title: copy\.salesProcessAndOngoingSupport/);
  assert.match(trainingProgramSpanish, /"salesProcessAndOngoingSupport": "Proceso comercial y acompañamiento"/);
  assert.match(trainingProgramSpanish, /"listenForApproximatelyMinutes": "Escuchar durante aproximadamente 20 minutos"/);
  assert.match(trainingProgramSpanish, /"negotiateByAddingValue": "Negociar agregando valor"/);
  assert.match(trainingProgramSpanish, /"buildAMonthRelationship": "Construir una relación de 60 meses"/);
  assert.equal((training.match(/number: \d, title: copy\./g) ?? []).length, 7);
});

test('root y distribuidores reutilizan el mismo workspace con progreso persistente', () => {
  assert.match(rootPortal, /TrainingWorkspace portal="root"/);
  assert.match(distributorPortal, /TrainingWorkspace portal="distributor"/);
  assert.match(training, /method: 'PATCH'/);
  assert.match(training, /completed_item_codes/);
});

test('la inducción explica la metodología los mercados y los módulos básicos', () => {
  assert.match(trainingProgramSpanish, /"indiceInduction": "Inducción a Índice"/);
  assert.match(trainingProgramSpanish, /programa práctico/i);
  assert.match(induction, /aria-label=\{t\('lesson162'\)\}/);
  assert.match(induction, /aria-label=\{t\('lesson188'\)\}/);
  assert.match(induction, /aria-label=\{t\('lesson195'\)\}/);
  assert.match(inductionTranslations, /"Pilares de Índice"/);
  assert.match(inductionTranslations, /"Mercados"/);
  assert.match(inductionTranslations, /"Módulos básicos"/);
  assert.match(inductionTranslations, /"México"/);
  assert.match(inductionTranslations, /"Colombia"/);
  assert.match(inductionTranslations, /"Canadá"/);
  assert.match(inductionTranslations, /"Estados Unidos"/);
  assert.match(inductionTranslations, /"Brasil"/);
});
