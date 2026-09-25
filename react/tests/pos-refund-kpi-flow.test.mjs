import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { refundPercentage } from '../src/app/BasicModules/PointOfSale/KPIs/utils/posKpiAnalytics.ts';

test('fully returned sales remain visible as 100 percent refunds, not zero', () => {
  assert.equal(refundPercentage(0, 100), 100);
});

test('refund percentage uses original sales, while revenue stays net', () => {
  assert.equal(refundPercentage(80, 20), 20);
  assert.equal(refundPercentage(100, 0), 0);
  assert.equal(refundPercentage(0, 0), 0);
  assert.equal(refundPercentage(25, 75), 75);
});

test('the live POS KPI workspace consumes the tested calculation without changing stored amounts', () => {
  const source = readFileSync(new URL('../src/app/BasicModules/PointOfSale/KPIs/KPIs.tsx', import.meta.url), 'utf8');
  assert.match(source, /refundRate: refundPercentage\(revenue, refunds\)/);
  assert.match(source, /const revenue = aggregateValue\(monetary, 'current-sales'\)/);
});
