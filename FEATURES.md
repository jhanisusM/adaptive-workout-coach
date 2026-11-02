# Features

What the app in `docs/` does today. The page is static HTML, CSS, and JavaScript with no build step. Progress is stored in this browser under the key `awc-demo-v1` (schema version 3).

Status is one of: planned, in progress, done, removed.

Run the tests with `npm test` (dev-only; nothing from `node_modules` is shipped to `docs/`). Pull requests run the same command in GitHub Actions.

## Program and phases

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Three phases: Stability & Tissue Tolerance, Supported Unilateral, Complex Unilateral Loading | done | `docs/app.js` `PHASES`, `docs/index.html` `#phasePicker` | Names follow the prompt heading and its description of the later phases. Phase 1 has 14 exercises, Phase 2 has 13, Phase 3 has 15. The routine view now shows the selected workout type list instead of a phase program; PHASES still drives the phase card, checklist, and knee session counts. |
| Phase 1 avoids deep loaded knee bending | done | `PHASES[0]`, `loaded_knee_flexion` | Spanish squat hold at about 30 to 45 degrees, band TKE, clamshell, side-lying hip abduction, two-foot calf raises, and high-box sit-to-stand are in. Holds are a starting point, not a treatment for pain. Chair sit-to-stand with no hands stays a checklist item too. |
| Bulgarian split squat starts in Phase 3 | done | Phase 3 `bulgarian-split-squat` | Placeholder phase. Bodyweight, low rear foot, `3 x 6` each side in week 1. Week-3 dumbbells are a placeholder. Lateral step-down and reverse lunge are in this phase only. |
| Week doses inside a phase | done | `doses`, `phaseWeek`, `weekCredit` | Placeholder sets, reps, holds, and week steps. Sessions 0-2 use week 1, 3-5 use week 2, 6 or more use week 3. The count is the real stored total, minus flagged or unfinished morning checks. One variable changes per week. |
| Weeks are minimums | done | phase `goal`, `#weekNote` | The checklist decides when a phase changes. No running or plyometrics until separately cleared. |
| Move up only through Advance | done | `advanceDecision`, `#advanceBtn`, `commitPhase` | Needs 9 logged sessions in the phase, every checklist item, and no two-flag lock. There is no early override. A pending advance is checked again when the confirmation is accepted. The gate is not tamper-proof against localStorage edits. |
| Moving back is always available | done | `phaseChangeDecision` | A phase Advance has already unlocked can be selected again. Higher phases stay locked until then. |
| Current phase is kept for existing saves | done | `migrate` `unlockedPhase` | An older save is not moved backward. `unlockedPhase` is at least the phase they were already on. |

## Workout types

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Workout type pills: knee strengthening, upper body, lower body | done | `docs/index.html` `#typePicker`, `docs/app.js` `typeRoutine` | The selected pill chooses which 15-exercise list is shown. Rows show the exercise name plus its note. Doses are blank because the source array has none. |
| Knee workouts keep phases | done | `docs/app.js` `typeRoutine`, `renderAll`, `#phaseCard` | The knee pill shows the new 15-exercise knee list no matter which phase is selected. The Phase 1 to 3 picker, advancement checklist, and 9-session counts stay and track progress. |
| Upper and lower workouts are flat lists | done | `renderAll`, `#phaseCard` | The phase card is hidden while upper body or lower body is selected, and shown again for knees. |
| Pills lock during a session | done | `selectWorkoutType`, `renderTypePicker` | Pills are disabled while a session is running, paused, or expired and unresolved. They unlock when the session ends, is logged or discarded after expiry, or is cleared. Switching is free with no session running. |
| Selected type is stored | done | `migrate`, `sanitizeWorkoutType` | Stored as `workoutType` under the same key. Older saves load with knee strengthening. The legacy `workoutDays` and `activeDay` fields still load but are consulted by no behavior. |
| Phase sessions count knee workouts only | done | `applyCompletion`, `sessionWorkoutType` | Finishing an upper-body or lower-body workout logs the day on the calendar but does not add to a phase session count. A session saved before types existed counts like a knee session. |

## Session and timer

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| 30 minute timer with one stored deadline | done | `remainingMs`, `startSession` | Reopening subtracts elapsed time once. |
| Start, pause, resume, and clear | done | `#btnStart`, `#btnPause`, `#btnResume`, `#btnClear` | Clear asks first. Start does not wait on a clearance pop-up. Start works any day and logs today, with no day to pick first. |
| Start works any day | done | `canStartSession`, `startSession` | No day gate. The session day is today. |
| Check off exercises only during a session | done | `toggleCheckState`, `renderSections` | Boxes stay disabled until a session starts. |
| Finish workout opens a check-in, then logs today | done | `#btnFinish`, `#checkinModal` | Ticking the last box does not log by itself. |
| Each day counts at most once | done | `applyCompletion` | |
| Rest days are not logged | removed | | Day selection is gone. Start works any day and logs today. A session already running still logs its own day. |
| Timer expiry keeps checkboxes and asks | done | `expireIfDue`, `#expiryConfirm` | Log anyway opens the same check-in, or discard. |
| Something's wrong stops without logging | removed | | Removed from the app. It now lives only in the README Disclaimer. |

