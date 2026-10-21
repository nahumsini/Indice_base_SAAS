import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/app/'+p,import.meta.url),'utf8');
test('personal and divided boards share one editor, palette and all editing actions',()=>{
 const personal=read('ComplementaryModules/IdeasBoard/PersonalIdeasBoard.tsx'),system=read('ComplementaryModules/IdeasBoard/SystemBoard.tsx');
 assert.match(personal,/<IdeasBoard/);assert.match(system,/<IdeasBoard/);assert.match(personal,/personalBoardSymbols/);assert.match(system,/personalBoardSymbols/);assert.doesNotMatch(system,/WorkspaceCanvas|<button/);
 const shared=read('BasicModules/Sales/Funneling/IdeasBoard.tsx');for(const tool of ['NOTE','PLAIN','RECTANGLE','ELLIPSE','CONNECT','PAN'])assert.ok(shared.includes("'"+tool+"'"));
 for(const action of ['NodeAppearanceControls','NodeResizeHandles','duplicate','erase','onSaveProject','IdeasBoardMinimap'])assert.ok(shared.includes(action));
 assert.match(shared,/customizable = false/);assert.match(shared,/api = ideasBoardApi/);
});
