# Features

What the app in `docs/` does today: one guided 35-minute strength session,
one move at a time. Press Start once and the app runs warm-up, the main
block (lower body, upper body, knee strength, arms), then a cool-down,
hands-free. The page is static HTML, CSS, and JavaScript with no build step.
Progress is stored in this browser under `awc-demo-v1` (schema version 4);
an active session is stored under `awc-guided-session-v1`.

Status is one of: done, removed.

Run the tests with `npm ci && npm test` (dev-only; nothing from
`node_modules` is shipped to `docs/`). Pull requests run the same command in
GitHub Actions.

## Where things live

- `docs/index.html`: page shell, CSP, referrer policy, calendar card, disclaimer footer.
- `docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`: shared guided session (hash-checked).
- `docs/program.js`: the 51 moves from exercises-adult.json, doses, rest, and the session builder. `SESSION_MINUTES = 35`.
- `docs/app.js`: calendar store, migration of old saves, page wiring.
- `docs/styles.css`: colors. `docs/favicon.svg`: icon.
- `docs/specs/guided-session.md`: the guided session spec.
- `test/`: `session-engine.test.js` and `shared-files.test.js` (shared), `program.test.js`, `store.test.js`, `page.test.js` (jsdom, drives the real page), fixtures.

How to test in a browser: serve `docs/` (`cd docs && python3 -m http.server 8000`)
and use the `data-testid` selectors below, not class names.

## Guided session screens (shared with the other workout app)

`docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`, and
the engine test file are identical in kids-workout-coach and
adaptive-workout-coach. `shared-files.test.js` fails if a copy drifts from
the hash in `shared-files.sha256`. To change one, edit it, copy it to both
repos, and update both manifests (the command is in the test file header).

| Feature | Status | Location | Web test reference |
| --- | --- | --- | --- |
| Start screen: title, minute estimate, exercise count, phase breakdown, Start | done | `session-screens.js` `renderStart` | Load the page. `[data-testid=session-screen]` has `data-status="idle"`. Check `session-title`, `time-estimate` ("About N minutes."), `exercise-count`, and `phase-breakdown` (3 items, `data-phase` warmup, main, cooldown). `btn-start` is visible without scrolling at 390x844. No `iframe` on the page. |
| Move list folded before Start | done | `plan-list` inside a closed `details` | `plan-list` is not visible until "See the moves" is opened. |
| Safety notes on the start screen | done | `safety-notes` | Short notes from synthesis.md. Medical-clearance wording is only in the README. |
| New mix | done | `btn-new-mix` | On the start screen, draws a new session. Not shown during a session. |
| Exercise screen | done | `renderRun` | After Start: `data-status="exercise"`, `[data-mode=exercise]`. Shows `phase-label`, `exercise-position` ("Exercise N of M"), `progress-bar`, `exercise-name`, `exercise-dose`, `btn-done`, `btn-pause`, `btn-skip`, `btn-end`, and `exercise-note`. The page header and other cards are hidden (`body[data-session=active]`). |
| Rep moves wait for Done | done | engine `done` | A rep move has no countdown and stays until `btn-done`. |
| Timed moves count down and auto-advance | done | engine `tick` | `countdown` shows mm:ss and moves on at 0. `btn-done` ends it early. "5 seconds left." is announced. Timed each-side moves announce "Switch sides." at half time. |
| Rest screen with Up next | done | engine rest rule | Starts by itself after a move that has rest. `rest-title`, `countdown`, `up-next` ("Up next: name"), the next move's demo, and `btn-skip-rest`. |
| Rest rule | done | `SessionEngine.restAfter` | Rest from the data wins (0 included). With no value: 20 s after main moves, none after warm-up or cool-down moves. Never after the last move, never after Skip. |
| Pause / Resume | done | engine `pause`, `resume` | `btn-pause` shows `paused-badge` and `btn-resume`; countdown and `session-elapsed` stop. Resume continues from the same second. |
| Skip exercise | done | engine `skip` | `btn-skip` moves to the next move with no rest and counts it as skipped. |
| End with confirm | done | engine `requestEnd`, `confirmEnd` | `btn-end` opens `end-confirm`. `btn-end-no` returns to the same screen and time. `btn-end-yes` clears the session and shows the start screen. Nothing is logged. |
| Finish screen | done | `renderFinish` | "Workout complete" in `finish-title`; `finish-completed` ("Exercises completed: X of Y"), `finish-skipped`, `finish-time`. `btn-finish-done` returns to a fresh start screen. |
| Reload resumes | done | one state object in localStorage | Reload during any screen: the same screen, move, and remaining time come back (the deadline is stored, so time keeps running while the page is closed unless paused). Cleared on finish and on End. |
| Demo videos, one at a time, never autoplay | done | `setDemo` | Only the current move (or Up next on rest) has an `iframe` (`demo-embed`): `https://www.youtube-nocookie.com/embed/<id>?rel=0`, sandbox `allow-scripts allow-same-origin allow-presentation`, referrer policy `strict-origin-when-cross-origin`. `demo-watch` opens youtube.com with `rel="noopener noreferrer"`. Repeat rounds/sets show no demo. |
| Save failure notice | done | `onSaveError`, `storage-notice` | When localStorage `setItem` throws, `storage-notice` says the browser could not save; the workout keeps running. |
| Screen Wake Lock | done | `wantWake` | Held during exercise and rest where supported; fails silently. Re-requested when the tab is shown again. |
| Live announcements, focus, reduced motion | done | `session-live` (`aria-live=polite`), `session.css` | Each new screen is announced and its heading or primary button gets focus. `prefers-reduced-motion` turns off transitions. |
| Mobile first, controls above the fold | done | `session.css` | At 390x844 the primary button is in the first screen on every screen. The disclaimer footer is in the normal flow at 860 px and below, so it never covers controls. |
| Network | done | CSP in `index.html` | Only this site's files plus youtube-nocookie iframes, one at a time. `connect-src 'none'`, `img-src 'self'`. |

