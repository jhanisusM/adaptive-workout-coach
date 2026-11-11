# Guided session

The workout runs one move at a time, hands-free once started, in the order
warm-up, main, cool-down. This file is the spec both workout apps follow
(kids-workout-coach and adaptive-workout-coach keep the same copy). It
updates the earlier engine spec: guided mode replaces the checklist screen
instead of shipping as a separate preview page.

## Sources

- Program: Ask AI's `synthesis.md` (kids 4 + 6 x 2 + 4, adult 35 minutes).
- Moves and demo URLs: `exercises-kids.json` (48) and `exercises-adult.json`
  (51), copied into each repo's test fixtures. No URL is invented; tests
  check every JSON name and URL is present unchanged.
- Fixes from the app review: one YouTube embed at a time, controls above the
  fold on phones, no full catalog before Start, the kids CSP and iframe
  rules in both apps, a notice when saving fails, and a disclaimer footer
  that never covers content on phones.

## Shared files

| File | Role |
| --- | --- |
| `docs/session-engine.js` | Pure state machine. No DOM. Injectable clock and storage. |
| `docs/session-screens.js` | Builds and updates the start, exercise, rest, and finish screens. |
| `docs/session.css` | Layout and screen styles. Colors come from each app's `styles.css`. |
| `session-engine.test.js` | Engine behavior tests. |

These four are byte-identical across the two repos and hash-checked by
`shared-files.test.js` against `shared-files.sha256`. Scripts are classic
scripts loaded in order (`session-engine.js`, `session-screens.js`,
`program.js`, `app.js`) and also export CommonJS for Node tests. No build
step and no runtime dependencies.

## Plan contract

The host app builds a plan and hands it to the screens:

```
{ id, title, targetMinutes, transitionSec, notes: [string],
  slots: [{ id, name, phase: 'warmup' | 'main' | 'cooldown',
            dose: { kind: 'reps' | 'time', reps, seconds, label, perSide },
            restSec?, restLabel?, workSec?, setupSec?,
            demoUrl, focus, equipment: [string], note, caution }] }
```

Rounds and sets are expanded into a linear slot list by the host before the
engine sees them. Slot ids are unique within a plan.

## Engine rules

- Statuses: `idle`, `exercise`, `rest`, `paused`, `confirmEnd`, `finished`.
- Rep moves wait for Done. Timed moves count down from a stored deadline
  (remaining = deadline - now), move on by themselves at zero, and accept
  Done early.
- Rest after a slot: its `restSec` if set (0 included). Otherwise 20 s after
  a main move and none after a warm-up or cool-down move. Never after the
  last slot. Skip exercise goes straight to the next move with no rest.
  Skip rest opens the next move at once.
- Pause stores the remaining time and stops the session clock. Resume sets a
  new deadline from it. End asks first and freezes time while asking; Keep
  going returns to the same screen and second; Yes clears the session.
- One state object is kept in localStorage while a session is active, so a
  reload resumes the same screen, move, and time. It is cleared on finish
  and on End. A snapshot that does not validate is removed, not resumed.
- If saving throws, the screens show a notice and the workout keeps going.
- Estimate = work (timed seconds, or `workSec` for rep moves) + setup
  (`setupSec`, else the plan's `transitionSec`) + rest.

## Screens

- Start: title, "About N minutes.", exercise count, phase breakdown, Start,
  New mix, a folded move list, and short safety notes. No video.
- Exercise: phase label, "Exercise N of M", progress bar, session time,
  name, dose, countdown (timed moves), Done, Pause/Resume, Skip exercise,
  End, the cue, equipment, caution, and the demo (never autoplay).
- Rest: rest title (or "Water break"), countdown, "Up next" with its demo,
  Skip rest, and the same Pause and End controls.
- Finish: "Workout complete", exercises completed of total, skipped, and
  total time. The host logs the day when at least one exercise was done.
- Demos: only the current move (or Up next) has an iframe:
  `https://www.youtube-nocookie.com/embed/<id>?rel=0`, sandbox without
  popups, `strict-origin-when-cross-origin`. The watch link uses
  `rel="noopener noreferrer"`. Repeat rounds and later sets have no demo.
- Wake Lock while running, where supported, failing silently. A polite live
  region announces each screen, "5 seconds left.", "Switch sides." on timed
  each-side holds, and Paused/Resumed. Focus moves to the new screen's
  heading or main button. Reduced motion is respected.

## Kids program (kids-workout-coach)

- 4 warm-up moves (pulse raiser, one extra, Arm Circles, coordination), then
  6 main moves x 2 rounds (3 thigh, 2 posture, 1 play), then the fixed
  cool-down: Slow March, Wall Stand, Wall Angels, Flamingo Balance.
- Rest: 25 / 20 / 15 s in the main block by level, 10 s in warm-up and
  cool-down, plus a 30 s water break after round 1.
- Levels: no jumps at Starter, Frog Jumps from Stronger, Star Jumps at
  Superhero only, Wall Sit 10 / 20 / 30 s. Starter uses Sit-to-Stand.
- Picks are random. If a session would pass 20.5 minutes, round 2 drops its
  play move.
- Labels per level cover the real minimum and maximum: Starter 16 to 18,
  Stronger 17 to 21, Superhero 19 to 24 minutes.
- Progress store `kids-coach-v1` v4: level, unlocked level, sessions per
  level, trained days, advance history. Saves from main, PR #2, and PR #3
  load with no notice.

## Adult program (adaptive-workout-coach)

- `SESSION_MINUTES = 35`, one constant.
- Warm-up: 5 moves (pulse, hinge, shoulder, glute, squat pattern), 10 s rest.
- Main: 8 moves, 2 per focus in the order Lower, Upper, Knee, Arms. Lower
  moves are 3 straight sets, the rest 2; each set is its own screen. Rest
  45 s after lower-body sets, 30 s after the rest. Past 36 minutes, the
  lower pair drops its third set. Every session uses dumbbells and bands.
- Knee group: no jumping, no deep or loaded knee bends, no dumbbells, and
  "Stop if you feel sharp pain." on every knee screen.
- Cool-down: 5 moves (easy walk, calf or hamstring, chest or shoulder, hip
  or quad, one more), 10 s rest.
- Sessions land between about 33 and 37 minutes.
- Store `awc-demo-v1` v4 keeps only trained days. Phase-era and
  workout-type-era saves load quietly; their phase, type, checklist,
  symptoms, and timer fields are dropped.

## Out of scope

Audio cues, workout types (synthesis.md describes one adult program),
accounts, analytics, and a service worker.
