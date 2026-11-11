'use strict';
/* Adaptive Workout Coach: host page for the guided 35-minute session.
 *
 * Keeps the trained-days calendar in localStorage under awc-demo-v1,
 * separate from the engine's in-progress session (awc-guided-session-v1).
 * Builds today's plan from AdultProgram and hands it to SessionScreens.
 * Load order: session-engine.js, session-screens.js, program.js, app.js. */
(function (root) {
  const AP = root.AdultProgram || (typeof require === 'function' ? require('./program.js') : null);

  const LS_KEY = 'awc-demo-v1';
  const SESSION_KEY = 'awc-guided-session-v1';
  const STORE_VERSION = 4;
  const BACKUP_KEEP = 3;
  const NOTICE_CORRUPT = 'Saved data could not be read, so the calendar was reset to a fresh start.';
  const NOTICE_PARTIAL = 'Some saved days could not be read and were dropped. The rest of your calendar was kept.';
  const BACKUP_NOTICE = 'A backup of your previous save was stored in this browser.';
  const NOTICE_SAVE_FAILED = 'This browser could not save your progress. Your workout still runs, but trained days may not be kept.';
  const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---------- dates ---------- */
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
  function weekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /* ---------- store ---------- */
  function defaultStore() { return { version: STORE_VERSION, completions: {} }; }

  /* Loads any earlier save (phase era, workout-type era, or v4). Only the
   * trained days carry over. Phase, unlocked phase, phase sessions,
   * workout type, checklist, checks, symptoms, workout days, and the old
   * timer session are dropped quietly: they described screens that no
   * longer exist. Only malformed trained days trigger the partial notice. */
  function migrate(raw) {
    if (!isPlainObject(raw)) return { state: defaultStore(), changed: true, notice: NOTICE_CORRUPT };
    const out = {};
    let repaired = false;
    if (Object.prototype.hasOwnProperty.call(raw, 'completions')) {
      if (!isPlainObject(raw.completions)) repaired = true;
      else {
        Object.keys(raw.completions).forEach(key => {
          if (!raw.completions[key]) return;
          if (!isDayKey(key)) { repaired = true; return; }
          out[key] = true;
        });
      }
    }
    const state = { version: STORE_VERSION, completions: out };
    return { state: state, changed: JSON.stringify(state) !== JSON.stringify(raw), notice: repaired ? NOTICE_PARTIAL : null };
  }

  function loadStoreFromRaw(rawString) {
    if (rawString == null || rawString === '') return { state: defaultStore(), changed: false, notice: null };
    let parsed;
    try { parsed = JSON.parse(rawString); } catch (e) {
      return { state: defaultStore(), changed: true, notice: NOTICE_CORRUPT };
    }
    return migrate(parsed);
  }

  function backupKeys(storage) {
    const prefix = LS_KEY + '.bak-';
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (typeof key === 'string' && key.indexOf(prefix) === 0 && Number.isFinite(Number(key.slice(prefix.length)))) keys.push(key);
    }
    return keys.sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
  }
  function backupRaw(storage, rawString, now) {
    storage.setItem(LS_KEY + '.bak-' + now, rawString);
    backupKeys(storage).slice(BACKUP_KEEP).forEach(k => storage.removeItem(k));
  }

  /* A finished session logs the day. A session where every exercise was
   * skipped is not logged. */
  function logFinished(state, summary, today) {
    if (!summary || summary.completed < 1) return { logged: false };
    const day = dayKey(today);
    const already = !!state.completions[day];
    state.completions[day] = true;
    return { logged: true, already: already, day: day };
  }

  /* ---------- page ---------- */
  function boot(doc) {
    const win = doc.defaultView;
    /* Reading localStorage itself throws when the browser blocks storage;
     * every use below is guarded, so null just means nothing is kept. */
    let storage = null;
    try { storage = win.localStorage; } catch (e) { storage = null; }
    const $ = id => doc.getElementById(id);
    let raw = null;
    try { raw = storage.getItem(LS_KEY); } catch (e) { raw = null; }
    const loaded = loadStoreFromRaw(raw);
    const store = loaded.state;
    const notices = [];

    function showNotice(text) {
      if (notices.indexOf(text) === -1) notices.push(text);
      $('appNotice').textContent = notices.join(' ');
      $('appNotice').hidden = false;
    }
    function save() {
      try { storage.setItem(LS_KEY, JSON.stringify(store)); return true; } catch (e) {
        showNotice(NOTICE_SAVE_FAILED);
        return false;
      }
    }
    if (loaded.notice) {
      let backedUp = false;
      try { backupRaw(storage, raw, Date.now()); backedUp = true; } catch (e) { backedUp = false; }
      showNotice(loaded.notice + (backedUp ? ' ' + BACKUP_NOTICE : ''));
    }
    if (loaded.changed) save();

    function renderCalendar() {
      const grid = $('weekGrid');
      grid.textContent = '';
      const start = weekStart(new Date());
      const today = dayKey(new Date());
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dayKey(d);
        const done = !!store.completions[key];
        if (done) count++;
        const cell = doc.createElement('div');
        cell.className = 'day' + (key === today ? ' today' : '') + (done ? ' done' : '');
        cell.setAttribute('data-testid', 'calendar-day');
        [['dow', WEEKDAY_NAMES[i]], ['dnum', String(d.getDate())], ['dmark', done ? '\u2713 done' : '']].forEach(part => {
          const span = doc.createElement('span');
          span.className = part[0];
          span.textContent = part[1];
          cell.appendChild(span);
        });
        grid.appendChild(cell);
      }
      $('calProgress').textContent = count === 1 ? '1 day trained this week' : count + ' days trained this week';
    }

    const screens = root.SessionScreens.mount({
      root: $('session'),
      storage: storage,
      storageKey: SESSION_KEY,
      allowNewMix: true,
      getPlan: () => AP.buildSession({}),
      onStatus: group => { doc.body.setAttribute('data-session', group); },
      onFinish: summary => {
        if (logFinished(store, summary, new Date()).logged) save();
        renderCalendar();
      },
    });

    renderCalendar();
    return { store: store, screens: screens };
  }

  const AdultApp = {
    LS_KEY: LS_KEY,
    SESSION_KEY: SESSION_KEY,
    STORE_VERSION: STORE_VERSION,
    NOTICE_CORRUPT: NOTICE_CORRUPT,
    NOTICE_PARTIAL: NOTICE_PARTIAL,
    defaultStore: defaultStore,
    migrate: migrate,
    loadStoreFromRaw: loadStoreFromRaw,
    backupRaw: backupRaw,
    logFinished: logFinished,
    boot: boot,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = AdultApp;
  else {
    root.AdultApp = AdultApp;
    if (root.document) boot(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
