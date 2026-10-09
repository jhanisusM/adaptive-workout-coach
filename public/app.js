'use strict';
/* Adaptive Workout Coach — frontend.
 *
 * The server is the single source of truth for session state. The timer you
 * see is always the SERVER's remaining time: this page polls /api/state and
 * re-fetches whenever the tab becomes visible again, so closing and reopening
 * the app resumes the running session with the correct remaining time.
 * This page never computes or stores timer values of its own.
 */

const $ = (id) => document.getElementById(id);

const state = {
  data: null,        // /api/state payload
  calendar: null,    // /api/calendar payload
  sessionDate: null, // YYYY-MM-DD selected from the calendar (defaults to today)
  pollId: null,
};

async function api(path, method, body) {
  const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || ('request failed: ' + res.status));
  return json;
}

function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function localDateStr(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function prettyDate(yyyyMmDd) {
  return new Date(yyyyMmDd + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/* ---------------- rendering ---------------- */

function exerciseById(id) {
  return state.data.exercises.find((e) => e.id === id);
}

function totalExercises() {
  return state.data.exercises.length;
}

function checkedCount() {
  const s = state.data.session;
  return s ? Object.keys(s.checks || {}).length : 0;
}

function renderRoutine() {
  const root = $('routine');
  root.innerHTML = '';
  state.data.sections.forEach((sec, i) => {
    const exercises = state.data.exercises.filter((e) => e.section === sec.id);
    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.section = sec.id;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'section-head';
    head.setAttribute('aria-expanded', 'true');
    head.innerHTML =
      `<span class="section-title"><span class="step-no">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="section-heading">${sec.title}</span>` +
      `<span class="block-tag">${sec.block === 'foundation' ? 'foundation block' : 'accessory block'}</span></span>` +
      `<span class="duration">${sec.duration}</span>`;
    head.addEventListener('click', () => {
      const collapsed = section.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', String(!collapsed));
    });

    const list = document.createElement('ul');
    list.className = 'exercise-list';
    exercises.forEach((ex) => list.appendChild(renderExercise(ex)));

    section.appendChild(head);
    section.appendChild(list);
    root.appendChild(section);
  });
  updateSections();
}

function renderExercise(ex) {
  const li = document.createElement('li');
  li.className = 'exercise';

  const label = document.createElement('label');
  label.className = 'check-row';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.exercise = ex.id;
  input.checked = !!(state.data.session && state.data.session.checks[ex.id]);
  input.addEventListener('change', () => onCheck(ex.id, input.checked));

  const copy = document.createElement('span');
  copy.innerHTML =
    `<span class="exercise-name">${ex.name}</span>` +
    `<span class="exercise-note">${ex.note}</span>` +
    `<span class="muscle-tags">${ex.muscle_groups.map((m) => `<span class="muscle-tag">${m}</span>`).join('')}</span>`;

  if (ex.demos && ex.demos.length) copy.appendChild(renderDemoRotator(ex.demos));

  const dose = document.createElement('span');
  dose.className = 'dose';
  dose.textContent = ex.dose;

  label.appendChild(input);
  label.appendChild(copy);
  label.appendChild(dose);
  li.appendChild(label);
  return li;
}

function renderDemoRotator(demos) {
  const wrap = document.createElement('div');
  wrap.className = 'demo';
  let idx = 0;
  const link = document.createElement('a');
  link.className = 'demo-link';
  link.target = '_blank';
  link.rel = 'noopener';
  const pos = document.createElement('span');
  pos.className = 'demo-pos';
  const nav = document.createElement('div');
  nav.className = 'demo-nav';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'demo-arrow';
  prev.setAttribute('aria-label', 'Previous demo video');
  prev.textContent = '‹';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'demo-arrow';
  next.setAttribute('aria-label', 'Next demo video');
  next.textContent = '›';
  function update() {
    const d = demos[idx];
    link.href = d.url;
    link.innerHTML = `${d.creator}${d.handle ? ' (' + d.handle + ')' : ''} ↗<span class="demo-desc">${d.description}</span>`;
    pos.textContent = `${idx + 1} of ${demos.length}`;
  }
  prev.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); idx = (idx - 1 + demos.length) % demos.length; update(); });
  next.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); idx = (idx + 1) % demos.length; update(); });
  link.addEventListener('click', (e) => e.stopPropagation());
  nav.appendChild(prev); nav.appendChild(pos); nav.appendChild(next);
  wrap.appendChild(link);
  if (demos.length > 1) wrap.appendChild(nav);
  update();
  return wrap;
}

