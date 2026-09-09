import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const page = read('src/app/PlatformAdmin/PlatformAdminPage.tsx');
const workspace = read('src/app/InternalDevelopment/InternalDevelopmentWorkspace.tsx');
const editor = read('src/app/InternalDevelopment/InternalDevelopmentEntryModal.tsx');
const detail = read('src/app/InternalDevelopment/InternalDevelopmentDetailModal.tsx');
const print = read('src/app/InternalDevelopment/internalDevelopmentPrint.ts');
const printEngine = read('src/app/BasicModules/shared/print/documentHtmlPrintEngine.ts');
const api = read('src/app/InternalDevelopment/internalDevelopmentApi.ts');

test('el registro interno solo se muestra para PLATFORM_ROOT', () => {
  assert.match(page, /id: "internalDevelopment"/);
  assert.match(page, /Registro de desarrollo interno/);
  assert.match(page, /context\?\.role === "PLATFORM_ROOT"/);
  assert.match(page, /<InternalDevelopmentWorkspace/);
});

test('la bitácora usa los patrones operativos oficiales y no almacenamiento local de negocio', () => {
  assert.match(workspace, /<IndiceTitleBar/);
  assert.match(workspace, /<IndiceFilterBar/);
  assert.match(workspace, /<IndiceOperationalTable/);
  assert.match(workspace, /usePersistentColumnWidths/);
  assert.match(workspace, /<DataTablePagination/);
  assert.doesNotMatch([workspace, editor, detail, print, api].join('\n'), /localStorage/);
});

test('alta edición y trazabilidad terminan en la API protegida', () => {
  assert.match(editor, /modalType="standard-form"/);
  assert.match(editor, /internalDevelopmentApi\.create/);
  assert.match(editor, /internalDevelopmentApi\.update/);
  assert.match(detail, /getInternalDevelopmentMessages\(locale\)\.revisionHistory/);
  assert.match(api, /endpoints\.platformAdmin\.internalDevelopment/);
  assert.match(api, /method: 'POST'/);
  assert.match(api, /method: 'PATCH'/);
});

test('el formulario prioriza captura rápida y conserva trazabilidad opcional', () => {
  assert.match(editor, /const \[advancedOpen, setAdvancedOpen\] = useState\(false\)/);
  assert.match(editor, /getInternalDevelopmentMessages\(locale\)\.quickRecord/);
  assert.match(editor, /getInternalDevelopmentMessages\(locale\)\.addDetailsAndTraceability/);
  assert.match(editor, /aria-expanded=\{advancedOpen\}/);
  assert.match(editor, /\{advancedOpen \? \(/);
  assert.match(editor, /getInternalDevelopmentMessages\(locale\)\.evidenceParticipantsDecisionsAndNextSteps/);
});

test('el expediente ofrece una impresión A4 completa y segura', () => {
  assert.match(detail, /printInternalDevelopmentDetail/);
  assert.match(detail, /getInternalDevelopmentMessages\(locale\)\.print/);
  assert.match(detail, /<Printer/);
  assert.match(print, /printDocumentHtml/);
  assert.match(print, /escapeDocumentPrintHtml/);
  assert.match(print, /pageSize: 'a4'/);
  assert.match(print, /getInternalDevelopmentMessages\(locale\)\.revisionHistory/);
});

test('cada fila permite imprimir el expediente completo sin abrir el modal', () => {
  assert.match(workspace, /const printEntry = \(entryId: number\)/);
  assert.match(workspace, /internalDevelopmentApi\.detail\(entryId\)/);
  assert.match(workspace, /printInternalDevelopmentDetail\(\{ detail: fullDetail/);
  assert.match(workspace, /<Printer/);
  assert.match(workspace, /printLoadingId === entry\.id/);
  assert.match(printEngine, /targetWindow\?: Window \| null/);
  assert.match(printEngine, /targetWindow \?\? window\.open/);
});
