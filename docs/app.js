'use strict';
/* Adaptive Workout Coach: static GitHub Pages demo.
 *
 * Client-side reimplementation of the session engine. Everything is stored in
 * localStorage under a single key. The timer uses ONE stored deadline:
 *   remaining = deadline - Date.now()
 * The deadline is written once at start (or re-anchored once at resume) and
 * never recomputed on reopen, so closing and reopening the browser can never
 * double-subtract elapsed time.
 */

/* ---------------- Exercise data (mirrors data/exercises.js) ----------------
 *
 * demo_ids reference entries in docs/video-library.js (loaded via a script
 * tag before this file). To swap an exercise's videos, change only its
 * demo_ids list, or edit the library itself. Never edit app logic to
 * change videos. Each list is resolved to full video objects on `demos`
 * at load time, so the rendering code below keeps working unchanged.
 */
const SECTIONS = [
  { id: 'warmup',    title: 'Warm-up',                     duration: '4 min',             block: 'foundation' },
  { id: 'strength',  title: 'Strength',                    duration: '18 min · rest 30s',  block: 'accessory' },
  { id: 'stability', title: 'Stability & shock absorbers', duration: '5 min',             block: 'foundation' },
  { id: 'cooldown',  title: 'Cool-down',                   duration: '3 min',             block: 'foundation' },
];

const EXERCISES = [
  { id: 'ankle-pumps-heel-slides', section: 'warmup',
    name: 'Ankle pumps + heel slides',
    note: 'Lie flat. Slide each heel toward your butt, then pump the ankles.',
    dose: '2 min · 20 each', muscle_groups: ['calves', 'quads'],
    demo_ids: ['v-chauhan-top9', 'v-jag-post-op', 'v-crp-acl'] },
  { id: 'quad-sets', section: 'warmup',
    name: 'Quad sets',
    note: 'Tighten your thigh and press the knee into the floor or mat.',
    dose: '15 × 5-sec hold', muscle_groups: ['quads'],
    demo_ids: ['v-jag-quad-sets', 'v-chauhan-quad-iso', 'v-bobbrad-knee-ext'] },
  { id: 'goblet-squat', section: 'strength',
    name: 'Goblet squat / dumbbell squat-to-bench',
    note: 'Hold one dumbbell at your chest. Use the bench as a depth target and keep every rep pain-free.',
    dose: '3 × 8–10', muscle_groups: ['quads', 'glutes'], demo_ids: [] },
  { id: 'bulgarian-split-squat', section: 'strength',
    name: 'Bulgarian split squat',
    note: 'Keep the front foot planted and use a comfortable range. Start light and add load only with good control.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'], demo_ids: [] },
  { id: 'step-ups', section: 'strength',
    name: 'Step-ups with dumbbells',
    note: 'Drive through the working foot and lower slowly without dropping from the step.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-stepup'] },
  { id: 'db-romanian-deadlift', section: 'strength',
    name: 'Dumbbell Romanian deadlift',
    note: 'Hinge at the hips with soft knees, a long spine, and the dumbbells close to your legs.',
    dose: '3 × 10', muscle_groups: ['hamstrings', 'glutes'], demo_ids: [] },
  { id: 'single-leg-rdl', section: 'strength',
    name: 'Single-leg RDL',
    note: 'Keep the hips level and use a light dumbbell or support as needed for balance.',
    dose: '3 × 8 each side', muscle_groups: ['hamstrings', 'glutes'],
    demo_ids: ['v-djkim-slrdl', 'v-pauli-slrdl', 'v-e3-slrdl'] },
  { id: 'straight-leg-raises', section: 'strength',
    name: 'Straight leg raises',
    note: 'Lie flat, keep the working knee straight, and lift the heel slowly.',
    dose: '3 × 10 each leg', muscle_groups: ['quads'], demo_ids: [] },
  { id: 'glute-bridges', section: 'strength',
    name: 'Glute bridges',
    note: 'Both feet down.',
    dose: '3 × 12', muscle_groups: ['glutes'], demo_ids: [] },
  { id: 'spanish-squat-hold', section: 'stability',
    name: 'Spanish squat hold with band',
    note: 'Anchor the band behind both knees and sit back into the hold. For more load, hold a dumbbell goblet-style.',
    dose: '3 × 30 sec', muscle_groups: ['quads'],
    demo_ids: ['v-kneehaber-spanish'] },
  { id: 'split-squat-hold', section: 'stability',
    name: 'Split-squat hold',
    note: 'Hold a comfortable split-squat depth with the front foot fully planted and the torso tall.',
    dose: '~30 sec each side', muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-split'] },
  { id: 'single-leg-balance-supported', section: 'stability',
    name: 'Single-leg balance (supported)',
    note: 'Hand on wall.',
    dose: '3 × 20 sec each side', muscle_groups: ['stability'], demo_ids: [] },
  { id: 'hamstring-stretch', section: 'cooldown',
    name: 'Hamstring stretch',
    note: 'Ease into the stretch; no bouncing.',
    dose: '30 sec each', muscle_groups: ['hamstrings'],
    demo_ids: ['v-bobbrad-hamstring', 'v-weshape-stretch'] },
  { id: 'calf-stretch', section: 'cooldown',
    name: 'Calf stretch at wall',
    note: 'Keep the back heel grounded.',
    dose: '30 sec each', muscle_groups: ['calves'],
    demo_ids: ['v-sommer-calf', 'v-hoopes-calf', 'v-bobbrad-calf'] },
  { id: 'backward-walk', section: 'cooldown',
    name: 'Backward walk',
    note: 'Use a clear, level path and move with control.',
    dose: '1 min', muscle_groups: ['quads', 'calves'],
    demo_ids: ['v-maloney-backward', 'v-benpatrick-backward'] },
];

/* Featured demos: ids into the video library. To rotate the featured set,
 * change only these ids. */
const FEATURED_DEMO_IDS = ['v-djkim-featured', 'v-kneehaber-featured', 'v-pauli-featured'];
const FEATURED_DEMOS = resolveDemoList(FEATURED_DEMO_IDS);

/* Resolve every exercise's demo_ids into full video objects from the video
 * library (video-library.js must be loaded before this file). Unknown ids
 * are skipped so one bad id cannot blank the page. `demos` keeps working
 * for all rendering code below. */
