import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = new URL('../', import.meta.url);
const {learningChapters, learningStages} = await import(new URL('react/src/app/learningMode/curriculum.ts', root));
const scopeSource = await readFile(new URL('react/src/app/access/tabScopeCatalog.ts', root), 'utf8');
const literal = scopeSource.match(/MODULE_TAB_SCOPE_CATALOG[^=]*= ([\s\S]*?\n});/)[1];
const scopes = Function(`return (${literal.replace(/;$/, '')});`)();
const toolSource = await readFile(new URL('integrations/indice-mcp/src/contracts.ts', root), 'utf8');
const toolEnum = toolSource.match(/export const indiceToolNameSchema = z\.enum\(\[([\s\S]*?)\]\)/)?.[1];
if (!toolEnum) throw new Error('Closed tool catalog could not be parsed');
const knownTools = new Set([...toolEnum.matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]));
const financeSource=await readFile(new URL("integrations/indice-mcp/src/financeContracts.ts",root),"utf8");
for(const name of [...financeSource.matchAll(/"name": "([a-z0-9_]+)"/g)].map(m=>m[1])){knownTools.add(name);knownTools.add(`preview_${name}`);}
const ids = new Set();
for (const chapter of learningChapters) {
  if (ids.has(chapter.id)) throw new Error(`Duplicate chapter ${chapter.id}`);
  ids.add(chapter.id);
  const route = scopes[chapter.pageId];
  if (route?.moduleSlug !== chapter.module || !Object.hasOwn(route.tabs, chapter.tab)) throw new Error(`Chapter has no current route: ${chapter.id}`);
  if (chapter.steps.length < 3 || chapter.steps.some(pair => pair.length !== 2 || pair.some(text => !text.trim()))) throw new Error(`Missing bilingual workflow: ${chapter.id}`);
  for (const tool of chapter.evidenceTools) if (!knownTools.has(tool)) throw new Error(`Unknown evidence tool ${tool} in ${chapter.id}`);
}
for (const scope of Object.values(scopes)) for (const tab of Object.keys(scope.tabs))
  if (!ids.has(`${scope.moduleSlug}.${tab}`)) throw new Error(`Current tab lacks a reviewed chapter: ${scope.moduleSlug}.${tab}`);
// Changes to an owner, its active screens, or reviewed guides invalidate the generated catalog.
const trackedRoots = ['react/src/app/BasicModules', 'react/src/app/ComplementaryModules/Inventory',
  'react/src/app/learningMode', 'react/src/app/Messaging', 'react/src/app/components/Header.tsx',
  'react/src/app/App.tsx', 'react/src/app/Dashboard',
  'src/main/java/com/indice/erp/hr', 'src/main/java/com/indice/erp/processTasks',
  'src/main/java/com/indice/erp/pos', 'src/main/java/com/indice/erp/sales', 'src/main/java/com/indice/erp/finance',
  'src/main/java/com/indice/erp/learning', 'src/main/java/com/indice/erp/ai/learning',
  'src/main/java/com/indice/erp/kpis', 'src/main/java/com/indice/erp/configcenter',
  'integrations/indice-mcp/src/contracts.ts', 'integrations/indice-mcp/src/financeContracts.ts', 'src/main/java/com/indice/erp/ai/financeworkflow'];
async function sourceFiles(relative) {
  if (/\.(tsx?|java)$/.test(relative)) return [relative];
  const entries = await readdir(new URL(relative+'/', root), {withFileTypes:true});
  return (await Promise.all(entries.map(e => e.isDirectory() ? sourceFiles(relative+'/'+e.name)
    : /\.(tsx?|java)$/.test(e.name) ? [relative+'/'+e.name] : []))).flat();
}
const sourceDigest = createHash('sha256');
for (const path of (await Promise.all(trackedRoots.map(sourceFiles))).flat().sort()) {
  sourceDigest.update(path+'\n'); sourceDigest.update((await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n'));
}
sourceDigest.update(scopeSource.replace(/\r\n/g,'\n'));
const modules = [];
for (const locale of ['es-MX','en-CA']) {
  const index = locale === 'es-MX' ? 0 : 1;
  for (const module of [...new Set(learningChapters.map(c => c.module))]) {
    const chapters = learningChapters.filter(c => c.module === module);
    modules.push({module, pageId:chapters[0].pageId, locale, stage:chapters[0].stage,
      purpose:learningStages[chapters[0].stage][index], tabs:chapters.map(c => ({
        tab:c.tab, label:c.label[index], title:c.label[index], purpose:c.steps[0][index], effect:c.steps.at(-1)[index],
        chapterId:c.id, version:c.version, journey:c.journey, companion:c.companion, evidenceTools:c.evidenceTools,
        steps:c.steps.map((pair,i) => ({id:['prepare','operate','verify'][i] ?? `detail-${i}`, title:locale==='es-MX'
          ? ['Antes de empezar','Realiza la operación','Comprueba el resultado'][i] ?? 'Detalle'
          : ['Before starting','Perform the operation','Verify the result'][i] ?? 'Detail', description:pair[index]})),
      }))});
  }
}
const serialized = JSON.stringify({version:'2026-10-07.v4', sourceDigest:sourceDigest.digest('hex'), modules},null,2)+'\n';
const output = new URL('src/main/resources/ai/learning-catalog-v1.json',root);
const matrix = '# Learning function coverage\n\nGenerated from the reviewed bilingual curriculum. Domain owners remain authoritative.\n\n| Chapter | Stage | Page/tab | Version | Evidence actions |\n| --- | --- | --- | --- | --- |\n'
  + learningChapters.map(c=>`| ${c.id} | ${c.stage+1} | ${c.pageId}/${c.tab} | ${c.version} | ${c.evidenceTools.join(', ') || 'Understanding only until an owner completion is integrated'} |`).join('\n')+'\n';
for (const [path,content] of [[output,serialized],[new URL('docs/learning-function-coverage.md',root),matrix]]) {
  if (process.argv.includes('--check')) {
    if (await readFile(path,'utf8') !== content) throw new Error('Learning catalog/coverage differs from current owners. Update the affected lessons, regenerate, and review.');
  } else await writeFile(fileURLToPath(path),content,'utf8');
}
console.log(`Reviewed ${learningChapters.length} bilingual chapters in ${modules.length/2} modules.`);
