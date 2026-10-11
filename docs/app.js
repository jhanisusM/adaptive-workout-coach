'use strict';
/* Adaptive Workout Coach: static GitHub Pages demo.
 *
 * Client-side session engine. Everything is stored in localStorage under
 * a single key. The timer uses ONE stored deadline:
 *   remaining = deadline - Date.now()
 * The deadline is written once at start (or re-anchored once at resume) and
 * never recomputed on reopen, so closing and reopening the browser can never
 * double-subtract elapsed time.
 *
 * Demo videos come from docs/video-library.js, loaded before this file.
 * To swap an exercise's videos, change only its demo_ids list. Never invent
 * a demo URL. Unknown ids are skipped.
 */

const SECTIONS = [
  { id: 'warmup',    title: 'Warm-up',                     block: 'foundation' },
  { id: 'strength',  title: 'Strength',                    block: 'accessory' },
  { id: 'stability', title: 'Stability & shock absorbers', block: 'foundation' },
  { id: 'cooldown',  title: 'Cool-down',                   block: 'foundation' },
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
    dose: '3 × 8 to 10', muscle_groups: ['quads', 'glutes'], demo_ids: [],
    loaded_knee_flexion: true },
  { id: 'bulgarian-split-squat', section: 'strength',
    name: 'Bulgarian split squat',
    note: 'Keep the front foot planted and use a comfortable range. Start light and add load only with good control.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'], demo_ids: [],
    loaded_knee_flexion: true },
  { id: 'step-ups', section: 'strength',
    name: 'Step-ups with dumbbells',
    note: 'Drive through the working foot and lower slowly without dropping from the step.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-stepup'],
    loaded_knee_flexion: true },
  { id: 'lateral-step-down', section: 'strength',
    name: 'Lateral step-down',
    note: 'Low step. Take 3 seconds to lower. A hand on the wall is fine.',
    dose: '2 × 6 each side', muscle_groups: ['quads', 'glutes'], demo_ids: [],
    loaded_knee_flexion: true },
  { id: 'reverse-lunge', section: 'strength',
    name: 'Reverse lunge',
    note: 'Step backward, bodyweight. Keep the front knee tracking over the foot.',
    dose: '2 × 6 each side', muscle_groups: ['quads', 'glutes'], demo_ids: [],
    loaded_knee_flexion: true },
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
  { id: 'tke-band', section: 'strength',
    name: 'Terminal knee extension with band',
    note: 'Anchor the band in front of the knee. Straighten the knee against the band without the hip taking over.',
    dose: '2 × 10', muscle_groups: ['quads'], demo_ids: [] },
  { id: 'clamshell', section: 'strength',
    name: 'Clamshell',
    note: 'Lie on your side with knees bent. Lift the top knee without rolling the hips back.',
    dose: '2 × 8 each side', muscle_groups: ['glutes'], demo_ids: [] },
  { id: 'calf-raise-bilateral', section: 'strength',
    name: 'Calf raise, both feet',
    note: 'Slow up and down. Hold a wall if you need balance.',
    dose: '2 × 10', muscle_groups: ['calves'], demo_ids: [] },
  { id: 'spanish-squat-hold', section: 'stability',
    name: 'Spanish squat hold with band',
    note: 'Anchor the band behind both knees and sit back into the hold. For more load, hold a dumbbell goblet-style.',
    dose: '3 × 30 sec', muscle_groups: ['quads'],
    demo_ids: ['v-kneehaber-spanish'] },
  { id: 'split-squat-hold', section: 'stability',
    name: 'Split-squat hold',
    note: 'Hold a comfortable split-squat depth with the front foot fully planted and the torso tall.',
    dose: '~30 sec each side', muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-split'],
    loaded_knee_flexion: true },
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
 * are skipped so one bad id cannot blank the page. */
EXERCISES.forEach(function (ex) { ex.demos = resolveDemoList(ex.demo_ids); });

/* 3 phases x about 3 weeks each, 3 sessions per week (9 sessions per phase).
 * A phase entry can override the catalog dose, supply week doses (1, 2, 3),
 * replace the catalog note, or append a coaching cue. Week doses change one
 * variable at a time. New exercises have empty demo_ids.
 *
 * Phase 1 does not include loaded knee bending (goblet squat, step-ups,
 * split squat, lunge, step-down, or sit-to-stand). The prompt keeps Phase 1
 * off deep loaded flexion. Sit-to-stand is an advancement check, not a
 * Phase 1 exercise.
 */
const SESSIONS_PER_PHASE = 9;

