'use strict';
/* Behavior tests for the shared guided session engine
 * (docs/session-engine.js). Same file in both repos. A fake clock and an
 * in-memory storage drive the engine through its public API only. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const SE = require(path.join(__dirname, '..', 'docs', 'session-engine.js'));

const KEY = 'test-guided-session';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
    has: k => data.has(k),
    raw: k => data.get(k),
  };
}
function fakeClock(start) {
  let now = start || 1000000;
  const clock = () => now;
  clock.advance = ms => { now += ms; return now; };
  return clock;
}
const reps = (id, phase, extra) => Object.assign({ id: id, name: id, phase: phase, dose: { kind: 'reps', reps: 10, label: '10 reps' } }, extra || {});
const timed = (id, phase, seconds, extra) => Object.assign({ id: id, name: id, phase: phase, dose: { kind: 'time', seconds: seconds, label: seconds + ' sec' } }, extra || {});
function plan(slots) { return { id: 'p1', title: 'Test plan', slots: slots }; }
function setup(slots) {
  const clock = fakeClock();
  const storage = memoryStorage();
  const engine = SE.create(plan(slots), { clock: clock, storage: storage, key: KEY });
  return { clock: clock, storage: storage, engine: engine };
}

test('a rep move waits for Done, then the next move opens', () => {
  const { engine, clock } = setup([reps('a', 'warmup'), reps('b', 'warmup')]);
  engine.start();
  clock.advance(10 * 60 * 1000);
  engine.tick();
  assert.strictEqual(engine.getState().status, 'exercise');
  assert.strictEqual(engine.current().id, 'a');
  engine.done();
  assert.strictEqual(engine.current().id, 'b');
  assert.deepStrictEqual(engine.getState().completedIds, ['a']);
});

test('a timed move counts down and advances by itself at zero', () => {
  const { engine, clock } = setup([timed('a', 'warmup', 30), reps('b', 'warmup')]);
  engine.start();
  clock.advance(12000);
  assert.strictEqual(engine.remainingMs(), 18000);
  clock.advance(17999);
  assert.strictEqual(engine.tick(), false);
  assert.strictEqual(engine.current().id, 'a');
  clock.advance(1);
  assert.strictEqual(engine.tick(), true);
  assert.strictEqual(engine.current().id, 'b');
  assert.deepStrictEqual(engine.getState().completedIds, ['a']);
});

test('Done ends a timed move early', () => {
  const { engine, clock } = setup([timed('a', 'warmup', 30), reps('b', 'warmup')]);
  engine.start();
  clock.advance(5000);
  assert.ok(engine.done());
  assert.strictEqual(engine.current().id, 'b');
  assert.deepStrictEqual(engine.getState().completedIds, ['a']);
});

test('a main move with no rest set gets the 20-second default rest', () => {
  const { engine, clock } = setup([reps('a', 'main'), reps('b', 'main')]);
  engine.start();
  engine.done();
  assert.strictEqual(engine.getState().status, 'rest');
  assert.strictEqual(engine.remainingMs(), 20000);
  clock.advance(20000);
  engine.tick();
  assert.strictEqual(engine.getState().status, 'exercise');
  assert.strictEqual(engine.current().id, 'b');
});

test('rest set by the data wins, including 0', () => {
  const { engine } = setup([reps('a', 'main', { restSec: 45 }), reps('b', 'main', { restSec: 0 }), reps('c', 'main')]);
  engine.start();
  engine.done();
  assert.strictEqual(engine.getState().status, 'rest');
  assert.strictEqual(engine.remainingMs(), 45000);
  engine.skipRest();
  engine.done();
  assert.strictEqual(engine.getState().status, 'exercise');
  assert.strictEqual(engine.current().id, 'c');
});

test('warm-up and cool-down moves with no rest set go straight to the next move', () => {
  const { engine } = setup([reps('w1', 'warmup'), reps('w2', 'warmup'), reps('c1', 'cooldown'), reps('c2', 'cooldown')]);
  engine.start();
  ['w2', 'c1', 'c2'].forEach(next => {
    engine.done();
    assert.strictEqual(engine.getState().status, 'exercise');
    assert.strictEqual(engine.current().id, next);
  });
});

test('warm-up rest set by the data is used', () => {
  const { engine } = setup([reps('w1', 'warmup', { restSec: 10 }), reps('w2', 'warmup')]);
  engine.start();
  engine.done();
  assert.strictEqual(engine.getState().status, 'rest');
  assert.strictEqual(engine.remainingMs(), 10000);
});

test('the last move never starts a rest; it opens the finish screen', () => {
  const { engine } = setup([reps('a', 'main', { restSec: 30 }), reps('b', 'main', { restSec: 30 })]);
  engine.start();
  engine.done();
  engine.skipRest();
  engine.done();
  assert.strictEqual(engine.getState().status, 'finished');
  assert.deepStrictEqual(engine.summary().completed, 2);
});

test('Skip rest opens the next exercise at once', () => {
  const { engine, clock } = setup([reps('a', 'main'), timed('b', 'main', 40)]);
  engine.start();
  engine.done();
  clock.advance(3000);
  assert.ok(engine.skipRest());
  assert.strictEqual(engine.getState().status, 'exercise');
  assert.strictEqual(engine.current().id, 'b');
  assert.strictEqual(engine.remainingMs(), 40000);
});

test('pause freezes the countdown and the session clock; resume continues from the remainder', () => {
  const { engine, clock } = setup([timed('a', 'main', 30), reps('b', 'main')]);
  engine.start();
  clock.advance(10000);
  engine.pause();
  clock.advance(5 * 60 * 1000);
  assert.strictEqual(engine.tick(), false);
  assert.strictEqual(engine.remainingMs(), 20000);
  assert.strictEqual(engine.elapsedMs(), 10000);
  engine.resume();
  clock.advance(19999);
  engine.tick();
  assert.strictEqual(engine.current().id, 'a');
  clock.advance(1);
  engine.tick();
  assert.strictEqual(engine.getState().status, 'rest');
  assert.strictEqual(engine.elapsedMs(), 30000);
});

test('pause during rest keeps the rest remainder', () => {
  const { engine, clock } = setup([reps('a', 'main', { restSec: 30 }), reps('b', 'main')]);
  engine.start();
  engine.done();
  clock.advance(12000);
  engine.pause();
  clock.advance(60000);
  engine.resume();
  assert.strictEqual(engine.getState().status, 'rest');
  assert.strictEqual(engine.remainingMs(), 18000);
});

test('Skip exercise marks it skipped and moves on with no rest', () => {
  const { engine } = setup([reps('a', 'main', { restSec: 30 }), reps('b', 'main')]);
  engine.start();
  assert.ok(engine.skip());
  const s = engine.getState();
  assert.strictEqual(s.status, 'exercise');
  assert.strictEqual(engine.current().id, 'b');
  assert.deepStrictEqual(s.skippedIds, ['a']);
  assert.deepStrictEqual(s.completedIds, []);
});

test('Skip on the last exercise finishes the session', () => {
  const { engine, storage } = setup([reps('a', 'main')]);
  engine.start();
  engine.skip();
  assert.strictEqual(engine.getState().status, 'finished');
  assert.deepStrictEqual(engine.summary(), { total: 1, completed: 0, skipped: 1, elapsedMs: 0 });
  assert.strictEqual(storage.has(KEY), false);
});

test('End asks first; Keep going resumes the same countdown', () => {
  const { engine, clock, storage } = setup([timed('a', 'main', 30), reps('b', 'main')]);
  engine.start();
  clock.advance(10000);
  assert.ok(engine.requestEnd());
  assert.strictEqual(engine.getState().status, 'confirmEnd');
  clock.advance(60000);
  assert.strictEqual(engine.tick(), false);
  assert.ok(engine.cancelEnd());
  assert.strictEqual(engine.getState().status, 'exercise');
  assert.strictEqual(engine.remainingMs(), 20000);
  assert.ok(storage.has(KEY));
});

test('End from a paused screen returns to paused when cancelled', () => {
  const { engine } = setup([timed('a', 'main', 30), reps('b', 'main')]);
  engine.start();
  engine.pause();
  engine.requestEnd();
  engine.cancelEnd();
  assert.strictEqual(engine.getState().status, 'paused');
});

test('confirming End clears storage and returns to the start screen without a summary', () => {
  const { engine, storage } = setup([reps('a', 'main'), reps('b', 'main')]);
  engine.start();
  engine.done();
  assert.ok(storage.has(KEY));
  engine.requestEnd();
  assert.ok(engine.confirmEnd());
  const s = engine.getState();
  assert.strictEqual(s.status, 'idle');
  assert.deepStrictEqual(s.completedIds, []);
  assert.strictEqual(storage.has(KEY), false);
  assert.strictEqual(engine.done(), false);
});

test('a reload resumes the same screen, index, remainder, ids, and elapsed time', () => {
  const clock = fakeClock();
  const storage = memoryStorage();
  const slots = [reps('a', 'warmup'), reps('b', 'main', { restSec: 30 }), timed('c', 'main', 40), reps('d', 'cooldown')];
  const engine = SE.create(plan(slots), { clock: clock, storage: storage, key: KEY });
  engine.start();
  clock.advance(5000);
  engine.skip();
  clock.advance(7000);
  engine.done();
  clock.advance(10000);
  engine.skipRest();
  clock.advance(15000);
  engine.pause();
  /* page reload */
  clock.advance(2000);
  const saved = SE.load(storage, KEY);
  const again = SE.fromState(saved, { clock: clock, storage: storage, key: KEY });
  const s = again.getState();
  assert.strictEqual(s.status, 'paused');
  assert.strictEqual(again.current().id, 'c');
  assert.deepStrictEqual(s.skippedIds, ['a']);
  assert.deepStrictEqual(s.completedIds, ['b']);
  assert.strictEqual(again.remainingMs(), 25000);
  assert.strictEqual(again.elapsedMs(), 37000);
  again.resume();
  clock.advance(25000);
  again.tick();
  assert.strictEqual(again.getState().status, 'rest');
  assert.strictEqual(again.next().id, 'd');
});