## Checklist

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise checkboxes, doses, notes, and muscle tags | done | `renderSections` | Section headings show how many exercises are in the list, not a fixed minute guess. New workout type rows show a name and note with a blank dose. |
| Accordion sections | done | `[data-section]` | |
| Progress bar and sticky status | done | `#progressFill`, `#statusBar` | |
| Phase 1 advancement criteria | done | `PHASE_CHECKLISTS[1]` | Shared checks, plus full extension with no quad lag, plus sit-to-stand with no hands and no knee collapse. |
| Phase 2 advancement criteria | done | `PHASE_CHECKLISTS[2]` | Shared checks, plus a supported split squat to about 90 degrees without the knee caving in, even weight in a squat, a lateral step-down with no more than one form fault, and no flare for the last 2 weeks. Strength near 80 percent of the other side is mentioned as an optional check, not a required box. |
| Older checklist ticks are kept | done | `sanitizeChecklist` | New ids stay unticked. Symptom scores never tick a box. |

## Safety

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Train-smart banner | done | `.safety` | Comfortable range, sharp pain is a stop, not medical advice, no running or plyometrics until cleared. |
| Disclaimer footer | done | `#disclaimerFooter` | Fixed line, exact text "Personal research project. Not medical advice; use at your own risk." The line links to the README Disclaimer on GitHub. No pop-up. |
| First-run clearance | removed | | The pop-up is gone. Older saves that stored clearance still load, and that field is dropped. Start is not blocked by it. |
| Red-flag panel on every screen size | removed | | Removed from the app. It now lives only in the README Disclaimer. |

## Symptoms

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Pain during the session, 0 to 10 | done | `#painDuring`, `applySessionCheckin` | Stored at `store.symptoms[day]` in this browser only. |
| Next-morning swelling and pain | done | `#morningFields`, `pendingMorning` | Asked on a later calendar day, or with the next check-in if it is still open. |
| Flag advice | done | `symptomFlagged`, `#symptomAdvice` | Rule of thumb: pain at or below 2/10 that settles to 2/10 or less within 24 hours is acceptable. Pain above 2 during, next-morning pain above 2, or next-morning swelling is a flag. Swelling advice says to cut volume by about 30%. The listed doses are not changed. |
| Flagged work does not move the week | done | `weekCredit` | The listed dose text is not rewritten. |
| Two flags in a row lock Advance | done | `consecutiveFlagLock` | A later clean session turns Advance back on. Flags never tick the checklist. A skipped next-morning check does not count toward the two-in-a-row lock. |

## Calendar

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Sun-Sat week | done | `renderCalendar`, `weekStart` | Read-only progress view. Logged days show a check mark and today is highlighted. No day is selectable. |
| Workout days in Settings | removed | | The Settings modal and the hamburger button are gone. Every day is a workout day now. Older saves that stored workoutDays still load, and that field is no longer consulted. |
| Optional third gym day | removed | | Replaced by the weekday checkboxes. An older Friday or Saturday choice becomes those weekdays. |
| Tap a workout day to select it | removed | | The calendar is read-only. Tapping a day does nothing. |
| Stale selected day from another week resets | removed | | There is no selected day anymore. The calendar re-renders when the date changes. |

## Demo videos

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Per-exercise demos from the video library | done | `docs/video-library.js`, `demo_ids` | In-session clips. Each workout type exercise has one verified demo. URLs are not invented. |
| Workout type exercises have verified demos | done | `typeRoutine`, `docs/video-library.js` | All 45 exercises have one verified demo each. Routine rows show the player plus Watch demo. The Demo videos section lists the current workout's 15 demos and updates when the pills switch. |
| Demo videos section | done | `#demoVideos`, `video_url` | One YouTube link per exercise, shown there and beside the exercise note. The section follows the selected workout type. The player uses youtube-nocookie.com. Watch demo opens youtube.com/watch. Only YouTube hosts are accepted. |
| How it's organized | done | `#btnInfo`, `#infoPanel`, `#blockNote` | Header info panel, not a card in the main flow. Also fills when a stored session has already expired. |
| Featured demo cards | removed | | The sidebar cards are gone. The Demo videos section lists the current workout's 15 demos. |
| Unknown video id is skipped | done | `resolveVideo`, `resolveDemoList` | A console warning is logged and the page still loads. |
| Player allow list omits web-share | done | `videoEmbedHtml` | The iframe allow list is accelerometer, autoplay, clipboard-write, encrypted-media, gyroscope, and picture-in-picture. web-share is left out so the browser does not warn about an unrecognized permission. |

