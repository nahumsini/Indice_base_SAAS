import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const load=path=>loadTypescript(resolve('src/app/ComplementaryModules/Scheduling/'+path),()=>{throw Error('Pure configuration utilities cannot load application data');});
test('weekly service and staff hours reject overlap, reversed ranges and invalid clocks',()=>{
 const {validWeeklyHours:valid}=load('utils/setupValidation.ts');
 const row=(startTime,endTime,dayOfWeek=1)=>({startTime,endTime,dayOfWeek});
 assert.equal(valid([]),true);assert.equal(valid([row('09:00','12:00'),row('12:00','14:00')]),true);
 for(const days of [[row('12:00','09:00')],[row('09:00','09:00')],[row('09:00','12:00'),row('11:59','13:00')],[row('25:00','26:00')],[row('09:60','10:00')],[row('09:00','12:00',0)],Array.from({length:29},()=>row('09:00','12:00'))])assert.equal(valid(days),false);
 assert.equal(valid([row('09:00:00','12:00:00'),row('09:00','12:00',2)]),true);
});
test('employee, catalog, public page and client instructions cover all eight locales',()=>{
 const {getSchedulingSetupCopy:get}=load('translations/schedulingSetupCopy.ts');const keys=Object.keys(get('en-CA')).sort();
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){assert.deepEqual(Object.keys(get(locale)).sort(),keys);for(const value of Object.values(get(locale)))assert.ok(value.trim());}
 assert.match(get('es-MX').gapHint,/mayor/);assert.match(get('es-MX').clientHint,/no envía/);
});
