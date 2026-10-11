# Features

What the app in `docs/` does today. The page is static HTML, CSS, and JavaScript with no build step. Progress is stored in this browser under the key `awc-demo-v1` (schema version 2).

Status is one of: planned, in progress, done, removed.

Run the tests with `npm test` (dev-only; nothing from `node_modules` is shipped to `docs/`). Pull requests run the same command in GitHub Actions.

## Program and phases

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Three phases: Stability & Tissue Tolerance, Supported Unilateral, Complex Unilateral Loading | done | `docs/app.js` `PHASES`, `docs/index.html` `#phasePicker` | Names follow the prompt heading and its description of the later phases. Phase 1 has 13 exercises, Phase 2 has 11, Phase 3 has 14. |
| Phase 1 avoids deep loaded knee bending | done | `PHASES[0]`, `loaded_knee_flexion` | Spanish squat hold, band TKE, clamshell, two-foot calf raises, and high-box sit-to-stand are in. Chair sit-to-stand with no hands stays a checklist item too. |
| Bulgarian split squat starts in Phase 3 | done | Phase 3 `bulgarian-split-squat` | Placeholder phase. Bodyweight, low rear foot, `3 x 6` each side in week 1. Week-3 dumbbells are a placeholder. Lateral step-down and reverse lunge are in this phase only. |
| Week doses inside a phase | done | `doses`, `phaseWeek`, `weekCredit` | Placeholder sets, reps, holds, and week steps. Sessions 0-2 use week 1, 3-5 use week 2, 6 or more use week 3. The count is the real stored total, minus flagged or unfinished morning checks. One variable changes per week. |
| Weeks are minimums | done | phase `goal`, `#weekNote` | The checklist decides when a phase changes. No running or plyometrics until separately cleared. |
| Move up only through Advance | done | `advanceDecision`, `#advanceBtn`, `commitPhase` | Needs 9 logged sessions in the phase, every checklist item, and no two-flag lock. There is no early override. A pending advance is checked again when the confirmation is accepted. The gate is not tamper-proof against localStorage edits. |
| Moving back is always available | done | `phaseChangeDecision` | A phase Advance has already unlocked can be selected again. Higher phases stay locked until then. |
| Current phase is kept for existing saves | done | `migrate` `unlockedPhase` | An older save is not moved backward. `unlockedPhase` is at least the phase they were already on. |

## Session and timer

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| 30 minute timer with one stored deadline | done | `remainingMs`, `startSession` | Reopening subtracts elapsed time once. |
| Start, pause, resume, and clear | done | `#btnStart`, `#btnPause`, `#btnResume`, `#btnClear` | Clear asks first. Start stays off until clearance is saved. |
| Check off exercises only during a session | done | `toggleCheckState`, `renderSections` | Boxes stay disabled until a session starts. |
| Finish workout opens a check-in, then logs the day | done | `#btnFinish`, `#checkinModal` | Ticking the last box does not log by itself. |
| Each gym day counts at most once | done | `applyCompletion` | |
| Rest days are not logged | done | `canStartSession`, `isGymDayKey` | Start is refused, and Finish does not write a completion. |
| Timer expiry keeps checkboxes and asks | done | `expireIfDue`, `#expiryConfirm` | Log anyway opens the same check-in, or discard. |
| Something's wrong stops without logging | done | `#btnSomethingWrong` | Ends the session and leaves the completion count alone. |

## Checklist

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise checkboxes, doses, notes, and muscle tags | done | `renderSections` | Section headings show how many exercises are in that phase, not a fixed minute guess. |
| Accordion sections | done | `[data-section]` | |
| Progress bar and sticky status | done | `#progressFill`, `#statusBar` | |
| Phase 1 advancement criteria | done | `PHASE_CHECKLISTS[1]` | Shared checks, plus full extension with no quad lag, plus sit-to-stand with no hands and no knee collapse. |
| Phase 2 advancement criteria | done | `PHASE_CHECKLISTS[2]` | Shared checks, plus a supported split squat to about 90 degrees without the knee caving in, plus even weight in a squat. |
| Older checklist ticks are kept | done | `sanitizeChecklist` | New ids stay unticked. Symptom scores never tick a box. |

