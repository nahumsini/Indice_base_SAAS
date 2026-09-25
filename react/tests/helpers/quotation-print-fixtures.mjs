import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadTypescript } from './hook-runtime.mjs';

const root = resolve(import.meta.dirname, '../../src/app/BasicModules');
export function printModules(overrides = {}) {
  const cache = new Map();
  const load = path => {
    const file = resolve(root, path);
    if (cache.has(file)) return cache.get(file);
    const result = loadTypescript(file, id => {
      if (overrides[id]) return overrides[id];
      if (id === 'jspdf') return { __esModule: true, default: class {}, jsPDF: class {} };
      if (id === 'jspdf-autotable') return { __esModule: true, default() {} };
      if (id === 'sonner') return { toast: { error() {} } };
      const base = resolve(dirname(file), id);
      const target = [base + '.ts', base + '.tsx', resolve(base, 'index.ts')].find(existsSync);
      if (!target) throw new Error('Unresolved print fixture import: ' + id);
      return load(target);
    });
    cache.set(file, result);
    return result;
  };
  return load;
}

export function quotationFixture(count = 3, locale = 'es-MX') {
  return {
    contract: { category: 'transaction-document', modifiers: ['customer-facing'], pageSize: 'a4', orientation: 'portrait', version: '1.0' },
    fileName: { documentType: 'quotation', identifier: 'COT-001' },
    locale, title: 'Cotización', folio: 'COT-001', status: 'Vigente', issuer: 'Tornillería de prueba', recipient: 'Cliente de prueba',
    generatedAt: new Date('2026-09-17T12:00:00Z'),
    metadata: [{ label: 'Fecha', value: '17/09/2026' }, { label: 'Moneda', value: 'MXN' }, { label: 'Contacto', value: 'ventas@example.invalid' }],
    tables: [{ title: 'Productos', columns: ['Producto', 'Cantidad', 'Precio', 'Total'], numericColumnIndices: [1, 2, 3], rows: Array.from({ length: count }, (_, index) => [`Tornillo galvanizado ${index + 1} — M8 × 40 mm`, '10', '12.50 MXN', '125.00 MXN']) }],
    metrics: [{ label: 'Subtotal', value: '375.00 MXN' }, { label: 'Impuestos', value: '60.00 MXN' }, { label: 'Total', value: '435.00 MXN' }],
    sections: [{ title: 'Condiciones', paragraphs: ['Entrega sujeta a las condiciones registradas. Documento de prueba; no es una operación real.'] }],
    signatures: [{ label: 'Recibió', caption: 'Cliente de prueba' }],
  };
}
