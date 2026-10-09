# Adaptive Workout Coach

[▶ Demo / Run here](#quick-start)

> **Note:** this button currently jumps to the local quick-start below. After deploying
> (e.g. Fly.io, Render, Railway, or any Node host), repoint it to your live demo URL.

**A guided 30-minute workout app anyone can follow — even if you have no routine,
no plan, and no experience.** Adaptive Workout Coach walks you through every session
step by step: what to do, how many, and for how long. A server-backed timer keeps
the session honest, per-exercise checklists track your progress, demo videos show
every move, and a weekly gym calendar keeps you consistent at three sessions a week.

## Who it's for

Anyone who wants a workout to simply follow. Whether you have nothing else to do and
want something structured, or you have no knowledge of how to train and want the
guesswork removed — this app is doable for anyone. No expertise required: every
exercise tells you exactly what to do, in what order, with big legible dose labels
(sets × reps), muscle-group tags, and demo videos where verified ones exist.

## What it is today

A complete guided 30-minute session, three times per week, built around dumbbells
and a resistance band — equipment most people already have or can get cheaply.

**The session (12 exercises, ~30 minutes)**

| Section | Block | Time | Exercises |
|---|---|---|---|
| Warm-up | foundation | 4 min | Ankle pumps + heel slides, quad sets |
| Strength | accessory | 18 min | Goblet squat / dumbbell squat-to-bench, Bulgarian split squat, step-ups with dumbbells, dumbbell Romanian deadlift, single-leg RDL |
| Stability | foundation | 5 min | Banded Spanish squat hold, split-squat hold |
| Cool-down | foundation | 3 min | Hamstring stretch, calf stretch, backward walk |

Every exercise carries a muscle-group tag (quads, hamstrings, glutes, calves), a
large legible dose label, and — where verified demo reels exist — demo video links.
Exercises without a verified demo show none; demo URLs are never invented.

## Key features

- **Guided sessions, zero guesswork.** Open the app, press Start, and follow along.
  Sections collapse as you finish them (accordion cards), so a completed workout
  stays tidy.
- **Server-authored 30-minute timer.** The server stores one deadline per session;
  remaining time is always derived server-side, so closing and reopening the app
  resumes the running session with the correct time left. Reopening can never
  double-subtract elapsed time.
- **Full session lifecycle** — start, pause, resume, clear, complete, timer
  expiry — with one source of truth for session state on the server.
- **Clear session button with confirmation.** Clearing fully resets the timer,
  checkboxes, and progress. A session ends *only* on workout completion, timer
  expiry, or an explicit confirmed Clear — never on back navigation or app close,
  so an accidental tap can't wipe your workout.
- **Per-viewer session scoping.** Each browser gets its own random token in an
  `HttpOnly` cookie; sessions are keyed to it, so there is no cross-user access.
  The server ignores any client-supplied timer or identity fields.
- **Weekly gym calendar.** Two fixed gym days plus a third configurable day
  (e.g. Friday morning, Friday night, or Saturday morning). Tap a gym day to open
  that day's session; completed days are logged and counted toward the 3×/week goal.
- **Sticky status bar and progress bar** keep your place in the session visible
  at all times.
- **Privacy by design.** All data lives in a local SQLite file. No accounts, no
  analytics, no tracking, no personal data collection.

## How sessions work

1. **Start** — creates one server-backed session with a single deadline
   (start time + 30 minutes). Starting is idempotent: it resumes a paused
   session instead of duplicating it.
2. **Work out** — check off exercises as you finish them. When all 12 are
   checked, the workout completes and the day is logged on your calendar.
3. **Pause / resume** — pausing snapshots the remaining time once; resuming
   re-anchors one fresh deadline from the server.
4. **Timer expiry** — at 00:00 the session ends automatically.
5. **Clear session** — the dedicated button, behind a confirmation step. It wipes
   the timer, checkboxes, and progress for a full reset.

Design rules enforced throughout: the server never trusts client-supplied timer
or identity values; session rows are deleted on completion, expiry, and clear so
none accumulate; remaining time is always derived from a single server-authored
deadline.

## The exercise catalog

Exercises live in `data/exercises.js` and are split into two blocks, so the app
can grow from today's routine into broader personalized training without any
redesign:

- **Foundation block** (fixed): warm-up, stability, cool-down — the constant core
  of every session.
- **Accessory block** (rotating): currently the loaded strength work, and the
  future home of **upper-body, back, and arm exercises** as training expands.

To add exercises, add entries with a `block` (`'foundation'` or `'accessory'`),
a `section`, `muscle_groups` tags, dose info, and (only if verified) demo links.
The UI, calendar, timer, and session logic pick them up automatically.

## Vision

Adaptive Workout Coach starts as one great guided routine and grows into a
**personalized training companion**: more routines, more muscle groups, and
eventually training that adapts to you. The foundation/accessory block structure,
muscle-group tagging, and calendar are the groundwork for that future.

## <a id="quick-start"></a>Quick start

Requirements: Node.js 18+.

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

Configuration via environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_MINUTES` | `30` | Session length in minutes (useful for testing) |

The SQLite database is created automatically at `data/app.db` on first run
(this file is gitignored — workout data is never committed).

## Project structure

```
adaptive-workout-coach/
├── server.js            # Express server: session API, calendar API, settings API
├── data/
│   ├── exercises.js     # Exercise catalog — sections, doses, muscle tags, demo links
│   └── app.db           # SQLite database (created at runtime, gitignored)
├── public/
│   ├── index.html       # App shell
│   ├── styles.css       # Styles (light/dark aware)
│   └── app.js           # Frontend: rendering, polling, calendar — timer state
│                        # always comes from the server, never computed locally
├── llms.txt             # Plain-language project summary for AI crawlers/bots
├── package.json
└── README.md
```

## API overview

| Method & path | Purpose |
|---|---|
| `GET /api/state` | Full app state: session (with server-computed remaining time), exercises, settings |
| `POST /api/session/start` | Start (idempotent — resumes a paused session instead of duplicating) |
| `POST /api/session/pause` | Pause — server snapshots remaining time once |
| `POST /api/session/resume` | Resume — server re-anchors one fresh deadline |
| `POST /api/session/check` | Check/uncheck an exercise; completes + logs the workout when all are done |
| `POST /api/session/clear` | Clear session — requires `{ session_id, confirm: true }` matching the server's session |
| `GET /api/calendar` | Monday-start week: gym days, third-day setting, completions, weekly progress |
| `PUT /api/settings` | Set the flexible third gym day (`none`, `fri-morning`, `fri-night`, `sat-morning`) |

## Safety note

This is a workout companion, not medical advice. Train within a comfortable range —
sharp pain is a stop sign: skip the move. If you train around an injury or medical
condition, follow your clinician's guidance; the app supplements it, never replaces it.

## Privacy

No accounts, no analytics, no tracking, no personal data. Workout data stays in
your own SQLite file. Nothing leaves your machine unless you deploy it somewhere.

## License

Private project — all rights reserved.
