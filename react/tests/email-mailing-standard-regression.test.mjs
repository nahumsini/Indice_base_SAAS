import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../src/app');
const read = name => readFileSync(resolve(root, name), 'utf8');
const email = name => read(`ComplementaryModules/Email/${name}`);
const mailing = name => read(`BasicModules/Sales/Mailing/${name}`);

test('Email owns one canonical shell and route-backed tabs, without a duplicate standalone wrapper', () => {
  const app = read('App.tsx');
  assert.match(app, /currentPage === 'email'[\s\S]*?<CorreoElectronico onNavigate=/);
  assert.doesNotMatch(app, /email: CorreoElectronico/);
  assert.match(email('CorreoEmpresarial.tsx'), /useRoutedModuleTab\('mail', tabs\)/);
  assert.match(email('CorreoEmpresarial.tsx'), /IndiceModuleShell/);
  assert.match(email('CorreoEmpresarial.tsx'), /key=\{revision\}/);
});

test('Email and Mailing editors use the shared frame with same-frame confirmations and left cancel actions', () => {
  for (const source of [email('AccountEditor.tsx'), email('PreviewComposer.tsx'), mailing('components/CampaignEditor.tsx'), mailing('components/TemplateManager.tsx')]) {
    assert.match(source, /ModalFrame/);
    assert.match(source, /footerLeading=/);
    assert.match(source, /confirmation/);
    assert.match(source, /data-modal-destructive/);
    assert.doesNotMatch(source, /<Dialog(?:\s|>)/);
  }
});

test('Campaign handoff saves before navigation and resumes through the authorized API', () => {
  assert.match(mailing('components/CampaignEditor.tsx'), /await mailingApi\.save\(id\.current, draft\);[\s\S]*?onConfigureAccounts\(id\.current\)/);
  assert.match(mailing('Mailing.tsx'), /email\/accounts\?campaign=\$\{id\}/);
  assert.match(mailing('Mailing.tsx'), /mailingApi\.get\(returnCampaign, controller\.signal\)/);
  assert.match(email('CorreoEmpresarial.tsx'), /sales\/mailing\?campaign=\$\{campaign\}/);
  assert.doesNotMatch(email('AccountEditor.tsx'), /localStorage|sessionStorage|useWorkspaceNavigationMemory/);
  assert.doesNotMatch(mailing('mailingApi.ts'), /smtpPassword|receivePassword|smtpHost/);
});

test('Private account forms never hydrate passwords and distinguish sending from receiving checks', () => {
  const editor = email('AccountEditor.tsx');
  assert.match(editor, /smtpPassword: ''/);
  assert.match(editor, /receivePassword: ''/);
  assert.match(editor, /autoComplete=\{password \? 'new-password'/);
  assert.match(email('EmailAccountsWorkspace.tsx'), /account\.smtpStatus/);
  assert.match(email('EmailAccountsWorkspace.tsx'), /account\.receiveStatus/);
  assert.match(email('EmailAccountsWorkspace.tsx'), /scope\.current !== requestScope/);
});

test('Mail preview is explicit, uses shared internal navigation and keeps message content out of memory', () => {
  const source = email('EmailMailboxWorkspace.tsx');
  assert.match(source, /preview \? previewMessages/);
  assert.match(source, /IndiceWorkspaceNavigation/);
  assert.match(source, /state: filters/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|localStorage|sessionStorage/);
  assert.match(email('translations.ts'), /\{ en, es, fr, pt, ko, zh \}/);
});
