import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getInviteAcceptCopy,
  localizeInvitationError,
} from '../src/app/Auth/inviteAcceptCopy.ts';

const invitationPage = await readFile(
  new URL('../src/app/Auth/InviteAcceptPage.tsx', import.meta.url),
  'utf8',
);

test('corporate invitation errors are presented in the selected language', () => {
  const copy = getInviteAcceptCopy('es-MX');

  assert.equal(copy.titles.ready, 'Acepta tu invitación a Índice');
  assert.match(
    localizeInvitationError('Invitation is missing business unit or business access.', copy),
    /alcance de acceso válido/,
  );
});

test('invitation page uses the shared Indice identity and language selector', () => {
  assert.match(invitationPage, /IndiceBrandLogo/);
  assert.match(invitationPage, /languages\.map/);
  assert.match(invitationPage, /#59C3A5/);
  assert.match(invitationPage, /#F7C948/);
  assert.match(invitationPage, /#FF6B63/);
  assert.match(invitationPage, /#2F6BFF/);
  assert.doesNotMatch(invitationPage, /bg-\[#143675\]/);
  assert.doesNotMatch(invitationPage, /font-bold|font-extrabold|font-black/);
});

test('invitation details preserve long email addresses instead of truncating them', () => {
  assert.match(invitationPage, /break-words/);
  assert.doesNotMatch(invitationPage, /truncate text-sm font-semibold/);
});
