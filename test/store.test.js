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
    assert.deepStrictEqual(r.state, { version: App.STORE_VERSION, completions: OLD[name].completions }, name);
    assert.strictEqual(r.changed, true);
  });
});

test('a v4 save round-trips unchanged', () => {
  const first = App.loadStoreFromRaw(JSON.stringify(OLD['adaptive-79f06e7'])).state;
  const again = App.loadStoreFromRaw(JSON.stringify(first));
  assert.deepStrictEqual(again, { state: first, changed: false, notice: null });
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
  assert.deepStrictEqual(App.logFinished(s, { completed: 0 }, new Date(2026, 10, 10)), { logged: false });
  assert.deepStrictEqual(s.completions, {});
  assert.strictEqual(App.logFinished(s, { completed: 3 }, new Date(2026, 10, 10, 7)).already, false);
  assert.strictEqual(App.logFinished(s, { completed: 3 }, new Date(2026, 10, 10, 19)).already, true);
  assert.deepStrictEqual(s.completions, { '2026-11-10': true });
});
