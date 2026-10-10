'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../docs/app.js');
const videos = require('../docs/video-library.js');

const TUE = new Date(2026, 9, 6);
const WED = new Date(2026, 9, 7);
const SAT = new Date(2026, 9, 10);
const SUN = new Date(2026, 9, 11);

function session(day, extra) {
  return Object.assign({
    state: 'running',
    startedAt: 1_000,
    deadline: 5_000_000,
    remainingMs: null,
    day: day,
  }, extra || {});
}

function gymState(day, extra) {
  const state = app.defaultStore(TUE);
  state.activeDay = day || '2026-10-06';
  state.thirdDay = 'none';
  state.phase = 1;
  state.phaseSessions = { 1: 0, 2: 0, 3: 0 };
  state.completions = {};
  state.checks = {};
  state.session = session(state.activeDay);
  return Object.assign(state, extra || {});
}

test('resolvePhase returns each current program and rejects an unknown phase', () => {
  assert.equal(app.resolvePhase(1).exercises.length, 8);
  assert.equal(app.resolvePhase(2).exercises.length, 11);
  assert.equal(app.resolvePhase(3).exercises.length, 12);
  assert.equal(app.resolvePhase(1).name, 'Reactivate');
  assert.equal(app.resolvePhase(3).exercises.some(e => e.id === 'bulgarian-split-squat'), true);
  assert.equal(app.resolvePhase(1).exercises.some(e => e.id === 'bulgarian-split-squat'), false);
  assert.equal(app.resolvePhase(1).exercises.some(e => e.id === 'goblet-squat'), false);
  const bss = app.resolvePhase(3).exercises.find(e => e.id === 'bulgarian-split-squat');
  assert.equal(bss.dose, '3 \u00d7 8 each side');
  assert.throws(() => app.resolvePhase(9), /unknown phase/);
});

test('remainingMs uses one deadline and does not move while paused', () => {
  const now = 1_000_000;
  const running = session('2026-10-06', { deadline: now + 90_000, remainingMs: null });
  assert.equal(app.remainingMs(running, now + 30_000), 60_000);
  const paused = session('2026-10-06', { state: 'paused', remainingMs: 45_000, deadline: now });
  assert.equal(app.remainingMs(paused, now + 999_999), 45_000);
  assert.equal(app.remainingMs(null, now), app.SESSION_MS);
  assert.equal(app.remainingMs(session('2026-10-06', { state: 'expired', remainingMs: 0 }), now), 0);
});

test('checklist gating stays closed until every item is confirmed', () => {
  assert.equal(app.checklistReady({}, 1), false);
  assert.equal(app.checklistReady({ 1: { 'no-swelling': true, 'pain-ok': true } }, 1), false);
  assert.equal(app.checklistReady({
    1: { 'no-swelling': true, 'pain-ok': true, 'good-control': true },
  }, 1), true);
});

test('checking boxes does nothing without a session and does not log by itself', () => {
  const idle = gymState();
  idle.session = null;
  const before = JSON.parse(JSON.stringify(idle));
  const refused = app.toggleCheckState(idle, 'quad-sets');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'no-session');
  assert.deepEqual(idle, before);

  const state = gymState();
  const ids = app.resolvePhase(1).exercises.map(e => e.id);
  ids.forEach(id => {
    const result = app.toggleCheckState(state, id);
    assert.equal(result.ok, true);
  });
  assert.equal(state.phaseSessions[1], 0);
  assert.equal(state.session.state, 'running');
  assert.equal(Object.keys(state.checks).length, ids.length);

  const logged = app.applyCompletion(state);
  assert.equal(logged.ok, true);
  assert.equal(logged.already, false);
  assert.equal(state.phaseSessions[1], 1);
  assert.equal(state.session, null);
  assert.deepEqual(state.checks, {});
  assert.equal(state.completions['2026-10-06'], true);
});