## Storage

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| localStorage key `awc-demo-v1` | done | `LS_KEY` | The key name is unchanged so existing browsers keep their data. |
| Version 3 migration | done | `migrate` | Missing or older saves are validated and written back. Phase, checklist, completions, session deadline, symptoms, and history are kept when they are valid. An older third-day choice becomes `workoutDays`. A stored clearance is dropped and does not by itself count as a partial repair. A stored `workoutType` is kept, a missing or bad one becomes knee strengthening, and a stored session keeps its type or defaults to knees. |
| Current phase stored on `unlockedPhase` | done | `migrate` | Set to the current phase on older saves. The picker reads it. |
| Session counts above the 9-session target | done | `sanitizePhaseSessions`, `cappedSessionCount` | The stored count is kept. The progress line shows at most 9. Week doses and the Advance gate use the real count. |
| Corrupt JSON or a broken field | done | `loadStoreFromRaw` | Fresh defaults, or that field reset, plus a one-time message. The page is not left blank. |
| Backup before replacing unreadable saved data | done | `backupRawBeforeSave`, `boot` | The original string is copied to `awc-demo-v1.bak-<timestamp>`. The page says when that backup was stored. |
| Old backups are trimmed | done | `pruneBackups` | The newest 3 backup keys are kept. |

## Page

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Favicon | done | `docs/favicon.svg`, `docs/index.html` | The header info icon (`.icon-info`, a circle with the letter i) on the app green. The page CSP `img-src` already allows `'self'`, so the icon can load from this site. |

## Notes

The prompt file was truncated, so most doses, all of Phase 3, and the symptom thresholds are not from the PT's full program. None of that content is presented as approved.

- Every set, rep, hold, and week dose is a placeholder rule of thumb pending professional confirmation.
- All of Phase 3 is a placeholder, including the Bulgarian split squat and the week-3 dumbbells on that exercise.
- The red-flag list and Something's wrong were removed from the app. They now live only in the README Disclaimer. The old on-page lines included "Pain that wakes you at night".
- The README Disclaimer says the app is general fitness information, not medical advice, and that use is voluntary and at your own risk. The page keeps one fixed footer line that links to that section.
- Pain at or below 2/10 that settles to 2/10 or less within 24 hours is an acceptable rule of thumb. Next-morning swelling is advice to cut volume by about 30%. The app does not change a dose on its own.
- Low-load holds are a starting point, not a treatment for pain.
- The gate is not tamper-proof against localStorage edits.
- A skipped next-morning check does not count toward the two-in-a-row lock.

