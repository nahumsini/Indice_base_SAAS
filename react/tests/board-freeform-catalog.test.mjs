import test from 'node:test';
import assert from 'node:assert/strict';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const app=new URL('../src/app/',import.meta.url);
const loader=createTypeScriptLoader({
 './fiveSEvidence.css':{},
 './SystemElementFields':{SystemElementFields:'fields'},
 './SystemNodeContent':{SystemNodeContent:'node-content'},
 './SystemBoardBackdrop':{SystemBoardBackdrop:()=>null,systemPrintSections:()=>[]},
 '../../components/icons/OriginalModuleEmoji':{OriginalModuleEmoji:()=>null},
 '../../components/icons/ModuleTabEmoji':{IndiceEmoji:()=>null},
},{crypto});
const model=loader(new URL('BasicModules/Sales/Funneling/ideasBoardModel.ts',app).pathname);
const catalog=loader(new URL('ComplementaryModules/IdeasBoard/freeformBoardLayout.tsx',app).pathname);
const filters=loader(new URL('ComplementaryModules/IdeasBoard/projectLibraryModel.ts',app).pathname);
const labels=loader(new URL('ComplementaryModules/IdeasBoard/projectWorkspaceCopy.ts',app).pathname);
const workspace=loader(new URL('ComplementaryModules/IdeasBoard/workspaceCopy.ts',app).pathname);
const plain=value=>JSON.parse(JSON.stringify(value));
test('the free canvas exposes all five owner catalogs without regions or coordinate conversion',()=>{
 const layout=catalog.freeformBoardLayout('es-MX');assert.equal(layout.kind,'FREEFORM');assert.equal(layout.regions.length,0);assert.equal(layout.worldBounds,undefined);assert.equal(layout.backdrop,null);
 assert.deepEqual(plain(layout.creationGroups.map(g=>g.id)),['PERSON','PROCESS','CHANNEL','PRODUCT','FINANCE']);
 const legacy={...model.textNode(-8000,5000),text:'Existing idea'},original={...model.emptyBoard(),nodes:[legacy]};
 assert.equal(layout.prepare(legacy,original),legacy);assert.equal(layout.move(legacy,10,20).x,-7990);
 for(const group of layout.creationGroups){const node=group.create(original);assert.ok(node.catalog);assert.equal('category' in node,false);assert.equal(layout.editor.matches(node),true);assert.equal(group.matches(node),true);assert.ok(node.x>=-10000&&node.x<=10000);}
 const centered=layout.creationGroups[0].create(model.emptyBoard(),{x:800,y:500});assert.equal(centered.x+centered.width/2,800);assert.equal(centered.y+centered.height/2,500);
 assert.equal(legacy.catalog,undefined);assert.equal(legacy.x,-8000);
});
test('catalog editing retains its metadata through a freeform save, process comparison and print details',()=>{
 const layout=catalog.freeformBoardLayout('es-MX'),group=layout.creationGroups.find(g=>g.id==='PROCESS');
 const node={...group.create(model.emptyBoard()),text:'Atender pedido'},before={...model.emptyBoard(),nodes:[node]};
 const edited=catalog.withCatalog({...catalog.catalogNode(node),steps:['Recibir','Preparar','Entregar']});
 assert.deepEqual(plain(edited.catalog.steps),['Recibir','Preparar','Entregar']);assert.equal('steps' in edited,false);assert.equal('category' in edited,false);
 assert.equal(model.sameBoardIdeas(before,{...before,nodes:[edited]}),false);assert.equal(layout.sameIdeas(before,{...before,nodes:[edited]}),false);
 const saved=JSON.parse(JSON.stringify({...before,nodes:[edited]}));assert.equal(layout.editor.matches(saved.nodes[0]),true);assert.deepEqual(plain(layout.printDetails(saved.nodes)),[{title:'Atender pedido',steps:['Recibir','Preparar','Entregar']}]);
 const view=layout.editor.render({node:edited,locale:'es-MX',onChange(){}});assert.ok(view.props.bounds.right>2200);assert.equal(view.props.node.category,'PROCESS');
 const print=loader(new URL('BasicModules/Sales/Funneling/boardPrintDocument.ts',app).pathname);const bounds=print.boardPrintBounds(saved,layout);assert.ok(bounds.width<2200);assert.match(print.boardPrintDocument(saved,'Mi pizarra',()=>'',layout),/<li>Entregar<\/li>/);
});
test('library restores only supported user-scoped filters and all locales expose the renamed diagnosis',()=>{
 const invalid=filters.restoreProjectFilters({scope:'public',search:'x'.repeat(150),kind:'foreign',sort:'SQL',page:-1,pageSize:999});
 assert.equal(invalid.scope,'OWNED');assert.equal(invalid.kind,'ALL');assert.equal(invalid.sort,'NEWEST');assert.equal(invalid.search.length,120);assert.equal(invalid.page,1);assert.equal(invalid.pageSize,12);
 assert.deepEqual(plain(filters.restoreProjectFilters({scope:'SHARED',search:'Café',kind:'SYSTEM',sort:'NAME_ASC',page:2,pageSize:24})),{scope:'SHARED',search:'Café',kind:'SYSTEM',sort:'NAME_ASC',page:2,pageSize:24});
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){assert.deepEqual(Object.keys(labels.projectWorkspaceCopy(locale)),Object.keys(labels.projectWorkspaceCopy('es-MX')));assert.ok(workspace.workspaceCopy(locale).system);}
 assert.equal(workspace.workspaceCopy('es-MX').system,'Diagnóstico empresarial');assert.equal(workspace.workspaceCopy('en-US').system,'Business diagnosis');
});