test('a reload while running keeps the countdown deadline, not a fresh one', () => {
  const clock = fakeClock();
  const storage = memoryStorage();
  const engine = SE.create(plan([timed('a', 'main', 30), reps('b', 'main')]), { clock: clock, storage: storage, key: KEY });
  engine.start();
  clock.advance(10000);
  const again = SE.fromState(SE.load(storage, KEY), { clock: clock, storage: storage, key: KEY });
  clock.advance(1000);
  assert.strictEqual(again.getState().status, 'exercise');
  assert.strictEqual(again.remainingMs(), 19000);
  assert.strictEqual(again.elapsedMs(), 11000);
});

test('finishing clears storage, and a reload then returns nothing to resume', () => {
  const { engine, clock, storage } = setup([reps('a', 'warmup'), timed('b', 'cooldown', 20)]);
  engine.start();
  clock.advance(8000);
  engine.done();
  assert.ok(storage.has(KEY));
  clock.advance(20000);
  engine.tick();
  const s = engine.getState();
  assert.strictEqual(s.status, 'finished');
  assert.deepStrictEqual(engine.summary(), { total: 2, completed: 2, skipped: 0, elapsedMs: 28000 });
  assert.strictEqual(storage.has(KEY), false);
  assert.strictEqual(SE.load(storage, KEY), null);
});