function renderFeaturedDemos() {
  const root = $('featuredDemos');
  root.innerHTML = '';
  state.data.featured_demos.forEach((d) => {
    const a = document.createElement('a');
    a.className = 'demo-card';
    a.href = d.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `<span class="demo-title">${d.creator} (${d.handle}) ↗</span><span class="demo-desc2">${d.description}</span>`;
    root.appendChild(a);
  });
  $('blockNote').textContent =
    'The routine is split into a fixed foundation block (warm-up, stability, cool-down) and an ' +
    'accessory block (strength). Future upper-body, back, and arm exercises will slot into ' +
    'the accessory block as the program grows.';
}

function renderStatus() {
  const s = state.data.session;
  const done = checkedCount();
  const total = totalExercises();
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;
  const expired = s && (s.expired || s.status === 'expired');

  const bar = $('statusBar');
  bar.classList.toggle('active', !!(s && !expired && !allDone && (s.status === 'running' || s.status === 'paused')));
  bar.classList.toggle('complete', !!(expired || allDone));

  $('statusText').textContent =
    allDone ? 'Workout complete'
    : expired ? 'Time complete'
    : s && s.status === 'running' ? 'Session active'
    : s && s.status === 'paused' ? 'Session paused'
    : 'Ready';

  $('statusProgress').textContent = `${done} of ${total} exercises`;
  $('statusTimer').textContent = s ? `${fmtClock(s.remaining_ms)}${expired ? ' elapsed' : ' remaining'}` : `${fmtClock(state.data.session_minutes * 60 * 1000)} remaining`;
  $('statusFill').style.width = pct + '%';

  const timer = $('timer');
  timer.textContent = s ? fmtClock(s.remaining_ms) : fmtClock(state.data.session_minutes * 60 * 1000);
  timer.classList.toggle('done', !!expired);

  const toggle = $('timerToggle');
  if (expired || allDone) toggle.textContent = 'Done';
  else if (s && s.status === 'running') toggle.textContent = 'Pause';
  else if (s && s.status === 'paused') toggle.textContent = 'Resume';
  else toggle.textContent = 'Start';

  $('progressCount').textContent = `${done} / ${total}`;
  $('progressFill').style.width = pct + '%';
  $('progressNote').textContent =
    allDone ? 'Session complete. Nice, controlled work.'
    : done === 0 ? 'Start with the warm-up and move at your own pace.'
    : `${pct}% complete — keep every rep smooth and pain-free.`;

  const d = state.sessionDate || localDateStr(Date.now());
  $('sessionDate').textContent = `Session for ${prettyDate(d)}`;
}

function updateSections() {
  document.querySelectorAll('.section').forEach((section) => {
    const boxes = Array.from(section.querySelectorAll('input[type="checkbox"]'));
    const complete = boxes.length > 0 && boxes.every((b) => b.checked);
    section.classList.toggle('complete', complete);
  });
}

function showMessage(text) {
  const el = $('sessionMessage');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4500);
}

/* ---------------- actions ---------------- */

async function refreshSession() {
  const data = await api('/api/state');
  const prevChecks = state.data.session ? state.data.session.checks : {};
  state.data.session = data.session;
  // Reconcile checkboxes without rebuilding the DOM.
  document.querySelectorAll('input[type="checkbox"][data-exercise]').forEach((box) => {
    const id = box.dataset.exercise;
    box.checked = !!(data.session && data.session.checks[id]);
  });
  renderStatus();
  updateSections();
  if (data.session && data.session.expired && prevChecks) {
    showMessage('Time is up — session ended. Start a new one whenever you are ready.');
  }
}

function startPolling() {
  stopPolling();
  state.pollId = setInterval(() => {
    const s = state.data.session;
    if (s && s.status === 'running' && !s.expired) refreshSession().catch(() => {});
  }, 1000);
}
function stopPolling() {
  if (state.pollId) clearInterval(state.pollId);
  state.pollId = null;
}

async function onToggle() {
  const s = state.data.session;
  try {
    if (!s) await api('/api/session/start', 'POST', {});
    else if (s.status === 'running') await api('/api/session/pause', 'POST', {});
    else if (s.status === 'paused') await api('/api/session/resume', 'POST', {});
    await refreshSession();
  } catch (e) { showMessage(e.message); }
}

