import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationDestination } from '../src/app/components/notifications/notificationDestination.ts';
const origin = 'http://127.0.0.1:5175';
test('notification links preserve the owning tab, record and query', () => {
  for (const target of ['/dashboard?conversation=7','/human-resources/announcements','/scheduling/calendar?reservation=8&view=table&from=2026-10-18&to=2026-10-18','/maintenance/orders?order=9','/sales/quotes','/processes-tasks','/expenses#pending']) {
    assert.equal(notificationDestination(target, origin), target);
    assert.equal(notificationDestination(origin + target, origin), target);
  }
});
test('missing, malformed, external and executable notification links remain inside the inbox', () => {
  for (const target of [null,undefined,'','   ','https://other.invalid/dashboard','//other.invalid/x','javascript:alert(1)','data:text/html,hi','/\\other.invalid/x','/path\nother','http://user:secret@127.0.0.1:5175/dashboard']) assert.equal(notificationDestination(target,origin),null);
});
