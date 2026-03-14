import test from 'node:test';
import assert from 'node:assert';
import { sleep } from '../sleep.js';

test('sleep resolves after specified time', async () => {
  const start = Date.now();
  const delay = 50;
  await sleep(delay);
  const end = Date.now();
  const delta = end - start;
  // We use a small tolerance because timers are not perfectly precise
  assert(delta >= delay - 5, `Expected at least ${delay}ms, got ${delta}ms`);
});

test('sleep with fake timers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  let resolved = false;
  const p = sleep(1000).then(() => {
    resolved = true;
  });

  assert.strictEqual(resolved, false, 'Should not be resolved initially');

  t.mock.timers.tick(1000);

  // Wait for promise microtask to resolve
  await new Promise((resolve) => setImmediate(resolve));

  assert.strictEqual(resolved, true, 'Should be resolved after ticking timers');
  await p;
});

test('sleep with 0ms', async () => {
  const start = Date.now();
  await sleep(0);
  const end = Date.now();
  assert(end - start >= 0);
});
