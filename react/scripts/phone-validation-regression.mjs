import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const tempDir = mkdtempSync(path.join(tmpdir(), 'indice-phone-validation-'));
const bundledModulePath = path.join(tempDir, 'phone-validation.bundle.mjs');

const positiveCases = [
  { country: 'MX', national: '5512345678', international: '+52 55 1234 5678' },
  { country: 'US', national: '2025550125', international: '+1 202 555 0125' },
  { country: 'CA', national: '4165551234', international: '+1 416 555 1234' },
  { country: 'ES', national: '612345678', international: '+34 612 34 56 78' },
  { country: 'CO', national: '3201234567', international: '+57 320 1234567' },
  { country: 'AR', national: '1123456789', international: '+54 11 2345 6789' },
  { country: 'BR', national: '11912345678', international: '+55 11 91234 5678' },
  { country: 'CL', national: '912345678', international: '+56 912345678' },
  { country: 'PE', national: '912345678', international: '+51 912 345 678' },
];

const negativeCases = [
  { selectedCountry: 'CA', value: '2025550125', description: 'US national number should fail for Canada' },
  { selectedCountry: 'US', value: '4165551234', description: 'Canadian national number should fail for United States' },
  { selectedCountry: 'ES', value: '+52 55 1234 5678', description: 'Mexican international number should fail for Spain' },
  { selectedCountry: 'MX', value: '+34 612 34 56 78', description: 'Spanish international number should fail for Mexico' },
  { selectedCountry: 'CL', value: '+57 320 1234567', description: 'Colombian international number should fail for Chile' },
  { selectedCountry: 'PE', value: 'abc123', description: 'Invalid characters should fail for Peru' },
];

const run = async () => {
  try {
    await build({
      absWorkingDir: process.cwd(),
      bundle: true,
      entryPoints: ['src/app/shared/validation/phone.ts'],
      format: 'esm',
      outfile: bundledModulePath,
      platform: 'node',
      target: ['node22'],
    });

    const {
      normalizePhoneInputForCountry,
      validatePhoneForProfileCountry,
    } = await import(pathToFileURL(bundledModulePath).href);

    positiveCases.forEach(({ country, national, international }) => {
      const normalizedNational = normalizePhoneInputForCountry(national, country);
      const nationalValidation = validatePhoneForProfileCountry(normalizedNational, country);
      assert.equal(
        nationalValidation.ok,
        true,
        `Expected ${country} national number ${national} to pass after normalization (${normalizedNational})`,
      );

      const normalizedInternational = normalizePhoneInputForCountry(international, country);
      const internationalValidation = validatePhoneForProfileCountry(normalizedInternational, country);
      assert.equal(
        internationalValidation.ok,
        true,
        `Expected ${country} international number ${international} to pass after normalization (${normalizedInternational})`,
      );
    });

    negativeCases.forEach(({ selectedCountry, value, description }) => {
      const normalizedValue = normalizePhoneInputForCountry(value, selectedCountry);
      const validation = validatePhoneForProfileCountry(normalizedValue, selectedCountry);
      assert.equal(
        validation.ok,
        false,
        `Expected ${description}; got normalized value ${normalizedValue}`,
      );
    });

    console.log(
      `Phone validation regression passed: ${positiveCases.length * 2} positive assertions and ${negativeCases.length} negative assertions.`,
    );
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