## The 35-minute session

| Feature | Status | Location | Web test reference |
| --- | --- | --- | --- |
| One constant for length | done | `program.js` `SESSION_MINUTES` | `time-estimate` reads about 33 to 37 minutes. |
| Session shape | done | `buildSession` | Breakdown: Warm-up 5, Main 16 to 24 (8 moves as sets), Cool-down 5. |
| Warm-up, about 5 minutes | done | `pickWarmup` | Pulse, hinge, shoulder, glute, squat pattern. 10 s rest between. |
| Main: 8 moves, 2 per focus | done | `pickMain` | `phase-label` reads "Main · Lower body", then Upper body, Knee strength, Arms, in that order. Lower moves are 3 sets (2 when the session would pass 36 minutes), others 2. `exercise-dose` starts "Set n of N". Demo on set 1 only. |
| Rest | done | `LOWER_REST_SEC`, `MAIN_REST_SEC` | 45 s after lower-body sets, 30 s after other main sets, 10 s in warm-up and cool-down. |
| Equipment | done | `equipment` | `exercise-equipment` lists bodyweight, dumbbells, or bands. Every session uses dumbbells and bands. |
| Knee group rules | done | focus `Knee` | No jumping, no deep or loaded knee bends, no dumbbells. `exercise-caution` reads "Stop if you feel sharp pain." on every knee screen. |
| Cool-down, about 5 minutes | done | `pickCooldown` | Easy walk, calf or hamstring stretch, chest or shoulder stretch, hip or quad stretch, one more. |
| Calendar | done | `week-grid`, `cal-progress` | Finishing with at least one exercise done marks today. Ending early logs nothing. Hidden during a session. |
| Old saves | done | `migrate` | Phase-era and workout-type-era saves keep their trained days with no notice; phase, type, checklist, symptoms, workout days, and the old timer are dropped. Broken saves reset with `app-notice` and a backup key. |
| Disclaimer footer | done | `disclaimer-footer` | Links to the README Disclaimer. Fixed on desktop, in the page flow on phones. |

## Removed

| Feature | Status | Notes |
| --- | --- | --- |
| Three-phase knee program, phase picker, Advance, 9-session gate, checklist | removed | synthesis.md has one 35-minute program. |
| Workout type pills (knee, upper, lower) | removed | synthesis.md describes no workout types, so there is no picker. |
| Checklist screen, accordions, single 30-minute session timer, status bar | removed | Replaced by the guided session. |
| Pain and swelling check-in, symptom history, week doses | removed | The session shows a stop-for-sharp-pain note instead. |
| Workout-day settings panel and info panel | removed | The calendar shows trained days only. |
| `docs/video-library.js` and the Demo videos section | removed | Each move carries its own URL from exercises-adult.json. |
