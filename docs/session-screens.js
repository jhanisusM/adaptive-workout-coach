'use strict';
/* Guided session screens: shared by Kids Workout Coach and Adaptive Workout
 * Coach. Byte-identical in both repos and hash-checked with
 * session-engine.js (see shared-files.sha256 and FEATURES.md).
 *
 * Draws the start, exercise, rest, and finish screens for a SessionEngine,
 * runs the 250 ms tick, holds a Screen Wake Lock while a session runs, and
 * announces changes through one polite live region. Text is set with
 * textContent only. At most one YouTube iframe exists: the current move's
 * demo, or the up-next demo during rest. Load after session-engine.js. */
(function (root) {
  const PHASE_LABELS = { warmup: 'Warm-up', main: 'Main', cooldown: 'Cool-down' };
  const SAVE_ERROR = 'This browser could not save the session. It keeps running, but a reload will start over.';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'hidden') node.hidden = !!attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(c => { if (c) node.appendChild(c); });
    return node;
  }
  function button(testid, label, cls) {
    return el('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), 'data-testid': testid, text: label });
  }
  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil((ms || 0) / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtDuration(ms) {
    const s = Math.max(0, Math.round((ms || 0) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + ' sec';
    return m + ' min' + (r ? ' ' + r + ' sec' : '');
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function phaseText(slot) {
    const base = PHASE_LABELS[slot.phase] || 'Main';
    return slot.focus && slot.phase === 'main' ? base + ' \u00b7 ' + slot.focus : base;
  }

  function mount(options) {
    const opts = options || {};
    const SE = opts.engine || root.SessionEngine;
    const rootEl = opts.root;
    const storage = opts.storage;
    const key = opts.storageKey;
    const clock = typeof opts.clock === 'function' ? opts.clock : Date.now;
    const getPlan = opts.getPlan;
    const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};
    const onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : function () {};
    const win = rootEl.ownerDocument.defaultView || root;

    let engine = null;
    let screenKey = '';
    let lastStatus = '';
    let announcedFive = false;
    let announcedSwitch = false;
    let demoUrl = null;
    let wakeLock = null;
    let timer = null;
    let saveFailed = false;

    /* ---------- skeleton ---------- */
    const live = el('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-testid': 'session-live' });
    const notice = el('p', { class: 'session-notice', role: 'status', 'data-testid': 'storage-notice', hidden: true });

    const startTitle = el('h2', { class: 'session-title', tabindex: '-1', 'data-testid': 'session-title' });
    const startEstimate = el('p', { class: 'session-estimate', 'data-testid': 'time-estimate' });
    const startCount = el('p', { class: 'session-count', 'data-testid': 'exercise-count' });
    const startPhases = el('ul', { class: 'phase-breakdown', 'data-testid': 'phase-breakdown' });
    const btnStart = button('btn-start', 'Start', 'primary');
    const btnMix = button('btn-new-mix', 'New mix', 'secondary');
    btnMix.hidden = !opts.allowNewMix;
    const planList = el('div', { class: 'plan-list', 'data-testid': 'plan-list' });
    const planDetails = el('details', { class: 'plan-details' }, [el('summary', { text: 'See the moves' }), planList]);
    const safety = el('ul', { class: 'safety-notes', 'data-testid': 'safety-notes' });
    const startScreen = el('div', { class: 'screen screen-start', 'data-screen': 'start' }, [
      startTitle, startEstimate, startCount, startPhases,
      el('div', { class: 'primary-row' }, [btnStart, btnMix]),
      planDetails, safety,
    ]);

    const phaseLabel = el('span', { class: 'phase-label', 'data-testid': 'phase-label' });
    const position = el('span', { class: 'exercise-position', 'data-testid': 'exercise-position' });
    const pausedBadge = el('span', { class: 'paused-badge', 'data-testid': 'paused-badge', text: 'Paused', hidden: true });
    const elapsed = el('span', { class: 'session-elapsed', 'data-testid': 'session-elapsed' });
    const barFill = el('div', { class: 'session-bar-fill' });
    const bar = el('div', { class: 'session-bar', role: 'progressbar', 'aria-label': 'Workout progress', 'aria-valuemin': '0', 'data-testid': 'progress-bar' }, [barFill]);
    const restTitle = el('h2', { class: 'run-title', tabindex: '-1', 'data-testid': 'rest-title', hidden: true });
    const exName = el('h2', { class: 'run-title', tabindex: '-1', 'data-testid': 'exercise-name' });
    const exDose = el('p', { class: 'exercise-dose', 'data-testid': 'exercise-dose' });
    const upNext = el('p', { class: 'up-next', 'data-testid': 'up-next', hidden: true });
    const countdown = el('div', { class: 'countdown', role: 'timer', 'data-testid': 'countdown', hidden: true });
    const btnDone = button('btn-done', 'Done', 'primary');
    const btnSkipRest = button('btn-skip-rest', 'Skip rest', 'primary');
    const btnResume = button('btn-resume', 'Resume', 'primary');
    const btnPause = button('btn-pause', 'Pause', 'secondary');
    const btnSkip = button('btn-skip', 'Skip exercise', 'secondary');
    const btnEnd = button('btn-end', 'End', 'danger');
    const btnEndYes = button('btn-end-yes', 'Yes, end it', 'danger');
    const btnEndNo = button('btn-end-no', 'Keep going', 'secondary');
    const endConfirm = el('div', { class: 'end-confirm', role: 'alertdialog', 'aria-label': 'End this workout?', 'data-testid': 'end-confirm', hidden: true }, [
      el('p', { text: 'End this workout? Nothing is logged.' }),
      el('div', { class: 'end-actions' }, [btnEndYes, btnEndNo]),
    ]);
    const controls = el('div', { class: 'run-controls' }, [btnPause, btnSkip, btnEnd]);
    const exNote = el('p', { class: 'exercise-note', 'data-testid': 'exercise-note', hidden: true });
    const exCaution = el('p', { class: 'exercise-caution', 'data-testid': 'exercise-caution', hidden: true });
    const exEquip = el('p', { class: 'exercise-equipment', 'data-testid': 'exercise-equipment', hidden: true });
    const demo = el('div', { class: 'demo', 'data-testid': 'demo', hidden: true });
    const runScreen = el('div', { class: 'screen screen-run', 'data-screen': 'run', hidden: true }, [
      el('div', { class: 'run-top' }, [phaseLabel, position, pausedBadge, elapsed]),
      bar, restTitle, exName, exDose, upNext, countdown,
      el('div', { class: 'primary-row' }, [btnDone, btnSkipRest, btnResume]),
      controls, endConfirm, exNote, exCaution, exEquip, demo,
    ]);

    const finishTitle = el('h2', { class: 'session-title', tabindex: '-1', 'data-testid': 'finish-title', text: 'Workout complete' });
    const finishSummary = el('ul', { class: 'finish-summary', 'data-testid': 'finish-summary' });
    const btnFinishDone = button('btn-finish-done', 'Done', 'primary');
    const finishScreen = el('div', { class: 'screen screen-finish', 'data-screen': 'finish', hidden: true }, [
      finishTitle, finishSummary, el('div', { class: 'primary-row' }, [btnFinishDone]),
    ]);

    const screen = el('section', { class: 'session', 'aria-label': 'Guided workout', 'data-testid': 'session-screen' }, [
      notice, startScreen, runScreen, finishScreen, live,
    ]);
    rootEl.textContent = '';
    rootEl.appendChild(screen);

    /* ---------- helpers ---------- */
    function announce(message) {
      live.textContent = '';
      /* A fresh text node after clearing makes screen readers re-read. */
      win.setTimeout(() => { live.textContent = message; }, 30);
    }
    function showSaveError() {
      saveFailed = true;
      notice.textContent = SAVE_ERROR;
      notice.hidden = false;
    }
    function newEngine(fresh) {
      return SE.create(getPlan(fresh), { clock: clock, storage: storage, key: key, onSaveError: showSaveError });
    }
    function wantWake(want) {
      const nav = win.navigator;
      if (!nav || !nav.wakeLock || typeof nav.wakeLock.request !== 'function') return;
      if (want && !wakeLock) {
        nav.wakeLock.request('screen').then(lock => {
          wakeLock = lock;
          lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
        }).catch(() => { wakeLock = null; });
      } else if (!want && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        lock.release().catch(() => {});
      }
    }
    function setDemo(url, name) {
      if (url === demoUrl) return;
      demoUrl = url;
      demo.textContent = '';
      const embed = url ? SE.embedUrl(url) : '';
      const watch = url ? SE.safeDemoUrl(url) : '';
      demo.hidden = !embed;
      if (!embed) return;
      const frame = el('div', { class: 'video-frame' }, [el('iframe', {
        src: embed,
        title: 'Demo: ' + name,
        referrerpolicy: 'strict-origin-when-cross-origin',
        sandbox: 'allow-scripts allow-same-origin allow-presentation',
        allow: 'encrypted-media; picture-in-picture; fullscreen',
        'data-testid': 'demo-embed',
      })]);
      const link = el('a', { class: 'demo-watch', href: watch, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'demo-watch', text: 'Watch demo on YouTube' });
      demo.appendChild(frame);
      demo.appendChild(link);
    }
    function setText(node, value) {
      node.textContent = value || '';
      node.hidden = !value;
    }

    /* ---------- renderers ---------- */
    function renderStart(state) {
      startTitle.textContent = state.title;
      const est = SE.estimateSeconds({ slots: state.slots, transitionSec: state.transitionSec });
      startEstimate.textContent = 'About ' + Math.round(est / 60) + ' minutes.';
      startCount.textContent = plural(state.slots.length, 'exercise', 'exercises') + ', one at a time. Press Start once; the app runs the rest.';
      const counts = SE.phaseCounts(state.slots);
      startPhases.textContent = '';
      SE.PHASES.forEach(p => {
        if (!counts[p]) return;
        startPhases.appendChild(el('li', { 'data-phase': p, text: PHASE_LABELS[p] + ': ' + plural(counts[p], 'exercise', 'exercises') }));
      });
      planList.textContent = '';
      SE.PHASES.forEach(p => {
        const names = [];
        const times = {};
        state.slots.filter(s => s.phase === p).forEach(s => {
          if (!times[s.name]) names.push(s.name);
          times[s.name] = (times[s.name] || 0) + 1;
        });
        if (!names.length) return;
        planList.appendChild(el('h3', { text: PHASE_LABELS[p] }));
        planList.appendChild(el('ol', {}, names.map(n => el('li', { text: n + (times[n] > 1 ? ' \u00d7' + times[n] : '') }))));
      });
      safety.textContent = '';
      state.notes.forEach(n => safety.appendChild(el('li', { text: n })));
      safety.hidden = !state.notes.length;
    }

    function renderRun(state, mode) {
      const slot = engine.current();
      const total = state.slots.length;
      const doneCount = state.completedIds.length + state.skippedIds.length;
      const paused = state.status === 'paused';
      const confirming = state.status === 'confirmEnd';
      phaseLabel.textContent = phaseText(mode === 'rest' && engine.next() ? engine.next() : slot);
      position.textContent = mode === 'rest'
        ? 'Next: exercise ' + (state.index + 2) + ' of ' + total
        : 'Exercise ' + (state.index + 1) + ' of ' + total;
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuenow', String(doneCount));
      bar.setAttribute('aria-valuetext', doneCount + ' of ' + total + ' done');
      barFill.style.width = (total ? doneCount / total * 100 : 0) + '%';
      pausedBadge.hidden = !paused;
      runScreen.setAttribute('data-mode', mode);
      if (mode === 'rest') {
        const next = engine.next();
        restTitle.textContent = slot.restLabel || 'Rest';
        restTitle.hidden = false;
        exName.hidden = true;
        exDose.hidden = true;
        upNext.textContent = 'Up next: ' + next.name + ' \u00b7 ' + next.dose.label;
        upNext.hidden = false;
        countdown.hidden = false;
        setText(exNote, '');
        setText(exCaution, '');
        setText(exEquip, '');
        setDemo(next.demoUrl, next.name);
      } else {
        restTitle.hidden = true;
        exName.textContent = slot.name;
        exName.hidden = false;
        exDose.textContent = slot.dose.label;
        exDose.hidden = false;
        upNext.hidden = true;
        countdown.hidden = slot.dose.kind !== 'time';
        setText(exNote, slot.note);
        setText(exCaution, slot.caution);
        setText(exEquip, slot.equipment.length ? 'Equipment: ' + slot.equipment.join(', ') : '');
        setDemo(slot.demoUrl, slot.name);
      }
      btnDone.hidden = mode !== 'exercise' || paused || confirming;
      btnSkipRest.hidden = mode !== 'rest' || paused || confirming;
      btnResume.hidden = !paused || confirming;
      btnPause.hidden = paused || confirming;
      btnSkip.hidden = mode !== 'exercise' || paused || confirming;
      btnEnd.hidden = confirming;
      endConfirm.hidden = !confirming;
      updateClock();
    }

    function renderFinish() {
      const sum = engine.summary();
      finishSummary.textContent = '';
      [
        ['finish-completed', 'Exercises completed: ' + sum.completed + ' of ' + sum.total],
        ['finish-skipped', 'Skipped: ' + sum.skipped],
        ['finish-time', 'Total time: ' + fmtDuration(sum.elapsedMs)],
      ].forEach(row => finishSummary.appendChild(el('li', { 'data-testid': row[0], text: row[1] })));
    }

    function updateClock() {
      const state = engine.getState();
      if (state.status === 'idle' || state.status === 'finished') return;
      const rem = engine.remainingMs();
      if (rem != null) countdown.textContent = fmtClock(rem);
      elapsed.textContent = 'Total ' + fmtClock(engine.elapsedMs());
      if (state.status !== 'exercise' && state.status !== 'rest') return;
      if (rem == null) return;
      const slot = engine.current();
      if (!announcedSwitch && state.status === 'exercise' && slot.dose.kind === 'time' && slot.dose.perSide &&
          rem <= slot.dose.seconds * 500 && rem > 1000) {
        announcedSwitch = true;
        announce('Switch sides.');
      }
      if (!announcedFive && rem <= 5000 && rem > 0) {
        announcedFive = true;
        announce('5 seconds left.');
      }
    }

    function statusGroup(status) {
      if (status === 'idle') return 'idle';
      if (status === 'finished') return 'finished';
      return 'active';
    }

    function render(reason) {
      const state = engine.getState();
      const mode = engine.mode();
      const keyNow = state.status === 'idle' || state.status === 'finished'
        ? state.status + ':' + state.planId
        : mode + ':' + state.index;
      const changed = keyNow !== screenKey;
      const prevStatus = lastStatus;
      lastStatus = state.status;
      startScreen.hidden = state.status !== 'idle';
      finishScreen.hidden = state.status !== 'finished';
      runScreen.hidden = state.status === 'idle' || state.status === 'finished';
      screen.setAttribute('data-status', state.status);
      if (state.status === 'idle') {
        renderStart(state);
        setDemo('', '');
      } else if (state.status === 'finished') {
        renderFinish();
        setDemo('', '');
      } else {
        renderRun(state, mode);
      }
      wantWake(state.status === 'exercise' || state.status === 'rest' || state.status === 'confirmEnd');
      if (!prevStatus || statusGroup(prevStatus) !== statusGroup(state.status)) onStatus(statusGroup(state.status));
      if (state.status === 'finished' && prevStatus && prevStatus !== 'finished') onFinish(engine.summary());
      if (!changed) {
        if (state.status === 'confirmEnd' && prevStatus !== 'confirmEnd') btnEndNo.focus();
        else if (state.status === 'paused' && prevStatus !== 'paused') { announce('Paused.'); btnResume.focus(); }
        else if (prevStatus === 'paused' && (state.status === 'exercise' || state.status === 'rest')) {
          announce('Resumed.');
          (state.status === 'rest' ? btnSkipRest : btnDone).focus();
        }
        return;
      }
      screenKey = keyNow;
      announcedFive = false;
      announcedSwitch = false;
      if (reason === 'boot' && state.status === 'idle') return;
      const prefix = reason === 'tick' ? 'Time. ' : '';
      if (state.status === 'finished') {
        const sum = engine.summary();
        announce('Workout complete. ' + sum.completed + ' of ' + sum.total + ' exercises done.');
        finishTitle.focus();
      } else if (state.status === 'idle') {
        startTitle.focus();
      } else if (mode === 'rest') {
        const next = engine.next();
        const rem = engine.remainingMs();
        announce(prefix + (engine.current().restLabel || 'Rest') + ', ' + Math.round((rem || 0) / 1000) + ' seconds. Up next: ' + next.name + '.');
        restTitle.focus();
      } else {
        const slot = engine.current();
        announce(prefix + 'Exercise ' + (state.index + 1) + ' of ' + state.slots.length + ': ' + slot.name + ', ' + slot.dose.label +
          (slot.dose.kind === 'time' ? '. Countdown started.' : '. Press Done when finished.'));
        exName.focus();
      }
    }

    function run(fn) {
      return function () { fn(); render('action'); };
    }

    btnStart.addEventListener('click', run(() => engine.start()));
    btnMix.addEventListener('click', run(() => { engine = newEngine(true); screenKey = ''; }));
    btnDone.addEventListener('click', run(() => engine.done()));
    btnSkip.addEventListener('click', run(() => engine.skip()));
    btnSkipRest.addEventListener('click', run(() => engine.skipRest()));
    btnPause.addEventListener('click', run(() => engine.pause()));
    btnResume.addEventListener('click', run(() => engine.resume()));
    btnEnd.addEventListener('click', run(() => engine.requestEnd()));
    btnEndNo.addEventListener('click', run(() => engine.cancelEnd()));
    btnEndYes.addEventListener('click', run(() => { engine.confirmEnd(); engine = newEngine(true); }));
    btnFinishDone.addEventListener('click', run(() => { engine = newEngine(true); }));

    function onVisible() {
      if (rootEl.ownerDocument.visibilityState !== 'visible') return;
      const status = engine.getState().status;
      if (status === 'exercise' || status === 'rest') { wakeLock = null; wantWake(true); }
    }
    rootEl.ownerDocument.addEventListener('visibilitychange', onVisible);

    /* ---------- boot ---------- */
    const saved = storage && key ? SE.load(storage, key) : null;
    engine = (saved && SE.fromState(saved, { clock: clock, storage: storage, key: key, onSaveError: showSaveError })) || newEngine(false);
    render('boot');
    timer = win.setInterval(() => { if (engine.tick()) render('tick'); else updateClock(); }, 250);

    return {
      engine: () => engine,
      saveFailed: () => saveFailed,
      /* The host calls this after changing what getPlan returns (for
       * example a new level). It only takes effect on the start screen. */
      refreshPlan: () => {
        if (engine.getState().status !== 'idle') return false;
        engine = newEngine(true);
        screenKey = '';
        render('action');
        return true;
      },
      destroy: () => {
        win.clearInterval(timer);
        wantWake(false);
        rootEl.ownerDocument.removeEventListener('visibilitychange', onVisible);
      },
    };
  }

  const SessionScreens = { mount: mount, fmtClock: fmtClock, fmtDuration: fmtDuration };
  if (typeof module !== 'undefined' && module.exports) module.exports = SessionScreens;
  else root.SessionScreens = SessionScreens;
})(typeof window !== 'undefined' ? window : globalThis);
