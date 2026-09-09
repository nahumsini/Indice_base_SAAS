import ts from 'typescript';
import { readFileSync } from 'node:fs';

export function loadTypescript(path, require) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}

// Deterministic hook lifecycle: effects execute after commit, with dependency cleanup and rerenders.
export function hookRuntime() {
  let cursor = 0, dirty = false, mounted = true, renderBody;
  const cells = [], effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!cells[index]) cells[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [cells[index].value, update => {
        const next = typeof update === 'function' ? update(cells[index].value) : update;
        if (!Object.is(next, cells[index].value)) { cells[index].value = next; if (mounted) dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return (cells[index] ??= { current: initial }); },
    useMemo(callback, deps) { const index = cursor++; if (!same(cells[index]?.deps, deps)) cells[index] = { value: callback(), deps }; return cells[index].value; },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!same(cells[index]?.deps, deps)) {
        const previous = cells[index]; cells[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { cells[index].cleanup?.(); cells[index].cleanup = callback(); });
      }
    },
  };
  const runtime = {
    hooks, result: undefined,
    render(body = renderBody) { renderBody = body; cursor = 0; dirty = false; runtime.result = body(); while (effects.length) effects.shift()(); return runtime.result; },
    async flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty) runtime.render(); } return runtime.result; },
    unmount() { mounted = false; cells.forEach(cell => cell?.cleanup?.()); },
  };
  return runtime;
}