## Safety

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Train-smart banner | done | `.safety` | Comfortable range, sharp pain is a stop, not medical advice, no running or plyometrics until cleared. |
| First-run clearance | done | `#clearanceModal`, `store.clearance` | Checkbox plus date. Start stays disabled until it is saved. Review clearance opens it again. |
| Red-flag panel on every screen size | done | `#redFlags` | Giving way, locking or catching, a hot or markedly swollen knee, calf pain or swelling (possible blood clot, urgent), and pain that wakes you at night. The night-pain line is a placeholder pending the PT's full program. |

## Symptoms

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Pain during the session, 0 to 10 | done | `#painDuring`, `applySessionCheckin` | Stored at `store.symptoms[day]` in this browser only. |
| Next-morning swelling and pain | done | `#morningFields`, `pendingMorning` | Asked on a later calendar day, or with the next check-in if it is still open. |
| Flag advice | done | `symptomFlagged`, `#symptomAdvice` | Pain at or below 2/10 that settles to 2/10 or less within 24 hours is acceptable. Pain above 2 during, next-morning pain above 2, or next-morning swelling is a flag. Swelling advice says to cut volume by about 30%. The listed doses are not changed. |
| Flagged work does not move the week | done | `weekCredit` | The listed dose text is not rewritten. |
| Two flags in a row lock Advance | done | `consecutiveFlagLock` | A later clean session turns Advance back on. Flags never tick the checklist. A skipped next-morning check does not count toward the two-in-a-row lock. |

## Calendar

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Tue-Sat week, with Sundays and Mondays off | done | `renderCalendar` | |
| Optional third gym day | done | `#thirdDay` | Friday morning and Friday night both make Friday a gym day. Phase 1 stays at 3 days, not 4 or 5. |
| Tap a gym day to select it | done | `[data-day]` | |
| Stale selected day from another week resets | done | `resolveActiveDay`, `tick` | Runs on load and when the date changes. |

## Demo videos

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise demos from the video library | done | `docs/video-library.js`, `demo_ids` | New exercises ship with an empty list. URLs are not invented. |
| Featured demos and "How it's organized" | done | `renderFeatured` | Also renders when a stored session has already expired. |
| Unknown video id is skipped | done | `resolveVideo`, `resolveDemoList` | A console warning is logged and the page still loads. |

## Storage

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| localStorage key `awc-demo-v1` | done | `LS_KEY` | The key name is unchanged so existing browsers keep their data. |
| Version 2 migration | done | `migrate` | Missing or older saves are validated and written back. Phase, checklist, completions, session deadline, symptoms, clearance, and history are kept when they are valid. |
| Current phase stored on `unlockedPhase` | done | `migrate` | Set to the current phase on older saves. The picker reads it. |
| Session counts above the 9-session target | done | `sanitizePhaseSessions`, `cappedSessionCount` | The stored count is kept. The progress line shows at most 9. Week doses and the Advance gate use the real count. |
| Corrupt JSON or a broken field | done | `loadStoreFromRaw` | Fresh defaults, or that field reset, plus a one-time message. The page is not left blank. |
| Backup before replacing unreadable saved data | done | `backupRawBeforeSave`, `boot` | The original string is copied to `awc-demo-v1.bak-<timestamp>`. The page says when that backup was stored. |
| Old backups are trimmed | done | `pruneBackups` | The newest 3 backup keys are kept. |

## Notes

The prompt file was truncated, so most doses, all of Phase 3, the symptom thresholds, and the red flags are not from the PT's full program. None of that content is presented as approved.

- Every set, rep, hold, and week dose is a placeholder pending the PT's full program.
- All of Phase 3 is a placeholder, including the Bulgarian split squat and the week-3 dumbbells on that exercise.
- "Pain that wakes you at night" on the red-flag panel is a placeholder pending the PT's full program.
- Pain at or below 2/10 that settles to 2/10 or less within 24 hours is acceptable. Next-morning swelling is advice to cut volume by about 30%. The app does not change a dose on its own.
- The gate is not tamper-proof against localStorage edits.
- A skipped next-morning check does not count toward the two-in-a-row lock.