const PHASES = [
  {
    id: 1,
    name: 'Reactivate',
    weeks: 'Weeks 1-3',
    goal: 'Motor control, isometric strength, and glute activation. No deep, loaded knee bending. Weeks are minimums; the checklist decides when you move on.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets',
        dose: '10 × 5-sec hold',
        doses: { 1: '10 × 5-sec hold', 2: '15 × 5-sec hold', 3: '15 × 8-sec hold' } },
      { exercise_id: 'straight-leg-raises',
        dose: '2 × 8 each leg',
        doses: { 1: '2 × 8 each leg', 2: '3 × 8 each leg', 3: '3 × 10 each leg' } },
      { exercise_id: 'glute-bridges',
        dose: '2 × 10',
        doses: { 1: '2 × 10', 2: '3 × 10', 3: '3 × 12' } },
      { exercise_id: 'tke-band',
        dose: '2 × 10',
        doses: { 1: '2 × 10', 2: '3 × 10', 3: '3 × 12' } },
      { exercise_id: 'clamshell',
        dose: '2 × 8 each side',
        doses: { 1: '2 × 8 each side', 2: '2 × 12 each side', 3: '3 × 12 each side' } },
      { exercise_id: 'calf-raise-bilateral',
        dose: '2 × 10',
        doses: { 1: '2 × 10', 2: '3 × 10', 3: '3 × 12' } },
      { exercise_id: 'spanish-squat-hold',
        dose: '3 × 20 sec',
        doses: { 1: '3 × 20 sec', 2: '4 × 20 sec', 3: '4 × 30 sec' },
        note: 'Band behind both knees. Sit back only a little, about 45 to 60 degrees. Shallow hold, not a deep squat.' },
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
    goal: 'Reintroduce load with support. Bilateral patterns come before unilateral ones. Weeks are minimums; the checklist decides when you move on.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets',
        dose: '15 × 5-sec hold',
        doses: { 1: '15 × 5-sec hold', 2: '15 × 8-sec hold', 3: '15 × 10-sec hold' } },
      { exercise_id: 'goblet-squat',
        dose: '3 × 6',
        doses: { 1: '3 × 6', 2: '3 × 8', 3: '3 × 8, a little more load' },
        note_append: 'Light load to a high box. Add load only in week 3, and only if the knee is quiet.' },
      { exercise_id: 'step-ups',
        dose: '3 × 6 each side',
        doses: { 1: '3 × 6 each side', 2: '3 × 8 each side', 3: '3 × 8 each side, less hand support' },
        note_append: 'Low step, bodyweight. Reduce hand support before you add dumbbells.' },
      { exercise_id: 'db-romanian-deadlift',
        dose: '3 × 8',
        doses: { 1: '3 × 8', 2: '3 × 10', 3: '3 × 10, slightly heavier' },
        note_append: 'Light load. Add weight only after the reps go up.' },
      { exercise_id: 'spanish-squat-hold',
        dose: '3 × 20 sec',
        doses: { 1: '3 × 20 sec', 2: '3 × 30 sec', 3: '4 × 30 sec' } },
      { exercise_id: 'split-squat-hold',
        dose: '20 sec each side',
        doses: { 1: '20 sec each side', 2: '30 sec each side', 3: '30 sec each side, less hand support' } },
      { exercise_id: 'single-leg-rdl',
        dose: '3 × 6 each side',
        doses: { 1: '3 × 6 each side', 2: '3 × 8 each side', 3: '3 × 8 each side, fingertip support' },
        note_append: 'Bodyweight with wall support. Reduce support before you add a dumbbell.' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
  {
    id: 3,
    name: 'Return',
    weeks: 'Weeks 7-9',
    goal: 'Complex single-leg loading. The Bulgarian split squat starts here at bodyweight. No running or plyometrics until you are cleared for them separately.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'goblet-squat',
        dose: '3 × 8',
        doses: { 1: '3 × 8', 2: '3 × 10', 3: '3 × 10, modest load' } },
      { exercise_id: 'bulgarian-split-squat',
        dose: '3 × 6 each side',
        doses: {
          1: '3 × 6 each side',
          2: '3 × 8 each side',
          3: '3 × 8 each side, light dumbbells if the last week was quiet',
        },
        note_append: 'Bodyweight, low rear foot first. Add dumbbells only after 3 × 8 is clean and the next day is quiet.' },
      { exercise_id: 'lateral-step-down',
        dose: '2 × 6 each side',
        doses: { 1: '2 × 6 each side', 2: '3 × 6 each side', 3: '3 × 8 each side' } },
      { exercise_id: 'reverse-lunge',
        dose: '2 × 6 each side',
        doses: { 1: '2 × 6 each side', 2: '3 × 6 each side', 3: '3 × 8 each side' } },
      { exercise_id: 'step-ups',
        dose: '3 × 8 each side',
        doses: { 1: '3 × 8 each side', 2: '3 × 10 each side', 3: '3 × 10 each side, light dumbbells' } },
      { exercise_id: 'db-romanian-deadlift',
        dose: '3 × 8',
        doses: { 1: '3 × 8', 2: '3 × 10', 3: '3 × 10, slightly heavier' } },
      { exercise_id: 'single-leg-rdl',
        dose: '3 × 6 each side',
        doses: { 1: '3 × 6 each side', 2: '3 × 8 each side', 3: '3 × 8 each side, light dumbbell' } },
      { exercise_id: 'spanish-squat-hold',
        dose: '3 × 30 sec',
        doses: { 1: '3 × 30 sec', 2: '4 × 30 sec', 3: '4 × 40 sec' } },
      { exercise_id: 'split-squat-hold',
        dose: '30 sec each side',
        doses: { 1: '30 sec each side', 2: '40 sec each side', 3: '40 sec each side, less support' } },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
];

/* Shared checks stay on the same ids so older saves still match.
 * Phase 1 adds extension and a sit-to-stand test. Phase 2 adds split-squat
 * control and even weight in a squat. Symptom scores never tick these. */
const SHARED_CHECKLIST = [
  { id: 'no-swelling', label: 'No swelling after sessions' },
  { id: 'pain-ok', label: 'Pain 2/10 or less during, and zero the next morning' },
  { id: 'good-control', label: 'Every set completed with good control' },
];

const PHASE_CHECKLISTS = {
  1: SHARED_CHECKLIST.concat([
    { id: 'full-extension', label: 'Full knee extension, with no quad lag on a straight leg raise' },
    { id: 'sit-to-stand', label: 'Sit to stand from a chair with no hands and no knee collapse' },
  ]),
  2: SHARED_CHECKLIST.concat([
    { id: 'split-squat-control', label: 'Supported split squat to about 90 degrees with no knee caving in' },
    { id: 'even-squat', label: 'Even weight on both legs in a squat' },
  ]),
};