test('a broken or foreign saved snapshot is dropped, not resumed', () => {
  const storage = memoryStorage();
  ['not json', JSON.stringify({ version: 1, status: 'exercise', slots: [] }), JSON.stringify([1, 2]),
    JSON.stringify({ version: 99, status: 'exercise' })].forEach(raw => {
    storage.setItem(KEY, raw);
    assert.strictEqual(SE.load(storage, KEY), null);
    assert.strictEqual(storage.has(KEY), false);
  });
});

test('the engine keeps the host order of slots', () => {
  const ids = ['w1', 'w2', 'm1', 'm2', 'c1'];
  const { engine } = setup([reps('w1', 'warmup'), reps('w2', 'warmup'), reps('m1', 'main', { restSec: 0 }), reps('m2', 'main', { restSec: 0 }), reps('c1', 'cooldown')]);
  engine.start();
  const seen = [];
  while (engine.getState().status === 'exercise') { seen.push(engine.current().id); engine.done(); }
  assert.deepStrictEqual(seen, ids);
});

test('a save that throws is reported and the session keeps running', () => {
  const clock = fakeClock();
  let reported = 0;
  const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
  const engine = SE.create(plan([reps('a', 'main'), reps('b', 'main')]), { clock: clock, storage: storage, key: KEY, onSaveError: () => { reported++; } });
  assert.ok(engine.start());
  assert.ok(reported >= 1);
  engine.done();
  assert.strictEqual(engine.getState().status, 'rest');
});

test('estimate adds work, rest, and setup; reps without workSec add no work', () => {
  const p = { slots: [
    timed('a', 'warmup', 30, { restSec: 10 }),
    reps('b', 'main', { workSec: 40, setupSec: 16 }),
    reps('c', 'main'),
    reps('d', 'cooldown'),
  ], transitionSec: 8 };
  /* a: 30 + 8 + 10. b: 40 + 16 + 20 default main rest. c: 0 + 8 + 20. d: 0 + 8, no rest after last. */
  assert.strictEqual(SE.estimateSeconds(p), 48 + 76 + 28 + 8);
});

test('demo URLs: only https YouTube becomes an embed; TODO and other schemes do not', () => {
  assert.strictEqual(SE.embedUrl('https://www.youtube.com/watch?v=92riZhCgkjw'), 'https://www.youtube-nocookie.com/embed/92riZhCgkjw?rel=0');
  assert.strictEqual(SE.safeDemoUrl('https://youtu.be/92riZhCgkjw'), 'https://www.youtube.com/watch?v=92riZhCgkjw');
  ['TODO', '', 'http://www.youtube.com/watch?v=92riZhCgkjw', 'javascript:alert(1)', 'https://evil.example/watch?v=92riZhCgkjw'].forEach(bad => {
    assert.strictEqual(SE.embedUrl(bad), '');
  });
  assert.ok(!/autoplay/.test(SE.embedUrl('https://www.youtube.com/watch?v=92riZhCgkjw')));
});

test('a plan with no slots is refused', () => {
  assert.throws(() => SE.create({ id: 'x', slots: [] }), TypeError);
});
