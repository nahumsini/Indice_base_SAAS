import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('el modal de tickets imprime el expediente completo para ambos portales', async () => {
  const modal = await read('src/app/SystemTickets/SystemTicketDetailModal.tsx');

  assert.match(modal, /printSystemTicketDetail\(\{ detail, locale \}\)/);
  assert.match(modal, /<Printer className="h-4 w-4" \/>\{copy\.print\}/);
  assert.match(modal, /disabled=\{loading \|\| !detail\}/);
});

test('la tabla abre primero la ventana y después obtiene el detalle para imprimir', async () => {
  const workspace = await read('src/app/SystemTickets/SystemTicketsWorkspace.tsx');

  assert.match(workspace, /const targetWindow = window\.open\('', '_blank'\)/);
  assert.match(workspace, /systemTicketsApi\.detail\(portal, ticketId\)/);
  assert.match(workspace, /printSystemTicketDetail\(\{ detail: fullDetail, locale, targetWindow \}\)/);
  assert.match(workspace, /printLoadingId === ticket\.id/);
  assert.match(workspace, /aria-label=\{`\$\{copy\.print\} \$\{ticket\.folio\}`\}/);
});

test('el expediente A4 conserva trazabilidad sin publicar enlaces temporales', async () => {
  const printHelper = await read('src/app/SystemTickets/systemTicketPrint.ts');

  assert.match(printHelper, /pageSize: 'a4'/);
  assert.match(printHelper, /orientation: 'portrait'/);
  assert.match(printHelper, /escapeDocumentPrintHtml/);
  assert.match(printHelper, /escapeDocumentPrintHtml\(copy\.traceability\)/);
  assert.match(printHelper, /attachmentRows/);
  assert.doesNotMatch(printHelper, /download_url/);
  assert.doesNotMatch(printHelper, /window\.print\(/);
});

test('la creación clasifica por módulo real y permite adjuntar una foto', async () => {
  const workspace = await read('src/app/SystemTickets/SystemTicketsWorkspace.tsx');

  assert.match(workspace, /modules=\{data\?\.modules \?\? \[\]\}/);
  assert.match(workspace, /<select className=\{fieldClass\} required value=\{form\.module\}/);
  assert.match(workspace, /modules\.map\(\(moduleName\)/);
  assert.match(workspace, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(workspace, /systemTicketsApi\.presignAttachment\(portal, created\.id, photo\)/);
  assert.match(workspace, /systemTicketsApi\.registerAttachment\(portal, created\.id, presign, photo\)/);
});