const EXERCISE_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

function checklistForPhase(phaseId) {
  return PHASE_CHECKLISTS[normalizePhase(phaseId)] || null;
}

/* Resolve a phase into its concrete program. `week` selects doses[week]
 * when that entry exists; otherwise the phase dose, then the catalog dose. */
function resolvePhase(phaseId, week) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) throw new Error('unknown phase: ' + phaseId);
  const exercises = phase.exercises.map((entry, i) => {
    const base = EXERCISE_BY_ID.get(entry.exercise_id);
    if (!base) throw new Error('unknown exercise in phase ' + phaseId + ': ' + entry.exercise_id);
    let note = entry.note !== undefined ? entry.note : base.note;
    if (entry.note_append) note = note + ' ' + entry.note_append;
    return {
      id: base.id, section: base.section, name: base.name, note,
      dose: doseForEntry(entry, base, week),
      muscle_groups: base.muscle_groups, demos: base.demos, order: i,
      loaded_knee_flexion: base.loaded_knee_flexion === true,
    };
  });
  return {
    id: phase.id, name: phase.name, weeks: phase.weeks, goal: phase.goal,
    sessions_target: SESSIONS_PER_PHASE, exercises,
  };
}

function doseForEntry(entry, base, week) {
  const w = Number(week);
  if ((w === 1 || w === 2 || w === 3) && entry.doses && entry.doses[w] != null && entry.doses[w] !== '') {
    return entry.doses[w];
  }
  if (entry.dose !== undefined) return entry.dose;
  return base.dose;
}

/* Week 1 is sessions 0-2, week 2 is 3-5, week 3 is 6 and above.
 * The count is the real (uncapped) number of sessions that still count. */
function phaseWeek(sessionCount) {
  const n = Math.max(0, Math.floor(Number(sessionCount) || 0));
  return Math.min(3, Math.floor(n / 3) + 1);
}

/* ---------------- Constants & store ---------------- */
const SESSION_MS = 30 * 60 * 1000;
const LS_KEY = 'awc-demo-v1';
const STORE_VERSION = 2;
const BACKUP_KEEP = 3;
const NOTICE_CORRUPT = 'Saved data could not be read, so progress was reset to a fresh start.';
const NOTICE_PARTIAL = 'Some saved data was unreadable and was reset. The rest of your progress was kept.';
const BACKUP_NOTICE = 'A backup of your previous save was stored in this browser.';
const THIRD_DAYS = ['none', 'fri-morning', 'fri-night', 'sat-morning'];
const DOWS = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Tue-Sat only: Sundays are for church, Mondays are rest

