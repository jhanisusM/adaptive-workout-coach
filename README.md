# Adaptive Workout Coach

[Open the app](https://jhanisusM.github.io/adaptive-workout-coach/)

**A guided 35-minute strength workout with dumbbells and resistance bands,
one move at a time.** Press Start once and follow along: the app shows each
move, counts down timed ones, runs the rests, and moves on by itself. Pure
HTML, CSS, and JavaScript. No build step, no server, no accounts, no
tracking.

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

Stop and contact your clinician if you notice any of these:

- The knee gives way
- Locking or catching in the knee
- The knee is hot or markedly swollen
- Pain that wakes you at night
- Fever, or numbness or tingling
- Calf pain, swelling, warmth, or redness. This can be a blood clot. Shortness of breath or chest pain needs urgent care.

If something is wrong, stop and contact your clinician before you train again.

## The program

One 35-minute session (`SESSION_MINUTES` in `docs/program.js`), from Ask
AI's program synthesis. Each session draws new moves from the 51 in the
exercise list.

- **Warm-up, about 5 minutes:** a pulse raiser, a hip hinge, a shoulder
  move, a glute move, and a squat pattern.
- **Main, about 25 minutes:** 8 moves, 2 per focus area, in this order:
  lower body, upper body, knee strength and stability, arms. Lower-body
  moves are 3 straight sets (2 when the session would run past 36
  minutes), the others 2. Rest is 45 seconds after lower-body sets and 30
  seconds after the rest. Every session uses both dumbbells and bands.
- **Knee group:** no jumping, no running, no deep or loaded knee bends, and
  no dumbbells. Wall sits stay shallow. Every knee screen says "Stop if you
  feel sharp pain."
- **Cool-down, about 5 minutes:** an easy walk and four stretches.

Doses are starting points from the synthesis, not a personal prescription.

## How a session runs

- The start screen shows the length, the number of exercises, and the
  warm-up / main / cool-down breakdown. The move list stays folded.
- Rep moves wait for **Done**. Timed moves count down and move on at zero;
  Done ends them early. Rests start by themselves and show what is up next,
  with **Skip rest**.
- **Pause / Resume**, **Skip exercise**, and **End** (with a confirm) are
  always on screen. The main button is large and above the fold on phones.
- Reloading the page resumes the same move and time. Finishing shows
  "Workout complete" with exercises done and total time, and marks the day
  on the weekly calendar.
- One demo video at a time, never autoplaying, from YouTube's
  privacy-enhanced domain. Later sets show no video.
- The screen stays awake during a session where the browser supports it.

Saves from the earlier phase and workout-type versions load quietly: the
trained days are kept, and the phase, type, checklist, and check-in data
are dropped.

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
npm ci && npm test
```

That runs `node --test` on `test/`: the shared session engine, the session
builder, the store migration, and a jsdom page test that clicks through a
whole session. jsdom is a dev dependency. Nothing from `node_modules` is
copied into `docs/`. GitHub Actions runs the same on pull requests
(`.github/workflows/test.yml`).

`docs/session-engine.js`, `docs/session-screens.js`, `docs/session.css`, and
`test/session-engine.test.js` are shared with the kids workout app and must
stay identical; `test/shared-files.test.js` checks them against
`shared-files.sha256`.

## Project structure

```
adaptive-workout-coach/
├── docs/
│   ├── index.html          # Page shell, CSP
│   ├── session-engine.js   # Guided session state machine (shared)
│   ├── session-screens.js  # Start, exercise, rest, finish screens (shared)
│   ├── session.css         # Layout and session styles (shared)
│   ├── program.js          # The 51 moves and the 35-minute session builder
│   ├── app.js              # Calendar store, old-save migration, page wiring
│   ├── styles.css          # Colors, light/dark aware
│   └── specs/guided-session.md
├── test/                   # node:test suites and fixtures (not served)
├── shared-files.sha256     # Hashes of the files shared with the kids app
├── FEATURES.md             # Feature list, status, and web test reference
├── llms.txt                # Plain-language summary for AI crawlers/bots
└── README.md
```

## Safety note

This is a workout companion, not medical advice. Train within a comfortable
range. Sharp pain is a stop sign: skip the move. Bands: check for nicks and
anchor them on something stable. Dumbbells: clear the floor and control the
lowering. If you train around an
injury or medical condition, follow your clinician's guidance; the app
supplements it, never replaces it.

## Privacy

No accounts, no analytics, no tracking, no personal data. Everything stays in
your browser: trained days under `awc-demo-v1`, and an active session under
`awc-guided-session-v1` until it ends. If the browser refuses to save, the
page says so and the workout still runs. If a save cannot be read, the previous text is copied to a
`awc-demo-v1.bak-<timestamp>` key in this browser and the page says so. Only
the latest few backups are kept.

## License

The source is public on GitHub. All rights reserved. No license is granted
to copy or reuse this project.