EXERCISES.forEach(function (ex) { ex.demos = resolveDemoList(ex.demo_ids); });

/* ---------------- Phases (PT-approved 3-phase program, mirrors data/exercises.js) ----------------
 *
 * 3 phases x ~3 weeks each, 3 sessions per week (9 sessions per phase).
 * Each phase lists its exercises in order; a phase entry can override the
 * catalog dose (dose), replace the catalog note (note), or append a
 * phase-specific coaching cue after the catalog note (note_append).
 * Demo URLs are never invented: exercises resolve demos from the video
 * library via demo_ids, and new exercises intentionally have an empty
 * demo_ids array.
 */
const SESSIONS_PER_PHASE = 9;

const PHASES = [
  {
    id: 1,
    name: 'Reactivate',
    weeks: 'Weeks 1-3',
    goal: 'Quad activation, range of motion, balance. No loaded knee bending.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'straight-leg-raises' },
      { exercise_id: 'glute-bridges' },
      { exercise_id: 'single-leg-balance-supported' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk', note_append: 'Slow. Only once normal forward walk feels steady.' },
    ],
  },
  {
    id: 2,
    name: 'Reload',
    weeks: 'Weeks 4-6',
    goal: 'Reintroduce loaded patterns. Bilateral before unilateral.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'goblet-squat', dose: '3 × 8', note_append: 'Light load. Phase 2 dose.' },
      { exercise_id: 'step-ups', dose: '3 × 8 each side', note_append: 'Low step, bodyweight to light dumbbells.' },
      { exercise_id: 'db-romanian-deadlift', dose: '3 × 10', note_append: 'Light load.' },
      { exercise_id: 'spanish-squat-hold', dose: '3 × 20 sec' },
      { exercise_id: 'split-squat-hold', dose: '~20 sec each side' },
      { exercise_id: 'single-leg-rdl', dose: '3 × 6 each side', note_append: 'Bodyweight with wall support.' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
  {
    id: 3,
    name: 'Return',
    weeks: 'Weeks 7-9',
    goal: 'The full routine. Bulgarian split squats enter here.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'goblet-squat' },
      { exercise_id: 'bulgarian-split-squat' },
      { exercise_id: 'step-ups' },
      { exercise_id: 'db-romanian-deadlift' },
      { exercise_id: 'single-leg-rdl' },
      { exercise_id: 'spanish-squat-hold' },
      { exercise_id: 'split-squat-hold' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
];

/* Advancement checklist: the user must confirm every item before the
 * "advance to the next phase" action is allowed. */
const ADVANCEMENT_CHECKLIST = [
  { id: 'no-swelling', label: 'No swelling after sessions' },
  { id: 'pain-ok', label: 'Pain 2/10 or less during, zero the next morning' },
  { id: 'good-control', label: 'Every set completed with good control' },
];

const EXERCISE_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

/* Resolve a phase into its concrete program: the phase's ordered exercises
 * with catalog fields merged and phase-specific doses/notes applied. */
function resolvePhase(phaseId) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) throw new Error('unknown phase: ' + phaseId);
  const exercises = phase.exercises.map((entry, i) => {
    const base = EXERCISE_BY_ID.get(entry.exercise_id);
    if (!base) throw new Error('unknown exercise in phase ' + phaseId + ': ' + entry.exercise_id);
    let note = entry.note !== undefined ? entry.note : base.note;
    if (entry.note_append) note = note + ' ' + entry.note_append;
    return {
      id: base.id, section: base.section, name: base.name, note,
      dose: entry.dose !== undefined ? entry.dose : base.dose,
      muscle_groups: base.muscle_groups, demos: base.demos, order: i,
    };
  });
  return {
    id: phase.id, name: phase.name, weeks: phase.weeks, goal: phase.goal,
    sessions_target: SESSIONS_PER_PHASE, exercises,
  };
}

/* ---------------- Constants & store ---------------- */
const SESSION_MS = 30 * 60 * 1000;
const LS_KEY = 'awc-demo-v1';
const STORE_VERSION = 2;
const NOTICE_CORRUPT = 'Saved data could not be read, so progress was reset to a fresh start.';
const NOTICE_PARTIAL = 'Some saved data was unreadable and was reset. The rest of your progress was kept.';
const THIRD_DAYS = ['none', 'fri-morning', 'fri-night', 'sat-morning'];
const DOWS = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Tue-Sat only: Sundays are for church, Mondays are rest

let bootNotice = null;
let bootDirty = false;
let bootRaw = null;
let bootNeedsBackup = false;
let renderedDayKey = null;
let pendingPhase = null;
let pendingPhaseMessage = null;
let booted = false;
let messageTimer = null;

function dayKey(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function parseDay(key) {
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
function isDayKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return dayKey(parseDay(key)) === key;
}
function prettyDay(key) {
  const d = parseDay(key);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function isGymDow(dow, thirdDay) {
  if (dow === 2 || dow === 4) return true; // Tue, Thu
  if (thirdDay === 'fri-morning' || thirdDay === 'fri-night') return dow === 5;
  if (thirdDay === 'sat-morning') return dow === 6;
  return false;
}
function isGymDay(date, thirdDay) {
  return isGymDow(date.getDay(), thirdDay);
}
function isGymDayKey(key, thirdDay) {
  return isDayKey(key) && isGymDay(parseDay(key), thirdDay);
}
function nextGymDay(fromDate, thirdDay) {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 14; i++) {
    if (isGymDay(d, thirdDay)) return dayKey(d);
    d.setDate(d.getDate() + 1);
  }
  return dayKey(fromDate);
}
function weekDayKeys(today) {
  const todayDate = today instanceof Date ? today : new Date(today);
  const mon = mondayOf(todayDate);
  const keys = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    keys.push(dayKey(d));
  }
  return keys;
}
/* Keep a day that is still in the visible Tue-Sat week. Otherwise use today
 * when it is a gym day, or the next gym day. */
function resolveActiveDay(activeDay, today, thirdDay) {
  const todayDate = today instanceof Date ? today : new Date(today);
  if (isDayKey(activeDay) && weekDayKeys(todayDate).indexOf(activeDay) !== -1) return activeDay;
  if (isGymDay(todayDate, thirdDay)) return dayKey(todayDate);
  return nextGymDay(todayDate, thirdDay);
}
function rolloverActiveDay(state, now) {
  const today = now instanceof Date ? now : new Date(now);
  const next = resolveActiveDay(state.activeDay, today, state.thirdDay);
  const changed = next !== state.activeDay;
  if (changed) state.activeDay = next;
  return { changed: changed, activeDay: state.activeDay, todayKey: dayKey(today) };
}
function thirdDaySelection(state, thirdDay, today) {
  const nextThird = THIRD_DAYS.indexOf(thirdDay) === -1 ? state.thirdDay : thirdDay;
  let activeDay = state.activeDay;
  if (!sessionIsActive(state.session) && !isGymDayKey(activeDay, nextThird)) {
    activeDay = resolveActiveDay(null, today, nextThird);
  }
  return { thirdDay: nextThird, activeDay: activeDay };
}
function normalizePhase(phase) {
  const n = Number(phase);
  return PHASES.some(p => p.id === n) ? n : 1;
}
function sessionIsActive(session) {
  return !!(session && (session.state === 'running' || session.state === 'paused' || session.state === 'expired'));
}
function shouldExpireOnLoad(session, now) {
  return !!(session && session.state === 'running' && typeof session.deadline === 'number' && session.deadline - now <= 0);
}
function expireIfDue(state, now) {
  const s = state.session;
  if (!shouldExpireOnLoad(s, now)) return false;
  state.session = {
    state: 'expired',
    startedAt: typeof s.startedAt === 'number' ? s.startedAt : s.deadline - SESSION_MS,
    deadline: s.deadline,
    remainingMs: 0,
    day: s.day,
  };
  return true;
}
function remainingMs(session, now) {
  const s = session === undefined ? store.session : session;
  const t = typeof now === 'number' ? now : Date.now();
  if (!s) return SESSION_MS;
  if (s.state === 'paused' || s.state === 'expired') return Math.max(0, s.remainingMs || 0);
  return Math.max(0, s.deadline - t);
}
function canStartSession(state) {
  const session = state.session;
  if (session && session.state === 'paused') return { ok: true, action: 'resume' };
  if (session && session.state === 'running') return { ok: false, reason: 'already-running' };
  if (session && session.state === 'expired') return { ok: false, reason: 'expired' };
  if (!isGymDayKey(state.activeDay, state.thirdDay)) return { ok: false, reason: 'not-gym-day' };
  return { ok: true, action: 'start' };
}
function programExerciseIds(phaseId) {
  return resolvePhase(normalizePhase(phaseId)).exercises.map(e => e.id);
}
function toggleCheckState(state, id) {
  if (!sessionIsActive(state.session)) return { ok: false, reason: 'no-session' };
  if (!isPlainObject(state.checks)) state.checks = {};
  if (state.checks[id]) delete state.checks[id];
  else state.checks[id] = true;
  const allDone = programExerciseIds(state.phase).every(eid => !!state.checks[eid]);
  return { ok: true, allChecked: allDone };
}
/* Log the session day once. Refuses a missing session or a non-gym day.
 * Does not mutate state when it refuses. */
function applyCompletion(state) {
  const session = state.session;
  if (!sessionIsActive(session)) return { ok: false, reason: 'no-session' };
  const day = session.day;
  if (!isGymDayKey(day, state.thirdDay)) return { ok: false, reason: 'not-gym-day', day: day };
  const phase = normalizePhase(state.phase);
  if (!isPlainObject(state.completions)) state.completions = {};
  if (!isPlainObject(state.phaseSessions)) state.phaseSessions = { 1: 0, 2: 0, 3: 0 };
  const already = !!state.completions[day];
  state.completions[day] = true;
  if (!already) state.phaseSessions[phase] = (Number(state.phaseSessions[phase]) || 0) + 1;
  state.session = null;
  state.checks = {};
  return { ok: true, already: already, day: day, phase: phase };
}
function phaseChangeDecision(state, nextPhase) {
  const current = normalizePhase(state.phase);
  const next = Number(nextPhase);
  if (!PHASES.some(p => p.id === next)) return { action: 'noop' };
  if (next === current) return { action: 'noop' };
  if (sessionIsActive(state.session)) return { action: 'confirm', phase: next };
  return { action: 'apply', phase: next };
}
function applyPhaseChange(state, nextPhase) {
  const next = Number(nextPhase);
  if (!PHASES.some(p => p.id === next)) return state;
  state.phase = next;
  state.session = null;
  state.checks = {};
  return state;
}
function checklistReady(checklist, phaseId) {
  const c = (checklist && checklist[String(phaseId)]) || {};
  return ADVANCEMENT_CHECKLIST.every(item => c[item.id] === true);
}

function defaultStore(now) {
  const today = now instanceof Date ? now : new Date();
  return {
    version: STORE_VERSION,
    session: null,
    checks: {},
    collapsed: {},
    thirdDay: 'none',
    completions: {},
    activeDay: dayKey(today),
    phase: 1,
    phaseSessions: { 1: 0, 2: 0, 3: 0 },
    checklist: {},
    unlockedPhase: 1,
    symptoms: {},
    clearance: null,
    history: [],
  };
}

function sanitizePhase(raw, present) {
  if (!present) return { value: 1, repaired: false };
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return { value: n, repaired: false };
  return { value: 1, repaired: true };
}
function sanitizePhaseSessions(raw, present) {
  const out = { 1: 0, 2: 0, 3: 0 };
  if (!present) return { value: out, repaired: false, changed: true };
  if (!isPlainObject(raw)) return { value: out, repaired: true, changed: true };
  let repaired = false;
  let changed = false;
  [1, 2, 3].forEach(id => {
    if (!Object.prototype.hasOwnProperty.call(raw, String(id))) { changed = true; return; }
    const original = raw[id];
    const n = Number(original);
    const numeric = typeof original === 'number' || (typeof original === 'string' && original.trim() !== '');
    if (!numeric || !Number.isFinite(n)) {
      repaired = true;
      changed = true;
      return;
    }
    let count = Math.floor(n);
    if (count < 0) count = 0;
    if (count !== n || count !== original) changed = true;
    out[id] = count;
  });
  Object.keys(raw).forEach(key => {
    if (key !== '1' && key !== '2' && key !== '3') changed = true;
  });
  return { value: out, repaired: repaired, changed: changed };
}
function sanitizeFlagMap(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  Object.keys(raw).forEach(key => { if (raw[key]) out[key] = true; });
  return { value: out, repaired: false };
}
function sanitizeCompletions(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  let repaired = false;
  Object.keys(raw).forEach(key => {
    if (!raw[key]) return;
    if (!isDayKey(key)) { repaired = true; return; }
    out[key] = true;
  });
  return { value: out, repaired: repaired };
}
function sanitizeChecklist(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  let repaired = false;
  Object.keys(raw).forEach(phaseKey => {
    const bucket = raw[phaseKey];
    if (!isPlainObject(bucket)) { repaired = true; return; }
    const clean = {};
    Object.keys(bucket).forEach(item => { if (bucket[item]) clean[item] = true; });
    out[phaseKey] = clean;
  });
  return { value: out, repaired: repaired };
}
function sanitizeActiveDay(raw, present, today) {
  if (!present) return { value: dayKey(today), repaired: false };
  if (!isDayKey(raw)) return { value: dayKey(today), repaired: true };
  return { value: raw, repaired: false };
}
function sanitizeThirdDay(raw, present) {
  if (!present) return { value: 'none', repaired: false };
  if (THIRD_DAYS.indexOf(raw) === -1) return { value: 'none', repaired: true };
  return { value: raw, repaired: false };
}
function sanitizeSession(raw, present) {
  if (!present || raw == null) return { value: null, repaired: false };
  if (!isPlainObject(raw)) return { value: null, repaired: true };
  const state = raw.state;
  if (state !== 'running' && state !== 'paused' && state !== 'expired') return { value: null, repaired: true };
  if (typeof raw.deadline !== 'number' || !Number.isFinite(raw.deadline)) return { value: null, repaired: true };
  if (!isDayKey(raw.day)) return { value: null, repaired: true };
  let remaining = null;
  let repaired = false;
  if (Object.prototype.hasOwnProperty.call(raw, 'remainingMs') && raw.remainingMs != null) {
    if (typeof raw.remainingMs === 'number' && Number.isFinite(raw.remainingMs)) remaining = raw.remainingMs;
    else repaired = true;
  }
  const startedAt = (typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt))
    ? raw.startedAt
    : raw.deadline - SESSION_MS;
  return {
    value: { state: state, startedAt: startedAt, deadline: raw.deadline, remainingMs: remaining, day: raw.day },
    repaired: repaired,
  };
}
function sanitizeJsonObject(raw, present, fallback, nullIsValid) {
  if (!present) return { value: fallback, repaired: false };
  if (raw == null) return { value: fallback, repaired: !nullIsValid };
  if (!isPlainObject(raw)) return { value: fallback, repaired: true };
  try { return { value: JSON.parse(JSON.stringify(raw)), repaired: false }; }
  catch (e) { return { value: fallback, repaired: true }; }
}
function sanitizeHistory(raw, present) {
  if (!present || raw == null) return { value: [], repaired: false };
  if (!Array.isArray(raw)) return { value: [], repaired: true };
  try { return { value: JSON.parse(JSON.stringify(raw)), repaired: false }; }
  catch (e) { return { value: [], repaired: true }; }
}
function hasOwn(raw, key) {
  return Object.prototype.hasOwnProperty.call(raw, key);
}

/* v1 (no version) -> v2. Validates each field, keeps good progress, and
 * grandfathers unlockedPhase at the current phase. Session counts are kept
 * as stored, including totals above 9. Corrupt roots become a fresh store
 * plus a one-time notice. */
function migrate(raw, now) {
  const today = now instanceof Date ? now : new Date();
  if (!isPlainObject(raw)) {
    return { state: defaultStore(today), changed: true, notice: NOTICE_CORRUPT };
  }
  let repaired = false;
  let changed = raw.version !== STORE_VERSION;

  const phaseInfo = sanitizePhase(raw.phase, hasOwn(raw, 'phase'));
  if (phaseInfo.repaired) repaired = true;
  if (!hasOwn(raw, 'phase') || phaseInfo.repaired) changed = true;
  const phase = phaseInfo.value;

  let unlocked = phase;
  if (!hasOwn(raw, 'unlockedPhase')) changed = true;
  else {
    const n = Number(raw.unlockedPhase);
    if (n === 1 || n === 2 || n === 3) unlocked = n;
    else { repaired = true; changed = true; }
  }
  if (unlocked < phase) { unlocked = phase; changed = true; }

  const sessionsInfo = sanitizePhaseSessions(raw.phaseSessions, hasOwn(raw, 'phaseSessions'));
  if (sessionsInfo.repaired) repaired = true;
  if (sessionsInfo.changed) changed = true;

  const checksInfo = sanitizeFlagMap(raw.checks, hasOwn(raw, 'checks'));
  const collapsedInfo = sanitizeFlagMap(raw.collapsed, hasOwn(raw, 'collapsed'));
  const completionsInfo = sanitizeCompletions(raw.completions, hasOwn(raw, 'completions'));
  const checklistInfo = sanitizeChecklist(raw.checklist, hasOwn(raw, 'checklist'));
  const dayInfo = sanitizeActiveDay(raw.activeDay, hasOwn(raw, 'activeDay'), today);
  const thirdInfo = sanitizeThirdDay(raw.thirdDay, hasOwn(raw, 'thirdDay'));
  const sessionInfo = sanitizeSession(raw.session, hasOwn(raw, 'session'));
  const symptomsInfo = sanitizeJsonObject(raw.symptoms, hasOwn(raw, 'symptoms'), {}, false);
  const clearanceInfo = sanitizeJsonObject(raw.clearance, hasOwn(raw, 'clearance'), null, true);
  const historyInfo = sanitizeHistory(raw.history, hasOwn(raw, 'history'));

  [checksInfo, collapsedInfo, completionsInfo, checklistInfo, dayInfo, thirdInfo, sessionInfo, symptomsInfo, clearanceInfo, historyInfo].forEach(info => {
    if (info.repaired) repaired = true;
  });
  if (!hasOwn(raw, 'checks') || !hasOwn(raw, 'collapsed') || !hasOwn(raw, 'completions') ||
      !hasOwn(raw, 'checklist') || !hasOwn(raw, 'activeDay') || !hasOwn(raw, 'thirdDay') ||
      !hasOwn(raw, 'session') || !hasOwn(raw, 'symptoms') || !hasOwn(raw, 'clearance') ||
      !hasOwn(raw, 'history')) {
    changed = true;
  }

  if (repaired) changed = true;
  return {
    state: {
      version: STORE_VERSION,
      session: sessionInfo.value,
      checks: checksInfo.value,
      collapsed: collapsedInfo.value,
      thirdDay: thirdInfo.value,
      completions: completionsInfo.value,
      activeDay: dayInfo.value,
      phase: phase,
      phaseSessions: sessionsInfo.value,
      checklist: checklistInfo.value,
      unlockedPhase: unlocked,
      symptoms: symptomsInfo.value,
      clearance: clearanceInfo.value,
      history: historyInfo.value,
    },
    changed: changed,
    notice: repaired ? NOTICE_PARTIAL : null,
  };
}

function loadStoreFromRaw(rawString, now) {
  if (rawString == null || rawString === '') {
    return { state: defaultStore(now), changed: false, notice: null };
  }
  try {
    return migrate(JSON.parse(rawString), now);
  } catch (e) {
    return { state: defaultStore(now), changed: true, notice: NOTICE_CORRUPT };
  }
}

function rawBackupKey(now) {
  const stamp = typeof now === 'number' ? now : Date.now();
  return LS_KEY + '.bak-' + stamp;
}
/* Copy the original saved string before the first write that replaces it. */
function backupRawBeforeSave(storage, rawString, now) {
  const key = rawBackupKey(now);
  storage.setItem(key, rawString);
  return key;
}
/* The on-screen target and any later goal check stop at 9. Storage does not. */
function cappedSessionCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(SESSIONS_PER_PHASE, Math.floor(n));
}

