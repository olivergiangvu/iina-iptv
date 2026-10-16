'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCoordinator } = require('../coordinator.js');

function env(extra = {}) {
  let clock = 10000000;
  let calls = 0;
  let resolveFetch;
  let saved;
  const timers = [];
  const settings = {
    now: () => clock,
    setTimer: (fn, ms) => {
      const timer = { fn, ms };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      const index = timers.indexOf(timer);
      if (index >= 0) timers.splice(index, 1);
    },
    fetchDataset: () => {
      calls++;
      return new Promise(resolve => { resolveFetch = resolve; });
    },
    persist: value => { saved = value; },
    intervalsHours: { channels: 1, epg: 0 },
    ...extra
  };
  return {
    core: createCoordinator(settings),
    get calls() { return calls; },
    get resolveFetch() { return resolveFetch; },
    get saved() { return saved; },
    timers,
    advance: ms => { clock += ms; }
  };
}

test('manual concurrent requests share one network-equivalent operation', async () => {
  const x = env();
  const a = x.core.refresh('channels', true);
  const b = x.core.refresh('channels', true);
  assert.strictEqual(a,b);
  await Promise.resolve();
  assert.equal(x.calls,1);
  x.resolveFetch([{ id: 'fixture' }]);
  await Promise.all([a,b]);
  assert.equal(x.saved.channels.data.length,1);
});
test('startup uses fresh cache and schedules hourly, not per minute', async () => {
  const x = env({ restore: { channels: { lastSuccess: 10000000, data: [{ id:'cached' }] } } });
  x.core.start();
  await Promise.resolve();
  assert.equal(x.calls,0);
  assert.equal(x.timers.length,1);
  assert.equal(x.timers[0].ms,3600000);
  x.core.stop();
});
test('offline errors redact original message, back off >= 1 hour', async () => {
  const x = env({ fetchDataset: () => Promise.reject(new Error('private-fixture-url')) });
  await assert.rejects(x.core.refresh('channels', true), /Fixture refresh failed/);
  assert.ok(x.core.snapshot().channels.lastFailure > 0);
  x.core.start();
  assert.ok(x.core.snapshot().channels.nextDue >= 10000000 + 3600000);
  x.core.stop();
});
test('invalid intervals and unsupported datasets fail closed', async () => {
  assert.throws(() => env({intervalsHours:{channels:0.25,epg:3}}), /Invalid/);
  assert.throws(() => env().core.refresh('movies',true), /Unknown/);
});
