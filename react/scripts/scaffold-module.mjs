import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function readFlag(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return '';
  }

  return args[index + 1] ?? '';
}

function readTabs() {
  const index = args.indexOf('--tabs');
  if (index === -1) {
    return [];
  }

  return args.slice(index + 1).filter((value) => !value.startsWith('--'));
}

function readCategory() {
  const category = readFlag('--category');
  return category || 'basic';
}

function toWords(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function toPascalCase(value) {
  return toWords(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toTitleCase(value) {
  return toWords(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateSlug(label, value) {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error(`${label} must use lowercase letters, numbers, and hyphens only.`);
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf8', flag: 'wx' });
}

function validateCategory(value) {
  if (!['basic', 'complementary', 'ai'].includes(value)) {
    throw new Error('Category must be one of: basic, complementary, ai.');
  }
}

function buildPageComponent(tabSlug) {
  const componentName = `${toPascalCase(tabSlug)}Page`;
  const label = toTitleCase(tabSlug);

  return `export function ${componentName}() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">${label}</h2>
        <p className="text-sm text-slate-600">
          Replace this placeholder with the ${label.toLowerCase()} workflow for the module.
        </p>
      </header>
    </section>
  );
}

export default ${componentName};
`;
}

function buildTabIndex(tabSlug) {
  const componentName = `${toPascalCase(tabSlug)}Page`;
  return `export { ${componentName} } from './${componentName}';
export { default } from './${componentName}';
`;
}

function buildTabsBarrel(tabs) {
  return `${tabs
    .map((tabSlug) => {
      const componentName = `${toPascalCase(tabSlug)}Page`;
      return `export { ${componentName} } from './${tabSlug}';`;
    })
    .join('\n')}
`;
}

function buildModuleConfig(moduleSlug, moduleName, routeSegment, category, tabs) {
  const definitionName = `${moduleSlug}Module`;
  const tabImports = tabs
    .map((tabSlug) => `${toPascalCase(tabSlug)}Page`)
    .join(', ');
  const tabEntries = tabs
    .map(
      (tabSlug) => `    {
      id: '${tabSlug}',
      label: '${toTitleCase(tabSlug)}',
      path: '${tabSlug}',
      component: ${toPascalCase(tabSlug)}Page,
    },`,
    )
    .join('\n');

  return `import type { ModuleDefinition } from '../shared';
import { ${tabImports} } from './tabs';

export const ${definitionName}: ModuleDefinition = {
  id: '${moduleSlug}',
  displayName: '${moduleName}',
  routeSegment: '${routeSegment}',
  category: '${category}',
  defaultTabId: '${tabs[0]}',
  tabs: [
${tabEntries}
  ],
};
`;
}

function buildModuleComponent(moduleSlug) {
  const moduleComponentName = `${toPascalCase(moduleSlug)}Module`;
  const definitionName = `${moduleSlug}Module`;

  return `import { ModuleShell } from '../shared';
import { ${definitionName} } from './module.config';

export interface ${moduleComponentName}Props {
  initialTabId?: string;
}

export function ${moduleComponentName}({ initialTabId }: ${moduleComponentName}Props) {
  return <ModuleShell module={${definitionName}} initialTabId={initialTabId} />;
}

export default ${moduleComponentName};
`;
}

function buildRoutes(moduleSlug) {
  const definitionName = `${moduleSlug}Module`;
  const routesName = `${moduleSlug}Routes`;

  return `import { createModuleRoutes } from '../shared';
import { ${definitionName} } from './module.config';

export const ${routesName} = createModuleRoutes(${definitionName});
`;
}

function buildModuleIndex(moduleSlug) {
  const moduleComponentName = `${toPascalCase(moduleSlug)}Module`;
  const definitionName = `${moduleSlug}Module`;
  const routesName = `${moduleSlug}Routes`;

  return `export { ${moduleComponentName} } from './${moduleComponentName}';
export { default } from './${moduleComponentName}';
export { ${definitionName} } from './module.config';
export { ${routesName} } from './routes';
`;
}

function buildModuleReadme(moduleName, routeSegment, tabs) {
  const lines = tabs.map((tabSlug) => `- \`${tabSlug}\` -> ${toTitleCase(tabSlug)}`).join('\n');

  return `# ${moduleName}

## Route

\`/${routeSegment}\`

## Tabs

${lines}

## Notes

- Keep all business-specific components inside this module.
- Reuse shared code only through \`src/modules/shared\`.
- Avoid importing from sibling modules.
`;
}

function buildPlaceholderIndex(label) {
  return `// ${label} barrel file
`;
}

function main() {
  const moduleSlug = readFlag('--module');
  const moduleName = readFlag('--name');
  const routeSegment = readFlag('--route');
  const category = readCategory();
  const tabs = readTabs();

  if (!moduleSlug || !moduleName || !routeSegment || tabs.length === 0) {
    throw new Error(
      'Usage: node scripts/scaffold-module.mjs --module hr --name "Human Resources" --route human-resources --category basic --tabs employees attendance payroll',
    );
  }

  validateSlug('Module slug', moduleSlug);
  validateSlug('Route segment', routeSegment);
  validateCategory(category);
  tabs.forEach((tabSlug) => validateSlug('Tab slug', tabSlug));

  const projectRoot = process.cwd();
  const moduleDirectory = path.join(projectRoot, 'src', 'modules', moduleSlug);

  if (fs.existsSync(moduleDirectory)) {
    throw new Error(`Module directory already exists: ${moduleDirectory}`);
  }

  for (const tabSlug of tabs) {
    const componentName = `${toPascalCase(tabSlug)}Page`;
    writeFile(
      path.join(moduleDirectory, 'tabs', tabSlug, `${componentName}.tsx`),
      buildPageComponent(tabSlug),
    );
    writeFile(
      path.join(moduleDirectory, 'tabs', tabSlug, 'index.ts'),
      buildTabIndex(tabSlug),
    );
  }

  writeFile(
    path.join(moduleDirectory, 'tabs', 'index.ts'),
    buildTabsBarrel(tabs),
  );
  writeFile(
    path.join(moduleDirectory, 'module.config.ts'),
    buildModuleConfig(moduleSlug, moduleName, routeSegment, category, tabs),
  );
  writeFile(
    path.join(moduleDirectory, `${toPascalCase(moduleSlug)}Module.tsx`),
    buildModuleComponent(moduleSlug),
  );
  writeFile(
    path.join(moduleDirectory, 'routes.tsx'),
    buildRoutes(moduleSlug),
  );
  writeFile(
    path.join(moduleDirectory, 'index.ts'),
    buildModuleIndex(moduleSlug),
  );
  writeFile(
    path.join(moduleDirectory, 'README.md'),
    buildModuleReadme(moduleName, routeSegment, tabs),
  );
  writeFile(
    path.join(moduleDirectory, 'components', 'index.ts'),
    buildPlaceholderIndex('Components'),
  );
  writeFile(
    path.join(moduleDirectory, 'hooks', 'index.ts'),
    buildPlaceholderIndex('Hooks'),
  );
  writeFile(
    path.join(moduleDirectory, 'services', 'index.ts'),
    buildPlaceholderIndex('Services'),
  );
  writeFile(
    path.join(moduleDirectory, 'types', 'index.ts'),
    buildPlaceholderIndex('Types'),
  );

  console.log(`Created module scaffold at src/modules/${moduleSlug}`);
}

main();
