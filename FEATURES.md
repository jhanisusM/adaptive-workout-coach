# Features

What the app in `docs/` does today. The page is static HTML, CSS, and JavaScript with no build step. Progress is stored in this browser under the key `awc-demo-v1` (schema version 2).

Run the tests with `npm test` (dev-only; nothing from `node_modules` is shipped to `docs/`).

## Program and phases

| Feature | Status | Location |
| --- | --- | --- |
| Three phases: Reactivate, Reload, Return | Works | `docs/app.js` `PHASES`, `docs/index.html` `#phasePicker` |
| Phase doses and notes override the catalog | Works | `resolvePhase` |
| Advancement checklist (three confirmations) | Works. The picker can still open any phase; gating is not enforced | `advancePhase`, `#checklistWrap` |
| Tapping the current phase does nothing | Works | `requestPhaseChange` |
| Switching phase while a session is active asks first | Works | `#phaseConfirm` |

## Session and timer

| Feature | Status | Location |
| --- | --- | --- |
| 30 minute timer with one stored deadline | Works. Reopening subtracts elapsed time once | `remainingMs`, `startSession` |
| Start, pause, resume, clear (clear asks first) | Works | `#btnStart`, `#btnPause`, `#btnResume`, `#btnClear` |
| Check off exercises only during a session | Works. Boxes stay disabled until a session starts | `toggleCheckState`, `renderSections` |
| Finish workout button logs the day | Works. Also offered when every box is ticked. Ticking the last box does not log by itself | `#btnFinish`, `#finishConfirm` |
| Each gym day counts at most once | Works | `applyCompletion` |
| Rest days are not logged | Works. Start is refused, and Finish does not write a completion | `canStartSession`, `isGymDayKey` |
| Timer expiry keeps checkboxes and asks | Works. Log anyway or discard | `expireIfDue`, `#expiryConfirm` |

## Checklist

| Feature | Status | Location |
| --- | --- | --- |
| Per-exercise checkboxes, doses, notes, muscle tags | Works | `renderSections` |
| Accordion sections | Works | `[data-section]` |
| Progress bar and sticky status | Works | `#progressFill`, `#statusBar` |

## Calendar

| Feature | Status | Location |
| --- | --- | --- |
| Tue-Sat week, Sundays and Mondays off | Works | `renderCalendar` |
| Optional third gym day (Friday morning, Friday night, or Saturday morning) | Works. Friday morning and Friday night both make Friday a gym day | `#thirdDay` |
| Tap a gym day to select it | Works | `[data-day]` |
| Stale selected day from another week resets on load and when the date changes | Works | `resolveActiveDay`, `tick` |

## Demo videos

| Feature | Status | Location |
| --- | --- | --- |
| Per-exercise demos from the video library | Works | `docs/video-library.js`, `demo_ids` |
| Featured demos and "How it's organized" | Works, including when a stored session has already expired | `renderFeatured` |
| Unknown video id | Skipped with a console warning. The page still loads | `resolveVideo`, `resolveDemoList` |

## Storage

| Feature | Status | Location |
| --- | --- | --- |
| localStorage key `awc-demo-v1` | Works. The key name is unchanged so existing browsers keep their data | `LS_KEY` |
| Version 2 migration | Works. Missing or older saves are validated, written back, and keep phase, checklist, completions, and session deadline | `migrate` |
| Current phase is grandfathered on `unlockedPhase` | Stored for a later gate. The picker does not use it yet | `migrate` |
| Counts above 9 per phase | Stored as 9. The day-by-day completion map is kept as-is | `sanitizePhaseSessions` |
| Corrupt JSON or a broken field | Fresh defaults, or that field reset, plus a one-time message. The page is not left blank | `loadStoreFromRaw` |
