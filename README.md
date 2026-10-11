# Adaptive Workout Coach

[Open the app](https://jhanisusM.github.io/adaptive-workout-coach/)

**A guided 30-minute workout app anyone can follow, even with no routine,
no plan, and no experience.** Pure HTML, CSS, and JavaScript. No build step,
no server, no accounts, no tracking. Open the URL and work out.

## Disclaimer

Adaptive Workout Coach is general fitness information, not medical advice,
diagnosis, or treatment, and it does not create a patient relationship of any kind.
Talk to your physician or physical therapist before starting, especially after
an injury, surgery, or time on crutches. Stop and get medical help if you have
sharp pain, your knee gives way or locks, or you have calf pain or swelling,
chest pain, or shortness of breath.

By using this app you accept that exercise carries a risk of injury and you do
so voluntarily and at your own risk. The app is provided "as is", without
warranty of any kind, and the authors are not liable for any injury, loss, or
damage arising from its use.

## The program

A 3-phase program, about 3 weeks per phase. The default week is Tuesday and
Thursday, and you can choose other workout days in Settings. It follows a
stability, then supported single-leg, then loaded single-leg progression
for someone coming back after a long time off their feet. It is a workout
companion, not a personal prescription.

- **Phase 1 "Stability & Tissue Tolerance"** (14 exercises): low-load
  holds, glute activation, and balance. Holds are a starting point, not a
  treatment for pain. No deep, loaded knee bending. Includes a Spanish squat
  hold around 30 to 45 degrees, band terminal knee extension, clamshells,
  side-lying hip abduction, calf raises, and a high-box sit-to-stand.
- **Phase 2 "Supported Unilateral"** (13 exercises): supported split squat,
  low step-up, kickstand-stance single-leg RDL, single-leg bridge, band side-step, and a
  supported single-leg calf raise. Reduce hand support before adding load.
  Do not add range and load in the same week.
- **Phase 3 "Complex Unilateral Loading"** (15 exercises): a placeholder
  until the full program is confirmed. The Bulgarian split squat starts here
  at bodyweight, low rear foot, 3 x 6 each side. Week-3 dumbbells on that
  exercise are a placeholder too. Lateral step-downs, reverse lunges, and
  single-leg calf raises are in this phase.

Sets, reps, holds, week doses, and the 2/10 and 30 percent figures are
placeholder rules of thumb pending professional confirmation.

Weeks inside a phase are minimums. The checklist decides when you move on.
Moving up happens only through Advance, after 9 logged sessions and every
checklist item. Moving back is always available. A phase you have not
unlocked stays locked. There is no button to skip ahead.

Each phase has its own week 1, week 2, and week 3 doses. One thing changes
at a time (reps, then hold time or load). A flagged session does not move
you to the next week's dose.

No running or plyometrics until you are cleared for them separately.

## Key features

- **30-minute timer with a single stored deadline.** Closing and reopening
  the browser resumes with the correct time left; it can never double-subtract.
- **Full session lifecycle**: start, pause, resume, clear (with confirmation),
  finish, timer expiry. Finish asks for pain during the session before the
  day is logged. The next visit asks about morning swelling and pain.
- **Per-exercise checklists**, accordion sections, progress bar, sticky status
  bar, big legible dose labels.
- **Weekly calendar.** The full week is shown. Choose which weekdays are
  workout days in Settings (the menu in the header). The default is Tuesday
  and Thursday. A day that is off is a rest day and is not logged. Each
  chosen day counts once.
- **How it's organized.** The foundation and accessory note lives in the
  info panel in the header, not in the main flow.
- **Demo videos.** A section on the page lists every exercise with one
  YouTube demo. The same player sits next to that exercise in the routine.
  Players use the privacy-enhanced YouTube domain.
- **Symptom flags.** Pain at or below 2/10 that settles to 2/10 or less
  within 24 hours is an acceptable rule of thumb. Pain above that, or
  next-morning swelling, is a flag. Swelling advice says to cut volume by
  about 30%. Two flagged sessions in a row turn Advance off until a later
  session is clean. The app does not tick the checklist for you and does
  not rewrite doses.
- **In-session demos from a topic-organized video library**
  (`docs/video-library.js`). To swap an exercise's in-session videos, edit
  only that file or that exercise's `demo_ids`. The separate `video_url`
  field is the one YouTube link shown in Demo videos and beside the
  exercise. URLs are only added when verified; they are never invented.
- **Privacy by design.** Progress lives in the browser's localStorage under
  `awc-demo-v1`. Nothing leaves the device.

## Run it

**Live:** https://jhanisusM.github.io/adaptive-workout-coach/
(deploys from the `docs/` folder on every push to `main`, usually live in
1 to 3 minutes).

**Locally:** serve the `docs/` folder with any static file server:

```bash
cd docs && python3 -m http.server 8000
```

then open http://localhost:8000.

## Tests

```bash
npm test
```

That runs `node --test` on `test/`. jsdom is a dev dependency. Nothing from
`node_modules` is copied into `docs/`. GitHub Actions runs `npm ci` and
`npm test` on pull requests (`.github/workflows/test.yml`).

## Project structure

```
adaptive-workout-coach/
├── docs/
│   ├── index.html         # App shell
│   ├── styles.css         # Styles, native CSS, light/dark aware
│   ├── app.js             # All app logic: phases, timer, calendar, checklist
│   └── video-library.js   # Topic-organized demo video library (edit this to swap videos)
├── test/                  # node:test suites (not served)
├── FEATURES.md            # Feature list and where each one lives
├── llms.txt               # Plain-language summary for AI crawlers/bots
└── README.md
```

## Safety note

This is a workout companion, not medical advice. Train within a comfortable
range. Sharp pain is a stop sign: skip the move. If you train around an
injury or medical condition, follow your clinician's guidance; the app
supplements it, never replaces it.

## Privacy

No accounts, no analytics, no tracking, no personal data. Everything stays in
your browser. If a save cannot be read, the previous text is copied to a
`awc-demo-v1.bak-<timestamp>` key in this browser and the page says so. Only
the latest few backups are kept.

## License

The source is public on GitHub. All rights reserved. No license is granted
to copy or reuse this project.