function loadStore() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return defaultStore();
    const raw = localStorage.getItem(LS_KEY);
    bootRaw = raw;
    const result = loadStoreFromRaw(raw, new Date());
    bootNotice = result.notice;
    bootDirty = result.changed;
    bootNeedsBackup = !!result.notice && raw != null && raw !== '';
    return result.state;
  } catch (e) {
    return defaultStore();
  }
}

function getResolveVideo() {
  if (typeof resolveVideo === 'function') return resolveVideo;
  if (typeof require === 'function') {
    try {
      const lib = require('./video-library.js');
      if (lib && typeof lib.resolveVideo === 'function') return lib.resolveVideo;
    } catch (err) { /* library missing: demos stay empty */ }
  }
  return function () { return null; };
}
/* Unknown or throwing ids are skipped. One bad id must not blank the page. */
function resolveDemoList(ids, resolve) {
  const fn = resolve || getResolveVideo();
  const out = [];
  const list = Array.isArray(ids) ? ids : [];
  list.forEach(id => {
    let video = null;
    try { video = fn(id); }
    catch (err) {
      if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn(err && err.message ? err.message : 'unknown video id: ' + id);
      }
    }
    if (video && typeof video === 'object' && video.url) out.push(video);
  });
  return out;
}

const store = loadStore();
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

