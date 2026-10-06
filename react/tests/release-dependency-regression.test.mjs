import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate';
import {jsPDF} from 'jspdf';

test('release lock keeps the patched archive and sanitization libraries', () => {
  const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url)));
  assert.equal(lock.packages['node_modules/fflate'].version, '0.8.3');
  assert.equal(lock.packages['node_modules/dompurify'].version, '3.4.16');
});

test('public catalog ZIP creation and PDF generation remain compatible', () => {
  const content = 'Indice catalog: synthetic regression fixture';
  const archive = zipSync({'catalog.txt': strToU8(content)});
  assert.equal(strFromU8(unzipSync(archive)['catalog.txt']), content);
  const document = new jsPDF();
  document.text(content, 10, 10);
  assert.ok(document.output('arraybuffer').byteLength > 0);
});
