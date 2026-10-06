import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

// Both channels use the reviewed Modo aprendiz copy. Page IDs are SPA destinations, not URLs.
const modules = [
  ['human_resources', 'human-resources', 'HumanResources'],
  ['processes', 'processes-tasks', 'ProcessesTasks'],
  ['crm', 'sales', 'Sales'],
];
const catalog = [];
const salesRuntime = await readFile(new URL('../react/src/app/BasicModules/Sales/salesIdentity.tsx', import.meta.url), 'utf8');
const allSalesTabs = [...salesRuntime.match(/export const salesTabIds = \[([\s\S]*?)\] as const;/)[1].matchAll(/'([a-z-]+)'/g)].map(match => match[1]);
const excludedSalesTabs = [...salesRuntime.match(/!\[([^\]]+)\]\.includes\(tabId\)/)[1].matchAll(/'([a-z-]+)'/g)].map(match => match[1]);
const routedSalesTabs = allSalesTabs.filter(tab => !excludedSalesTabs.includes(tab));
for (const locale of ['es-MX', 'en-CA']) {
  for (const [module, pageId, folder] of modules) {
    const source = new URL(`../react/src/app/BasicModules/${folder}/operationalGuidance/translations/${locale}.ts`, import.meta.url);
    const translations = await import(source.href);
    const content = translations.esMX ?? translations.enCA;
    if (!content?.tabs) throw new Error(`Missing reviewed guide: ${source.href}`);
    catalog.push({ module, pageId, locale, purpose: content.subtitle,
      tabs: Object.entries(content.tabs).filter(([tab]) => module !== 'crm' || routedSalesTabs.includes(tab)).map(([tab, value]) => ({ tab, label: value.label, title: value.title,
        purpose: value.summary, effect: value.value, steps: value.steps })) });
  }
}
// Inventory and POS use the active shared SimpleModuleLearningGuide, rather than translation tabs.
// Import its real control formatter without importing the React runtime.
async function ownedControls(relative, exportName) {
  const source = new URL(`../react/src/app/${relative}`, import.meta.url);
  const helper = new URL('../react/src/app/learningMode/createLearningModeControl.ts', import.meta.url);
  const raw = (await readFile(source, 'utf8')).replace(/^import .*?;\r?\n/gm, '');
  const code = `import { createLearningModeControl } from ${JSON.stringify(helper.href)};\n${stripTypeScriptTypes(raw)}`;
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`))[exportName];
}
for (const [module, pageId, folder, prefix] of [
  ['inventory', 'inventory', 'ComplementaryModules/Inventory', 'inventory'],
  ['pos', 'point-of-sale', 'BasicModules/PointOfSale', 'pointOfSale'],
]) {
  const controls = await ownedControls(`${folder}/operationalGuidance/${prefix}LearningControls.ts`, `${prefix}LearningControls`);
  const labels = await ownedControls(`${folder}/operationalGuidance/${prefix}LearningControls.ts`, `${prefix}LearningLabels`);
  const english = (await import(new URL(`../react/src/app/${folder}/operationalGuidance/${prefix}LearningEnglish.ts`, import.meta.url).href))[`${prefix}LearningEnglish`];
  for (const locale of ['es-MX', 'en-CA']) {
    const tabs = Object.entries(controls).map(([tab, entries]) => {
      const overview = english[tab];
      if (!entries.length || !overview) throw new Error(`Missing reviewed ${module}/${tab} learning content.`);
      return locale === 'en-CA'
        ? { tab, label: overview.label, title: overview.label, purpose: overview.objective,
            effect: overview.example, steps: [{title: 'Workflow', description: overview.instructions},
              {title: 'When to use', description: overview.whenToUse}, {title: 'Example', description: overview.example}] }
        : { tab, label: labels[tab], title: labels[tab], purpose: entries[0].purpose,
            effect: entries.map(control => control.result).filter(Boolean).join(' '),
            steps: entries.map(control => ({title: control.title, description: `${control.purpose} ${control.behavior} ${control.whenToUse}`})) };
    });
    catalog.push({module, pageId, locale, purpose: tabs.map(tab => tab.purpose).join(' '), tabs});
  }
}
const output = new URL('../src/main/resources/ai/learning-catalog-v1.json', import.meta.url);
const serialized = `${JSON.stringify({ version: '2026-10-06.v2', modules: catalog }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== serialized) throw new Error('Lupita learning catalog differs from the reviewed UI copy. Regenerate and review it.');
} else {
  await writeFile(fileURLToPath(output), serialized, 'utf8');
}