/* ---------------- Helpers ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtTime(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function currentPhaseId() {
  return normalizePhase(store.phase);
}
function currentProgram() {
  return resolvePhase(currentPhaseId()).exercises;
}
function checkedCount() {
  return currentProgram().filter(e => store.checks[e.id]).length;
}
function allChecked() {
  return currentProgram().every(e => store.checks[e.id]);
}
function gymDows() {
  const days = [];
  for (let dow = 0; dow < 7; dow++) {
    if (isGymDow(dow, store.thirdDay)) days.push(dow);
  }
  return days;
}
function showMessage(text) {
  const el = $('sessionMessage');
  el.textContent = text;
  el.classList.add('show');
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

/* ---------------- Session lifecycle ---------------- */
function startSession() {
  const decision = canStartSession(store);
  if (!decision.ok) {
    if (decision.reason === 'not-gym-day') {
      showMessage('Pick a gym day before starting. This program trains Tuesday, Thursday, and your optional third day.');
    }
    return;
  }
  if (decision.action === 'resume') { resumeSession(); return; }
  if (decision.action !== 'start') return;
  const now = Date.now();
  store.session = {
    state: 'running',
    startedAt: now,
    deadline: now + SESSION_MS,
    remainingMs: null,
    day: store.activeDay,
  };
  save();
  renderAll();
  showMessage('Session started: 30:00 on the clock.');
}

