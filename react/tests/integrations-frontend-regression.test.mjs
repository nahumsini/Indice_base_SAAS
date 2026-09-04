import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const integrationsRoot = resolve(root, 'src/app/BasicModules/Dashboard/Integrations');
const read = (path) => readFileSync(resolve(integrationsRoot, path), 'utf8');

const pageSource = read('Integrations.tsx');
const guideSource = read('components/AiSetupGuide.tsx');
const guideVisualsSource = read('components/ChatGptSetupVisuals.tsx');
const wizardSource = read('components/CreateAiConnectionWizard.tsx');
const revokeSource = read('components/RevokeAiConnectionDialog.tsx');
const constantsSource = read('constants.ts');
const spanishSource = read('translations/es-MX.ts');
const visualSource = [
  pageSource,
  read('components/AiQuestionIdeas.tsx'),
  guideSource,
  guideVisualsSource,
  read('components/ConnectionDetail.tsx'),
  read('components/ConnectionList.tsx'),
  read('components/ConnectionPermissionChoices.tsx'),
  read('components/ConnectionTrustStrip.tsx'),
  wizardSource,
  revokeSource,
].join('\n');

test('Conectar IA usa los patrones canónicos del Frontend Engine', () => {
  assert.match(pageSource, /<IndiceTitleBar/);
  assert.match(pageSource, /tone="blue"/);
  assert.match(pageSource, /<IndiceWorkspaceNavigation<WorkspaceSection>/);
  assert.match(pageSource, /'guide' \| 'ideas'/);
  assert.match(pageSource, /getIntegrationsTranslations/);
  assert.doesNotMatch(visualSource, /tone="aqua"|#59C3A5|#177D66|#126553/);
});

test('la guía pública muestra solo ChatGPT y conserva Mis conexiones fuera de navegación', () => {
  assert.match(pageSource, /useState<WorkspaceSection>\('guide'\)/);
  assert.doesNotMatch(pageSource, /id: 'connections'/);
  assert.doesNotMatch(pageSource, /useAiConnections|ConnectionsWorkspace|CreateAiConnectionWizard/);
  assert.match(guideSource, /aria-expanded=\{expanded\}/);
  assert.match(guideSource, /copyText\(INDICE_MCP_SERVER_URL\)/);
  assert.match(constantsSource, /https:\/\/app\.indiceapp\.com\/api\/v1\/ai\/mcp/);
});

test('la configuración de ChatGPT explica los cuatro pasos con referencias visuales', () => {
  assert.match(spanishSource, /Activa el Modo desarrollador/);
  assert.match(spanishSource, /Aplicar CSP en modo desarrollador/);
  assert.match(spanishSource, /Crea un nuevo complemento/);
  assert.match(spanishSource, /Autenticación.*OAuth/s);
  assert.match(spanishSource, /Autoriza tu cuenta/);
  assert.match(guideVisualsSource, /DeveloperModeVisual/);
  assert.match(guideVisualsSource, /AppsVisual/);
  assert.match(guideVisualsSource, /FormVisual/);
  assert.match(guideVisualsSource, /AuthorizationVisual/);
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