async function onCheck(exerciseId, checked) {
  try {
    const res = await api('/api/session/check', 'POST', { exercise_id: exerciseId, checked });
    if (res.completed) {
      state.data.session = null;
      document.querySelectorAll('input[type="checkbox"][data-exercise]').forEach((b) => { b.checked = false; });
      showMessage('Workout complete — logged to your calendar. Nice, controlled work.');
      await loadCalendar();
    } else {
      state.data.session = res.session;
      const box = document.querySelector(`input[data-exercise="${exerciseId}"]`);
      if (box) box.checked = !!(res.session && res.session.checks[exerciseId]);
    }
    renderStatus();
    updateSections();
  } catch (e) { showMessage(e.message); }
}

async function onClearConfirm() {
  const s = state.data.session;
  if (!s) return;
  try {
    await api('/api/session/clear', 'POST', { session_id: s.id, confirm: true });
    state.data.session = null;
    document.querySelectorAll('input[type="checkbox"][data-exercise]').forEach((b) => { b.checked = false; });
    document.querySelectorAll('.section').forEach((sec) => {
      sec.classList.remove('collapsed', 'complete');
      sec.querySelector('.section-head').setAttribute('aria-expanded', 'true');
    });
    $('clearConfirm').classList.remove('show');
    renderStatus();
    showMessage('Session cleared. You are ready to start again.');
  } catch (e) { showMessage(e.message); }
}

/* ---------------- calendar ---------------- */

function renderCalendar() {
  const cal = state.calendar;
  if (!cal) return;
  const grid = $('weekGrid');
  grid.innerHTML = '';
  const dows = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Tue–Sat only: Sundays are for church, Mondays are rest
  cal.days.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'day' + (d.gym ? ' gym' : '') + (d.date === localDateStr(Date.now()) ? ' today' : '');
    const dt = new Date(d.date + 'T12:00:00');
    el.innerHTML =
      `<span class="dow">${dows[i]}</span>` +
      `<span class="dnum">${dt.getDate()}</span>` +
      `<span class="dmark">${d.completed ? '✓ done' : d.gym ? (d.third_day_label || 'gym day') : ''}</span>`;
    if (d.gym) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      const open = () => {
        state.sessionDate = d.date;
        switchTab('session');
        renderStatus();
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    grid.appendChild(el);
  });
  $('calSummary').textContent = `Tue & Thu are fixed gym days${cal.third_day !== 'none' ? `, plus ${cal.third_day.replace('-', ' ')}` : ', third day not decided yet'}.`;
  $('calProgress').textContent = `${cal.weekly_completed}/${cal.weekly_goal}`;
  $('thirdDaySelect').value = cal.third_day;
}

async function loadCalendar() {
  state.calendar = await api('/api/calendar');
  renderCalendar();
}

function switchTab(which) {
  const session = which === 'session';
  $('tabSession').classList.toggle('active', session);
  $('tabCalendar').classList.toggle('active', !session);
  $('viewSession').hidden = !session;
  $('viewCalendar').hidden = session;
}

/* ---------------- init ---------------- */

async function init() {
  const data = await api('/api/state');
  state.data = data;
  state.sessionDate = localDateStr(Date.now());
  renderRoutine();
  renderFeaturedDemos();
  renderStatus();
  await loadCalendar();
  startPolling();

  $('timerToggle').addEventListener('click', onToggle);
  $('clearSession').addEventListener('click', () => {
    if (!state.data.session) { showMessage('No active session to clear.'); return; }
    $('clearConfirm').classList.add('show');
    $('confirmClear').focus();
  });
  $('keepSession').addEventListener('click', () => {
    $('clearConfirm').classList.remove('show');
    $('clearSession').focus();
  });
  $('confirmClear').addEventListener('click', onClearConfirm);
  $('tabSession').addEventListener('click', () => switchTab('session'));
  $('tabCalendar').addEventListener('click', () => { switchTab('calendar'); loadCalendar().catch(() => {}); });
  $('thirdDaySelect').addEventListener('change', async (e) => {
    try {
      await api('/api/settings', 'PUT', { third_day: e.target.value });
      await loadCalendar();
      showMessage('Third gym day updated.');
    } catch (err) { showMessage(err.message); }
  });

  // Re-sync with the server whenever the app becomes visible again — this is
  // what makes a session survive closing and reopening.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshSession().catch(() => {});
  });
  window.addEventListener('pageshow', () => refreshSession().catch(() => {}));
  window.addEventListener('online', () => refreshSession().catch(() => {}));
}

init().catch((e) => {
  document.body.insertAdjacentHTML('afterbegin',
    `<div style="padding:16px;background:#fbe7e3;color:#7a2d24">Could not reach the server: ${e.message}</div>`);
});