function pauseSession() {
  const s = store.session;
  if (!s || s.state !== 'running') return;
  s.remainingMs = Math.max(0, s.deadline - Date.now());
  s.state = 'paused';
  save();
  renderAll();
}

function resumeSession() {
  const s = store.session;
  if (!s || s.state !== 'paused') return;
  s.deadline = Date.now() + Math.max(0, s.remainingMs || 0);
  s.remainingMs = null;
  s.state = 'running';
  save();
  renderAll();
}

function endSession(message) {
  store.session = null;
  store.checks = {};
  pendingPhase = null;
  pendingPhaseMessage = null;
  save();
  renderAll();
  if (message) showMessage(message);
}

function offerExpiryChoice() {
  if (!expireIfDue(store, Date.now())) return false;
  save();
  renderAll();
  const expiryText = 'Time is up. Log this workout anyway, or discard it.';
  if (bootNotice) {
    showMessage(bootNotice + ' ' + expiryText);
    bootNotice = null;
  } else {
    showMessage(expiryText);
  }
  return true;
}

function discardExpired() {
  endSession('Session discarded. Nothing was logged.');
}

function completeWorkout() {
  const result = applyCompletion(store);
  if (!result.ok) {
    if (result.reason === 'no-session') {
      showMessage('Start a session before logging a workout.');
    } else if (result.reason === 'not-gym-day') {
      const when = isDayKey(result.day) ? prettyDay(result.day) : 'that day';
      showMessage('Nothing was logged. This program does not train on ' + when + '.');
    }
    renderAll();
    return;
  }
  pendingPhase = null;
  pendingPhaseMessage = null;
  save();
  renderAll();
  if (result.already) showMessage('Already logged for ' + prettyDay(result.day) + '. This day counts once.');
  else showMessage('Workout complete: logged for ' + prettyDay(result.day) + '. Nice work.');
}

