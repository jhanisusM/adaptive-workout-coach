'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = require('../docs/app.js');

const TUE = new Date(2026, 9, 6);

function clearedState(extra) {
  const state = app.defaultStore(TUE);
  state.activeDay = '2026-10-06';
  state.thirdDay = 'none';
  state.phase = 1;
  state.unlockedPhase = 1;
  state.phaseSessions = { 1: 0, 2: 0, 3: 0 };
  state.completions = {};
  state.checks = {};
  state.checklist = {};
  state.symptoms = {};
  state.history = [];
  state.clearance = { accepted: true, date: '2026-10-01' };
  state.session = {
    state: 'running',
    startedAt: 1_000,
    deadline: 5_000_000,
    remainingMs: null,
    day: '2026-10-06',
  };
  return Object.assign(state, extra || {});
}

function fillChecklist(phaseId) {
  const bucket = {};
  app.checklistForPhase(phaseId).forEach(item => { bucket[item.id] = true; });
  return bucket;
}

function readyToAdvance(extra) {
  const state = clearedState({ session: null, phaseSessions: { 1: 9, 2: 0, 3: 0 } });
  state.checklist = { 1: fillChecklist(1) };
  return Object.assign(state, extra || {});
}

test('phase 1 keeps the prompt boundary and phase 3 owns the split squat', () => {
  const phase1 = app.resolvePhase(1).exercises;
  assert.equal(phase1.some(e => e.loaded_knee_flexion), false);
  ['spanish-squat-hold', 'tke-band', 'clamshell', 'side-lying-abduction', 'calf-raise-bilateral', 'sit-to-stand-high'].forEach(id => {
    assert.equal(phase1.some(e => e.id === id), true, id);
  });
  assert.equal(phase1.find(e => e.id === 'sit-to-stand-high').loaded_knee_flexion, false);
  const spanish = phase1.find(e => e.id === 'spanish-squat-hold');
  assert.match(spanish.note, /30 to 45/);
  assert.match(spanish.note, /not a treatment for pain/);
  ['goblet-squat', 'bulgarian-split-squat', 'step-ups', 'reverse-lunge', 'lateral-step-down', 'split-squat-hold', 'supported-split-squat'].forEach(id => {
    assert.equal(phase1.some(e => e.id === id), false, id);
  });
  assert.equal(app.resolvePhase(2).exercises.some(e => e.id === 'bulgarian-split-squat'), false);
  const phase3 = app.resolvePhase(3, 1);
  assert.equal(phase3.exercises.filter(e => e.id === 'bulgarian-split-squat').length, 1);
  const bss = phase3.exercises.find(e => e.id === 'bulgarian-split-squat');
  assert.equal(bss.dose, '3 \u00d7 6 each side');
  assert.match(bss.note, /Bodyweight, low rear foot first/);
  assert.equal(phase3.exercises.some(e => e.id === 'lateral-step-down'), true);
  assert.equal(phase3.exercises.some(e => e.id === 'reverse-lunge'), true);
  assert.match(app.resolvePhase(1).goal, /Weeks are minimums/);
  assert.match(app.resolvePhase(1).goal, /not a treatment for pain/);
  assert.match(app.resolvePhase(2).goal, /Weeks are minimums/);
  assert.equal(app.resolvePhase(2).exercises.some(e => e.id === 'supported-split-squat'), true);
  assert.equal(app.resolvePhase(2).exercises.some(e => e.id === 'calf-raise-single'), true);
  assert.match(app.resolvePhase(3).goal, /No running or plyometrics/);
  assert.equal(app.resolvePhase(3).exercises.some(e => e.id === 'calf-raise-single'), true);
  const phase2Checks = app.checklistForPhase(2).map(item => item.id);
  assert.equal(phase2Checks.includes('step-down-control'), true);
  assert.equal(phase2Checks.includes('no-flare'), true);
});

