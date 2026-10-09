# Adaptive Workout Coach

[Open the app](https://jhanisusM.github.io/adaptive-workout-coach/)

**A guided 30-minute workout app anyone can follow — even with no routine,
no plan, and no experience.** Pure HTML, CSS, and JavaScript. No build step,
no server, no accounts, no tracking. Open the URL and work out.

## The program

A PT-approved 3-phase program, about 3 weeks per phase, 3 sessions per week:

- **Phase 1 "Reactivate"** (8 exercises): quad activation, range of motion,
  balance. No loaded knee bending.
- **Phase 2 "Reload"** (11 exercises): light loaded patterns, bilateral
  before unilateral.
- **Phase 3 "Return"** (12 exercises): the full routine, including Bulgarian
  split squats.

A phase picker selects the current phase. Progression tracks completed
sessions toward 9 per phase. Moving up a phase requires confirming the
advancement checklist: no swelling after sessions, pain 2/10 or less during
with zero pain the next morning, every set completed with good control.

## Key features

- **30-minute timer with a single stored deadline.** Closing and reopening
  the browser resumes with the correct time left; it can never double-subtract.
- **Full session lifecycle**: start, pause, resume, clear (with confirmation),
  complete, timer expiry.
- **Per-exercise checklists**, accordion sections, progress bar, sticky status
  bar, big legible dose labels.
- **Tue–Sat gym calendar** (Sundays are for church, Mondays are rest) with a
  configurable third gym day. Tap a gym day to open that day's session.
- **Demo videos from a topic-organized video library**
  (`docs/video-library.js`). To swap an exercise's videos, edit only that one
  file. Demo URLs are only added when verified; they are never invented.
- **Privacy by design.** Progress lives in the browser's localStorage. Nothing
  leaves the device.

## Run it

**Live:** https://jhanisusM.github.io/adaptive-workout-coach/
(deploys from the `docs/` folder on every push to `main`, usually live in
1–3 minutes).

**Locally:** serve the `docs/` folder with any static file server:

```bash
cd docs && python3 -m http.server 8000
```

then open http://localhost:8000.

## Project structure

```
adaptive-workout-coach/
├── docs/
│   ├── index.html         # App shell
│   ├── styles.css         # Styles, native CSS, light/dark aware
│   ├── app.js             # All app logic: phases, timer, calendar, checklist
│   └── video-library.js   # Topic-organized demo video library (edit this to swap videos)
├── llms.txt               # Plain-language summary for AI crawlers/bots
└── README.md
```

## Safety note

This is a workout companion, not medical advice. Train within a comfortable
range — sharp pain is a stop sign: skip the move. If you train around an
injury or medical condition, follow your clinician's guidance; the app
supplements it, never replaces it.

## Privacy

No accounts, no analytics, no tracking, no personal data. Everything stays in
your browser.

## License

Private project — all rights reserved.