function toggleCheck(id) {
  const result = toggleCheckState(store, id);
  if (!result.ok) {
    showMessage('Start a session before checking off exercises.');
    renderAll();
    return;
  }
  save();
  renderAll();
}

function requestClear() { $('clearConfirm').classList.add('show'); }
function cancelClear() { $('clearConfirm').classList.remove('show'); }
function confirmClear() {
  cancelClear();
  endSession('Session cleared: timer, checkboxes, and progress reset.');
}

/* ---------------- Phase actions ---------------- */
function checklistConfirmed(phaseId) {
  const c = store.checklist[String(phaseId)] || {};
  return ADVANCEMENT_CHECKLIST.map(i => ({ id: i.id, label: i.label, confirmed: c[i.id] === true }));
}
function requestPhaseChange(n, successMessage) {
  const decision = phaseChangeDecision(store, n);
  if (decision.action === 'noop') {
    pendingPhase = null;
    pendingPhaseMessage = null;
    renderPrompts();
    return;
  }
  if (decision.action === 'confirm') {
    pendingPhase = decision.phase;
    pendingPhaseMessage = successMessage || null;
    renderPrompts();
    return;
  }
  commitPhase(decision.phase, successMessage);
}
function commitPhase(n, successMessage) {
  applyPhaseChange(store, n);
  pendingPhase = null;
  pendingPhaseMessage = null;
  save();
  renderAll();
  showMessage(successMessage || 'Phase selected. Your session starts fresh when you press Start.');
}
function confirmPhaseChange() {
  if (pendingPhase == null) return;
  commitPhase(pendingPhase, pendingPhaseMessage);
}
function cancelPhaseChange() {
  pendingPhase = null;
  pendingPhaseMessage = null;
  renderPrompts();
}
function toggleChecklistItem(id, confirmed) {
  const key = String(currentPhaseId());
  const cur = Object.assign({}, store.checklist[key] || {});
  if (confirmed) cur[id] = true;
  else delete cur[id];
  store.checklist[key] = cur;
  save();
  renderPhase();
}
function advancePhase() {
  const p = currentPhaseId();
  if (p >= 3) return;
  if (!checklistReady(store.checklist, p)) {
    showMessage('Confirm all three checklist items first.');
    return;
  }
  requestPhaseChange(p + 1, 'Advanced to Phase ' + (p + 1) + '.');
}

/* ---------------- Rendering ---------------- */
const demoIdx = {};

function renderStatus() {
  const bar = $('statusBar'), s = store.session;
  bar.classList.toggle('active', !!(s && s.state === 'running'));
  bar.classList.toggle('complete', !!(s && s.state === 'paused'));
  const n = checkedCount(), total = currentProgram().length;
  $('statusCount').textContent = n + ' / ' + total;
  $('statusFill').style.width = (total ? n / total * 100 : 0) + '%';
  $('statusDay').textContent = prettyDay(s ? s.day : store.activeDay);
  if (!s) $('statusText').textContent = 'Ready';
  else if (s.state === 'paused') $('statusText').textContent = 'Paused';
  else if (s.state === 'expired') $('statusText').textContent = 'Time is up';
}

function renderTimer() {
  const s = store.session, t = $('timer');
  const expired = !!(s && s.state === 'expired');
  t.classList.toggle('done', expired);
  if (!s) t.textContent = fmtTime(SESSION_MS);
  else t.textContent = fmtTime(remainingMs(s, Date.now()));
  const active = sessionIsActive(s);
  $('btnStart').hidden = !!s;
  $('btnPause').hidden = !(s && s.state === 'running');
  $('btnResume').hidden = !(s && s.state === 'paused');
  $('btnFinish').hidden = !active || expired;
  let detail = 'in progress';
  if (s && s.state === 'paused') detail = 'paused';
  else if (expired) detail = 'time is up';
  $('sessionDate').textContent = s
    ? 'Session: ' + prettyDay(s.day) + ' (' + detail + ')'
    : 'No active session: pick a gym day and press Start.';
}

function renderProgress() {
  const n = checkedCount(), total = currentProgram().length;
  const active = sessionIsActive(store.session);
  $('progressCount').textContent = n + ' / ' + total;
  $('progressFill').style.width = (total ? n / total * 100 : 0) + '%';
  if (!active) $('progressNote').textContent = 'Start a session to check off exercises.';
  else if (n === 0) $('progressNote').textContent = 'Check off exercises as you finish them.';
  else if (n === total) $('progressNote').textContent = 'All done. Press Finish workout to log this day.';
  else $('progressNote').textContent = (total - n) + ' to go.';
}

function renderPrompts() {
  const s = store.session;
  const active = sessionIsActive(s);
  const expired = !!(s && s.state === 'expired');
  $('finishConfirm').classList.toggle('show', active && allChecked() && !expired);
  $('expiryConfirm').classList.toggle('show', expired);
  $('phaseConfirm').classList.toggle('show', pendingPhase != null);
}

function demoHtml(ex) {
  if (!ex.demos || !ex.demos.length) return '';
  const i = demoIdx[ex.id] || 0;
  const d = ex.demos[i];
  if (!d || !d.url) return '';
  let nav = '';
  if (ex.demos.length > 1) {
    nav = '<div class="demo-nav">' +
      '<button class="demo-arrow" data-demo-prev="' + esc(ex.id) + '" aria-label="Previous demo">\u2039</button>' +
      '<span class="demo-pos">' + (i + 1) + ' of ' + ex.demos.length + '</span>' +
      '<button class="demo-arrow" data-demo-next="' + esc(ex.id) + '" aria-label="Next demo">\u203a</button></div>';
  }
  const handle = d.handle ? ' ' + esc(d.handle) : '';
  return '<div class="demo" id="demo-' + esc(ex.id) + '">' +
    '<a class="demo-link" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
    '\u25b6 Demo: ' + esc(d.creator) + handle +
    '<span class="demo-desc">' + esc(d.description) + '</span></a>' + nav + '</div>';
}

