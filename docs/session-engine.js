'use strict';
/* Guided session engine: shared by Kids Workout Coach and Adaptive Workout
 * Coach. The two repos carry byte-identical copies of this file. Each repo's
 * shared-files test fails if its copy drifts from shared-files.sha256, so
 * change both copies together and re-record the hash (see FEATURES.md).
 *
 * This file is a pure state machine. It never touches the DOM. The host
 * builds a plan (slots already in performance order) and the engine runs it:
 * exercise, automatic rest, next exercise, finish.
 *
 * Countdowns use one stored deadline: remaining = deadline - now. Pausing
 * stores the remainder; resuming writes a fresh deadline from it, so a
 * reload never subtracts time twice. The clock is injectable for tests.
 *
 * Loaded as a classic script (window.SessionEngine) and as a CommonJS module
 * in node tests. No dependencies, no build step. */
(function (root) {
  const STATE_VERSION = 1;
  const PHASES = ['warmup', 'main', 'cooldown'];
  const DEFAULT_MAIN_REST_SEC = 20;
  /* Saved statuses. idle and finished are never written to storage. */
  const RUNNING = ['exercise', 'rest'];
  const ACTIVE = ['exercise', 'rest', 'paused', 'confirmEnd'];

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function isFiniteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }
  function nonNegInt(n) { return isFiniteNumber(n) && n >= 0 ? Math.round(n) : null; }
  function posInt(n) { return isFiniteNumber(n) && n > 0 ? Math.round(n) : null; }
  function text(value, fallback) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
  }
  function stringList(value) {
    return Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim() !== '').map(v => v.trim()) : [];
  }

  /* ---------- YouTube URLs (never invented, only re-shaped) ---------- */
  const YT_HOSTS = ['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com'];
  function youtubeId(url) {
    let parsed;
    try { parsed = new URL(String(url || '').trim()); } catch (e) { return ''; }
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (YT_HOSTS.indexOf(host) === -1) return '';
    let id = '';
    if (host === 'youtu.be') id = parsed.pathname.replace(/^\//, '').split('/')[0];
    else if (/^\/(embed|shorts)\//.test(parsed.pathname)) id = parsed.pathname.split('/')[2] || '';
    else id = parsed.searchParams.get('v') || '';
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  }
  /* An https YouTube URL becomes its canonical watch URL. Anything else,
   * including a TODO placeholder, becomes '' (no player, no link). */
  function safeDemoUrl(url) {
    const id = youtubeId(url);
    return id ? 'https://www.youtube.com/watch?v=' + id : '';
  }
  /* Privacy-enhanced embed. rel=0 keeps end suggestions to the same channel.
   * No autoplay parameter: a demo never starts by itself. */
  function embedUrl(url) {
    const id = youtubeId(url);
    return id ? 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0' : '';
  }

  /* ---------- Plan normalization ---------- */
  const DONE_WHEN_FINISHED = { kind: 'reps', reps: null, label: 'Done when finished', perSide: false };

  function normalizeDose(raw) {
    if (!isPlainObject(raw)) return Object.assign({}, DONE_WHEN_FINISHED);
    const perSide = raw.perSide === true;
    if (raw.kind === 'time') {
      const seconds = posInt(raw.seconds);
      if (seconds == null) return Object.assign({}, DONE_WHEN_FINISHED);
      return { kind: 'time', seconds: seconds, label: text(raw.label, seconds + ' sec'), perSide: perSide };
    }
    if (raw.kind === 'reps') {
      const reps = posInt(raw.reps);
      if (reps == null) return Object.assign({}, DONE_WHEN_FINISHED);
      return { kind: 'reps', reps: reps, label: text(raw.label, reps + ' reps'), perSide: perSide };
    }
    return Object.assign({}, DONE_WHEN_FINISHED);
  }

  function normalizeSlot(raw, i, seen) {
    const src = isPlainObject(raw) ? raw : {};
    let id = text(src.id, 'slot-' + (i + 1));
    while (seen.has(id)) id = id + '-' + (i + 1);
    seen.add(id);
    return {
      id: id,
      name: text(src.name, 'Exercise'),
      phase: PHASES.indexOf(src.phase) !== -1 ? src.phase : 'main',
      dose: normalizeDose(src.dose),
      restSec: nonNegInt(src.restSec),
      restLabel: text(src.restLabel, ''),
      workSec: posInt(src.workSec),
      setupSec: nonNegInt(src.setupSec),
      demoUrl: safeDemoUrl(src.demoUrl),
      focus: text(src.focus, ''),
      equipment: stringList(src.equipment),
      note: text(src.note, ''),
      caution: text(src.caution, ''),
    };
  }

  /* Returns a clean copy of the plan, or null when it has no slots. */
  function normalizePlan(raw) {
    if (!isPlainObject(raw) || !Array.isArray(raw.slots) || raw.slots.length === 0) return null;
    const seen = new Set();
    const target = posInt(raw.targetMinutes);
    return {
      id: text(raw.id, 'plan'),
      title: text(raw.title, 'Workout'),
      targetMinutes: target,
      transitionSec: nonNegInt(raw.transitionSec) || 0,
      notes: stringList(raw.notes),
      slots: raw.slots.map((s, i) => normalizeSlot(s, i, seen)),
    };
  }

  /* Rest after slot i. Explicit restSec (including 0) wins. Omitted rest is
   * 0 after warm-up or cool-down and 20 s after main. Never after the last. */
  function restAfter(slots, index) {
    if (!Array.isArray(slots) || index < 0 || index >= slots.length - 1) return 0;
    const slot = slots[index];
    if (slot.restSec != null) return slot.restSec;
    return slot.phase === 'main' ? DEFAULT_MAIN_REST_SEC : 0;
  }

  function workSeconds(slot) {
    if (slot.dose.kind === 'time') return slot.dose.seconds;
    return slot.workSec || 0;
  }

  /* Planned length: work (timed seconds, or workSec for reps), rest, and
   * setup time per slot (the slot's setupSec, else the plan's
   * transitionSec). */
  function estimateSeconds(rawPlan) {
    const plan = normalizePlan(rawPlan);
    if (!plan) return 0;
    let total = 0;
    plan.slots.forEach((slot, i) => {
      const setup = slot.setupSec != null ? slot.setupSec : plan.transitionSec;
      total += workSeconds(slot) + setup + restAfter(plan.slots, i);
    });
    return total;
  }

  function phaseCounts(slots) {
    const out = { warmup: 0, main: 0, cooldown: 0 };
    slots.forEach(s => { out[s.phase] += 1; });
    return out;
  }

  /* ---------- State ---------- */
  function idleState(plan) {
    return {
      version: STATE_VERSION,
      planId: plan.id,
      title: plan.title,
      targetMinutes: plan.targetMinutes,
      transitionSec: plan.transitionSec,
      notes: plan.notes.slice(),
      slots: plan.slots,
      status: 'idle',
      index: 0,
      completedIds: [],
      skippedIds: [],
      elapsedMs: 0,
      elapsedAnchor: null,
      pauseFrom: null,
      endFrom: null,
      remainingMs: null,
      deadline: null,
      startedAt: null,
      finishedAt: null,
    };
  }

  function clone(state) { return JSON.parse(JSON.stringify(state)); }

  /* Validates a saved snapshot. Anything that does not describe an
   * in-progress session returns null. */
  function sanitizeState(raw) {
    if (!isPlainObject(raw) || raw.version !== STATE_VERSION) return null;
    if (ACTIVE.indexOf(raw.status) === -1) return null;
    const plan = normalizePlan({
      id: raw.planId, title: raw.title, targetMinutes: raw.targetMinutes,
      transitionSec: raw.transitionSec, notes: raw.notes, slots: raw.slots,
    });
    if (!plan) return null;
    const ids = plan.slots.map(s => s.id);
    if (!Array.isArray(raw.slots) || raw.slots.some((s, i) => !isPlainObject(s) || s.id !== ids[i])) return null;
    const index = raw.index;
    if (!Number.isInteger(index) || index < 0 || index >= plan.slots.length) return null;
    const listOk = list => Array.isArray(list) && list.every(id => ids.indexOf(id) !== -1);
    if (!listOk(raw.completedIds) || !listOk(raw.skippedIds)) return null;
    if (!isFiniteNumber(raw.elapsedMs) || raw.elapsedMs < 0) return null;
    const state = idleState(plan);
    state.status = raw.status;
    state.index = index;
    state.completedIds = raw.completedIds.slice();
    state.skippedIds = raw.skippedIds.slice();
    state.elapsedMs = raw.elapsedMs;
    state.startedAt = isFiniteNumber(raw.startedAt) ? raw.startedAt : null;
    const slot = plan.slots[index];
    const timedHere = mode => mode === 'rest' || slot.dose.kind === 'time';
    if (raw.status === 'exercise' || raw.status === 'rest') {
      if (!isFiniteNumber(raw.elapsedAnchor)) return null;
      state.elapsedAnchor = raw.elapsedAnchor;
      if (timedHere(raw.status)) {
        if (!isFiniteNumber(raw.deadline)) return null;
        state.deadline = raw.deadline;
      }
      if (raw.status === 'rest' && index >= plan.slots.length - 1) return null;
      return state;
    }
    /* paused or confirmEnd: the clock is frozen. */
    const from = raw.status === 'paused' ? raw.pauseFrom : raw.endFrom;
    const fromOk = raw.status === 'paused' ? RUNNING : RUNNING.concat(['paused']);
    if (fromOk.indexOf(from) === -1) return null;
    const mode = from === 'paused' ? raw.pauseFrom : from;
    if (RUNNING.indexOf(mode) === -1) return null;
    if (mode === 'rest' && index >= plan.slots.length - 1) return null;
    state.pauseFrom = mode;
    state.endFrom = raw.status === 'confirmEnd' ? from : null;
    if (timedHere(mode)) {
      if (!isFiniteNumber(raw.remainingMs) || raw.remainingMs < 0) return null;
      state.remainingMs = raw.remainingMs;
    }
    return state;
  }

  /* ---------- Storage ---------- */
  function save(storage, key, state) {
    try {
      storage.setItem(key, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }
  function clear(storage, key) {
    try { storage.removeItem(key); return true; } catch (e) { return false; }
  }
  /* Returns a sanitized in-progress snapshot, or null. A snapshot that does
   * not validate is removed so it cannot block the start screen. */
  function load(storage, key) {
    let raw = null;
    try { raw = storage.getItem(key); } catch (e) { return null; }
    if (raw == null || raw === '') return null;
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    const state = sanitizeState(parsed);
    if (!state) clear(storage, key);
    return state;
  }

  /* ---------- Engine ---------- */
  function makeEngine(initial, options) {
    const opts = options || {};
    const clock = typeof opts.clock === 'function' ? opts.clock : Date.now;
    const storage = opts.storage || null;
    const key = typeof opts.key === 'string' ? opts.key : '';
    const onSaveError = typeof opts.onSaveError === 'function' ? opts.onSaveError : null;
    let state = initial;

    function persist() {
      if (!storage || !key) return;
      if (ACTIVE.indexOf(state.status) === -1) { clear(storage, key); return; }
      if (!save(storage, key, state) && onSaveError) onSaveError();
    }
    function slotAt(i) { return state.slots[i] || null; }
    function isTimed(mode) { return mode === 'rest' || slotAt(state.index).dose.kind === 'time'; }

    function freezeClock(now) {
      if (state.elapsedAnchor != null) state.elapsedMs += Math.max(0, now - state.elapsedAnchor);
      state.elapsedAnchor = null;
      state.remainingMs = state.deadline != null ? Math.max(0, state.deadline - now) : null;
      state.deadline = null;
    }
    function runClock(mode, now) {
      state.status = mode;
      state.elapsedAnchor = now;
      state.deadline = isTimed(mode) && state.remainingMs != null ? now + state.remainingMs : null;
      state.remainingMs = null;
      state.pauseFrom = null;
      state.endFrom = null;
    }
    function enterExercise(i, now) {
      state.index = i;
      state.status = 'exercise';
      const slot = slotAt(i);
      state.deadline = slot.dose.kind === 'time' ? now + slot.dose.seconds * 1000 : null;
      state.remainingMs = null;
    }
    function finish(now) {
      freezeClock(now);
      state.remainingMs = null;
      state.status = 'finished';
      state.finishedAt = now;
    }
    /* Close the current slot as done or skipped and move on. A skipped slot
     * gets no rest. The last slot opens the finish screen. */
    function closeSlot(kind, now) {
      const slot = slotAt(state.index);
      (kind === 'done' ? state.completedIds : state.skippedIds).push(slot.id);
      if (state.index >= state.slots.length - 1) { finish(now); return; }
      const rest = kind === 'done' ? restAfter(state.slots, state.index) : 0;
      if (rest > 0) {
        state.status = 'rest';
        state.deadline = now + rest * 1000;
        state.remainingMs = null;
        return;
      }
      enterExercise(state.index + 1, now);
    }
    function act(allowed, fn) {
      if (allowed.indexOf(state.status) === -1) return false;
      fn(clock());
      persist();
      return true;
    }

    const engine = {
      getState: () => clone(state),
      slot: i => (slotAt(i) ? clone(slotAt(i)) : null),
      current: () => clone(slotAt(state.index)),
      next: () => (slotAt(state.index + 1) ? clone(slotAt(state.index + 1)) : null),
      /* What the screen shows: the paused or confirm overlay keeps its mode. */
      mode: () => {
        if (state.status === 'paused' || state.status === 'confirmEnd') return state.pauseFrom;
        return state.status;
      },
      remainingMs: now => {
        const t = now == null ? clock() : now;
        if (state.deadline != null) return Math.max(0, state.deadline - t);
        return state.remainingMs;
      },
      elapsedMs: now => {
        const t = now == null ? clock() : now;
        return state.elapsedMs + (state.elapsedAnchor != null ? Math.max(0, t - state.elapsedAnchor) : 0);
      },
      restSecAfter: i => restAfter(state.slots, i),
      start: () => act(['idle'], now => {
        state.startedAt = now;
        state.elapsedAnchor = now;
        enterExercise(0, now);
      }),
      done: () => act(['exercise'], now => closeSlot('done', now)),
      skip: () => act(['exercise'], now => closeSlot('skip', now)),
      skipRest: () => act(['rest'], now => enterExercise(state.index + 1, now)),
      pause: () => act(RUNNING, now => {
        const from = state.status;
        freezeClock(now);
        state.status = 'paused';
        state.pauseFrom = from;
      }),
      resume: () => act(['paused'], now => runClock(state.pauseFrom, now)),
      requestEnd: () => act(ACTIVE.filter(s => s !== 'confirmEnd'), now => {
        const from = state.status;
        if (from !== 'paused') { freezeClock(now); state.pauseFrom = from; }
        state.endFrom = from;
        state.status = 'confirmEnd';
      }),
      cancelEnd: () => act(['confirmEnd'], now => {
        if (state.endFrom === 'paused') { state.status = 'paused'; state.endFrom = null; return; }
        runClock(state.pauseFrom, now);
      }),
      /* Ends without a finish summary. The engine returns to the start
       * screen for the same plan, and storage is cleared. */
      confirmEnd: () => act(['confirmEnd'], () => {
        state = idleState(normalizePlan({
          id: state.planId, title: state.title, targetMinutes: state.targetMinutes,
          transitionSec: state.transitionSec, notes: state.notes, slots: state.slots,
        }));
      }),
      /* A timed exercise at zero acts like Done. A rest at zero opens the
       * next exercise. One transition per tick. */
      tick: now => {
        const t = now == null ? clock() : now;
        if (RUNNING.indexOf(state.status) === -1 || state.deadline == null || t < state.deadline) return false;
        if (state.status === 'exercise') closeSlot('done', t);
        else enterExercise(state.index + 1, t);
        persist();
        return true;
      },
      summary: () => ({
        total: state.slots.length,
        completed: state.completedIds.length,
        skipped: state.skippedIds.length,
        elapsedMs: engine.elapsedMs(state.finishedAt != null ? state.finishedAt : undefined),
      }),
    };
    return engine;
  }

  function create(rawPlan, options) {
    const plan = normalizePlan(rawPlan);
    if (!plan) throw new TypeError('SessionEngine.create needs a plan with at least one slot');
    return makeEngine(idleState(plan), options);
  }
  function fromState(savedState, options) {
    const state = sanitizeState(savedState);
    if (!state) return null;
    return makeEngine(state, options);
  }

  const SessionEngine = {
    STATE_VERSION: STATE_VERSION,
    PHASES: PHASES.slice(),
    DEFAULT_MAIN_REST_SEC: DEFAULT_MAIN_REST_SEC,
    normalizePlan: normalizePlan,
    estimateSeconds: estimateSeconds,
    restAfter: restAfter,
    phaseCounts: phaseCounts,
    safeDemoUrl: safeDemoUrl,
    embedUrl: embedUrl,
    youtubeId: youtubeId,
    create: create,
    fromState: fromState,
    load: load,
    save: save,
    clear: clear,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SessionEngine;
  else root.SessionEngine = SessionEngine;
})(typeof window !== 'undefined' ? window : globalThis);
