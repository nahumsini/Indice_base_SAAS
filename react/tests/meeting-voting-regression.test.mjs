import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const base='src/app/ComplementaryModules/MinutesControl/';
const load=(path,require=()=>{throw Error('Unexpected import')})=>loadTypescript(resolve(base+path),require);
class ApiClientError extends Error { constructor(status,code){super(code);this.status=status;this.code=code;} }
const utility=()=>load('utils/meetingVoting.ts',name=>{if(name.endsWith('apiClient'))return {ApiClientError};throw Error(name);});
const request=()=>({subject:'Approve new hours',description:'',approvalRule:'MAJORITY',quorumRule:'MAJORITY',roles:[{key:'lead',name:'Lead',weight:3},{key:'member',name:'Member',weight:2},{key:'guest',name:'Guest',weight:0}],voters:[{userId:42,roleKey:'lead'},{userId:43,roleKey:'member'},{userId:44,roleKey:'guest'}]});
const people=[{userId:42,name:'Owner',eligible:true},{userId:43,name:'Member',eligible:true},{userId:44,name:'Guest',eligible:false}];
test('draft preview uses points from functions and whole-team thresholds, never headcount',()=>{
 const {votingPreview,requiredWeight}=utility();
 assert.deepEqual(votingPreview(request(),people),{total:5,approval:3,quorum:3});
 assert.equal(requiredWeight('MAJORITY',6),4);assert.equal(requiredWeight('TWO_THIRDS',7),5);assert.equal(requiredWeight('ALL',7),7);
 const form=request();form.roles[0].weight=7;assert.deepEqual(votingPreview(form,people),{total:9,approval:5,quorum:5});
 assert.deepEqual(votingPreview({...request(),approvalRule:'ALL',quorumRule:'TWO_THIRDS'},people),{total:5,approval:5,quorum:4});
});
test('draft review rejects duplicate people, inaccessible weighted voters and malformed functions',()=>{
 const {votingPreview}=utility();
 const invalid=request();invalid.voters[2].roleKey='member';assert.throws(()=>votingPreview(invalid,people),/member_unavailable/);
 const duplicate=request();duplicate.voters[1].userId=42;assert.throws(()=>votingPreview(duplicate,people),/team_changed/);
 const decimal=request();decimal.roles[0].weight=1.5;assert.throws(()=>votingPreview(decimal,people),/roles_invalid/);
 const named=request();named.roles[0].name='Member';assert.throws(()=>votingPreview(named,people),/roles_invalid/);
 const zero=request();zero.roles.forEach(r=>r.weight=0);assert.throws(()=>votingPreview(zero,people),/no_weight/);
});
test('ballot client sends only authenticated choice/version and retains open retry keys',async()=>{
 const calls=[];
 const {meetingVotingApi:api}=load('services/meetingVotingApi.ts',()=>({apiClient:async(url,options)=>{calls.push({url,options});return {};}}));
 await api.vote(17,9,'YES',3);assert.equal(calls[0].url,'/api/v1/meetings/17/ballots/9/vote');assert.deepEqual(JSON.parse(calls[0].options.body),{choice:'YES',expectedVoteVersion:3});
 await api.open(17,request(),'synthetic-payload-key');assert.equal(calls[1].options.headers['Idempotency-Key'],'synthetic-payload-key');
 assert.equal('companyId' in JSON.parse(calls[1].options.body),false);
});
test('voting labels cover eight native locales and English fallback',()=>{
 const {getMeetingVotingCopy:get}=load('translations/meetingVotingCopy.ts');
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){assert.deepEqual(Object.keys(get(locale)),Object.keys(get('en-CA')));assert.ok(Object.values(get(locale)).every(v=>typeof v==='string'&&v.trim()));}
 assert.deepEqual(get('unknown'),get('en-CA'));assert.equal(get('es-MX').NO_QUORUM,'Sin participación mínima');
});
test('printed minutes retain weighted outcome and cancellation reason; legacy records still print',()=>{
 let document;
 const copy=load('translations/meetingCopy.ts').getMeetingCopy('es-MX');
 const {printMeetingMinutes}=load('utils/meetingPrintDocument.ts',name=>{
  if(name.endsWith('standardDocumentHtml'))return {printStandardDocumentHtml:value=>{document=value;return true;}};
  if(name.endsWith('meetingOperationsCopy'))return load('translations/meetingOperationsCopy.ts');
  if(name.endsWith('meetingVotingCopy'))return load('translations/meetingVotingCopy.ts');
  throw Error(name);
 });
 const detail={meeting:{id:1,title:'Review',status:'COMPLETED',startAt:'2026-10-21T14:00:00Z',endAt:'2026-10-21T15:00:00Z',timezone:'UTC',ownerName:'Owner',version:4},location:'',participants:[],agenda:'Plan',minutes:'Original minutes',decisions:'Original decisions',history:[]};
 printMeetingMinutes(detail,copy,'es-MX');assert.equal(document.sections.length,3);
 printMeetingMinutes({...detail,votingResults:[{id:7,subject:'Revised plan',outcome:'APPROVED',totalWeight:7,approvalWeight:4,quorumWeight:4,tally:{yes:5,no:1,abstain:1,cast:7},closedAt:'2026-10-21T15:00:00Z'},{id:8,subject:'Withdrawn',outcome:'CANCELLED',totalWeight:7,approvalWeight:4,quorumWeight:4,tally:{yes:0,no:0,abstain:0,cast:0},closedAt:'2026-10-21T15:00:00Z',closeReason:'Proposal replaced'}]},copy,'es-MX');
 assert.equal(document.sections.length,5);assert.ok(document.sections[3].paragraphs.includes('Aprobada'));assert.match(document.sections[3].paragraphs[1],/5.*1.*1/);assert.ok(document.sections[4].paragraphs.includes('Proposal replaced'));assert.equal(document.sections[1].paragraphs[0],'Original minutes');
});
test('open-vote and stale-version errors tell the user what to resolve',()=>{
 const {votingError}=utility(),copy=load('translations/meetingVotingCopy.ts').getMeetingVotingCopy('es-MX');
 assert.equal(votingError(new ApiClientError(400,'meeting_voting_open'),copy,'Error','Reload'),copy.openBallots);
 assert.equal(votingError(new ApiClientError(409,'meeting_conflict'),copy,'Error','Reload'),'Reload');
});