function renderSections() {
  const root = $('routine');
  const program = currentProgram();
  const canCheck = sessionIsActive(store.session);
  let stepNo = 0;
  root.innerHTML = SECTIONS.map(sec => {
    const exs = program.filter(e => e.section === sec.id).sort((a, b) => a.order - b.order);
    if (!exs.length) return '';
    stepNo += 1;
    const done = exs.every(e => store.checks[e.id]);
    const collapsed = !!store.collapsed[sec.id];
    const rows = exs.map(e => {
      const tags = e.muscle_groups.map(t => '<span class="muscle-tag">' + esc(t) + '</span>').join('');
      return '<li class="exercise"><label class="check-row">' +
        '<input type="checkbox" data-check="' + esc(e.id) + '"' + (store.checks[e.id] ? ' checked' : '') + (canCheck ? '' : ' disabled') + '>' +
        '<span><span class="exercise-name">' + esc(e.name) + '</span>' +
        '<span class="exercise-note">' + esc(e.note) + '</span>' +
        '<span class="muscle-tags">' + tags + '</span></span>' +
        '<span class="dose">' + esc(e.dose) + '</span></label>' +
        demoHtml(e) + '</li>';
    }).join('');
    return '<section class="section' + (collapsed ? ' collapsed' : '') + (done ? ' complete' : '') + '">' +
      '<button class="section-head" data-section="' + esc(sec.id) + '">' +
      '<span class="section-title"><span class="step-no">' + String(stepNo).padStart(2, '0') + '</span>' +
      '<h3 class="section-heading">' + esc(sec.title) + '</h3>' +
      '<span class="block-tag">' + (sec.block === 'foundation' ? 'foundation block' : 'accessory block') + '</span></span>' +
      '<span class="duration">' + esc(sec.duration) + '</span></button>' +
      '<ul class="exercise-list">' + rows + '</ul></section>';
  }).join('');
}

function renderCalendar() {
  const grid = $('weekGrid');
  const mon = mondayOf(new Date());
  const today = dayKey(new Date());
  const gyms = gymDows();
  let html = '';
  for (let i = 1; i <= 5; i++) { // Tue-Sat: Monday (i=0) is rest, Sunday (i=6) is for church
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    const key = dayKey(d);
    const isGym = gyms.includes(d.getDay());
    const done = !!store.completions[key];
    const cls = 'day' + (isGym ? ' gym' : '') + (key === today ? ' today' : '') + (key === store.activeDay ? ' selected' : '');
    html += '<div class="' + cls + '"' + (isGym ? ' data-day="' + key + '" role="button" tabindex="0"' : '') + '>' +
      '<span class="dow">' + DOWS[i - 1] + '</span>' +
      '<span class="dnum">' + d.getDate() + '</span>' +
      '<span class="dmark">' + (done ? '\u2713 done' : '') + '</span></div>';
  }
  grid.innerHTML = html;
  const weekKeys = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    if (gyms.includes(d.getDay())) weekKeys.push(dayKey(d));
  }
  const doneCount = weekKeys.filter(k => store.completions[k]).length;
  $('calProgress').textContent = doneCount + ' / ' + weekKeys.length;
  $('thirdDay').value = store.thirdDay;
}

function renderFeatured() {
  $('featuredDemos').innerHTML = FEATURED_DEMOS.filter(d => d && d.url).map(d =>
    '<a class="demo-card" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
    '<div class="demo-title">\u25b6 ' + esc(d.creator) + (d.handle ? ' ' + esc(d.handle) : '') + '</div>' +
    '<div class="demo-desc2">' + esc(d.description) + '</div></a>'
  ).join('');
  $('blockNote').textContent =
    'The routine is split into a fixed foundation block (warm-up, stability, cool-down) and an ' +
    'accessory block (strength). Future upper-body, back, and arm exercises will slot into ' +
    'the accessory block as the program grows.';
}

/* ---------------- Phase UI ---------------- */
function renderPhase() {
  const p = currentPhaseId();
  const phase = PHASES.find(x => x.id === p);
  $('phaseTitle').textContent = 'Phase ' + p + ': ' + phase.name + ' (' + phase.weeks + ')';
  $('phaseGoal').textContent = phase.goal;
  document.querySelectorAll('#phasePicker .phase-btn').forEach(b => {
    b.classList.toggle('active', Number(b.getAttribute('data-phase')) === p);
  });

  let prog = '';
  for (let id = 1; id <= 3; id++) {
    const done = store.phaseSessions[id] || 0;
    const shown = cappedSessionCount(done);
    const target = SESSIONS_PER_PHASE;
    const reached = shown >= target;
    const phaseName = PHASES.find(x => x.id === id).name;
    prog += '<div class="phase-row"><span>Phase ' + id + ': ' + phaseName + '</span>' +
      '<span class="' + (reached ? 'done' : '') + '">' + shown + ' / ' + target + ' sessions</span></div>';
  }
  $('phaseProgress').innerHTML = prog;

  const wrap = $('checklistWrap');
  if (p >= 3) {
    wrap.hidden = true;
  } else {
    wrap.hidden = false;
    $('checklistTitle').textContent = 'Before advancing to Phase ' + (p + 1) + ', confirm all three';
    const items = checklistConfirmed(p);
    $('checklistItems').innerHTML = items.map(it =>
      '<label class="check-item"><input type="checkbox" data-checklist-item="' + it.id + '"' +
      (it.confirmed ? ' checked' : '') + '><span>' + esc(it.label) + '</span></label>'
    ).join('');
    const ready = items.every(it => it.confirmed);
    const btn = $('advanceBtn');
    btn.disabled = !ready;
    btn.textContent = 'Advance to Phase ' + (p + 1);
  }
}

function renderAll() {
  renderPhase();
  renderStatus();
  renderTimer();
  renderProgress();
  renderPrompts();
  renderSections();
  renderCalendar();
}

