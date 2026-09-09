import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function createTypeScriptLoader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(input) {
    const file = [input, `${input}.ts`, `${input}.tsx`, resolve(input, 'index.ts'), resolve(input, 'index.tsx')]
      .find(candidate => existsSync(candidate) && /\.tsx?$/.test(candidate));
    if (!file) throw new Error(`TypeScript module not found: ${input}`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, Intl, Error, URL, URLSearchParams, console, ...globals,
      require(id) {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        return id.startsWith('.') ? load(resolve(dirname(file), id)) : require(id);
      },
    }, { filename: file });
    return module.exports;
  }
  return load;
}
