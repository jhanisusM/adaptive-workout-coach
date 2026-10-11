# Features

What the app in `docs/` does today. The page is static HTML, CSS, and JavaScript with no build step. Progress is stored in this browser under the key `awc-demo-v1` (schema version 2).

Status is one of: planned, in progress, done, removed.

Run the tests with `npm test` (dev-only; nothing from `node_modules` is shipped to `docs/`).

## Program and phases

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Three phases: Reactivate, Reload, Return | done | `docs/app.js` `PHASES`, `docs/index.html` `#phasePicker` | |
| Phase doses and notes override the catalog | done | `resolvePhase` | |
| Advancement checklist of three confirmations | done | `advancePhase`, `#checklistWrap` | The advance button stays disabled until all three are confirmed. |
| Phase-advancement gating | planned | `advancePhase`, `#phasePicker` | The picker can still open any phase. `unlockedPhase` is stored so a later gate can keep the current phase. |
| Tapping the current phase does nothing | done | `requestPhaseChange` | |
| Switching phase while a session is active asks first | done | `#phaseConfirm` | |

## Session and timer

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| 30 minute timer with one stored deadline | done | `remainingMs`, `startSession` | Reopening subtracts elapsed time once. |
| Start, pause, resume, and clear | done | `#btnStart`, `#btnPause`, `#btnResume`, `#btnClear` | Clear asks first. |
| Check off exercises only during a session | done | `toggleCheckState`, `renderSections` | Boxes stay disabled until a session starts. |
| Finish workout button logs the day | done | `#btnFinish`, `#finishConfirm` | Also offered when every box is ticked. Ticking the last box does not log by itself. |
| Each gym day counts at most once | done | `applyCompletion` | |
| Rest days are not logged | done | `canStartSession`, `isGymDayKey` | Start is refused, and Finish does not write a completion. |
| Timer expiry keeps checkboxes and asks | done | `expireIfDue`, `#expiryConfirm` | Log anyway or discard. |

## Checklist

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise checkboxes, doses, notes, and muscle tags | done | `renderSections` | |
| Accordion sections | done | `[data-section]` | |
| Progress bar and sticky status | done | `#progressFill`, `#statusBar` | |

## Calendar

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Tue-Sat week, with Sundays and Mondays off | done | `renderCalendar` | |
| Optional third gym day | done | `#thirdDay` | Friday morning and Friday night both make Friday a gym day. |
| Tap a gym day to select it | done | `[data-day]` | |
| Stale selected day from another week resets | done | `resolveActiveDay`, `tick` | Runs on load and when the date changes. |

## Demo videos

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise demos from the video library | done | `docs/video-library.js`, `demo_ids` | |
| Featured demos and "How it's organized" | done | `renderFeatured` | Also renders when a stored session has already expired. |
| Unknown video id is skipped | done | `resolveVideo`, `resolveDemoList` | A console warning is logged and the page still loads. |

## Storage

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| localStorage key `awc-demo-v1` | done | `LS_KEY` | The key name is unchanged so existing browsers keep their data. |
| Version 2 migration | done | `migrate` | Missing or older saves are validated and written back. Phase, checklist, completions, and session deadline are kept. |
| Current phase stored on `unlockedPhase` | done | `migrate` | Set to the current phase on older saves. The picker does not read it yet. |
| Session counts above the 9-session target | done | `sanitizePhaseSessions`, `cappedSessionCount` | The stored count is kept. The progress line and the goal check show at most 9. |
| Corrupt JSON or a broken field | done | `loadStoreFromRaw` | Fresh defaults, or that field reset, plus a one-time message. The page is not left blank. |
| Backup before replacing unreadable saved data | done | `backupRawBeforeSave`, `boot` | Before the first save, the original string is copied to `awc-demo-v1.bak-<timestamp>` when the data is unreadable, the root is not an object, or a field is repaired. |