test('week doses follow the uncapped session count and change one variable', () => {
  assert.equal(app.phaseWeek(0), 1);
  assert.equal(app.phaseWeek(2), 1);
  assert.equal(app.phaseWeek(3), 2);
  assert.equal(app.phaseWeek(5), 2);
  assert.equal(app.phaseWeek(6), 3);
  assert.equal(app.phaseWeek(40), 3);

  const quad = week => app.resolvePhase(1, week).exercises.find(e => e.id === 'quad-sets').dose;
  assert.equal(quad(1), '10 \u00d7 5-sec hold');
  assert.equal(quad(2), '10 \u00d7 8-sec hold');
  assert.equal(quad(3), '10 \u00d7 10-sec hold');

  const bss = week => app.resolvePhase(3, week).exercises.find(e => e.id === 'bulgarian-split-squat').dose;
  assert.equal(bss(1), '3 \u00d7 6 each side');
  assert.equal(bss(2), '3 \u00d7 8 each side');
  assert.equal(bss(3), '3 \u00d7 8 each side, light dumbbells if the last week was quiet');
  assert.equal(app.resolvePhase(3).exercises.find(e => e.id === 'bulgarian-split-squat').dose, bss(1));

  const early = clearedState({ session: null, phaseSessions: { 1: 3, 2: 0, 3: 0 } });
  assert.equal(app.programWeek(early, 1), 2);
  early.symptoms['2026-10-01'] = { painDuring: 4, painNext: 0, swellingNext: false, phase: 1 };
  assert.equal(app.weekCredit(early, 1), 2);
  assert.equal(app.programWeek(early, 1), 1);
  assert.equal(quad(app.programWeek(early, 1)), quad(1));

  const lots = clearedState({ session: null, phaseSessions: { 1: 40, 2: 0, 3: 0 } });
  assert.equal(app.programWeek(lots, 1), 3);
  assert.equal(app.cappedSessionCount(lots.phaseSessions[1]), 9);
});

test('symptom rules flag pain, swelling, and two flags in a row', () => {
  assert.equal(app.symptomStatus({ painDuring: 2, painNext: 0, swellingNext: false }), 'clean');
  assert.equal(app.symptomStatus({ painDuring: 2, painNext: 2, swellingNext: false }), 'clean');
  assert.equal(app.symptomStatus({ painDuring: 0, painNext: 1, swellingNext: false }), 'clean');
  assert.equal(app.symptomStatus({ painDuring: 3, painNext: 0, swellingNext: false }), 'flag');
  assert.equal(app.symptomStatus({ painDuring: 2, painNext: 3, swellingNext: false }), 'flag');
  assert.equal(app.symptomStatus({ painDuring: 0, painNext: 0, swellingNext: true }), 'flag');
  assert.equal(app.symptomStatus({ painDuring: 1, painNext: null, swellingNext: null }), 'pending');
  assert.equal(app.symptomFlagged({ painDuring: 2, painNext: 2, swellingNext: false }), false);

  const state = clearedState({ session: null });
  state.symptoms = {
    '2026-10-01': { painDuring: 5, painNext: 0, swellingNext: false, phase: 1 },
    '2026-10-02': { painDuring: 1, painNext: null, swellingNext: null, phase: 1 },
    '2026-10-03': { painDuring: 4, painNext: 0, swellingNext: false, phase: 1 },
  };
  assert.equal(app.consecutiveFlagLock(state, 1), true);

  state.symptoms['2026-10-08'] = { painDuring: 1, painNext: 0, swellingNext: false, phase: 1 };
  assert.equal(app.consecutiveFlagLock(state, 1), false);

  const settled = clearedState({ session: null });
  settled.symptoms = {
    '2026-10-01': { painDuring: 6, painNext: 0, swellingNext: false, phase: 1 },
    '2026-10-03': { painDuring: 1, painNext: 2, swellingNext: false, phase: 1 },
  };
  assert.equal(app.symptomStatus(settled.symptoms['2026-10-03']), 'clean');
  assert.equal(app.consecutiveFlagLock(settled, 1), false);

  const paired = clearedState({ session: null });
  paired.symptoms = {
    '2026-10-01': { painDuring: 6, painNext: 0, swellingNext: false, phase: 1 },
    '2026-10-03': { painDuring: 1, painNext: 3, swellingNext: false, phase: 1 },
  };
  assert.equal(app.consecutiveFlagLock(paired, 1), true);
  assert.match(app.symptomAdvice(paired), /Repeat this week or reduce your sets/);
  assert.match(app.symptomAdvice(paired), /not changed for you|doses stay the same|Doses are not changed/i);

  const swollen = clearedState({ session: null });
  swollen.symptoms = {
    '2026-10-06': { painDuring: 1, painNext: 0, swellingNext: true, phase: 1 },
  };
  const doseBefore = app.resolvePhase(1, 1).exercises.find(e => e.id === 'quad-sets').dose;
  assert.match(app.symptomAdvice(swollen), /about 30%/);
  assert.match(app.symptomAdvice(swollen), /not changed for you|doses stay the same|Doses are not changed/i);
  assert.equal(app.resolvePhase(1, 1).exercises.find(e => e.id === 'quad-sets').dose, doseBefore);
});

