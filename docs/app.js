'use strict';
/* Adaptive Workout Coach — static GitHub Pages demo.
 *
 * Client-side reimplementation of the session engine. Everything is stored in
 * localStorage under a single key. The timer uses ONE stored deadline:
 *   remaining = deadline - Date.now()
 * The deadline is written once at start (or re-anchored once at resume) and
 * never recomputed on reopen, so closing and reopening the browser can never
 * double-subtract elapsed time.
 */

/* ---------------- Exercise data (mirrors data/exercises.js) ---------------- */
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
    demos: [
      { creator: 'Dr. Priya Chauhan, physio', handle: '@dr.chauhanpriya___mpt_ortho', description: 'Top 9 knee exercises, including labeled ankle pumps and heel slides.', url: 'https://www.instagram.com/reel/DdTa_2ipxGG/' },
      { creator: 'JAG Physical Therapy', handle: '@jagphysicaltherapy', description: 'Post-knee-replacement starters: seated heel slides, quad sets, and ankle pumps.', url: 'https://www.instagram.com/reel/Dbs_7ZBDeSv/' },
      { creator: 'CRP Care Rehab Performance', handle: '@carerehabperformance', description: 'Early ACL rehab with ankle pumps, heel slides, and towel-press quad activation.', url: 'https://www.instagram.com/reel/DY1ytN1zRyd/' },
    ] },
  { id: 'quad-sets', section: 'warmup',
    name: 'Quad sets',
    note: 'Tighten your thigh and press the knee into the floor or mat.',
    dose: '15 × 5-sec hold', muscle_groups: ['quads'],
    demos: [
      { creator: 'JAG Physical Therapy', handle: '@jagphysicaltherapy', description: 'Quad sets with 10-second holds for 10 reps.', url: 'https://www.instagram.com/reel/Dbs_7ZBDeSv/' },
      { creator: 'Dr. Priya Chauhan', handle: '@dr.chauhanpriya___mpt_ortho', description: 'Labeled quadriceps isometric demonstration.', url: 'https://www.instagram.com/reel/DdTa_2ipxGG/' },
      { creator: 'Bob and Brad', handle: '@officialbobandbrad', description: 'Seated knee extensions and heel slides routine.', url: 'https://www.instagram.com/reel/DbdouOfxuuc/' },
    ] },
  { id: 'goblet-squat', section: 'strength',
    name: 'Goblet squat / dumbbell squat-to-bench',
    note: 'Hold one dumbbell at your chest. Use the bench as a depth target and keep every rep pain-free.',
    dose: '3 × 8–10', muscle_groups: ['quads', 'glutes'], demos: [] },
  { id: 'bulgarian-split-squat', section: 'strength',
    name: 'Bulgarian split squat',
    note: 'Keep the front foot planted and use a comfortable range. Start light and add load only with good control.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'], demos: [] },
  { id: 'step-ups', section: 'strength',
    name: 'Step-ups with dumbbells',
    note: 'Drive through the working foot and lower slowly without dropping from the step.',
    dose: '3 × 8 each side', muscle_groups: ['quads', 'glutes'],
    demos: [
      { creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber', description: 'Controlled step-up form in an isometric and strength sequence.', url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    ] },
  { id: 'db-romanian-deadlift', section: 'strength',
    name: 'Dumbbell Romanian deadlift',
    note: 'Hinge at the hips with soft knees, a long spine, and the dumbbells close to your legs.',
    dose: '3 × 10', muscle_groups: ['hamstrings', 'glutes'], demos: [] },
  { id: 'single-leg-rdl', section: 'strength',
    name: 'Single-leg RDL',
    note: 'Keep the hips level and use a light dumbbell or support as needed for balance.',
    dose: '3 × 8 each side', muscle_groups: ['hamstrings', 'glutes'],
    demos: [
      { creator: 'DJ Kim', handle: '@djkim.yoga', description: 'Single-leg RDL in five essential knee exercises.', url: 'https://www.instagram.com/reel/DTb3fy5kUi2/' },
      { creator: 'Pauli Reitman', handle: '@paulinareitman', description: 'Gym-based single-leg RDLs: 8 per side for 3 sets.', url: 'https://www.instagram.com/reel/DdUoESqphzG/' },
      { creator: 'E3 Rehab', handle: '@e3rehab', description: 'Single-leg RDL and three-way RDL progressions.', url: 'https://www.instagram.com/reel/DZNUZX3SkJS/' },
    ] },
  { id: 'spanish-squat-hold', section: 'stability',
    name: 'Spanish squat hold with band',
    note: 'Anchor the band behind both knees and sit back into the hold. For more load, hold a dumbbell goblet-style.',
    dose: '3 × 30 sec', muscle_groups: ['quads'],
    demos: [
      { creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber', description: 'Spanish squat setup and hold alongside other knee-strength drills.', url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    ] },
  { id: 'split-squat-hold', section: 'stability',
    name: 'Split-squat hold',
    note: 'Hold a comfortable split-squat depth with the front foot fully planted and the torso tall.',
    dose: '~30 sec each side', muscle_groups: ['quads', 'glutes'],
    demos: [
      { creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber', description: 'Split-squat hold position in a knee-strength sequence.', url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    ] },
  { id: 'hamstring-stretch', section: 'cooldown',
    name: 'Hamstring stretch',
    note: 'Ease into the stretch; no bouncing.',
    dose: '30 sec each', muscle_groups: ['hamstrings'],
    demos: [
      { creator: 'Bob and Brad', handle: '@officialbobandbrad', description: 'Seated hamstring stretch for knee pain.', url: 'https://www.instagram.com/reel/DawDBQtgc70/' },
      { creator: 'WeShape', handle: '', description: 'Stretch series including a hamstring stretch.', url: 'https://www.instagram.com/reel/DXh11z9AicL/' },
    ] },
  { id: 'calf-stretch', section: 'cooldown',
    name: 'Calf stretch at wall',
    note: 'Keep the back heel grounded.',
    dose: '30 sec each', muscle_groups: ['calves'],
    demos: [
      { creator: 'Sommer Riermaier', handle: '', description: 'Wall calf stretch demo explaining how tight calves affect the ankles and knees.', url: 'https://www.instagram.com/reel/DdoYCndzQ0L/' },
      { creator: 'Dan Hoopes, MD, orthopedic surgeon', handle: '', description: 'Why most people do the wall calf stretch wrong, plus correct form.', url: 'https://www.instagram.com/reel/DbHm60QMxqG/' },
      { creator: 'Bob and Brad', handle: '@officialbobandbrad', description: 'Calf stretch demonstration.', url: 'https://www.instagram.com/reel/Da8K1oiBHiQ/' },
    ] },
  { id: 'backward-walk', section: 'cooldown',
    name: 'Backward walk',
    note: 'Use a clear, level path and move with control.',
    dose: '1 min', muscle_groups: ['quads', 'calves'],
    demos: [
      { creator: 'Matthew Maloney', handle: '@aclwonders', description: 'Backward treadmill walking in a knee-pain routine.', url: 'https://www.instagram.com/reel/DUlTcAoDmRm/' },
      { creator: 'Ben Patrick', handle: '@kneesovertoesguy', description: 'Backward treadmill walking for knee rebuilding.', url: 'https://www.instagram.com/reel/DYcmt2QOnV7/' },
    ] },
];

const FEATURED_DEMOS = [
  { creator: 'DJ Kim', handle: '@djkim.yoga', description: 'Single-leg RDL form within a concise knee-strength sequence.', url: 'https://www.instagram.com/reel/DTb3fy5kUi2/' },
  { creator: 'thekneehaber', handle: '@thekneehaber', description: 'Spanish squat, split squat, and step-up form in one concise reel.', url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
  { creator: 'Pauli Reitman', handle: '@paulinareitman', description: 'Glute and leg session showing single-leg RDLs at 8 reps × 3 sets each side.', url: 'https://www.instagram.com/reel/DdUoESqphzG/' },
];

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
  };
}
function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return Object.assign(defaultStore(), JSON.parse(raw));
  } catch (e) { /* storage unavailable — run memory-only */ }
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
  return Math.max(0, s.deadline - Date.now()); // single stored deadline — one subtraction
}
function checkedCount() { return EXERCISES.filter(e => store.checks[e.id]).length; }
function allChecked() { return EXERCISES.every(e => store.checks[e.id]); }
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
  showMessage('Session started — 30:00 on the clock.');
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
  endSession('Time expired — session ended.');
}

function completeWorkout() {
  const day = store.session ? store.session.day : store.activeDay;
  store.completions[day] = true;
  store.session = null;
  store.checks = {};
  save();
  renderAll();
  showMessage('Workout complete — logged for ' + prettyDay(day) + '. Nice work.');
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
  endSession('Session cleared — timer, checkboxes, and progress reset.');
}

/* ---------------- Rendering ---------------- */
const demoIdx = {}; // in-memory rotator position per exercise

function renderStatus() {
  const bar = $('statusBar'), s = store.session;
  bar.classList.toggle('active', !!(s && s.state === 'running'));
  bar.classList.toggle('complete', !!(s && s.state === 'paused'));
  const n = checkedCount();
  $('statusCount').textContent = n + ' / ' + EXERCISES.length;
  $('statusFill').style.width = (n / EXERCISES.length * 100) + '%';
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
    ? 'Session: ' + prettyDay(s.day) + ' — ' + (s.state === 'paused' ? 'paused' : 'in progress')
    : 'No active session — pick a gym day and press Start.';
}

function renderProgress() {
  const n = checkedCount();
  $('progressCount').textContent = n + ' / ' + EXERCISES.length;
  $('progressFill').style.width = (n / EXERCISES.length * 100) + '%';
  $('progressNote').textContent = n === 0
    ? 'Check off exercises as you finish them.'
    : n === EXERCISES.length ? 'All done!' : (EXERCISES.length - n) + ' to go.';
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
  root.innerHTML = SECTIONS.map((sec, i) => {
    const exs = EXERCISES.filter(e => e.section === sec.id);
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
      '<span class="section-title"><span class="step-no">' + String(i + 1).padStart(2, '0') + '</span>' +
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

function renderAll() {
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
  $('statusText').textContent = 'Running — ' + fmtTime(left) + ' left';
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
  }
});
document.addEventListener('change', ev => {
  const box = ev.target.closest('[data-check]');
  if (box) { toggleCheck(box.getAttribute('data-check')); return; }
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
