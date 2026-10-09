'use strict';
/**
 * Adaptive Workout Coach — server.
 *
 * Session design (single source of truth, all server-side):
 * - The server authors ONE deadline per running session (deadline_ms).
 *   Remaining time is always DERIVED: max(0, deadline_ms - now).
 *   Pausing snapshots the server-computed remaining once; resuming re-anchors
 *   a fresh deadline from that snapshot. Remaining time is never stored as a
 *   ticking value, so reopening the app can never double-subtract elapsed
 *   time.
 * - Client-supplied timer values and identity fields are NEVER read. The
 *   server ignores any such fields outright.
 * - Each browser gets its own random viewer token in an HttpOnly cookie.
 *   Every session row is keyed by that token, so sessions are scoped per
 *   viewer — no cross-user access is possible.
 * - A session ends only on: workout completion (all exercises checked),
 *   timer expiry, or an explicit confirmed Clear. Completion/expiry/clear
 *   all delete the active session row, so no orphaned sessions accumulate.
 */

const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { SECTIONS, EXERCISES, FEATURED_DEMOS } = require('./data/exercises');

const PORT = Number(process.env.PORT || 3000);
const SESSION_MINUTES = Number(process.env.SESSION_MINUTES || 30); // override for testing
const SESSION_MS = SESSION_MINUTES * 60 * 1000;

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS active_session (
  viewer_token       TEXT PRIMARY KEY,
  session_id         TEXT NOT NULL,
  started_at_ms      INTEGER NOT NULL,
  deadline_ms        INTEGER,              -- server-authored; NULL while paused
  paused_remaining_ms INTEGER,             -- server-computed snapshot; set while paused
  status             TEXT NOT NULL,        -- 'running' | 'paused'
  checks_json        TEXT NOT NULL DEFAULT '{}',
  created_at_ms      INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS completions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_token     TEXT NOT NULL,
  date             TEXT NOT NULL,          -- YYYY-MM-DD, server-local
  completed_at_ms  INTEGER NOT NULL,
  kind             TEXT NOT NULL           -- 'workout' | 'time'
);
CREATE INDEX IF NOT EXISTS idx_completions_viewer_date
  ON completions (viewer_token, date);
CREATE TABLE IF NOT EXISTS settings (
  viewer_token TEXT PRIMARY KEY,
  third_day    TEXT NOT NULL DEFAULT 'none'  -- 'none' | 'fri-morning' | 'sat-morning' | 'fri-night'
);
`);

const EXERCISE_IDS = new Set(EXERCISES.map((e) => e.id));
const THIRD_DAY_OPTIONS = ['none', 'fri-morning', 'sat-morning', 'fri-night'];

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

/* ---------- viewer identity (server-issued, never client-supplied) ---------- */

function readViewerToken(req) {
  const header = req.headers.cookie || '';
  const m = header.match(/(?:^|;\s*)krn_viewer=([0-9a-f]{32})/);
  return m ? m[1] : null;
}

app.use((req, res, next) => {
  let token = readViewerToken(req);
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    res.setHeader(
      'Set-Cookie',
      `krn_viewer=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    );
  }
  req.viewer = token; // NOTE: only ever from our own cookie; req.body identity fields are ignored
  next();
});

/* ---------- prepared statements ---------- */