test('a check-in can block advance and cannot tick the checklist or rewrite a dose', () => {
  const logging = clearedState();
  const beforeDose = app.resolvePhase(1, 1).exercises.find(e => e.id === 'quad-sets').dose;
  const logged = app.applySessionCheckin(logging, { painDuring: 8 });
  assert.equal(logged.ok, true);
  assert.equal(logged.flagged, true);
  assert.equal(logging.phaseSessions[1], 1);
  assert.deepEqual(logging.checklist, {});
  assert.equal(app.resolvePhase(1, 1).exercises.find(e => e.id === 'quad-sets').dose, beforeDose);
  assert.equal(app.pendingMorning(logging, TUE), null);
  const nextDay = app.pendingMorning(logging, new Date(2026, 9, 7));
  assert.equal(nextDay.day, '2026-10-06');

  const morning = app.applyMorningCheck(logging, '2026-10-06', 1, false);
  assert.equal(morning.flagged, true);
  assert.deepEqual(logging.checklist, {});
  assert.equal(logging.phaseSessions[1], 1);

  const refused = clearedState();
  const snapshot = JSON.parse(JSON.stringify(refused));
  assert.equal(app.applySessionCheckin(refused, { painDuring: 11 }).ok, false);
  assert.deepEqual(refused, snapshot);

  const blocked = readyToAdvance();
  blocked.symptoms = {
    '2026-10-01': { painDuring: 5, painNext: 0, swellingNext: false, phase: 1 },
    '2026-10-03': { painDuring: 0, painNext: 0, swellingNext: true, phase: 1 },
  };
  assert.equal(app.advanceDecision(blocked).reason, 'symptoms');
  blocked.symptoms['2026-10-08'] = { painDuring: 1, painNext: 0, swellingNext: false, phase: 1 };
  assert.equal(app.advanceDecision(blocked).ok, true);
});

test('advance needs 9 real sessions and the checklist, and moving down stays open', () => {
  const short = readyToAdvance({ phaseSessions: { 1: 8, 2: 0, 3: 0 } });
  short.earlyOverride = true;
  assert.equal(app.advanceDecision(short).reason, 'sessions');
  assert.equal(app.grantAdvance(short).ok, false);
  assert.equal(short.phase, 1);

  const missingItem = readyToAdvance();
  delete missingItem.checklist[1]['sit-to-stand'];
  assert.equal(app.advanceDecision(missingItem).reason, 'checklist');

  const ready = readyToAdvance({ phaseSessions: { 1: 40, 2: 0, 3: 0 } });
  const advanced = app.grantAdvance(ready, '2026-10-11T00:00:00.000Z');
  assert.equal(advanced.ok, true);
  assert.equal(ready.phase, 2);
  assert.equal(ready.unlockedPhase, 2);
  assert.equal(ready.history.length, 1);
  assert.equal(ready.history[0].from, 1);
  assert.equal(ready.history[0].to, 2);
  assert.equal(app.cappedSessionCount(40), 9);

  const kept = app.migrate(ready, TUE);
  assert.equal(kept.notice, null);
  assert.equal(kept.state.history[0].to, 2);
  assert.equal(kept.state.phase, 2);
  assert.equal(kept.state.phaseSessions[1], 40);
  assert.equal(kept.state.checklist[1]['full-extension'], true);

  const back = app.phaseChangeDecision(ready, 1);
  assert.deepEqual(back, { action: 'apply', phase: 1 });
  app.applyPhaseChange(ready, 1);
  assert.equal(ready.phase, 1);
  assert.equal(ready.unlockedPhase, 2);
  assert.deepEqual(app.phaseChangeDecision(ready, 2), { action: 'apply', phase: 2 });
  assert.deepEqual(app.phaseChangeDecision(ready, 3), { action: 'advance' });
});