test('a day can be logged only once, and only from an active session on a gym day', () => {
  const state = gymState();
  assert.equal(app.applyCompletion(Object.assign(app.defaultStore(TUE), { session: null })).ok, false);

  app.applyCompletion(state);
  assert.equal(state.phaseSessions[1], 1);

  state.session = session('2026-10-06');
  state.checks = { 'quad-sets': true };
  const again = app.applyCompletion(state);
  assert.equal(again.ok, true);
  assert.equal(again.already, true);
  assert.equal(state.phaseSessions[1], 1);
  assert.equal(state.completions['2026-10-06'], true);

  const sunday = gymState('2026-10-11');
  sunday.session = session('2026-10-11');
  const snapshot = JSON.parse(JSON.stringify(sunday));
  const refused = app.applyCompletion(sunday);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'not-gym-day');
  assert.deepEqual(sunday, snapshot);

  const friday = gymState('2026-10-09');
  friday.session = session('2026-10-09');
  assert.equal(app.applyCompletion(friday).reason, 'not-gym-day');
  friday.thirdDay = 'fri-morning';
  friday.session = session('2026-10-09');
  assert.equal(app.applyCompletion(friday).ok, true);

  assert.equal(app.canStartSession(gymState('2026-10-10', { session: null, activeDay: '2026-10-10' })).reason, 'not-gym-day');
  assert.equal(app.canStartSession(gymState('2026-10-06', { session: null, activeDay: '2026-10-06' })).action, 'start');
  const paused = gymState();
  paused.session = session('2026-10-06', { state: 'paused', remainingMs: 1000 });
  assert.equal(app.canStartSession(paused).action, 'resume');
});

test('expiry keeps checks and still allows a single log', () => {
  const state = gymState();
  state.checks = { 'quad-sets': true, 'glute-bridges': true };
  const checks = state.checks;
  assert.equal(app.shouldExpireOnLoad(state.session, state.session.deadline), true);
  assert.equal(app.shouldExpireOnLoad(state.session, state.session.deadline - 1), false);
  assert.equal(app.expireIfDue(state, state.session.deadline), true);
  assert.equal(state.session.state, 'expired');
  assert.equal(state.session.remainingMs, 0);
  assert.equal(state.checks, checks);
  assert.equal(app.expireIfDue(state, Date.now()), false);

  const logged = app.applyCompletion(state);
  assert.equal(logged.ok, true);
  assert.equal(state.phaseSessions[1], 1);
  assert.equal(state.session, null);
});

test('the current phase is a no-op and a different phase confirms before discarding a session', () => {
  const state = gymState();
  state.checks = { 'quad-sets': true };
  assert.deepEqual(app.phaseChangeDecision(state, 1), { action: 'noop' });
  assert.equal(state.session.state, 'running');
  assert.equal(state.checks['quad-sets'], true);

  assert.deepEqual(app.phaseChangeDecision(state, 2), { action: 'confirm', phase: 2 });
  assert.equal(state.phase, 1);
  assert.equal(state.session.state, 'running');

  app.applyPhaseChange(state, 2);
  assert.equal(state.phase, 2);
  assert.equal(state.session, null);
  assert.deepEqual(state.checks, {});

  const idle = gymState();
  idle.session = null;
  assert.deepEqual(app.phaseChangeDecision(idle, 3), { action: 'apply', phase: 3 });
  assert.deepEqual(app.phaseChangeDecision(idle, 99), { action: 'noop' });
});

test('a selected day outside the visible week moves to today or the next gym day', () => {
  assert.equal(app.resolveActiveDay('2020-01-01', TUE, 'none'), '2026-10-06');
  assert.equal(app.resolveActiveDay('2020-01-01', WED, 'none'), '2026-10-08');
  assert.equal(app.resolveActiveDay('2020-01-01', SAT, 'none'), '2026-10-13');
  assert.equal(app.resolveActiveDay('2026-10-10', SAT, 'none'), '2026-10-10');
  assert.equal(app.resolveActiveDay('2026-10-06', SAT, 'none'), '2026-10-06');
  assert.equal(app.nextGymDay(SUN, 'none'), '2026-10-13');
  assert.equal(app.isGymDay(SAT, 'sat-morning'), true);
  assert.equal(app.isGymDay(SAT, 'none'), false);

  const state = app.defaultStore(SAT);
  state.activeDay = '2020-01-01';
  state.thirdDay = 'none';
  const rolled = app.rolloverActiveDay(state, new Date(2026, 9, 18));
  assert.equal(rolled.changed, true);
  assert.notEqual(state.activeDay, '2020-01-01');
  assert.equal(app.weekDayKeys(new Date(2026, 9, 18)).indexOf('2020-01-01'), -1);
});

