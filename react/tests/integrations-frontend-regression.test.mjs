import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const integrationsRoot = resolve(root, 'src/app/BasicModules/Dashboard/Integrations');
const read = (path) => readFileSync(resolve(integrationsRoot, path), 'utf8');

const pageSource = read('Integrations.tsx');
const wizardSource = read('components/CreateAiConnectionWizard.tsx');
const revokeSource = read('components/RevokeAiConnectionDialog.tsx');
const constantsSource = read('constants.ts');
const spanishSource = read('translations/es-MX.ts');

test('Conectar IA usa los patrones canónicos del Frontend Engine', () => {
  assert.match(pageSource, /<IndiceTitleBar/);
  assert.match(pageSource, /tone="aqua"/);
  assert.match(pageSource, /<IndiceWorkspaceNavigation<WorkspaceSection>/);
  assert.match(pageSource, /connections' \| 'guide' \| 'ideas'/);
  assert.match(pageSource, /getIntegrationsTranslations/);
});

test('la conexión es un wizard guiado y las acciones inician apagadas', () => {
  assert.match(wizardSource, /<IndiceModalFrame/);
  assert.match(wizardSource, /modalType="wizard"/);
  assert.match(wizardSource, /<IndiceModalWizardStepper/);
  assert.match(wizardSource, /useState<AiScopeCode\[]>\(\[\.\.\.READ_SCOPE_CODES\]\)/);
  assert.doesNotMatch(constantsSource, /DEFAULT_SCOPES[\s\S]*tasks\.create/);
});

test('cerrar acceso usa confirmación Índice y no avisos del navegador', () => {
  assert.match(revokeSource, /<IndiceConfirmationDialog/);
  assert.match(revokeSource, /destructive/);
  const moduleSource = [pageSource, wizardSource, revokeSource].join('\n');
  assert.doesNotMatch(moduleSource, /window\.(?:alert|confirm)/);
});

test('el lenguaje explica valor y decisión sin mostrar términos internos', () => {
  assert.match(spanishSource, /Convierte la información de tu negocio en mejores decisiones/);
  assert.match(spanishSource, /Preguntas para decidir/);
  assert.match(spanishSource, /Tu empresa mantiene el control/);
  assert.match(spanishSource, /¿Cuánto vendí hoy y qué necesita mi atención\?/);
  assert.doesNotMatch(spanishSource, /['"][^'"]*\b(?:payload|DTO|scope|endpoint|MCP)\b[^'"]*['"]/i);
});