## Visual restyle v2 (CSS only, preview)

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Bold gradient restyle, sage green left behind | preview | `docs/styles.css` | CSS only. No HTML, JS, layout, grid, breakpoint, spacing-structure, or wording changes. Same system font stack, no `url()`, no `@import`, no external images. Light mode unchanged: diagonal gradient wash background (`#eef2ff` lavender, `#ecfeff` pale cyan, `#fff1f2` pale rose) with solid white cards. Dark mode: near-black base (`#0B0B0F`, paper `#17171D`, line `#2B2B35`, soft surfaces `#23202E` / `#1B1F2B` / `#2B1A20` / `#29200F`) with vivid gradient glows; dark text stays light ink (`#f1f5f9`, 17.93:1 on the base; muted `#a5adcf`, 8.87:1). One electric accent gradient (`linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)`) is used identically for primary buttons, the status fill, and the progress fill in both modes. Cyan (`#06b6d4` family), coral (`#f43f5e` family), and amber (`#f59e0b`, used sparingly as an inset accent in `.advice`; `--amber` is `#b45309` light / `#fbbf24` dark) remain only as non-competing highlights (title gradient, accent bars, glows). Body text, exercise names, notes, and small text stay solid ink/muted colors, never gradient text, except the title and timer treatments. Cards stay solid so text contrast is unchanged. |
| Visible animated background | preview | `docs/styles.css` `body::before`, `v2-bg-drift` | Fixed decorative layer, `pointer-events: none`, below content (`.page` sits above it at `z-index: 1`), three large saturated radial gradients (violet, cyan, coral) at clearly visible but not garish opacity, drifting 36s `ease-in-out` alternate. Dark-mode variant uses stronger glows on the dark base. `prefers-reduced-motion` disables the animation; static gradients remain. No layout shift, no readability effect. |
| Gradient title, buttons, and fills | preview | `docs/styles.css` `h1`, `.btn`, `.status-fill`, `.progress-fill` | `h1` uses a DIRECT gradient (`linear-gradient(92deg, #6d28d9 0%, #4f46e5 42%, #0891b2 76%, #e11d48 100%)` with `-webkit-background-clip: text`, `background-clip: text`, `color: transparent`), not a CSS variable, with an `@supports not (background-clip: text)` fallback to solid ink and a lighter gradient in dark mode. Primary buttons use a bold gradient (`linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)`) with white text, hover lift plus an accent-family glow, and active press. Progress and status fills use the IDENTICAL single accent gradient (`linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)`) in both light and dark mode, with a soft accent glow; no cyan or coral gradient appears on any fill or primary button. Button gradient endpoints are dark enough for white text: `#6d28d9` is 7.10:1 and `#2563eb` is 5.17:1 against white, both above 4.5:1. White text is never put on cyan, coral, or amber. Dark-mode `.btn` text is `#fff`. Secondary and danger buttons unchanged in kind. |
| Gradient accents on chips, phase, timer, and cards | preview | `docs/styles.css` `.step-no`, `.phase-btn.active`, `.timer-panel`, `.dashboard::before`, `.phase-card::before` | Step-number chips use the violet-to-blue button gradient with white text. The active phase button uses a pale violet-to-blue gradient wash with a violet border (near-black tinted wash in dark mode). The timer panel gets a gradient wash, and the timer itself is now gradient text (see the signature-timer row). The dashboard and phase card get a thin 4px gradient accent edge via a `::before` bar, not a full gradient background, so text stays readable. Checked boxes use the same violet-to-blue gradient. |
| Signature timer with active pulse | preview | `docs/styles.css` `.timer`, `.timer.done`, `.status-bar.active ~ .dashboard .timer`, `v2-timer-pulse` | `.timer` uses a DIRECT gradient (`linear-gradient(92deg, #6d28d9 0%, #4f46e5 50%, #2563eb 100%)`, lighter violet/indigo/blue in dark mode: `#a78bfa` to `#818cf8` to `#60a5fa`), never a CSS variable, with an `@supports not (background-clip: text)` fallback to solid ink. While a session is active, the timer gets a soft pulsing glow (`v2-timer-pulse`, 3s `ease-in-out` alternate, text-shadow only, no layout change) via `.status-bar.active ~ .dashboard .timer`. That selector works because `.status-bar` and `.dashboard` are both direct children of `.page` in `docs/index.html`, status bar first, and `app.js` toggles `.active` while a session is running. `.timer.done` is placed after all timer gradient rules and has higher specificity than `.timer`, and resets background/clip, so done timers render solid red (`var(--red)`). |
| Micro-interactions | preview | `docs/styles.css` `.btn:hover`, `.status-fill`, `.progress-fill` | Primary buttons keep the hover lift and active press and add an accent-family glow on hover (`box-shadow` with violet/indigo, stronger in dark mode). Progress and status fills keep the width transition and add a soft accent glow (`box-shadow` in the violet/blue family). `prefers-reduced-motion` disables both the background drift and the timer pulse; static gradients remain. |
| Contemporary surfaces | preview | `docs/styles.css` | Card radii 18-20px (`--radius` 14px to 18px; dashboard and phase card at 20px, sections, side cards, and modal card at 18px), softer layered `--shadow`, sticky status bar with `backdrop-filter` blur and slight translucency (opaque `var(--paper)` fallback first; dark-mode translucent indigo fallback). `:focus-visible` rings and all existing interactive states kept. |
| Selector parity | preview | `docs/styles.css` | Every original selector still exists (174 baseline selectors, 0 missing; new selector tokens vs baseline are `body::before`, `.dashboard::before`, `.phase-card::before`, `.btn:hover`, `.btn:active`, `.btn.secondary:hover`, `.btn.danger:hover`, `.status-bar.active ~ .dashboard .timer`, `.status-bar.active ~ .dashboard .timer.done`, plus `from`/`to` in the v2 keyframes). Braces balance (239 open, 239 close). New file is 365 lines (baseline 258, v2 before refinement was 329). |

Preview only, not pushed: a standalone single-file preview with the refined CSS inlined alongside the main-branch `index.html` structure, `app.js`, and `video-library.js` was rebuilt locally for review (inlined CSS matches the refined `docs/styles.css` apart from leading/trailing newline normalization; no relative file references). No wording reframe is included here; the app still shows its current Phase 1 wording.
