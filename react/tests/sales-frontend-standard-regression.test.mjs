import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const salesRoot = resolve(root, 'src/app/BasicModules/Sales');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Ventas respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(salesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Oportunidades limita la divisa preferida a la barra KPI y conserva la tabla transaccional', () => {
  const opportunitiesSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const kpiSource = readFileSync(resolve(salesRoot, 'Prospectos/components/ProspectosKpiStrip.tsx'), 'utf8');
  const tableSource = readFileSync(resolve(salesRoot, 'Prospectos/table/ProspectosTable.tsx'), 'utf8');

  assert.match(kpiSource, /currencyContext=\{currencyContext\}/);
  assert.match(kpiSource, /value: periodWonConvertedLabel/);
  assert.match(kpiSource, /value: convertedPipelineLabel/);
  assert.match(kpiSource, /value: periodLostConvertedLabel/);
  assert.match(opportunitiesSource, /nativeBreakdown: pipelineNativeBreakdown/);
  assert.match(opportunitiesSource, /exchangeRateMetadata\.sourceDate/);
  assert.doesNotMatch(tableSource, /preferredCurrency|exchangeRatesPerUsd|convertSalesCurrencyAmount/);
});

test('el motor compartido de barras KPI respeta tipografía y contexto monetario', () => {
  const engineSource = readFileSync(resolve(root, 'src/app/BasicModules/shared/operational/OperationalKpiArea.tsx'), 'utf8');

  assert.doesNotMatch(engineSource, prohibitedTypography);
  assert.match(engineSource, /OperationalKpiCurrencyContext/);
  assert.match(engineSource, /nativeBreakdown/);
  assert.match(engineSource, /preferredCurrency/);
  assert.match(engineSource, /excludedRecords/);
});
