import assert from 'node:assert/strict';
import test from 'node:test';
import { activeProductBenefits, benefitEffectiveStatus, nextBenefitEnd } from '../src/app/PlatformAdmin/CompanyAccount/companyAccountState.ts';

const now = Date.parse('2026-09-13T12:00:00Z');
const grant = (overrides = {}) => ({ reference: 'grant', benefit_type: 'PRODUCT', product_code: 'hr', quantity: 1, source_type: 'SUPPORT', status: 'ACTIVE', reason: 'Support', starts_at: '2026-09-01T00:00:00Z', ends_at: null, ...overrides });

test('expired and future grants do not hide products that can be enabled again', () => {
  const expired = grant({ ends_at: '2026-09-13T12:00:00Z' });
  const future = grant({ product_code: 'sales', starts_at: '2026-09-14T00:00:00Z' });
  assert.equal(benefitEffectiveStatus(expired, now), 'EXPIRED');
  assert.equal(benefitEffectiveStatus(future, now), 'SCHEDULED');
  assert.deepEqual([...activeProductBenefits([expired, future], now).keys()], []);
  assert.equal(activeProductBenefits([expired, grant()], now).get('hr').length, 1);
});

test('revoked and malformed grants never become effective', () => {
  for (const benefit of [grant({ status: 'REVOKED' }), grant({ starts_at: 'invalid' }), grant({ ends_at: 'invalid' })]) {
    assert.notEqual(benefitEffectiveStatus(benefit, now), 'ACTIVE');
  }
});

test('a new product only inherits a current product deadline, ordered by instant', () => {
  const grants = [
    grant({ ends_at: '2026-09-12T00:00:00Z' }),
    grant({ benefit_type: 'SEAT', ends_at: '2026-09-13T13:00:00Z' }),
    grant({ starts_at: '2026-09-14T00:00:00Z', ends_at: '2026-09-14T01:00:00Z' }),
    grant({ ends_at: '2026-09-15T03:00:00+03:00' }),
    grant({ ends_at: '2026-09-15T01:00:00Z' }),
  ];
  assert.equal(nextBenefitEnd(grants, now), '2026-09-15T03:00:00+03:00');
  assert.equal(nextBenefitEnd([grants[0]], now), undefined);
});
