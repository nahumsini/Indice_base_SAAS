import assert from 'node:assert/strict';
import test from 'node:test';
import { publishCatalogOffer } from '../src/app/PlatformAdmin/CatalogWorkspace/catalogPublication.ts';

const draftCatalog = {
  versions: [{ id: 1, version_code: 'old', status: 'ACTIVE' }, { id: 2, version_code: 'next', status: 'DRAFT' }],
  products: [], prices: [],
};
const publishedCatalog = {
  ...draftCatalog,
  versions: [{ id: 1, version_code: 'old', status: 'SUPERSEDED' }, { id: 2, version_code: 'next', status: 'ACTIVE' }],
};
const publication = {
  catalog_version_id: 2, version_code: 'next', status: 'ACTIVE', published: true,
  stripe_mode: 'TEST', synchronized_products: 13,
};

test('publication sends only saved-version authority and refreshes the verified offer', async () => {
  const calls = [];
  const result = await publishCatalogOffer({
    synchronizeAndPublishCatalogDraft: async (...args) => {
      calls.push(args);
      return publication;
    },
    getCatalog: async () => publishedCatalog,
  }, 2, { target_mode: 'LIVE', confirmation: 'PUBLICAR EN STRIPE LIVE' });
  assert.deepEqual(calls, [[2, { target_mode: 'LIVE', confirmation: 'PUBLICAR EN STRIPE LIVE' }]]);
  assert.equal(result.published, true);
  assert.equal(result.versionCode, 'next');
  assert.equal(result.catalog, publishedCatalog);
});

test('partial Stripe failure refreshes progress without another write or claiming publication', async () => {
  let writes = 0;
  const result = await publishCatalogOffer({
    synchronizeAndPublishCatalogDraft: async () => {
      writes += 1;
      throw new Error('Stripe is unavailable; retry after checking the offer.');
    },
    getCatalog: async () => draftCatalog,
  }, 2, { target_mode: 'TEST' });
  assert.equal(writes, 1);
  assert.equal(result.published, false);
  assert.equal(result.catalog.versions[0].status, 'ACTIVE');
  assert.match(result.error, /Stripe is unavailable/);
});

test('a lost response is reconciled against the exact version before offering a retry', async () => {
  const result = await publishCatalogOffer({
    synchronizeAndPublishCatalogDraft: async () => { throw new Error('Network error'); },
    getCatalog: async () => publishedCatalog,
  }, 2, { target_mode: 'TEST' });
  assert.equal(result.published, true);
  assert.equal(result.versionCode, 'next');
});

test('successful publication survives a subsequent catalog refresh failure', async () => {
  const result = await publishCatalogOffer({
    synchronizeAndPublishCatalogDraft: async () => publication,
    getCatalog: async () => { throw new Error('Network error'); },
  }, 2, { target_mode: 'TEST' });
  assert.equal(result.published, true);
  assert.equal(result.catalog, null);
});

test('an unconfirmed operation remains unconfirmed when refresh is unavailable', async () => {
  const result = await publishCatalogOffer({
    synchronizeAndPublishCatalogDraft: async () => { throw new Error('Network error'); },
    getCatalog: async () => { throw new Error('Network error'); },
  }, 2, { target_mode: 'TEST' });
  assert.equal(result.published, false);
  assert.equal(result.catalog, null);
});
