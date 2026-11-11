'use strict';
/* Page tests: load docs/index.html with its real scripts in jsdom and use
 * it through the buttons, the way a person would. A fake clock drives the
 * countdowns; the page's own 250 ms ticker applies them. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const DOCS = path.join(__dirname, '..', 'docs');
const HTML = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
const SCRIPTS = Array.from(HTML.matchAll(/<script src="([^"]+)"><\/script>/g)).map(m => m[1]);
const OLD = require(path.join(__dirname, 'fixtures', 'old-saves.json'));
const SESSION_KEY = 'awc-guided-session-v1';
const OPEN = new Set();
test.afterEach(() => { OPEN.forEach(w => w.close()); OPEN.clear(); });

/* Opens the page. `saved` seeds localStorage (a reload passes the previous
 * page's storage). `breakSetItem` makes every write throw. */
function openPage(options) {
  const opts = options || {};
  const dom = new JSDOM(HTML.replace(/<script src="[^"]+"><\/script>/g, ''), {
    url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const win = dom.window;
  OPEN.add(win);
  const clock = opts.clock || { now: 1800000000000 };
  win.Date.now = () => clock.now;
  Object.entries(opts.saved || {}).forEach(([k, v]) => win.localStorage.setItem(k, v));
  if (opts.breakSetItem) {
    win.Storage.prototype.setItem = function () { throw new win.DOMException('full', 'QuotaExceededError'); };
  }
  SCRIPTS.forEach(src => win.eval(fs.readFileSync(path.join(DOCS, src), 'utf8')));
  const doc = win.document;
  const q = id => doc.querySelector('[data-testid="' + id + '"]');
  const page = {
    win, doc, clock, q,
    click: id => { const b = q(id); assert.ok(b && !b.hidden && !b.disabled, id + ' is not clickable'); b.click(); },
    visible: id => { const n = q(id); if (!n) return false; for (let e = n; e && e.nodeType === 1; e = e.parentElement) { if (e.hidden) return false; } return true; },
    text: id => q(id).textContent.trim(),
    status: () => q('session-screen').getAttribute('data-status'),
    storage: () => { const out = {}; for (let i = 0; i < win.localStorage.length; i++) { const k = win.localStorage.key(i); out[k] = win.localStorage.getItem(k); } return out; },
    wait: ms => new Promise(r => setTimeout(r, ms)),
    close: () => win.close(),
  };
  return page;
}
async function advance(page, seconds) {
  page.clock.now += seconds * 1000;
  await page.wait(300);
}

test('the start screen shows the plan summary and Start, not the whole catalog', async () => {
  const p = openPage();
  assert.strictEqual(p.status(), 'idle');
  assert.match(p.text('session-title'), /35-minute/);
  assert.match(p.text('time-estimate'), /^About \d+ minutes\.$/);
  assert.match(p.text('exercise-count'), /^\d+ exercises/);
  const phases = Array.from(p.q('phase-breakdown').children).map(li => li.getAttribute('data-phase'));
  assert.deepStrictEqual(phases, ['warmup', 'main', 'cooldown']);
  assert.ok(p.visible('btn-start'));
  assert.strictEqual(p.q('plan-list').closest('details').open, false, 'the move list stays folded until asked for');
  assert.strictEqual(p.doc.querySelectorAll('iframe').length, 0, 'no video loads before Start');
  assert.strictEqual(p.doc.body.getAttribute('data-session'), 'idle');
  assert.ok(p.text('safety-notes').length > 0);
  p.close();
});

test('the start screen has a focus select, defaulting to Mix', () => {
  const p = openPage();
  const sel = p.q('focus-select');
  assert.ok(p.visible('focus-select'));
  assert.strictEqual(sel.value, 'mix');
  assert.deepStrictEqual(Array.from(sel.options).map(o => o.value), ['mix', 'Upper', 'Lower', 'Arms', 'Knee']);
  assert.match(p.doc.getElementById('focusHeading').textContent, /What do you want to work on/);
  assert.match(p.text('session-title'), /35-minute/);
  ['#typePicker', '#phaseCard', '#phasePicker', '.checklist', '#checkinModal', '[data-type]', '[data-phase-btn]']
    .forEach(sel => assert.strictEqual(p.doc.querySelector(sel), null, sel));
  p.close();
});

test('picking a focus rebuilds the preview and Start runs only that group', () => {
  const p = openPage();
  const sel = p.q('focus-select');
  const beforeTitle = p.text('session-title');
  const beforeEstimate = p.text('time-estimate');
  sel.value = 'Upper';
  sel.dispatchEvent(new p.win.Event('change', { bubbles: true }));
  assert.strictEqual(sel.value, 'Upper');
  assert.match(p.text('session-title'), /upper body/i);
  assert.notStrictEqual(p.text('session-title'), beforeTitle);
  assert.match(p.text('time-estimate'), /^About (2[0-9]|30) minutes\.$/);
  p.q('plan-list').closest('details').open = true;
  const names = Array.from(p.q('plan-list').querySelectorAll('ol')[1].querySelectorAll('li')).map(li => li.textContent);
  assert.ok(names.length >= 4);
  const upper = ['Incline or Knee Push-Up', 'Knee Push-Up', 'Dumbbell Floor Press', 'Dumbbell Overhead Press', 'One-Arm Dumbbell Row', 'Band Row', 'Band Face Pull'];
  names.forEach(n => assert.ok(upper.some(u => n.indexOf(u) === 0), n));
  assert.strictEqual(JSON.parse(p.storage()['awc-demo-v1']).lastFocus, 'Upper');
  p.click('btn-start');
  assert.strictEqual(p.status(), 'exercise');
  /* Skip through to a main move and confirm the focus label. */
  let steps = 0;
  while (p.text('phase-label').indexOf('Main') !== 0 && steps++ < 20) {
    if (p.status() === 'rest') p.click('btn-skip-rest');
    else p.click('btn-done');
  }
  assert.match(p.text('phase-label'), /Main · Upper body/);
  p.close();
});

test('the last picked focus comes back after a reload', () => {
  const first = openPage();
  const sel = first.q('focus-select');
  sel.value = 'Knee';
  sel.dispatchEvent(new first.win.Event('change', { bubbles: true }));
  const saved = first.storage();
  first.close();
  const p = openPage({ saved: saved });
  assert.strictEqual(p.q('focus-select').value, 'Knee');
  assert.match(p.text('session-title'), /knee recovery/i);
  p.close();
});

test('the old video library is gone and every script on the page exists', () => {
  assert.ok(!fs.existsSync(path.join(DOCS, 'video-library.js')));
  assert.deepStrictEqual(SCRIPTS, ['session-engine.js', 'session-screens.js', 'program.js', 'app.js']);
  SCRIPTS.forEach(src => assert.ok(fs.existsSync(path.join(DOCS, src)), src));
});

test('the security headers match the kids app', () => {
  const csp = new JSDOM(HTML).window.document.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  assert.strictEqual(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; form-action 'none'");
  assert.match(HTML, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
  assert.doesNotMatch(HTML, /<script>(?!<)/, 'no inline script');
});

test('Start runs the warm-up hands-free: exercise screen, one demo, controls', () => {
  const p = openPage();
  p.click('btn-start');
  assert.strictEqual(p.status(), 'exercise');
  assert.strictEqual(p.doc.body.getAttribute('data-session'), 'active');
  assert.strictEqual(p.text('phase-label'), 'Warm-up');
  assert.match(p.text('exercise-position'), /^Exercise 1 of \d+$/);
  ['exercise-name', 'exercise-dose', 'progress-bar', 'btn-done', 'btn-pause', 'btn-skip', 'btn-end'].forEach(id => assert.ok(p.visible(id), id));
  const frames = p.doc.querySelectorAll('iframe');
  assert.ok(frames.length <= 1);
  if (frames.length) {
    const f = frames[0];
    assert.match(f.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?rel=0$/);
    assert.doesNotMatch(f.src, /autoplay/);
    assert.strictEqual(f.getAttribute('sandbox'), 'allow-scripts allow-same-origin allow-presentation');
    assert.strictEqual(f.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
    assert.strictEqual(p.q('demo-watch').getAttribute('rel'), 'noopener noreferrer');
  }
  p.close();
});

test('a full session: timed countdowns, rests with Up next, skip, pause, reload, finish', async () => {
  const p = openPage();
  p.click('btn-start');
  let steps = 0;
  let sawRest = false;
  let sawKneeCaution = false;
  let didPause = false;
  let didSkip = false;
  let page = p;
  let reloaded = false;
  while (page.status() !== 'finished' && steps++ < 200) {
    const status = page.status();
    if (status === 'rest') {
      sawRest = true;
      assert.ok(page.visible('up-next'));
      assert.match(page.text('up-next'), /^Up next: /);
      assert.ok(page.doc.querySelectorAll('iframe').length <= 1);
      page.click('btn-skip-rest');
      continue;
    }
    assert.strictEqual(status, 'exercise');
    if (/Knee/i.test(page.q('session-screen').textContent) && page.visible('exercise-caution')) {
      sawKneeCaution = sawKneeCaution || /Stop if you feel sharp pain\./.test(page.text('exercise-caution'));
    }
    const timed = page.visible('countdown') && page.text('countdown') !== '';
    if (!didPause && timed) {
      const before = page.text('countdown');
      page.click('btn-pause');
      assert.strictEqual(page.status(), 'paused');
      await advance(page, 60);
      assert.strictEqual(page.text('countdown'), before, 'pause freezes the countdown');
      page.click('btn-resume');
      didPause = true;
    }
    if (!didSkip && page.text('phase-label').indexOf('Main') === 0) {
      page.click('btn-skip');
      didSkip = true;
      continue;
    }
    if (!reloaded && page.text('phase-label').indexOf('Main') === 0) {
      const name = page.text('exercise-name');
      const pos = page.text('exercise-position');
      const saved = page.storage();
      assert.ok(saved[SESSION_KEY], 'the session is saved while running');
      page.close();
      page = openPage({ saved: saved, clock: p.clock });
      assert.strictEqual(page.status(), 'exercise', 'a reload resumes');
      assert.strictEqual(page.text('exercise-name'), name);
      assert.strictEqual(page.text('exercise-position'), pos);
      reloaded = true;
    }
    if (timed && steps % 2 === 0) {
      await advance(page, 400);
      assert.notStrictEqual(page.status(), 'paused');
    } else {
      page.click('btn-done');
    }
  }
  assert.strictEqual(page.status(), 'finished');
  assert.deepStrictEqual({ sawRest, didPause, didSkip, reloaded }, { sawRest: true, didPause: true, didSkip: true, reloaded: true });
  assert.ok(sawKneeCaution, 'knee moves carry the sharp-pain stop note');
  assert.strictEqual(page.text('finish-title'), 'Workout complete');
  assert.match(page.text('finish-completed'), /^Exercises completed: \d+ of \d+$/);
  assert.strictEqual(page.text('finish-skipped'), 'Skipped: 1');
  assert.match(page.text('finish-time'), /^Total time: \d+ min/);
  const stored = page.storage();
  assert.strictEqual(stored[SESSION_KEY], undefined, 'finishing clears the session');
  const savedProgress = JSON.parse(stored['awc-demo-v1']);
  assert.strictEqual(Object.keys(savedProgress.completions).length, 1);
  assert.strictEqual(savedProgress.lastFocus, 'mix');
  assert.strictEqual(Object.values(savedProgress.focusLog)[0][0], 'mix');
  assert.match(page.text('cal-progress'), /^1 day trained this week$/);
  page.click('btn-finish-done');
  assert.strictEqual(page.status(), 'idle');
  page.close();
});

test('End asks to confirm; Keep going continues; Yes returns to Start and clears the session', () => {
  const p = openPage();
  p.click('btn-start');
  p.click('btn-done');
  p.click('btn-end');
  assert.strictEqual(p.status(), 'confirmEnd');
  assert.ok(p.visible('end-confirm'));
  p.click('btn-end-no');
  assert.strictEqual(p.status(), 'rest', 'back to the warm-up rest it came from');
  p.click('btn-end');
  p.click('btn-end-yes');
  assert.strictEqual(p.status(), 'idle');
  assert.strictEqual(p.storage()[SESSION_KEY], undefined);
  assert.strictEqual(p.doc.body.getAttribute('data-session'), 'idle');
  p.close();
});

test('when the browser refuses to save, a notice shows and the workout still runs', () => {
  const p = openPage({ breakSetItem: true });
  p.click('btn-start');
  assert.ok(p.visible('storage-notice'));
  assert.match(p.text('storage-notice'), /could not save/i);
  p.click('btn-done');
  assert.notStrictEqual(p.status(), 'idle');
  p.close();
});

test('phase-era and type-era saves load quietly: no notice, days kept, old timer ignored', () => {
  Object.keys(OLD).forEach(name => {
    const p = openPage({ saved: { 'awc-demo-v1': JSON.stringify(OLD[name]) } });
    assert.strictEqual(p.q('app-notice').hidden, true, name);
    assert.strictEqual(p.status(), 'idle', name);
    const store = JSON.parse(p.storage()['awc-demo-v1']);
    assert.deepStrictEqual(store, { version: 5, lastFocus: 'mix', completions: OLD[name].completions, focusLog: {} }, name);
    p.close();
  });
});

test('a broken save shows the reset notice and keeps a backup', () => {
  const p = openPage({ saved: { 'awc-demo-v1': '{oops' } });
  assert.strictEqual(p.q('app-notice').hidden, false);
  assert.match(p.text('app-notice'), /could not be read/);
  assert.ok(Object.keys(p.storage()).some(k => k.indexOf('awc-demo-v1.bak-') === 0));
  p.close();
});