test('saved v1 progress survives migration and a second load is stable', () => {
  const saved = {
    session: session('2026-10-06', { deadline: 424242 }),
    checks: { 'quad-sets': true },
    collapsed: { warmup: true },
    thirdDay: 'sat-morning',
    completions: { '2026-10-06': true, '2026-10-08': true },
    activeDay: '2026-10-08',
    phase: 2,
    phaseSessions: { 1: 9, 2: 4, 3: 0 },
    checklist: { 1: { 'no-swelling': true, 'pain-ok': true, 'good-control': true } },
  };
  const snapshot = JSON.parse(JSON.stringify(saved));
  const first = app.migrate(saved, TUE);
  assert.deepEqual(saved, snapshot);
  assert.equal(first.notice, null);
  assert.equal(first.changed, true);
  assert.equal(first.state.version, 2);
  assert.equal(first.state.phase, 2);
  assert.equal(first.state.unlockedPhase, 2);
  assert.equal(first.state.phaseSessions[1], 9);
  assert.equal(first.state.phaseSessions[2], 4);
  assert.equal(first.state.phaseSessions[3], 0);
  assert.equal(first.state.session.deadline, 424242);
  assert.equal(first.state.session.state, 'running');
  assert.equal(first.state.checks['quad-sets'], true);
  assert.equal(first.state.collapsed.warmup, true);
  assert.equal(first.state.thirdDay, 'sat-morning');
  assert.equal(first.state.completions['2026-10-06'], true);
  assert.equal(first.state.completions['2026-10-08'], true);
  assert.equal(first.state.activeDay, '2026-10-08');
  assert.equal(first.state.checklist['1']['good-control'], true);
  assert.deepEqual(first.state.symptoms, {});
  assert.equal(first.state.clearance, null);
  assert.deepEqual(first.state.history, []);

  const second = app.migrate(first.state, TUE);
  assert.equal(second.changed, false);
  assert.equal(second.notice, null);
  assert.deepEqual(second.state, first.state);
});

test('migration keeps counts above 9 and caps only the displayed goal', () => {
  const kept = app.migrate({
    phase: 1,
    phaseSessions: { 1: 40, 2: 0, 3: 3 },
    completions: { '2026-10-06': true },
    session: null,
    checks: {},
    collapsed: {},
    thirdDay: 'none',
    activeDay: '2026-10-06',
    checklist: {},
  }, TUE);
  assert.equal(kept.state.phaseSessions[1], 40);
  assert.equal(kept.state.phaseSessions[3], 3);
  assert.equal(kept.state.completions['2026-10-06'], true);
  assert.equal(kept.notice, null);
  assert.equal(app.cappedSessionCount(40), 9);
  assert.equal(app.cappedSessionCount(3), 3);
  assert.equal(app.cappedSessionCount(0), 0);

  const partial = app.migrate({
    phase: 3,
    checks: null,
    phaseSessions: null,
    completions: { '2026-10-06': true, 'not-a-day': true },
    activeDay: '2026-02-31',
  }, TUE);
  assert.equal(partial.notice, app.NOTICE_PARTIAL);
  assert.equal(partial.state.phase, 3);
  assert.equal(partial.state.unlockedPhase, 3);
  assert.deepEqual(partial.state.checks, {});
  assert.deepEqual(partial.state.phaseSessions, { 1: 0, 2: 0, 3: 0 });
  assert.equal(partial.state.completions['2026-10-06'], true);
  assert.equal(partial.state.completions['not-a-day'], undefined);
  assert.equal(partial.state.activeDay, app.dayKey(TUE));

  const broken = app.migrate('nope', TUE);
  assert.equal(broken.notice, app.NOTICE_CORRUPT);
  assert.equal(broken.state.phase, 1);
  assert.equal(broken.state.version, 2);

  const parsed = app.loadStoreFromRaw('{"phase":', TUE);
  assert.equal(parsed.notice, app.NOTICE_CORRUPT);
  assert.equal(parsed.state.phase, 1);
  assert.equal(app.loadStoreFromRaw(null, TUE).changed, false);
});

test('a bad video id warns and is skipped', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    assert.equal(videos.resolveVideo('v-djkim-featured').creator, 'DJ Kim');
    assert.equal(videos.resolveVideo('missing-video'), null);
    const demos = app.resolveDemoList(['missing-video', 'v-djkim-featured', 'also-missing']);
    assert.equal(demos.length, 1);
    assert.equal(demos[0].id, 'v-djkim-featured');
    const threw = app.resolveDemoList(['x'], () => { throw new Error('unknown video id: x'); });
    assert.deepEqual(threw, []);
  } finally {
    console.warn = original;
  }
  assert.match(warnings.join('\n'), /missing-video/);
  assert.match(warnings.join('\n'), /unknown video id: x/);
});

test('changing the third gym day moves a non-gym selection when no session is running', () => {
  const state = app.defaultStore(SAT);
  state.activeDay = '2026-10-10';
  state.thirdDay = 'sat-morning';
  state.session = null;
  const picked = app.thirdDaySelection(state, 'none', SAT);
  assert.equal(picked.thirdDay, 'none');
  assert.equal(picked.activeDay, '2026-10-13');
});