const getActive = db.prepare('SELECT * FROM active_session WHERE viewer_token = ?');
const insertActive = db.prepare(
  `INSERT INTO active_session
     (viewer_token, session_id, started_at_ms, deadline_ms, paused_remaining_ms, status, checks_json, created_at_ms)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const updatePause = db.prepare(
  `UPDATE active_session SET status = 'paused', paused_remaining_ms = ?, deadline_ms = NULL WHERE viewer_token = ?`
);
const updateResume = db.prepare(
  `UPDATE active_session SET status = 'running', deadline_ms = ?, paused_remaining_ms = NULL WHERE viewer_token = ?`
);
const updateChecks = db.prepare(
  'UPDATE active_session SET checks_json = ? WHERE viewer_token = ?'
);
const deleteActive = db.prepare('DELETE FROM active_session WHERE viewer_token = ?');
const insertCompletion = db.prepare(
  'INSERT INTO completions (viewer_token, date, completed_at_ms, kind) VALUES (?, ?, ?, ?)'
);
const getSettings = db.prepare('SELECT third_day FROM settings WHERE viewer_token = ?');
const upsertSettings = db.prepare(
  `INSERT INTO settings (viewer_token, third_day) VALUES (?, ?)
   ON CONFLICT(viewer_token) DO UPDATE SET third_day = excluded.third_day`
);

/* ---------- helpers ---------- */

function localDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseChecks(json) {
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/**
 * Serialize the active session. Remaining time is DERIVED from the single
 * server-authored deadline — it is never stored as a ticking value, so a
 * reopen can only ever read the truth once.
 *
 * If the deadline has passed, the session is ended atomically: one completion
 * row is logged and the session row deleted. The transaction makes the
 * log-once guarantee hold even under concurrent requests.
 */
function serializeSession(viewer) {
  const row = getActive.get(viewer);
  if (!row) return null;
  const now = Date.now();
  const remaining =
    row.status === 'paused' ? row.paused_remaining_ms : Math.max(0, row.deadline_ms - now);

  if (remaining <= 0) {
    const finish = db.transaction(() => {
      insertCompletion.run(viewer, localDate(now), now, 'time');
      deleteActive.run(viewer);
    });
    finish();
    return {
      id: row.session_id,
      status: 'expired',
      expired: true,
      remaining_ms: 0,
      total_ms: SESSION_MS,
      checks: parseChecks(row.checks_json),
    };
  }

  return {
    id: row.session_id,
    status: row.status,
    expired: false,
    remaining_ms: remaining,
    total_ms: SESSION_MS,
    checks: parseChecks(row.checks_json),
    started_at_ms: row.started_at_ms,
  };
}

/* ---------- session endpoints ---------- */

app.get('/api/state', (req, res) => {
  const settingsRow = getSettings.get(req.viewer);
  res.json({
    session: serializeSession(req.viewer),
    sections: SECTIONS,
    exercises: EXERCISES,
    featured_demos: FEATURED_DEMOS,
    settings: { third_day: settingsRow ? settingsRow.third_day : 'none' },
    session_minutes: SESSION_MINUTES,
  });
});

app.post('/api/session/start', (req, res) => {
  // Idempotent: an existing session is returned (or resumed) rather than duplicated.
  const now = Date.now();
  let row = getActive.get(req.viewer);
  if (!row) {
    const id = crypto.randomBytes(12).toString('hex');
    insertActive.run(req.viewer, id, now, now + SESSION_MS, null, 'running', '{}', now);
  } else if (row.status === 'paused') {
    updateResume.run(now + row.paused_remaining_ms, req.viewer);
  }
  res.json({ session: serializeSession(req.viewer) });
});

app.post('/api/session/pause', (req, res) => {
  const row = getActive.get(req.viewer);
  if (!row) return res.status(404).json({ error: 'no active session' });
  if (row.status !== 'running') return res.json({ session: serializeSession(req.viewer) });
  // Snapshot the SERVER-computed remaining exactly once.
  const remaining = Math.max(0, row.deadline_ms - Date.now());
  updatePause.run(remaining, req.viewer);
  res.json({ session: serializeSession(req.viewer) });
});

app.post('/api/session/resume', (req, res) => {
  const row = getActive.get(req.viewer);
  if (!row) return res.status(404).json({ error: 'no active session' });
  if (row.status !== 'paused') return res.json({ session: serializeSession(req.viewer) });
  // Re-anchor ONE fresh deadline from the paused snapshot.
  updateResume.run(Date.now() + row.paused_remaining_ms, req.viewer);
  res.json({ session: serializeSession(req.viewer) });
});

app.post('/api/session/check', (req, res) => {
  // Only exercise_id + checked are honored; every other body field is ignored.
  const { exercise_id, checked } = req.body || {};
  if (!EXERCISE_IDS.has(exercise_id) || typeof checked !== 'boolean') {
    return res.status(400).json({ error: 'invalid exercise' });
  }
  const now = Date.now();
  let row = getActive.get(req.viewer);
  if (!row) {
    // Auto-create a paused session so checklist progress persists.
    const id = crypto.randomBytes(12).toString('hex');
    insertActive.run(req.viewer, id, now, null, SESSION_MS, 'paused', '{}', now);
    row = getActive.get(req.viewer);
  }
  const checks = parseChecks(row.checks_json);
  if (checked) checks[exercise_id] = true;
  else delete checks[exercise_id];

  if (Object.keys(checks).length >= EXERCISES.length) {
    // Workout complete: log once, remove the session — it cannot linger.
    const finish = db.transaction(() => {
      insertCompletion.run(req.viewer, localDate(now), now, 'workout');
      deleteActive.run(req.viewer);
    });
    finish();
    return res.json({ completed: true, session: null });
  }
  updateChecks.run(JSON.stringify(checks), req.viewer);
  res.json({ completed: false, session: serializeSession(req.viewer) });
});

app.post('/api/session/clear', (req, res) => {
  // Explicit confirmation is required, and the session id must match the
  // server's own active session — a forged or foreign id clears nothing.
  const { session_id, confirm } = req.body || {};
  if (confirm !== true) return res.status(400).json({ error: 'confirmation required' });
  const row = getActive.get(req.viewer);
  if (!row || row.session_id !== session_id) {
    return res.status(404).json({ error: 'no matching active session' });
  }
  deleteActive.run(req.viewer);
  res.json({ cleared: true });
});

/* ---------- calendar ---------- */

function mondayOfWeek(anchorMs) {
  const d = new Date(anchorMs);
  const mondayOffset = (d.getDay() + 6) % 7; // 0 = Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset);
}

app.get('/api/calendar', (req, res) => {
  const monday = mondayOfWeek(Date.now());
  const days = [];
  for (let i = 1; i <= 5; i++) { // Tue–Sat only: Monday is rest, Sunday is for church
    days.push(localDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).getTime()));
  }
  const settingsRow = getSettings.get(req.viewer);
  const third = settingsRow ? settingsRow.third_day : 'none';
  const doneRows = db
    .prepare('SELECT DISTINCT date FROM completions WHERE viewer_token = ? AND date >= ? AND date <= ?')
    .all(req.viewer, days[0], days[4]);
  const doneDates = new Set(doneRows.map((r) => r.date));

  const dayObjs = days.map((date) => {
    const dow = new Date(date + 'T12:00:00').getDay(); // 0=Sun … 6=Sat
    let gym = dow === 2 || dow === 4; // Tue + Thu are fixed gym days
    let thirdLabel = null;
    if (third === 'fri-morning' && dow === 5) { gym = true; thirdLabel = 'Friday morning'; }
    if (third === 'fri-night' && dow === 5) { gym = true; thirdLabel = 'Friday night'; }
    if (third === 'sat-morning' && dow === 6) { gym = true; thirdLabel = 'Saturday morning'; }
    return { date, gym, third_day_label: thirdLabel, completed: doneDates.has(date) };
  });

  res.json({
    days: dayObjs,
    third_day: third,
    third_day_options: THIRD_DAY_OPTIONS,
    weekly_completed: dayObjs.filter((d) => d.gym && d.completed).length,
    weekly_goal: 3,
  });
});

app.put('/api/settings', (req, res) => {
  const { third_day } = req.body || {};
  if (!THIRD_DAY_OPTIONS.includes(third_day)) {
    return res.status(400).json({ error: 'invalid option' });
  }
  upsertSettings.run(req.viewer, third_day);
  res.json({ third_day });
});

/* ---------- static frontend ---------- */

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Adaptive Workout Coach running at http://localhost:${PORT}`);
  console.log(`Session length: ${SESSION_MINUTES} minutes (override with SESSION_MINUTES=)`);
});