test('older checklist keys survive and new phase criteria stay unticked', () => {
  const saved = {
    phase: 1,
    phaseSessions: { 1: 9, 2: 0, 3: 0 },
    checklist: { 1: { 'no-swelling': true, 'pain-ok': true, 'good-control': true } },
    completions: { '2026-10-06': true },
    activeDay: '2026-10-06',
    thirdDay: 'none',
    checks: {},
    collapsed: {},
    session: null,
  };
  const migrated = app.migrate(saved, TUE);
  assert.equal(migrated.state.checklist['1']['good-control'], true);
  assert.equal(migrated.state.checklist['1']['full-extension'], undefined);
  assert.equal(migrated.state.unlockedPhase, 1);
  assert.equal(app.checklistReady(migrated.state.checklist, 1), false);
  assert.equal(app.advanceDecision(migrated.state).reason, 'checklist');
});

test('clearance is required for a new start and backups keep only the latest few', () => {
  assert.equal(app.hasClearance(app.defaultStore(TUE)), false);
  assert.equal(app.hasClearance({ clearance: { accepted: true, date: '2026-10-01' } }), true);
  assert.equal(app.hasClearance({ clearance: { accepted: true, date: 'nope' } }), false);

  const storage = {
    data: {},
    getItem(key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
    setItem(key, value) { this.data[key] = String(value); },
    removeItem(key) { delete this.data[key]; },
    key(index) { return Object.keys(this.data)[index] || null; },
    get length() { return Object.keys(this.data).length; },
  };
  storage.setItem(app.LS_KEY, '{"phase":1}');
  for (let i = 1; i <= 6; i++) storage.setItem(app.LS_KEY + '.bak-' + i, 'old-' + i);
  const pruned = app.pruneBackups(storage, app.BACKUP_KEEP);
  assert.equal(pruned.kept.length, 3);
  assert.deepEqual(pruned.kept, [app.LS_KEY + '.bak-6', app.LS_KEY + '.bak-5', app.LS_KEY + '.bak-4']);
  assert.equal(storage.getItem(app.LS_KEY), '{"phase":1}');
  assert.equal(storage.getItem(app.LS_KEY + '.bak-1'), null);
  assert.equal(storage.getItem(app.LS_KEY + '.bak-6'), 'old-6');
});

test('the page policy, docs, and workflow stay free of dev-only inline code', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /img-src 'self' https:/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.equal(/<script(?![^>]*\bsrc=)/.test(html), false);
  assert.equal(/\son[a-z]+=/i.test(html), false);
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');
  assert.match(workflow, /pull_request/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40} # v4\.4\.0/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40} # v4\.4\.0/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  const features = fs.readFileSync(path.join(root, 'FEATURES.md'), 'utf8');
  assert.match(features, /Stability & Tissue Tolerance/);
  assert.match(features, /Every set, rep, hold, and week dose is a placeholder/);
  assert.match(features, /week-3 dumbbells/);
  assert.match(features, /Pain that wakes you at night/);
  assert.match(features, /not tamper-proof against localStorage edits/);
  assert.match(features, /skipped next-morning check does not count/);
  [html, fs.readFileSync(path.join(root, 'docs', 'app.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
    fs.readFileSync(path.join(root, 'FEATURES.md'), 'utf8'),
    fs.readFileSync(path.join(root, 'llms.txt'), 'utf8')].forEach(text => {
    assert.equal(text.includes('\u2014'), false);
    assert.equal(text.includes('\u2013'), false);
    assert.equal(/PT-approved/i.test(text), false);
  });
});
