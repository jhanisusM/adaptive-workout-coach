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
const FEATURED_DEMOS = FEATURED_DEMO_IDS.map(resolveVideo);

/* Resolve every exercise's demo_ids into full video objects from the video
 * library (video-library.js must be loaded before this file). `demos`
 * keeps working for all rendering code below. */
EXERCISES.forEach(function (ex) { ex.demos = ex.demo_ids.map(resolveVideo); });

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
const DOWS = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Tue–Sat only: Sundays are for church, Mondays are rest

function dayKey(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function parseDay(key) {
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
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

function defaultStore() {
  return {
    session: null,      // { state:'running'|'paused', startedAt, deadline, remainingMs, day }
    checks: {},         // { exerciseId: true }
    collapsed: {},      // { sectionId: true }
    thirdDay: 'none',   // none | fri-morning | fri-night | sat-morning
    completions: {},    // { 'YYYY-MM-DD': true }
    activeDay: dayKey(new Date()),
    phase: 1,           // current program phase (1 | 2 | 3)
    phaseSessions: { 1: 0, 2: 0, 3: 0 }, // completed sessions per phase
    checklist: {},      // { '1': { itemId: true }, '2': {...}, '3': {...} }
  };
}
function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return Object.assign(defaultStore(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: run memory-only */ }
  return defaultStore();
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
function remainingMs() {
  const s = store.session;
  if (!s) return SESSION_MS;
  if (s.state === 'paused') return Math.max(0, s.remainingMs || 0);
  return Math.max(0, s.deadline - Date.now()); // single stored deadline: one subtraction
}
function currentPhaseId() {
  return PHASES.some(p => p.id === store.phase) ? store.phase : 1;
}
function currentProgram() {
  return resolvePhase(currentPhaseId()).exercises;
}
function checkedCount() { return currentProgram().filter(e => store.checks[e.id]).length; }
function allChecked() { return currentProgram().every(e => store.checks[e.id]); }
function gymDows() {
  const days = [2, 4]; // Tue, Thu (JS: 0=Sun)
  if (store.thirdDay === 'fri-morning' || store.thirdDay === 'fri-night') days.push(5);
  else if (store.thirdDay === 'sat-morning') days.push(6);
  return days;
}

let messageTimer = null;
function showMessage(text) {
  const el = $('sessionMessage');
  el.textContent = text;
  el.classList.add('show');
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

/* ---------------- Session lifecycle ---------------- */
function startSession() {
  const s = store.session;
  if (s && s.state === 'paused') { resumeSession(); return; }
  if (s && s.state === 'running') return;
  const now = Date.now();
  store.session = {
    state: 'running',
    startedAt: now,
    deadline: now + SESSION_MS, // written ONCE; reopen only reads it
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
  s.remainingMs = Math.max(0, s.deadline - Date.now()); // snapshot once
  s.state = 'paused';
  save();
  renderAll();
}

function resumeSession() {
  const s = store.session;
  if (!s || s.state !== 'paused') return;
  s.deadline = Date.now() + Math.max(0, s.remainingMs || 0); // re-anchor once
  s.remainingMs = null;
  s.state = 'running';
  save();
  renderAll();
}

function endSession(message) {
  store.session = null;
  store.checks = {};
  save();
  renderAll();
  if (message) showMessage(message);
}

function expireSession() {
  endSession('Time expired. Session ended.');
}

function completeWorkout() {
  const day = store.session ? store.session.day : store.activeDay;
  const p = currentPhaseId();
  store.completions[day] = true;
  store.phaseSessions[p] = (store.phaseSessions[p] || 0) + 1; // count toward the phase's 9-session target
  store.session = null;
  store.checks = {};
  save();
  renderAll();
  showMessage('Workout complete: logged for ' + prettyDay(day) + '. Nice work.');
}

function toggleCheck(id) {
  if (store.checks[id]) delete store.checks[id];
  else store.checks[id] = true;
  save();
  if (allChecked()) completeWorkout();
  else renderAll();
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
function setPhase(n) {
  store.phase = n;
  store.session = null; // a new program starts fresh: old checks belong to a different exercise list
  store.checks = {};
  save();
  renderAll();
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
  const ready = checklistConfirmed(p).every(i => i.confirmed);
  if (!ready) { showMessage('Confirm all three checklist items first.'); return; }
  setPhase(p + 1);
  showMessage('Advanced to Phase ' + (p + 1) + '.');
}

/* ---------------- Rendering ---------------- */
const demoIdx = {}; // in-memory rotator position per exercise

function renderStatus() {
  const bar = $('statusBar'), s = store.session;
  bar.classList.toggle('active', !!(s && s.state === 'running'));
  bar.classList.toggle('complete', !!(s && s.state === 'paused'));
  const n = checkedCount(), total = currentProgram().length;
  $('statusCount').textContent = n + ' / ' + total;
  $('statusFill').style.width = (n / total * 100) + '%';
  $('statusDay').textContent = prettyDay(s ? s.day : store.activeDay);
  if (!s) $('statusText').textContent = 'Ready';
  else if (s.state === 'paused') $('statusText').textContent = 'Paused';
}

function renderTimer() {
  const s = store.session, t = $('timer');
  t.classList.remove('done');
  if (!s) t.textContent = fmtTime(SESSION_MS);
  else t.textContent = fmtTime(remainingMs());
  $('btnStart').hidden = !!s;
  $('btnPause').hidden = !(s && s.state === 'running');
  $('btnResume').hidden = !(s && s.state === 'paused');
  $('sessionDate').textContent = s
    ? 'Session: ' + prettyDay(s.day) + ' (' + (s.state === 'paused' ? 'paused' : 'in progress') + ')'
    : 'No active session: pick a gym day and press Start.';
}

function renderProgress() {
  const n = checkedCount(), total = currentProgram().length;
  $('progressCount').textContent = n + ' / ' + total;
  $('progressFill').style.width = (n / total * 100) + '%';
  $('progressNote').textContent = n === 0
    ? 'Check off exercises as you finish them.'
    : n === total ? 'All done!' : (total - n) + ' to go.';
}

function demoHtml(ex) {
  if (!ex.demos || !ex.demos.length) return '';
  const i = demoIdx[ex.id] || 0;
  const d = ex.demos[i];
  let nav = '';
  if (ex.demos.length > 1) {
    nav = '<div class="demo-nav">' +
      '<button class="demo-arrow" data-demo-prev="' + esc(ex.id) + '" aria-label="Previous demo">‹</button>' +
      '<span class="demo-pos">' + (i + 1) + ' of ' + ex.demos.length + '</span>' +
      '<button class="demo-arrow" data-demo-next="' + esc(ex.id) + '" aria-label="Next demo">›</button></div>';
  }
  const handle = d.handle ? ' ' + esc(d.handle) : '';
  return '<div class="demo" id="demo-' + esc(ex.id) + '">' +
    '<a class="demo-link" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
    '▶ Demo: ' + esc(d.creator) + handle +
    '<span class="demo-desc">' + esc(d.description) + '</span></a>' + nav + '</div>';
}

function renderSections() {
  const root = $('routine');
  const program = currentProgram();
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
        '<input type="checkbox" data-check="' + esc(e.id) + '"' + (store.checks[e.id] ? ' checked' : '') + '>' +
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
  for (let i = 1; i <= 5; i++) { // Tue–Sat: Monday (i=0) is rest, Sunday (i=6) is for church
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    const key = dayKey(d);
    const isGym = gyms.includes(d.getDay());
    const done = !!store.completions[key];
    const cls = 'day' + (isGym ? ' gym' : '') + (key === today ? ' today' : '') + (key === store.activeDay ? ' selected' : '');
    html += '<div class="' + cls + '"' + (isGym ? ' data-day="' + key + '" role="button" tabindex="0"' : '') + '>' +
      '<span class="dow">' + DOWS[i - 1] + '</span>' +
      '<span class="dnum">' + d.getDate() + '</span>' +
      '<span class="dmark">' + (done ? '✓ done' : '') + '</span></div>';
  }
  grid.innerHTML = html;
  const weekKeys = [];
  for (let i = 1; i <= 5; i++) { // Tue–Sat only
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    if (gyms.includes(d.getDay())) weekKeys.push(dayKey(d));
  }
  const doneCount = weekKeys.filter(k => store.completions[k]).length;
  $('calProgress').textContent = doneCount + ' / ' + weekKeys.length;
  $('thirdDay').value = store.thirdDay;
}

function renderFeatured() {
  $('featuredDemos').innerHTML = FEATURED_DEMOS.map(d =>
    '<a class="demo-card" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
    '<div class="demo-title">▶ ' + esc(d.creator) + (d.handle ? ' ' + esc(d.handle) : '') + '</div>' +
    '<div class="demo-desc2">' + esc(d.description) + '</div></a>'
  ).join('');
  $('blockNote').textContent =
    'The routine is split into a fixed foundation block (warm-up, stability, cool-down) and an ' +
    'accessory block (strength). Future upper-body, back, and arm exercises will slot into ' +
    'the accessory block as the program grows.';
}

/* ---------------- Phase UI ---------------- */
const PHASE_NAMES = { 1: 'Reactivate', 2: 'Reload', 3: 'Return' };

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
    const target = SESSIONS_PER_PHASE;
    const reached = done >= target;
    prog += '<div class="phase-row"><span>Phase ' + id + ': ' + PHASE_NAMES[id] + '</span>' +
      '<span class="' + (reached ? 'done' : '') + '">' + Math.min(done, target) + ' / ' + target + ' sessions</span></div>';
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
  renderSections();
  renderCalendar();
}

/* ---------------- Tick ---------------- */
function tick() {
  const s = store.session;
  if (!s || s.state !== 'running') return;
  const left = s.deadline - Date.now(); // the one and only subtraction
  if (left <= 0) { expireSession(); return; }
  $('timer').textContent = fmtTime(left);
  $('statusText').textContent = 'Running: ' + fmtTime(left) + ' left';
}

/* ---------------- Events (delegated) ---------------- */
document.addEventListener('click', ev => {
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
    $('routine').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const phaseBtn = ev.target.closest('[data-phase]');
  if (phaseBtn) {
    setPhase(Number(phaseBtn.getAttribute('data-phase')));
    showMessage('Phase selected. Your session starts fresh when you press Start.');
    return;
  }
  if (ev.target.id === 'advanceBtn') {
    advancePhase();
    return;
  }
});
document.addEventListener('change', ev => {
  const box = ev.target.closest('[data-check]');
  if (box) { toggleCheck(box.getAttribute('data-check')); return; }
  const item = ev.target.closest('[data-checklist-item]');
  if (item) { toggleChecklistItem(item.getAttribute('data-checklist-item'), item.checked); return; }
  if (ev.target.id === 'thirdDay') {
    store.thirdDay = ev.target.value;
    save(); renderCalendar();
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' || ev.key === ' ') {
    const day = ev.target.closest && ev.target.closest('[data-day]');
    if (day) { ev.preventDefault(); day.click(); }
  }
});

$('btnStart').addEventListener('click', startSession);
$('btnPause').addEventListener('click', pauseSession);
$('btnResume').addEventListener('click', resumeSession);
$('btnClear').addEventListener('click', requestClear);
$('btnClearYes').addEventListener('click', confirmClear);
$('btnClearNo').addEventListener('click', cancelClear);

/* ---------------- Init ---------------- */
(function init() {
  // If a session was running when the browser closed, reconcile once:
  // the stored deadline is the single source of truth.
  const s = store.session;
  if (s && s.state === 'running' && s.deadline - Date.now() <= 0) {
    expireSession();
  } else {
    renderFeatured();
    renderAll();
  }
  setInterval(tick, 250);
})();