let bootNotice = null;
let bootDirty = false;
let bootRaw = null;
let bootNeedsBackup = false;
let renderedDayKey = null;
let pendingPhase = null;
let pendingPhaseMessage = null;
let pendingAdvance = false;
let checkinMode = null;
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
function hasClearance(state) {
  const c = state && state.clearance;
  return !!(c && c.accepted === true && isDayKey(c.date));
}
function canStartSession(state) {
  const session = state.session;
  if (session && session.state === 'paused') return { ok: true, action: 'resume' };
  if (session && session.state === 'running') return { ok: false, reason: 'already-running' };
  if (session && session.state === 'expired') return { ok: false, reason: 'expired' };
  if (!hasClearance(state)) return { ok: false, reason: 'no-clearance' };
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
function unlockedPhaseOf(state) {
  const current = normalizePhase(state.phase);
  const n = Number(state.unlockedPhase);
  const unlocked = (n === 1 || n === 2 || n === 3) ? n : current;
  return Math.max(current, unlocked);
}
/* Moving down is always allowed. Moving up to a phase Advance has already
 * unlocked is allowed. Anything past that goes through advancePhase. */
function phaseChangeDecision(state, nextPhase) {
  const current = normalizePhase(state.phase);
  const next = Number(nextPhase);
  if (!PHASES.some(p => p.id === next)) return { action: 'noop' };
  if (next === current) return { action: 'noop' };
  if (next > current && next > unlockedPhaseOf(state)) return { action: 'advance' };
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
  const items = checklistForPhase(phaseId);
  if (!items || !items.length) return false;
  const c = (checklist && checklist[String(phaseId)]) || {};
  return items.every(item => c[item.id] === true);
}
function clampPain(value) {
  if (typeof value === 'boolean' || value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n);
}
/* Pain above 2 during, any next-morning pain, or next-morning swelling. */
function symptomFlagged(record) {
  if (!record || typeof record !== 'object') return false;
  const during = Number(record.painDuring);
  if (Number.isFinite(during) && during > 2) return true;
  if (record.swellingNext === true) return true;
  if (record.painNext != null && record.painNext !== '' && Number(record.painNext) > 0) return true;
  return false;
}
function symptomStatus(record) {
  if (!record || typeof record !== 'object') return 'pending';
  if (symptomFlagged(record)) return 'flag';
  if (record.painNext == null || record.swellingNext == null) return 'pending';
  return 'clean';
}
function symptomRecords(state, phaseId) {
  const symptoms = state && isPlainObject(state.symptoms) ? state.symptoms : {};
  const phase = phaseId == null ? null : normalizePhase(phaseId);
  return Object.keys(symptoms).filter(isDayKey).sort().map(day => {
    return { day: day, record: symptoms[day] };
  }).filter(row => {
    if (!isPlainObject(row.record)) return false;
    if (phase == null) return true;
    return Number(row.record.phase) === phase;
  });
}
/* Flagged sessions, and sessions still waiting on the morning check, do not
 * move the week. Sessions with no symptom record still count (older saves). */
function weekCredit(state, phaseId) {
  const phase = normalizePhase(phaseId);
  const total = Math.max(0, Math.floor(Number(state.phaseSessions && state.phaseSessions[phase]) || 0));
  const held = symptomRecords(state, phase).filter(row => {
    const status = symptomStatus(row.record);
    return status === 'flag' || status === 'pending';
  }).length;
  return Math.max(0, total - held);
}
function programWeek(state, phaseId) {
  return phaseWeek(weekCredit(state, phaseId));
}
/* Two flagged sessions in a row, skipping any still waiting on the morning
 * check. A later clean session clears the lock. */
function consecutiveFlagLock(state, phaseId) {
  const rows = symptomRecords(state, phaseId).filter(row => symptomStatus(row.record) !== 'pending');
  if (rows.length < 2) return false;
  return symptomStatus(rows[rows.length - 1].record) === 'flag'
    && symptomStatus(rows[rows.length - 2].record) === 'flag';
}
function advanceDecision(state) {
  const phase = normalizePhase(state.phase);
  if (phase >= 3) return { ok: false, reason: 'last-phase' };
  const have = Math.max(0, Math.floor(Number(state.phaseSessions && state.phaseSessions[phase]) || 0));
  if (have < SESSIONS_PER_PHASE) return { ok: false, reason: 'sessions', have: have, need: SESSIONS_PER_PHASE };
  if (!checklistReady(state.checklist, phase)) return { ok: false, reason: 'checklist' };
  if (consecutiveFlagLock(state, phase)) return { ok: false, reason: 'symptoms' };
  return { ok: true, next: phase + 1 };
}
function grantAdvance(state, at) {
  const decision = advanceDecision(state);
  if (!decision.ok) return decision;
  const from = normalizePhase(state.phase);
  const priorUnlock = unlockedPhaseOf(state);
  applyPhaseChange(state, decision.next);
  state.unlockedPhase = Math.max(priorUnlock, decision.next);
  if (!Array.isArray(state.history)) state.history = [];
  state.history.push({
    type: 'advance',
    from: from,
    to: decision.next,
    at: at == null ? null : String(at),
  });
  return { ok: true, from: from, to: decision.next };
}
function advanceReason(decision) {
  if (!decision || decision.ok) return 'Checklist complete and 9 sessions logged. Advance when you are ready.';
  if (decision.reason === 'sessions') {
    const have = Math.max(0, Math.floor(Number(decision.have) || 0));
    if (have >= SESSIONS_PER_PHASE) return 'This phase has reached 9 of 9 sessions.';
    return 'Logged ' + have + ' of 9 sessions in this phase. Advance stays off until you reach 9.';
  }
  if (decision.reason === 'checklist') return 'Confirm every checklist item before advancing.';
  if (decision.reason === 'symptoms') {
    return 'Advance is paused after two flagged sessions in a row. It stays off until a later session is clean.';
  }
  return '';
}
function symptomAdvice(state) {
  const phase = normalizePhase(state.phase);
  if (consecutiveFlagLock(state, phase)) {
    return 'Two flagged sessions in a row. Repeat this week or reduce your sets. Advance stays off until a later session is clean. Doses are not changed for you.';
  }
  const rows = symptomRecords(state, phase);
  if (!rows.length) return '';
  if (symptomStatus(rows[rows.length - 1].record) === 'flag') {
    return 'This session is flagged. Repeat this week or reduce your sets. The listed doses stay the same.';
  }
  return '';
}
/* Morning questions belong to a later calendar day, not the workout itself. */
function pendingMorning(state, today) {
  const todayKey = dayKey(today instanceof Date ? today : new Date(today || Date.now()));
  const rows = symptomRecords(state, null).filter(row => {
    if (row.day >= todayKey) return false;
    return row.record.painNext == null || row.record.swellingNext == null;
  });
  return rows.length ? rows[rows.length - 1] : null;
}
function applyMorningCheck(state, day, painNext, swellingNext) {
  const pain = clampPain(painNext);
  if (pain == null) return { ok: false, reason: 'pain-next' };
  if (swellingNext !== true && swellingNext !== false) return { ok: false, reason: 'swelling-next' };
  if (!isDayKey(day) || !isPlainObject(state.symptoms) || !isPlainObject(state.symptoms[day])) {
    return { ok: false, reason: 'no-record' };
  }
  state.symptoms[day].painNext = pain;
  state.symptoms[day].swellingNext = swellingNext;
  const status = symptomStatus(state.symptoms[day]);
  return { ok: true, status: status, flagged: status === 'flag', day: day };
}
/* Stores the check-in, then logs the day. Refuses before it writes when the
 * pain score or an included morning follow-up is invalid. Does not tick the
 * checklist and does not rewrite dose text. */
function applySessionCheckin(state, input) {
  const session = state.session;
  if (!sessionIsActive(session)) return { ok: false, reason: 'no-session' };
  const day = session.day;
  if (!isGymDayKey(day, state.thirdDay)) return { ok: false, reason: 'not-gym-day', day: day };
  const painDuring = clampPain(input && input.painDuring);
  if (painDuring == null) return { ok: false, reason: 'pain-during' };
  let morningPatch = null;
  if (input && input.morningDay) {
    const painNext = clampPain(input.painNext);
    if (painNext == null) return { ok: false, reason: 'pain-next' };
    if (input.swellingNext !== true && input.swellingNext !== false) return { ok: false, reason: 'swelling-next' };
    if (!isDayKey(input.morningDay) || !isPlainObject(state.symptoms) || !isPlainObject(state.symptoms[input.morningDay])) {
      return { ok: false, reason: 'no-record' };
    }
    morningPatch = { day: input.morningDay, painNext: painNext, swellingNext: input.swellingNext };
  }
  if (!isPlainObject(state.symptoms)) state.symptoms = {};
  state.symptoms[day] = {
    painDuring: painDuring,
    painNext: null,
    swellingNext: null,
    phase: normalizePhase(state.phase),
  };
  if (morningPatch) {
    state.symptoms[morningPatch.day].painNext = morningPatch.painNext;
    state.symptoms[morningPatch.day].swellingNext = morningPatch.swellingNext;
  }
  const logged = applyCompletion(state);
  const status = symptomStatus(state.symptoms[day]);
  return {
    ok: logged.ok,
    already: logged.already,
    day: logged.day,
    phase: logged.phase,
    symptom: status,
    flagged: status === 'flag',
  };
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
function sanitizeSymptoms(raw, present) {
  if (!present) return { value: {}, repaired: false };
  if (raw == null) return { value: {}, repaired: false };
  if (!isPlainObject(raw)) return { value: {}, repaired: true };
  const out = {};
  let repaired = false;
  Object.keys(raw).forEach(day => {
    const rec = raw[day];
    if (!isDayKey(day) || !isPlainObject(rec)) { repaired = true; return; }
    const painDuring = clampPain(rec.painDuring);
    if (painDuring == null) { repaired = true; return; }
    let painNext = null;
    if (rec.painNext != null && rec.painNext !== '') {
      painNext = clampPain(rec.painNext);
      if (painNext == null) { repaired = true; return; }
    }
    let swelling = null;
    if (rec.swellingNext === true || rec.swellingNext === false) swelling = rec.swellingNext;
    else if (rec.swellingNext != null) { repaired = true; return; }
    let phase = null;
    if (rec.phase === 1 || rec.phase === 2 || rec.phase === 3) phase = rec.phase;
    else if (rec.phase != null) repaired = true;
    const clean = { painDuring: painDuring, painNext: painNext, swellingNext: swelling, phase: phase };
    const same = rec.painDuring === painDuring
      && (rec.painNext == null ? null : rec.painNext) === painNext
      && (rec.swellingNext == null ? null : rec.swellingNext) === swelling
      && (rec.phase == null ? null : rec.phase) === phase
      && Object.keys(rec).length === 4;
    if (!same) repaired = true;
    out[day] = clean;
  });
  return { value: out, repaired: repaired };
}
function sanitizeClearance(raw, present) {
  if (!present || raw == null) return { value: null, repaired: false };
  if (!isPlainObject(raw) || raw.accepted !== true || !isDayKey(raw.date)) {
    return { value: null, repaired: true };
  }
  const clean = { accepted: true, date: raw.date };
  const extra = Object.keys(raw).some(key => key !== 'accepted' && key !== 'date');
  return { value: clean, repaired: extra };
}
function sanitizeHistory(raw, present) {
  if (!present || raw == null) return { value: [], repaired: false };
  if (!Array.isArray(raw)) return { value: [], repaired: true };
  const out = [];
  let repaired = false;
  raw.forEach(item => {
    if (!isPlainObject(item) || item.type !== 'advance') { repaired = true; return; }
    const from = Number(item.from);
    const to = Number(item.to);
    if ((from !== 1 && from !== 2 && from !== 3) || (to !== 1 && to !== 2 && to !== 3)) {
      repaired = true;
      return;
    }
    const at = typeof item.at === 'string' ? item.at : null;
    if (item.at != null && typeof item.at !== 'string') repaired = true;
    const extra = Object.keys(item).some(key => key !== 'type' && key !== 'from' && key !== 'to' && key !== 'at');
    if (extra || item.from !== from || item.to !== to) repaired = true;
    out.push({ type: 'advance', from: from, to: to, at: at });
  });
  return { value: out, repaired: repaired };
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
  const symptomsInfo = sanitizeSymptoms(raw.symptoms, hasOwn(raw, 'symptoms'));
  const clearanceInfo = sanitizeClearance(raw.clearance, hasOwn(raw, 'clearance'));
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
function backupStamp(key) {
  const prefix = LS_KEY + '.bak-';
  if (typeof key !== 'string' || key.indexOf(prefix) !== 0) return null;
  const n = Number(key.slice(prefix.length));
  return Number.isFinite(n) ? n : null;
}
function listBackupKeys(storage) {
  const keys = [];
  if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') return keys;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (backupStamp(key) != null) keys.push(key);
  }
  keys.sort((a, b) => backupStamp(b) - backupStamp(a));
  return keys;
}
/* Keep the newest backups and drop the rest. */
function pruneBackups(storage, keep) {
  const limit = keep == null ? BACKUP_KEEP : keep;
  const keys = listBackupKeys(storage);
  const removed = [];
  keys.slice(Math.max(0, limit)).forEach(key => {
    storage.removeItem(key);
    removed.push(key);
  });
  return { kept: keys.slice(0, Math.max(0, limit)), removed: removed };
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
  const phase = currentPhaseId();
  return resolvePhase(phase, programWeek(store, phase)).exercises;
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
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

/* ---------------- Session lifecycle ---------------- */
function startSession() {
  const decision = canStartSession(store);
  if (!decision.ok) {
    if (decision.reason === 'no-clearance') {
      showMessage('Confirm training clearance before you start a session.');
      openClearance();
    } else if (decision.reason === 'not-gym-day') {
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

function hideCheckin() {
  checkinMode = null;
  const modal = $('checkinModal');
  if (modal) modal.hidden = true;
}

function endSession(message) {
  store.session = null;
  store.checks = {};
  pendingPhase = null;
  pendingPhaseMessage = null;
  pendingAdvance = false;
  hideCheckin();
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

function openFinishCheckin() {
  if (!sessionIsActive(store.session)) {
    showMessage('Start a session before logging a workout.');
    renderAll();
    return;
  }
  if (!isGymDayKey(store.session.day, store.thirdDay)) {
    const when = isDayKey(store.session.day) ? prettyDay(store.session.day) : 'that day';
    showMessage('Nothing was logged. This program does not train on ' + when + '.');
    return;
  }
  openCheckin('finish');
}

function openCheckin(mode) {
  checkinMode = mode;
  const modal = $('checkinModal');
  if (!modal) return;
  const morning = pendingMorning(store, new Date());
  const sessionDay = store.session && store.session.day;
  const showMorning = mode === 'morning' || (morning && morning.day !== sessionDay);
  const follow = morning && showMorning ? morning : (mode === 'morning' ? pendingMorning(store, new Date()) : null);
  $('checkinTitle').textContent = mode === 'morning' ? 'Next-morning check-in' : 'Session check-in';
  $('painDuringWrap').hidden = mode === 'morning';
  $('painDuring').value = '';
  $('morningFields').hidden = !follow;
  if (follow) {
    $('morningPrompt').textContent = 'For ' + prettyDay(follow.day) + ': how did the knee feel this morning?';
    $('morningFields').setAttribute('data-day', follow.day);
    $('swellingNext').value = '';
    $('painNext').value = '';
  } else {
    $('morningFields').removeAttribute('data-day');
  }
  $('checkinLead').textContent = mode === 'morning'
    ? 'This does not change your doses. It only records how the last session settled.'
    : 'Pain during this session, from 0 to 10. This is stored in this browser only.';
  $('btnCheckinSave').textContent = mode === 'morning' ? 'Save morning check-in' : 'Save and log workout';
  modal.hidden = false;
}

function saveCheckin() {
  if (checkinMode === 'morning') {
    const day = $('morningFields').getAttribute('data-day');
    const swelling = $('swellingNext').value;
    const result = applyMorningCheck(
      store,
      day,
      $('painNext').value,
      swelling === 'yes' ? true : swelling === 'no' ? false : null
    );
    if (!result.ok) {
      showMessage('Choose swelling and a morning pain score from 0 to 10.');
      return;
    }
    hideCheckin();
    save();
    renderAll();
    const advice = symptomAdvice(store);
    showMessage(advice || ('Morning check saved for ' + prettyDay(result.day) + '.'));
    return;
  }
  const payload = { painDuring: $('painDuring').value };
  if (!$('morningFields').hidden) {
    const swellingValue = $('swellingNext').value;
    const painNext = $('painNext').value;
    const morningReady = (swellingValue === 'yes' || swellingValue === 'no') && painNext !== '';
    if (morningReady) {
      payload.morningDay = $('morningFields').getAttribute('data-day');
      payload.painNext = painNext;
      payload.swellingNext = swellingValue === 'yes';
    }
  }
  const result = applySessionCheckin(store, payload);
  if (!result.ok) {
    if (result.reason === 'pain-during') showMessage('Choose a pain score from 0 to 10 before logging.');
    else if (result.reason === 'pain-next' || result.reason === 'swelling-next') {
      showMessage('Finish the morning questions, or they stay for your next visit.');
    } else if (result.reason === 'no-session') showMessage('Start a session before logging a workout.');
    else if (result.reason === 'not-gym-day') showMessage('Nothing was logged. This program does not train on that day.');
    return;
  }
  hideCheckin();
  save();
  renderAll();
  let text = result.already
    ? 'Already logged for ' + prettyDay(result.day) + '. This day counts once.'
    : 'Workout complete: logged for ' + prettyDay(result.day) + '.';
  const advice = symptomAdvice(store);
  if (advice) text = text + ' ' + advice;
  showMessage(text);
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

function somethingWrong() {
  endSession('Session stopped. Nothing was logged. Contact your clinician before you train again.');
}

/* ---------------- Phase actions ---------------- */
function checklistConfirmed(phaseId) {
  const items = checklistForPhase(phaseId) || [];
  const c = store.checklist[String(phaseId)] || {};
  return items.map(i => ({ id: i.id, label: i.label, confirmed: c[i.id] === true }));
}
function commitPhase(n, successMessage) {
  const from = currentPhaseId();
  const priorUnlock = unlockedPhaseOf(store);
  const advancing = pendingAdvance && n > from;
  if (advancing) {
    const decision = advanceDecision(store);
    if (!decision.ok || decision.next !== n) {
      pendingPhase = null;
      pendingPhaseMessage = null;
      pendingAdvance = false;
      renderAll();
      showMessage(decision.ok ? 'Stay on this phase for now.' : (advanceReason(decision) || 'Stay on this phase for now.'));
      return;
    }
  }
  applyPhaseChange(store, n);
  if (advancing) {
    store.unlockedPhase = Math.max(priorUnlock, n);
    if (!Array.isArray(store.history)) store.history = [];
    store.history.push({ type: 'advance', from: from, to: n, at: new Date().toISOString() });
  }
  pendingPhase = null;
  pendingPhaseMessage = null;
  pendingAdvance = false;
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
  pendingAdvance = false;
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
  const decision = advanceDecision(store);
  if (!decision.ok) {
    showMessage(advanceReason(decision) || 'Stay on this phase for now.');
    renderPhase();
    return;
  }
  pendingAdvance = true;
  const next = decision.next;
  const message = 'Advanced to Phase ' + next + '.';
  if (sessionIsActive(store.session)) {
    pendingPhase = next;
    pendingPhaseMessage = message;
    renderPrompts();
    return;
  }
  commitPhase(next, message);
}

function clearanceFormReady() {
  return !!($('clearanceAccept') && $('clearanceAccept').checked && isDayKey($('clearanceDate').value));
}
function openClearance() {
  const modal = $('clearanceModal');
  if (!modal) return;
  const c = store.clearance;
  $('clearanceAccept').checked = !!(c && c.accepted === true);
  $('clearanceDate').value = c && isDayKey(c.date) ? c.date : '';
  $('btnClearanceSave').disabled = !clearanceFormReady();
  modal.hidden = false;
}
function closeClearance() {
  const modal = $('clearanceModal');
  if (modal) modal.hidden = true;
}
function saveClearance() {
  if (!$('clearanceAccept').checked || !isDayKey($('clearanceDate').value)) {
    $('btnClearanceSave').disabled = true;
    return;
  }
  store.clearance = { accepted: true, date: $('clearanceDate').value };
  save();
  closeClearance();
  renderAll();
  showMessage('Clearance saved for ' + prettyDay(store.clearance.date) + '.');
  if (!(store.session && store.session.state === 'expired')) {
    const morning = pendingMorning(store, new Date());
    if (morning) openCheckin('morning');
  }
}
function refreshClearanceButton() {
  const btn = $('btnClearanceSave');
  if (btn) btn.disabled = !clearanceFormReady();
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
  $('btnStart').disabled = !hasClearance(store);
  $('btnPause').hidden = !(s && s.state === 'running');
  $('btnResume').hidden = !(s && s.state === 'paused');
  $('btnFinish').hidden = !active || expired;
  let detail = 'in progress';
  if (s && s.state === 'paused') detail = 'paused';
  else if (expired) detail = 'time is up';
  if (!s && !hasClearance(store)) {
    $('sessionDate').textContent = 'Clearance is required before the first session.';
  } else {
    $('sessionDate').textContent = s
      ? 'Session: ' + prettyDay(s.day) + ' (' + detail + ')'
      : 'No active session: pick a gym day and press Start.';
  }
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
  if ($('phaseConfirmText')) {
    $('phaseConfirmText').textContent = pendingAdvance
      ? 'Advance phase? This ends the current session and clears its checkboxes.'
      : 'Change phase? This ends the current session and clears its checkboxes.';
  }
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
    const countLabel = exs.length === 1 ? '1 exercise' : exs.length + ' exercises';
    return '<section class="section' + (collapsed ? ' collapsed' : '') + (done ? ' complete' : '') + '">' +
      '<button class="section-head" data-section="' + esc(sec.id) + '">' +
      '<span class="section-title"><span class="step-no">' + String(stepNo).padStart(2, '0') + '</span>' +
      '<h3 class="section-heading">' + esc(sec.title) + '</h3>' +
      '<span class="block-tag">' + (sec.block === 'foundation' ? 'foundation block' : 'accessory block') + '</span></span>' +
      '<span class="duration">' + countLabel + '</span></button>' +
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
  const week = programWeek(store, p);
  $('phaseTitle').textContent = 'Phase ' + p + ': ' + phase.name + ' (' + phase.weeks + ')';
  $('phaseGoal').textContent = phase.goal;
  const unlocked = unlockedPhaseOf(store);
  document.querySelectorAll('#phasePicker .phase-btn').forEach(b => {
    const id = Number(b.getAttribute('data-phase'));
    const locked = id > unlocked;
    b.classList.toggle('active', id === p);
    b.classList.toggle('locked', locked);
    b.setAttribute('aria-disabled', locked ? 'true' : 'false');
    const lock = b.querySelector('.phase-lock');
    if (lock) {
      lock.textContent = locked ? 'Locked. Complete Phase ' + (id - 1) + ' criteria.' : '';
    }
  });

  const credit = weekCredit(store, p);
  const total = Math.max(0, Math.floor(Number(store.phaseSessions[p]) || 0));
  let weekText = 'Week ' + week + ' doses for this phase. Weeks are minimums; the checklist decides when you move on.';
  if (total > credit) {
    weekText += ' A flagged session, or one still waiting on the next-morning check, keeps this week in place. Listed doses are not changed for you.';
  }
  $('weekNote').textContent = weekText;

  const advice = symptomAdvice(store);
  const adviceEl = $('symptomAdvice');
  adviceEl.hidden = !advice;
  adviceEl.textContent = advice;

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
    const items = checklistConfirmed(p);
    $('checklistTitle').textContent = 'Before advancing to Phase ' + (p + 1) + ', confirm every item';
    $('checklistItems').innerHTML = items.map(it =>
      '<label class="check-item"><input type="checkbox" data-checklist-item="' + it.id + '"' +
      (it.confirmed ? ' checked' : '') + '><span>' + esc(it.label) + '</span></label>'
    ).join('');
    const decision = advanceDecision(store);
    const btn = $('advanceBtn');
    btn.disabled = !decision.ok;
    btn.textContent = 'Advance to Phase ' + (p + 1);
    $('advanceNote').textContent = advanceReason(decision);
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
    if (checkinMode == null && hasClearance(store) && pendingMorning(store, new Date(now)) && !(store.session && store.session.state === 'expired')) {
      openCheckin('morning');
    }
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
    const n = Number(phaseBtn.getAttribute('data-phase'));
    const decision = phaseChangeDecision(store, n);
    if (decision.action === 'noop') {
      pendingPhase = null;
      pendingPhaseMessage = null;
      pendingAdvance = false;
      renderPrompts();
      return;
    }
    if (decision.action === 'advance') {
      advancePhase();
      return;
    }
    pendingAdvance = false;
    if (decision.action === 'confirm') {
      pendingPhase = decision.phase;
      pendingPhaseMessage = null;
      renderPrompts();
      return;
    }
    commitPhase(decision.phase, null);
    return;
  }
  if (ev.target.id === 'advanceBtn') advancePhase();
}
function onChange(ev) {
  const box = ev.target.closest('[data-check]');
  if (box) { toggleCheck(box.getAttribute('data-check')); return; }
  const item = ev.target.closest('[data-checklist-item]');
  if (item) { toggleChecklistItem(item.getAttribute('data-checklist-item'), item.checked); return; }
  if (ev.target.id === 'clearanceAccept' || ev.target.id === 'clearanceDate') {
    refreshClearanceButton();
    return;
  }
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
function onInput(ev) {
  if (ev.target.id === 'clearanceDate') refreshClearanceButton();
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
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  $('btnStart').addEventListener('click', startSession);
  $('btnPause').addEventListener('click', pauseSession);
  $('btnResume').addEventListener('click', resumeSession);
  $('btnFinish').addEventListener('click', openFinishCheckin);
  $('btnFinishNow').addEventListener('click', openFinishCheckin);
  $('btnClear').addEventListener('click', requestClear);
  $('btnClearYes').addEventListener('click', confirmClear);
  $('btnClearNo').addEventListener('click', cancelClear);
  $('btnExpireLog').addEventListener('click', openFinishCheckin);
  $('btnExpireDiscard').addEventListener('click', discardExpired);
  $('btnPhaseYes').addEventListener('click', confirmPhaseChange);
  $('btnPhaseNo').addEventListener('click', cancelPhaseChange);
  $('btnCheckinSave').addEventListener('click', saveCheckin);
  $('btnCheckinCancel').addEventListener('click', hideCheckin);
  $('btnClearanceSave').addEventListener('click', saveClearance);
  $('btnClearanceLater').addEventListener('click', closeClearance);
  $('btnReviewClearance').addEventListener('click', openClearance);
  $('btnSomethingWrong').addEventListener('click', somethingWrong);
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
  let backupMade = false;
  if (bootNeedsBackup && bootRaw != null && bootRaw !== '') {
    try {
      backupRawBeforeSave(localStorage, bootRaw, Date.now());
      backupMade = true;
    } catch (e) {
      bootDirty = false;
    }
  }
  try { pruneBackups(localStorage, BACKUP_KEEP); } catch (e) { /* ignore */ }
  if (bootDirty) {
    if (bootDirty) save();
    bootNeedsBackup = false;
  }
  if (backupMade) bootNotice = bootNotice ? (bootNotice + ' ' + BACKUP_NOTICE) : BACKUP_NOTICE;
  // Featured demos and the organization note render even when a stored
  // session has already expired. Expiry used to return before this call.
  renderFeatured();
  const expired = offerExpiryChoice();
  if (!expired) {
    renderAll();
    if (bootNotice) showMessage(bootNotice);
  }
  bootNotice = null;
  if (!hasClearance(store)) openClearance();
  else if (!expired && pendingMorning(store, today)) openCheckin('morning');
  setInterval(tick, 250);
}
boot();

if (typeof module !== 'undefined') {
  module.exports = {
    SESSION_MS: SESSION_MS,
    SESSIONS_PER_PHASE: SESSIONS_PER_PHASE,
    STORE_VERSION: STORE_VERSION,
    LS_KEY: LS_KEY,
    BACKUP_KEEP: BACKUP_KEEP,
    NOTICE_CORRUPT: NOTICE_CORRUPT,
    NOTICE_PARTIAL: NOTICE_PARTIAL,
    BACKUP_NOTICE: BACKUP_NOTICE,
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
    hasClearance: hasClearance,
    toggleCheckState: toggleCheckState,
    applyCompletion: applyCompletion,
    phaseChangeDecision: phaseChangeDecision,
    applyPhaseChange: applyPhaseChange,
    checklistReady: checklistReady,
    checklistForPhase: checklistForPhase,
    normalizePhase: normalizePhase,
    cappedSessionCount: cappedSessionCount,
    rawBackupKey: rawBackupKey,
    backupRawBeforeSave: backupRawBeforeSave,
    listBackupKeys: listBackupKeys,
    pruneBackups: pruneBackups,
    phaseWeek: phaseWeek,
    weekCredit: weekCredit,
    programWeek: programWeek,
    symptomFlagged: symptomFlagged,
    symptomStatus: symptomStatus,
    consecutiveFlagLock: consecutiveFlagLock,
    advanceDecision: advanceDecision,
    grantAdvance: grantAdvance,
    applySessionCheckin: applySessionCheckin,
    applyMorningCheck: applyMorningCheck,
    pendingMorning: pendingMorning,
    symptomAdvice: symptomAdvice,
  };
}
