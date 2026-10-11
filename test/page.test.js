'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const app = require('../docs/app.js');

const docs = path.join(__dirname, '..', 'docs');

function pageHtml() {
  const html = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
  const video = fs.readFileSync(path.join(docs, 'video-library.js'), 'utf8');
  const source = fs.readFileSync(path.join(docs, 'app.js'), 'utf8');
  return html
    .replace('<script src="video-library.js"></script>', '<script>\n' + video + '\n</script>')
    .replace('<script src="app.js"></script>', '<script>\n' + source + '\n</script>');
}

function boot(storageValue) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => errors.push(err));
  const dom = new JSDOM(pageHtml(), {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (storageValue !== undefined) {
        const raw = typeof storageValue === 'string' ? storageValue : JSON.stringify(storageValue);
        window.localStorage.setItem(app.LS_KEY, raw);
      }
    },
  });
  return { dom, window: dom.window, errors };
}

function readStore(window) {
  return JSON.parse(window.localStorage.getItem(app.LS_KEY));
}

function backupValues(window) {
  const values = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.indexOf(app.LS_KEY + '.bak-') === 0) values.push(window.localStorage.getItem(key));
  }
  return values;
}

function click(window, el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function selectGymDay(window) {
  const day = window.document.querySelector('.day.gym');
  assert.ok(day, 'expected a gym day on the calendar');
  click(window, day);
  return day.getAttribute('data-day');
}

function checkAll(window) {
  for (let i = 0; i < 30; i++) {
    const box = window.document.querySelector('input[data-check]:not(:checked)');
    if (!box) return;
    box.checked = true;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  throw new Error('could not check every exercise');
}

function acceptClearance(window, date) {
  const doc = window.document;
  const box = doc.getElementById('clearanceAccept');
  const dateInput = doc.getElementById('clearanceDate');
  box.checked = true;
  dateInput.value = date || '2026-10-01';
  box.dispatchEvent(new window.Event('change', { bubbles: true }));
  dateInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  click(window, doc.getElementById('btnClearanceSave'));
}

function saveCheckin(window, pain) {
  const doc = window.document;
  const select = doc.getElementById('painDuring');
  select.value = String(pain);
  click(window, doc.getElementById('btnCheckinSave'));
}

function thisTuesday() {
  const today = new Date();
  const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const tue = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 1);
  return app.dayKey(tue);
}

test('featured demos render and boxes cannot log a workout before Start', () => {
  const { dom, window, errors } = boot();
  try {
    assert.deepEqual(errors, []);
    const featured = window.document.querySelectorAll('#featuredDemos a');
    assert.equal(featured.length, 3);
    assert.match(window.document.getElementById('blockNote').textContent, /foundation block/);
    assert.ok(window.document.querySelector('input[data-check]').disabled);

    const box = window.document.querySelector('input[data-check]');
    box.checked = true;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
    const stored = readStore(window);
    assert.equal(Boolean(stored && stored.checks && stored.checks['quad-sets']), false);
    assert.equal(window.document.querySelector('input[data-check="quad-sets"]').checked, false);
    assert.match(window.document.getElementById('sessionMessage').textContent, /Start a session/);
    assert.equal(window.document.getElementById('btnFinish').hidden, true);
    assert.equal(window.document.querySelectorAll('.exercise').length, 12);
    assert.doesNotMatch(window.document.getElementById('routine').textContent, /18 min/);
    assert.equal(window.document.querySelector('[data-phase="2"]').classList.contains('locked'), true);
    assert.equal(window.document.querySelector('[data-phase="3"]').classList.contains('locked'), true);
    assert.equal(window.document.getElementById('btnStart').disabled, true);
    assert.equal(window.document.getElementById('redFlags').hidden, false);
    assert.match(window.document.getElementById('redFlags').textContent, /blood clot/);
  } finally {
    dom.window.close();
  }
});

test('Finish logs a gym day once, and ticking every box does not', async () => {
  const { dom, window, errors } = boot();
  try {
    assert.deepEqual(errors, []);
    acceptClearance(window);
    const day = selectGymDay(window);
    click(window, window.document.getElementById('btnStart'));
    checkAll(window);
    let stored = readStore(window);
    assert.equal(stored.phaseSessions['1'], 0);
    assert.equal(stored.completions[day], undefined);
    assert.ok(window.document.getElementById('finishConfirm').classList.contains('show'));

    click(window, window.document.getElementById('btnFinishNow'));
    assert.equal(window.document.getElementById('checkinModal').hidden, false);
    assert.equal(readStore(window).phaseSessions['1'], 0);
    saveCheckin(window, 1);
    stored = readStore(window);
    assert.equal(stored.phaseSessions['1'], 1);
    assert.equal(stored.completions[day], true);
    assert.equal(stored.symptoms[day].painDuring, 1);
    assert.equal(stored.session, null);
    assert.deepEqual(stored.checks, {});
    assert.deepEqual(stored.checklist, {});

    selectGymDay(window);
    click(window, window.document.getElementById('btnStart'));
    click(window, window.document.getElementById('btnFinish'));
    stored = readStore(window);
    assert.equal(stored.phaseSessions['1'], 1);
    assert.equal(stored.completions[day], true);
  } finally {
    dom.window.close();
  }
});

test('an expired session reopens with demos, kept checks, and a log or discard choice', () => {
  const day = thisTuesday();
  const seed = {
    phase: 1,
    phaseSessions: { 1: 1, 2: 0, 3: 0 },
    checks: { 'quad-sets': true },
    collapsed: {},
    thirdDay: 'none',
    completions: {},
    activeDay: day,
    checklist: {},
    session: {
      state: 'running',
      startedAt: 10,
      deadline: Date.now() - 60_000,
      remainingMs: null,
      day: day,
    },
  };
  const first = boot(seed);
  try {
    assert.deepEqual(first.errors, []);
    const doc = first.window.document;
    assert.equal(doc.querySelectorAll('#featuredDemos a').length, 3);
    assert.match(doc.getElementById('blockNote').textContent, /accessory block/);
    assert.ok(doc.getElementById('expiryConfirm').classList.contains('show'));
    assert.equal(doc.querySelector('input[data-check="quad-sets"]').checked, true);
    assert.equal(doc.getElementById('timer').textContent, '00:00');
    assert.equal(readStore(first.window).checks['quad-sets'], true);
    assert.equal(readStore(first.window).phaseSessions['1'], 1);

    click(first.window, doc.getElementById('btnExpireLog'));
    assert.equal(doc.getElementById('checkinModal').hidden, false);
    assert.equal(readStore(first.window).phaseSessions['1'], 1);
    saveCheckin(first.window, 0);
    const logged = readStore(first.window);
    assert.equal(logged.phaseSessions['1'], 2);
    assert.equal(logged.completions[day], true);
    assert.equal(logged.session, null);
  } finally {
    first.dom.window.close();
  }

  const discardSeed = JSON.parse(JSON.stringify(seed));
  const second = boot(discardSeed);
  try {
    assert.equal(second.window.document.querySelectorAll('#featuredDemos a').length, 3);
    click(second.window, second.window.document.getElementById('btnExpireDiscard'));
    const stored = readStore(second.window);
    assert.equal(stored.session, null);
    assert.deepEqual(stored.checks, {});
    assert.equal(stored.phaseSessions['1'], 1);
    assert.equal(stored.completions[day], undefined);
    assert.equal(second.window.document.querySelectorAll('#featuredDemos a').length, 3);
  } finally {
    second.dom.window.close();
  }
});

test('the current phase does nothing and a locked phase cannot be opened', () => {
  const { dom, window, errors } = boot();
  try {
    assert.deepEqual(errors, []);
    acceptClearance(window);
    selectGymDay(window);
    click(window, window.document.getElementById('btnStart'));
    const before = readStore(window);
    click(window, window.document.querySelector('[data-phase="1"]'));
    const afterSame = readStore(window);
    assert.equal(afterSame.phase, 1);
    assert.equal(afterSame.session.state, 'running');
    assert.equal(afterSame.session.deadline, before.session.deadline);
    assert.equal(window.document.getElementById('phaseConfirm').classList.contains('show'), false);

    click(window, window.document.querySelector('[data-phase="3"]'));
    assert.equal(window.document.getElementById('phaseConfirm').classList.contains('show'), false);
    assert.equal(readStore(window).phase, 1);
    assert.equal(readStore(window).session.state, 'running');
    assert.equal(readStore(window).unlockedPhase, 1);
    assert.match(window.document.getElementById('sessionMessage').textContent, /9/);
    assert.equal(window.document.querySelectorAll('.exercise').length, 12);
  } finally {
    dom.window.close();
  }
});

test('moving back from an unlocked phase still asks before ending a session', () => {
  const day = thisTuesday();
  const { dom, window, errors } = boot({
    version: 2,
    phase: 2,
    unlockedPhase: 2,
    phaseSessions: { 1: 9, 2: 1, 3: 0 },
    checks: {},
    collapsed: {},
    thirdDay: 'none',
    completions: {},
    activeDay: day,
    checklist: { 1: { 'no-swelling': true, 'pain-ok': true, 'good-control': true } },
    session: {
      state: 'running',
      startedAt: Date.now(),
      deadline: Date.now() + 10 * 60 * 1000,
      remainingMs: null,
      day: day,
    },
    symptoms: {},
    clearance: { accepted: true, date: '2026-10-01' },
    history: [{ type: 'advance', from: 1, to: 2, at: '2026-10-01T00:00:00.000Z' }],
  });
  try {
    assert.deepEqual(errors, []);
    assert.equal(window.document.getElementById('clearanceModal').hidden, true);
    assert.match(window.document.getElementById('phaseTitle').textContent, /Phase 2/);
    assert.equal(window.document.querySelector('[data-phase="1"]').classList.contains('locked'), false);
    assert.equal(window.document.querySelector('[data-phase="3"]').classList.contains('locked'), true);
    click(window, window.document.querySelector('[data-phase="1"]'));
    assert.ok(window.document.getElementById('phaseConfirm').classList.contains('show'));
    assert.equal(readStore(window).phase, 2);
    assert.equal(readStore(window).session.state, 'running');
    click(window, window.document.getElementById('btnPhaseYes'));
    const changed = readStore(window);
    assert.equal(changed.phase, 1);
    assert.equal(changed.unlockedPhase, 2);
    assert.equal(changed.session, null);
    assert.equal(changed.checklist['1']['good-control'], true);
    assert.equal(changed.history.length, 1);
    click(window, window.document.querySelector('[data-phase="2"]'));
    assert.equal(readStore(window).phase, 2);
    assert.equal(window.document.querySelectorAll('.exercise').length, 11);
  } finally {
    dom.window.close();
  }
});

test('a stale selected day is replaced on load and the calendar follows a new date', async () => {
  const { dom, window, errors } = boot({
    version: 2,
    phase: 1,
    phaseSessions: { 1: 2, 2: 0, 3: 0 },
    checks: {},
    collapsed: {},
    thirdDay: 'none',
    completions: { '2020-01-07': true },
    activeDay: '2020-01-01',
    checklist: {},
    session: null,
    unlockedPhase: 1,
    symptoms: {},
    clearance: null,
    history: [],
  });
  try {
    assert.deepEqual(errors, []);
    const stored = readStore(window);
    assert.equal(stored.phaseSessions['1'], 2);
    assert.equal(stored.completions['2020-01-07'], true);
    assert.notEqual(stored.activeDay, '2020-01-01');
    assert.ok(app.weekDayKeys(new Date()).includes(stored.activeDay) || app.isGymDayKey(stored.activeDay, 'none'));
    const before = window.document.getElementById('weekGrid').textContent;
    const RealDate = window.Date;
    const future = new RealDate(Date.now() + 8 * 24 * 60 * 60 * 1000);
    function MockDate(...args) {
      if (!(this instanceof MockDate)) return new RealDate(...(args.length ? args : [future])).toString();
      if (args.length === 0) return new RealDate(future.getTime());
      return new RealDate(...args);
    }
    MockDate.prototype = RealDate.prototype;
    MockDate.now = () => future.getTime();
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    window.Date = MockDate;
    await new Promise(resolve => setTimeout(resolve, 600));
    const after = window.document.getElementById('weekGrid').textContent;
    assert.notEqual(after, before);
    assert.notEqual(readStore(window).activeDay, '2020-01-01');
  } finally {
    dom.window.close();
  }
});

test('corrupt storage still renders, and a saved session deadline is kept', () => {
  const corrupt = boot('{"checks":null,"phase":2,"phaseSessions":null,"completions":{"2026-10-06":true}}');
  try {
    assert.deepEqual(corrupt.errors, []);
    const doc = corrupt.window.document;
    assert.match(doc.getElementById('phaseTitle').textContent, /Phase 2/);
    assert.ok(doc.querySelectorAll('.exercise').length >= 8);
    assert.match(doc.getElementById('sessionMessage').textContent, /unreadable/);
    assert.match(doc.getElementById('sessionMessage').textContent, /backup of your previous save/);
    const stored = readStore(corrupt.window);
    assert.equal(stored.version, 2);
    assert.equal(stored.phase, 2);
    assert.equal(stored.completions['2026-10-06'], true);
    assert.deepEqual(stored.checks, {});
    assert.deepEqual(backupValues(corrupt.window), [
      '{"checks":null,"phase":2,"phaseSessions":null,"completions":{"2026-10-06":true}}',
    ]);
  } finally {
    corrupt.dom.window.close();
  }

  const garbage = boot('{');
  try {
    assert.deepEqual(garbage.errors, []);
    assert.match(garbage.window.document.getElementById('phaseTitle').textContent, /Phase 1/);
    assert.ok(garbage.window.document.querySelectorAll('.exercise').length >= 8);
    assert.match(garbage.window.document.getElementById('sessionMessage').textContent, /fresh start/);
    assert.match(garbage.window.document.getElementById('sessionMessage').textContent, /backup of your previous save/);
    assert.deepEqual(backupValues(garbage.window), ['{']);
  } finally {
    garbage.dom.window.close();
  }

  const notObject = boot('[]');
  try {
    assert.deepEqual(notObject.errors, []);
    assert.match(notObject.window.document.getElementById('phaseTitle').textContent, /Phase 1/);
    assert.deepEqual(backupValues(notObject.window), ['[]']);
  } finally {
    notObject.dom.window.close();
  }

  const deadline = Date.now() + 10 * 60 * 1000;
  const day = thisTuesday();
  const kept = boot({
    phase: 2,
    phaseSessions: { 1: 9, 2: 4, 3: 0 },
    checks: { 'quad-sets': true },
    collapsed: {},
    thirdDay: 'none',
    completions: { '2026-10-01': true },
    activeDay: day,
    checklist: { 1: { 'no-swelling': true } },
    session: { state: 'running', startedAt: deadline - app.SESSION_MS, deadline: deadline, remainingMs: null, day: day },
  });
  try {
    assert.deepEqual(kept.errors, []);
    const stored = readStore(kept.window);
    assert.equal(stored.phase, 2);
    assert.equal(stored.unlockedPhase, 2);
    assert.equal(stored.phaseSessions['2'], 4);
    assert.equal(stored.session.deadline, deadline);
    assert.equal(stored.checklist['1']['no-swelling'], true);
    assert.equal(stored.completions['2026-10-01'], true);
    assert.notEqual(kept.window.document.getElementById('timer').textContent, '30:00');
    assert.equal(kept.window.document.getElementById('btnPause').hidden, false);
    assert.deepEqual(backupValues(kept.window), []);
  } finally {
    kept.dom.window.close();
  }
});

function phase1Checklist() {
  const bucket = {};
  app.checklistForPhase(1).forEach(item => { bucket[item.id] = true; });
  return { 1: bucket };
}

function baseStore(extra) {
  return Object.assign({
    version: 2,
    phase: 1,
    unlockedPhase: 1,
    phaseSessions: { 1: 0, 2: 0, 3: 0 },
    checks: {},
    collapsed: {},
    thirdDay: 'none',
    completions: {},
    activeDay: thisTuesday(),
    checklist: {},
    session: null,
    symptoms: {},
    clearance: { accepted: true, date: '2026-10-01' },
    history: [],
  }, extra || {});
}

test('Advance opens the next phase only after 9 sessions and the checklist', () => {
  const { dom, window, errors } = boot(baseStore({
    phaseSessions: { 1: 9, 2: 0, 3: 0 },
    checklist: phase1Checklist(),
  }));
  try {
    assert.deepEqual(errors, []);
    assert.equal(window.document.getElementById('clearanceModal').hidden, true);
    assert.equal(window.document.getElementById('advanceBtn').disabled, false);
    click(window, window.document.getElementById('advanceBtn'));
    const stored = readStore(window);
    assert.equal(stored.phase, 2);
    assert.equal(stored.unlockedPhase, 2);
    assert.equal(stored.history.length, 1);
    assert.equal(stored.history[0].to, 2);
    assert.equal(window.document.querySelector('[data-phase="3"]').classList.contains('locked'), true);
    assert.match(window.document.getElementById('phaseTitle').textContent, /Phase 2/);
  } finally {
    dom.window.close();
  }
});

function runningSession(day) {
  return {
    state: 'running',
    startedAt: Date.now(),
    deadline: Date.now() + 10 * 60 * 1000,
    remainingMs: null,
    day: day,
  };
}

test('confirming an advance checks the gate again', () => {
  const day = thisTuesday();
  const unticked = boot(baseStore({
    phaseSessions: { 1: 9, 2: 0, 3: 0 },
    checklist: phase1Checklist(),
    activeDay: day,
    session: runningSession(day),
  }));
  try {
    const doc = unticked.window.document;
    click(unticked.window, doc.getElementById('advanceBtn'));
    assert.ok(doc.getElementById('phaseConfirm').classList.contains('show'));
    assert.equal(readStore(unticked.window).phase, 1);
    const box = doc.querySelector('[data-checklist-item="sit-to-stand"]');
    box.checked = false;
    box.dispatchEvent(new unticked.window.Event('change', { bubbles: true }));
    click(unticked.window, doc.getElementById('btnPhaseYes'));
    const stored = readStore(unticked.window);
    assert.equal(stored.phase, 1);
    assert.equal(stored.unlockedPhase, 1);
    assert.deepEqual(stored.history, []);
    assert.equal(stored.session.state, 'running');
    assert.equal(doc.getElementById('phaseConfirm').classList.contains('show'), false);
    assert.match(doc.getElementById('sessionMessage').textContent, /checklist/i);
  } finally {
    unticked.dom.window.close();
  }

  const flagged = boot(baseStore({
    phaseSessions: { 1: 9, 2: 0, 3: 0 },
    checklist: phase1Checklist(),
    activeDay: day,
    session: runningSession(day),
    symptoms: {
      '2020-01-07': { painDuring: 5, painNext: 0, swellingNext: false, phase: 1 },
    },
  }));
  try {
    const doc = flagged.window.document;
    assert.equal(doc.getElementById('advanceBtn').disabled, false);
    click(flagged.window, doc.getElementById('advanceBtn'));
    assert.ok(doc.getElementById('phaseConfirm').classList.contains('show'));
    click(flagged.window, doc.getElementById('btnFinish'));
    saveCheckin(flagged.window, 6);
    assert.equal(readStore(flagged.window).phaseSessions['1'], 10);
    assert.ok(doc.getElementById('phaseConfirm').classList.contains('show'));
    click(flagged.window, doc.getElementById('btnPhaseYes'));
    const stored = readStore(flagged.window);
    assert.equal(stored.phase, 1);
    assert.equal(stored.unlockedPhase, 1);
    assert.deepEqual(stored.history, []);
    assert.equal(doc.getElementById('phaseConfirm').classList.contains('show'), false);
    assert.match(doc.getElementById('sessionMessage').textContent, /two flagged sessions/i);
  } finally {
    flagged.dom.window.close();
  }
});

test('a flagged check-in repeats the week and two flags lock Advance', () => {
  const flagged = boot(baseStore());
  try {
    acceptClearance(flagged.window, '2026-10-01');
    selectGymDay(flagged.window);
    click(flagged.window, flagged.window.document.getElementById('btnStart'));
    click(flagged.window, flagged.window.document.getElementById('btnFinish'));
    const doseBefore = flagged.window.document.querySelector('.dose').textContent;
    saveCheckin(flagged.window, 6);
    const doc = flagged.window.document;
    assert.match(doc.getElementById('symptomAdvice').textContent, /Repeat this week or reduce your sets/);
    assert.equal(doc.getElementById('symptomAdvice').hidden, false);
    assert.match(doc.getElementById('weekNote').textContent, /Week 1/);
    assert.equal(doc.querySelector('[data-check="quad-sets"]').parentElement.querySelector('.dose').textContent, '10 \u00d7 5-sec hold');
    assert.equal(doc.querySelector('.dose').textContent, doseBefore);
    const stored = readStore(flagged.window);
    assert.deepEqual(stored.checklist, {});
    assert.equal(stored.phaseSessions['1'], 1);
  } finally {
    flagged.dom.window.close();
  }

  const locked = boot(baseStore({
    phaseSessions: { 1: 9, 2: 0, 3: 0 },
    checklist: phase1Checklist(),
    symptoms: {
      '2026-10-01': { painDuring: 5, painNext: 0, swellingNext: false, phase: 1 },
      '2026-10-03': { painDuring: 1, painNext: 0, swellingNext: true, phase: 1 },
    },
  }));
  try {
    const doc = locked.window.document;
    assert.equal(doc.getElementById('advanceBtn').disabled, true);
    assert.match(doc.getElementById('advanceNote').textContent, /two flagged sessions/i);
    assert.match(doc.getElementById('symptomAdvice').textContent, /Doses are not changed for you/);
    click(locked.window, doc.getElementById('advanceBtn'));
    assert.equal(readStore(locked.window).phase, 1);
  } finally {
    locked.dom.window.close();
  }
});

test('Something is wrong ends the session without logging', () => {
  const { dom, window, errors } = boot();
  try {
    assert.deepEqual(errors, []);
    acceptClearance(window);
    selectGymDay(window);
    click(window, window.document.getElementById('btnStart'));
    const box = window.document.querySelector('input[data-check]');
    box.checked = true;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
    click(window, window.document.getElementById('btnSomethingWrong'));
    const stored = readStore(window);
    assert.equal(stored.session, null);
    assert.deepEqual(stored.checks, {});
    assert.equal(stored.phaseSessions['1'], 0);
    assert.match(window.document.getElementById('sessionMessage').textContent, /Nothing was logged/);
    assert.match(window.document.getElementById('redFlags').textContent, /gives way/);
  } finally {
    dom.window.close();
  }
});