/* ---------------- Tick ---------------- */
function tick() {
  const now = Date.now();
  const todayKey = dayKey(new Date(now));
  if (renderedDayKey !== todayKey) {
    renderedDayKey = todayKey;
    const rolled = rolloverActiveDay(store, new Date(now));
    if (rolled.changed) save();
    renderCalendar();
    renderStatus();
    renderTimer();
  }
  const s = store.session;
  if (!s || s.state !== 'running') return;
  const left = s.deadline - now;
  if (left <= 0) { offerExpiryChoice(); return; }
  $('timer').textContent = fmtTime(left);
  $('statusText').textContent = 'Running: ' + fmtTime(left) + ' left';
}

/* ---------------- Events (delegated) ---------------- */
function onClick(ev) {
  const secBtn = ev.target.closest('[data-section]');
  if (secBtn) {
    const id = secBtn.getAttribute('data-section');
    store.collapsed[id] = !store.collapsed[id];
    if (!store.collapsed[id]) delete store.collapsed[id];
    save(); renderSections(); renderStatus();
    return;
  }
  const prev = ev.target.closest('[data-demo-prev]');
  const next = ev.target.closest('[data-demo-next]');
  if (prev || next) {
    const id = (prev || next).getAttribute(prev ? 'data-demo-prev' : 'data-demo-next');
    const ex = EXERCISES.find(e => e.id === id);
    if (ex && ex.demos.length > 1) {
      const n = ex.demos.length;
      demoIdx[id] = (((demoIdx[id] || 0) + (prev ? -1 : 1)) % n + n) % n;
      const box = $('demo-' + id);
      if (box) box.outerHTML = demoHtml(ex);
    }
    return;
  }
  const day = ev.target.closest('[data-day]');
  if (day) {
    store.activeDay = day.getAttribute('data-day');
    save(); renderCalendar(); renderStatus(); renderTimer();
    const routine = $('routine');
    if (routine && typeof routine.scrollIntoView === 'function') {
      try { routine.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { /* ignore */ }
    }
    return;
  }
  const phaseBtn = ev.target.closest('[data-phase]');
  if (phaseBtn) {
    requestPhaseChange(Number(phaseBtn.getAttribute('data-phase')));
    return;
  }
  if (ev.target.id === 'advanceBtn') {
    advancePhase();
  }
}
function onChange(ev) {
  const box = ev.target.closest('[data-check]');
  if (box) { toggleCheck(box.getAttribute('data-check')); return; }
  const item = ev.target.closest('[data-checklist-item]');
  if (item) { toggleChecklistItem(item.getAttribute('data-checklist-item'), item.checked); return; }
  if (ev.target.id === 'thirdDay') {
    const picked = thirdDaySelection(store, ev.target.value, new Date());
    store.thirdDay = picked.thirdDay;
    store.activeDay = picked.activeDay;
    save();
    renderCalendar();
    renderStatus();
    renderTimer();
  }
}
function onKey(ev) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    const day = ev.target.closest && ev.target.closest('[data-day]');
    if (day) { ev.preventDefault(); day.click(); }
  }
}
function bindUi() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  $('btnStart').addEventListener('click', startSession);
  $('btnPause').addEventListener('click', pauseSession);
  $('btnResume').addEventListener('click', resumeSession);
  $('btnFinish').addEventListener('click', completeWorkout);
  $('btnFinishNow').addEventListener('click', completeWorkout);
  $('btnClear').addEventListener('click', requestClear);
  $('btnClearYes').addEventListener('click', confirmClear);
  $('btnClearNo').addEventListener('click', cancelClear);
  $('btnExpireLog').addEventListener('click', completeWorkout);
  $('btnExpireDiscard').addEventListener('click', discardExpired);
  $('btnPhaseYes').addEventListener('click', confirmPhaseChange);
  $('btnPhaseNo').addEventListener('click', cancelPhaseChange);
}

/* ---------------- Init ---------------- */
function boot() {
  if (typeof document === 'undefined') return;
  if (booted) return;
  booted = true;
  bindUi();
  const today = new Date();
  renderedDayKey = dayKey(today);
  const rolled = rolloverActiveDay(store, today);
  if (rolled.changed) bootDirty = true;
  if (bootDirty) {
    if (bootNeedsBackup) {
      try { backupRawBeforeSave(localStorage, bootRaw, Date.now()); }
      catch (e) { bootDirty = false; }
    }
    if (bootDirty) save();
    bootNeedsBackup = false;
  }
  // Featured demos and the organization note render even when a stored
  // session has already expired. Expiry used to return before this call.
  renderFeatured();
  if (!offerExpiryChoice()) {
    renderAll();
    if (bootNotice) showMessage(bootNotice);
  }
  bootNotice = null;
  setInterval(tick, 250);
}
boot();

if (typeof module !== 'undefined') {
  module.exports = {
    SESSION_MS: SESSION_MS,
    SESSIONS_PER_PHASE: SESSIONS_PER_PHASE,
    STORE_VERSION: STORE_VERSION,
    LS_KEY: LS_KEY,
    NOTICE_CORRUPT: NOTICE_CORRUPT,
    NOTICE_PARTIAL: NOTICE_PARTIAL,
    resolvePhase: resolvePhase,
    resolveDemoList: resolveDemoList,
    remainingMs: remainingMs,
    migrate: migrate,
    loadStoreFromRaw: loadStoreFromRaw,
    defaultStore: defaultStore,
    dayKey: dayKey,
    parseDay: parseDay,
    isDayKey: isDayKey,
    prettyDay: prettyDay,
    mondayOf: mondayOf,
    isGymDay: isGymDay,
    isGymDayKey: isGymDayKey,
    nextGymDay: nextGymDay,
    weekDayKeys: weekDayKeys,
    resolveActiveDay: resolveActiveDay,
    rolloverActiveDay: rolloverActiveDay,
    thirdDaySelection: thirdDaySelection,
    sessionIsActive: sessionIsActive,
    shouldExpireOnLoad: shouldExpireOnLoad,
    expireIfDue: expireIfDue,
    canStartSession: canStartSession,
    toggleCheckState: toggleCheckState,
    applyCompletion: applyCompletion,
    phaseChangeDecision: phaseChangeDecision,
    applyPhaseChange: applyPhaseChange,
    checklistReady: checklistReady,
    normalizePhase: normalizePhase,
    cappedSessionCount: cappedSessionCount,
    rawBackupKey: rawBackupKey,
    backupRawBeforeSave: backupRawBeforeSave,
  };
}
