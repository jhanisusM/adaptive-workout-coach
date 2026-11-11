'use strict';
/* Calendar store: old saves load quietly and finished sessions log days. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const App = require(path.join(__dirname, '..', 'docs', 'app.js'));
const OLD = require(path.join(__dirname, 'fixtures', 'old-saves.json'));

test('phase-era, type-era, and v1 saves keep their trained days and drop the rest quietly', () => {
  Object.keys(OLD).forEach(name => {
    const r = App.loadStoreFromRaw(JSON.stringify(OLD[name]));
    assert.strictEqual(r.notice, null, name);
    assert.deepStrictEqual(r.state, { version: App.STORE_VERSION, lastFocus: 'mix', completions: OLD[name].completions, focusLog: {} }, name);
    assert.strictEqual(r.changed, true);
  });
});

test('a current save round-trips unchanged', () => {
  const first = App.loadStoreFromRaw(JSON.stringify(OLD['adaptive-79f06e7'])).state;
  const again = App.loadStoreFromRaw(JSON.stringify(first));
  assert.deepStrictEqual(again, { state: first, changed: false, notice: null });
  assert.strictEqual(first.lastFocus, 'mix');
  assert.deepStrictEqual(first.focusLog, {});
});

test('the last picked focus is kept, and an unknown or missing value becomes Mix with no notice', () => {
  const kept = App.loadStoreFromRaw(JSON.stringify({ version: 5, lastFocus: 'Arms', completions: { '2026-11-10': true }, focusLog: { '2026-11-10': ['Arms'] } }));
  assert.strictEqual(kept.notice, null);
  assert.strictEqual(kept.state.lastFocus, 'Arms');
  assert.deepStrictEqual(kept.state.focusLog, { '2026-11-10': ['Arms'] });
  const missing = App.loadStoreFromRaw(JSON.stringify({ version: 4, completions: { '2026-11-10': true } }));
  assert.strictEqual(missing.notice, null);
  assert.strictEqual(missing.state.lastFocus, 'mix');
  const unknown = App.loadStoreFromRaw(JSON.stringify({ version: 5, lastFocus: 'cardio', completions: {}, focusLog: {} }));
  assert.strictEqual(unknown.notice, null);
  assert.strictEqual(unknown.state.lastFocus, 'mix');
});

test('broken JSON or a non-object resets with the reset notice; bad days give the soft notice', () => {
  ['{nope', '[]', '7', 'null'].forEach(raw => assert.strictEqual(App.loadStoreFromRaw(raw).notice, App.NOTICE_CORRUPT, raw));
  const r = App.loadStoreFromRaw(JSON.stringify({ version: 3, completions: { '2026-11-03': true, 'nope': true } }));
  assert.strictEqual(r.notice, App.NOTICE_PARTIAL);
  assert.deepStrictEqual(r.state.completions, { '2026-11-03': true });
  assert.deepStrictEqual(App.loadStoreFromRaw(null), { state: App.defaultStore(), changed: false, notice: null });
});

test('a finished session logs the day once; a session with nothing done is not logged', () => {
  const s = App.defaultStore();
  assert.deepStrictEqual(App.logFinished(s, { completed: 0 }, new Date(2026, 10, 10), 'Upper'), { logged: false });
  assert.deepStrictEqual(s.completions, {});
  assert.deepStrictEqual(s.focusLog, {});
  const first = App.logFinished(s, { completed: 3 }, new Date(2026, 10, 10, 7), 'Upper');
  assert.strictEqual(first.already, false);
  assert.strictEqual(first.focus, 'Upper');
  assert.strictEqual(App.logFinished(s, { completed: 3 }, new Date(2026, 10, 10, 19), 'Arms').already, true);
  assert.deepStrictEqual(s.completions, { '2026-11-10': true });
  assert.deepStrictEqual(s.focusLog, { '2026-11-10': ['Upper', 'Arms'] });
});
