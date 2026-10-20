import assert from 'node:assert/strict';
import test from 'node:test';
import {getPasswordRecoveryCopy,newPasswordIssue,recoveryError} from '../src/app/Auth/passwordRecoveryCopy.ts';
test('new passwords respect exact UTF-8 encoder capacity and keep meaningful spaces',()=>{
 assert.equal(newPasswordIssue('        '),'required');
 assert.equal(newPasswordIssue('short'),'short');
 assert.equal(newPasswordIssue(' exact password '),null);
 assert.equal(newPasswordIssue('é'.repeat(36)),null);
 assert.equal(newPasswordIssue('é'.repeat(37)),'long');
 assert.equal(newPasswordIssue('🙂'.repeat(25)),'long');
});
test('recovery errors stay actionable and do not expose provider or database detail',()=>{
 const copy=getPasswordRecoveryCopy('es-MX');
 assert.equal(recoveryError('SQL synthetic private details',copy),copy.saveError);
 assert.equal(recoveryError('Password reset link is invalid or expired.',copy),copy.invalidDescription);
 assert.equal(recoveryError('Password and confirmation must match.',copy),copy.mismatch);
 assert.equal(recoveryError('Password is too long.',copy),copy.long);
});
test('all eight interface locales have complete recovery labels and guidance',()=>{
 for(const locale of ['es-MX','es-CO','en-CA','en-US','fr-CA','pt-BR','ko-CA','zh-CA']){
  for(const [key,value] of Object.entries(getPasswordRecoveryCopy(locale)))assert.equal(typeof value==='string'&&value.length>0,true,`${locale}:${key}`);
 }
});
