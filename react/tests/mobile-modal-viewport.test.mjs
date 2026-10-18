import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';

const load = createTypeScriptLoader();
const { subscribeToDialogViewport } = load(resolve(import.meta.dirname, '../src/app/components/ui/useDialogViewport.ts'));
function environment(visual = true) {
  const target = new EventTarget();
  target.innerHeight = 844;
  target.visualViewport = visual ? Object.assign(new EventTarget(), { height: 844, offsetTop: 0 }) : null;
  let id = 0;
  const frames = new Map();
  target.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
  target.cancelAnimationFrame = id => frames.delete(id);
  return { target, frames, flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); } };
}

test('keyboard resize and viewport offset are reported together once per animation frame', () => {
  const env = environment(), changes = [];
  const stop = subscribeToDialogViewport(value => changes.push(value), env.target);
  assert.equal(changes[0].height, 844);
  env.target.visualViewport.height = 360;
  env.target.visualViewport.offsetTop = 72;
  env.target.visualViewport.dispatchEvent(new Event('resize'));
  env.target.visualViewport.dispatchEvent(new Event('scroll'));
  env.target.dispatchEvent(new Event('resize'));
  assert.equal(env.frames.size, 1);
  env.flush();
  assert.equal(changes.length, 2);
  assert.equal(changes[1].height, 360);
  assert.equal(changes[1].offsetTop, 72);
  stop();
});

test('browsers without visualViewport use window height and rotation changes', () => {
  const env = environment(false), changes = [];
  const stop = subscribeToDialogViewport(value => changes.push(value), env.target);
  env.target.innerHeight = 390;
  env.target.dispatchEvent(new Event('resize'));
  env.flush();
  assert.equal(changes.at(-1).height, 390);
  assert.equal(changes.at(-1).offsetTop, 0);
  stop();
});

test('closing removes every listener and cancels pending viewport work', () => {
  const env = environment(), changes = [];
  const stop = subscribeToDialogViewport(value => changes.push(value), env.target);
  env.target.visualViewport.dispatchEvent(new Event('resize'));
  stop();
  assert.equal(env.frames.size, 0);
  env.target.visualViewport.dispatchEvent(new Event('scroll'));
  env.target.visualViewport.dispatchEvent(new Event('resize'));
  env.target.dispatchEvent(new Event('resize'));
  env.flush();
  assert.equal(changes.length, 1);
});
