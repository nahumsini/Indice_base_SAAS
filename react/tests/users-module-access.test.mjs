import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source=readFileSync(new URL('../src/app/BasicModules/Dashboard/Users/usersModuleAccess.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {moduleAssignmentState,moduleIdForSlug,modulesWithPreviousAssignments,selectedModuleSlugs,moduleSelectionError}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const ready={id:'sales',slug:'crm',name:'Sales',companyEnabled:true,actorAssignable:true,assignable:true};
const disabled={id:'hr',slug:'human_resources',name:'HR',companyEnabled:false,actorAssignable:true,assignable:false};
const restricted={...ready,id:'inventory',slug:'inventory',actorAssignable:false,assignable:false};
test('company availability, delegation and previous assignment are independent',()=>{
 assert.equal(moduleAssignmentState(ready).editable,true);
 for(const module of [disabled,restricted,{...ready,assignable:false}])assert.equal(moduleAssignmentState(module).editable,false);
 assert.equal(moduleAssignmentState({...ready,companyEnabled:undefined}).unknown,true);
 assert.equal(moduleAssignmentState({...ready,actorAssignable:undefined}).unknown,true);
});
test('unknown existing catalogue rows remain visible and selected with stable identifiers',()=>{
 const modules=modulesWithPreviousAssignments([ready],['legacy_extra']);
 assert.equal(modules.length,2);assert.equal(moduleIdForSlug('legacy_extra',modules),'module:legacy_extra');
 assert.equal(moduleAssignmentState(modules[1]).unknown,true);
 assert.deepEqual(selectedModuleSlugs(modules,['module:legacy_extra'],['legacy_extra']),['legacy_extra']);
});
test('retained assignments count when visible editable selection is empty',()=>{
 for(const [modules,previous] of [[[disabled],['human_resources']],[[restricted],['inventory']],[[],['legacy_extra']]]){
  assert.equal(moduleSelectionError(modules,[],previous),null);
  assert.deepEqual(selectedModuleSlugs(modules,[],previous),previous);
 }
 assert.equal(moduleSelectionError([ready],[],[]),'user_modules_required');
 assert.equal(moduleSelectionError([ready],[],['crm']),'user_modules_required');
});
test('new forbidden assignments are distinguished and never become grandfathered',()=>{
 assert.equal(moduleSelectionError([disabled],['hr']),'user_module_not_enabled');
 assert.equal(moduleSelectionError([restricted],['inventory']),'user_module_not_assignable');
 assert.equal(moduleSelectionError([{...ready,companyEnabled:undefined}],['sales']),'user_module_unknown');
 assert.equal(moduleSelectionError([ready],['unknown'],['crm']),'user_module_unknown');
 assert.equal(moduleSelectionError([disabled],['hr'],['human_resources']),null);
});
test('only editable assignments can be explicitly removed; hidden grants survive other changes',()=>{
 assert.deepEqual(selectedModuleSlugs([ready,disabled],['sales'],['human_resources','legacy_extra']),['crm','human_resources','legacy_extra']);
 assert.deepEqual(selectedModuleSlugs([ready,disabled],[],['crm','human_resources']),['human_resources']);
 assert.deepEqual(selectedModuleSlugs([ready],['sales']),['crm']);
});
test('error classification agrees with backend activation, entitlement, assignment and lifecycle precedence',()=>{
 const blocked={...ready,companyEnabled:false,assignable:false,active:true,entitled:true,assignmentEnabled:true,lifecycleStatus:'released'};
 for(const [changes,expected] of [
  [{active:false,assignmentEnabled:false},'user_module_not_enabled'],
  [{entitled:false,lifecycleStatus:'planned'},'user_module_not_enabled'],
  [{assignmentEnabled:false},'user_module_not_assignable'],
  [{lifecycleStatus:'planned'},'user_module_not_assignable'],
 ])assert.equal(moduleSelectionError([{...blocked,...changes}],['sales']),expected);
});
