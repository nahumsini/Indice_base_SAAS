import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('notification center uses the shared blue operational workspace', async () => {
  const center = await read('../src/app/components/NotificationCenter.tsx');

  assert.match(center, /<IndiceModalFrame/);
  assert.match(center, /modalType="operational-workspace"/);
  assert.match(center, /tone="blue"/);
  assert.match(center, /sticky top-0/);
  assert.match(center, /sticky top-\[65px\]/);
  assert.match(center, /getNotificationDateGroup/);
  assert.match(center, /copy\.today/);
  assert.match(center, /copy\.yesterday/);
  assert.match(center, /copy\.earlier/);
  assert.doesNotMatch(center, /fixed inset-0 z-50/);
});

test('notification hierarchy keeps urgent action and progressive filters discoverable', async () => {
  const [summary, filters] = await Promise.all([
    read('../src/app/components/notifications/NotificationSummaryStrip.tsx'),
    read('../src/app/components/notifications/NotificationFilterBar.tsx'),
  ]);

  assert.match(summary, /onShowUrgent/);
  assert.match(summary, /copy\.viewUrgent/);
  assert.match(filters, /aria-expanded=\{advancedOpen\}/);
  assert.match(filters, /activeAdvancedCount/);
  assert.match(filters, /copy\.clearFilters/);
  assert.match(filters, /text-slate-800/);
});

test('notification cards keep primary actions accessible and dismiss inside overflow', async () => {
  const card = await read('../src/app/components/notifications/NotificationItemCard.tsx');

  assert.match(card, /sm:group-hover:opacity-100/);
  assert.match(card, /<DropdownMenu>/);
  assert.match(card, /variant="destructive"/);
  assert.match(card, /onDismiss\(notification\.id\)/);
  assert.match(card, /before:bg-\[var\(--indice-brand-action\)\]/);
});
