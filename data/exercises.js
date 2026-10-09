'use strict';

const { resolveVideo } = require('./video-library');

/**
 * Exercise catalog: the single source of truth for the routine.
 *
 * block: 'foundation' = fixed foundation core (warm-up, stability, cool-down).
 *        'accessory' = loaded strength work. Future upper-body / back / arms
 *        exercises slot into the 'accessory' block without redesigning
 *        anything: just add entries here with block: 'accessory'.
 *
 * muscle_groups: free-form tags used for filtering and for planning the
 * future full-body expansion.
 *
 * demo_ids: references into data/video-library.js. To swap an exercise's
 * videos, change only its demo_ids list (or edit the library itself).
 * Exercises with no verified demo intentionally have an empty array.
 * Never invent demo URLs. At load time each demo_ids list is resolved to
 * full video objects on `demos`, so downstream code keeps working unchanged.
 */

const SECTIONS = [
  { id: 'warmup',    title: 'Warm-up',                     duration: '4 min',            block: 'foundation' },
  { id: 'strength',  title: 'Strength',                    duration: '18 min · rest 30s', block: 'accessory' },
  { id: 'stability', title: 'Stability & shock absorbers', duration: '5 min',            block: 'foundation' },
  { id: 'cooldown',  title: 'Cool-down',                   duration: '3 min',            block: 'foundation' },
];

const EXERCISES = [
  // ---- Warm-up (foundation block) ----
  {
    id: 'ankle-pumps-heel-slides',
    section: 'warmup',
    name: 'Ankle pumps + heel slides',
    note: 'Lie flat. Slide each heel toward your butt, then pump the ankles.',
    dose: '2 min · 20 each',
    muscle_groups: ['calves', 'quads'],
    demo_ids: ['v-chauhan-top9', 'v-jag-post-op', 'v-crp-acl'],
  },
  {
    id: 'quad-sets',
    section: 'warmup',
    name: 'Quad sets',
    note: 'Tighten your thigh and press the knee into the floor or mat.',
    dose: '15 × 5-sec hold',
    muscle_groups: ['quads'],
    demo_ids: ['v-jag-quad-sets', 'v-chauhan-quad-iso', 'v-bobbrad-knee-ext'],
  },

  // ---- Strength (accessory block, loaded work) ----
  {
    id: 'goblet-squat',
    section: 'strength',
    name: 'Goblet squat / dumbbell squat-to-bench',
    note: 'Hold one dumbbell at your chest. Use the bench as a depth target and keep every rep pain-free.',
    dose: '3 × 8–10',
    muscle_groups: ['quads', 'glutes'],
    demo_ids: [],
  },
  {
    id: 'bulgarian-split-squat',
    section: 'strength',
    name: 'Bulgarian split squat',
    note: 'Keep the front foot planted and use a comfortable range. Start light and add load only with good control.',
    dose: '3 × 8 each side',
    muscle_groups: ['quads', 'glutes'],
    demo_ids: [],
  },
  {
    id: 'step-ups',
    section: 'strength',
    name: 'Step-ups with dumbbells',
    note: 'Drive through the working foot and lower slowly without dropping from the step.',
    dose: '3 × 8 each side',
    muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-stepup'],
  },
  {
    id: 'db-romanian-deadlift',
    section: 'strength',
    name: 'Dumbbell Romanian deadlift',
    note: 'Hinge at the hips with soft knees, a long spine, and the dumbbells close to your legs.',
    dose: '3 × 10',
    muscle_groups: ['hamstrings', 'glutes'],
    demo_ids: [],
  },
  {
    id: 'single-leg-rdl',
    section: 'strength',
    name: 'Single-leg RDL',
    note: 'Keep the hips level and use a light dumbbell or support as needed for balance.',
    dose: '3 × 8 each side',
    muscle_groups: ['hamstrings', 'glutes'],
    demo_ids: ['v-djkim-slrdl', 'v-pauli-slrdl', 'v-e3-slrdl'],
  },
  {
    id: 'straight-leg-raises',
    section: 'strength',
    name: 'Straight leg raises',
    note: 'Lie flat, keep the working knee straight, and lift the heel slowly.',
    dose: '3 × 10 each leg',
    muscle_groups: ['quads'],
    demo_ids: [],
  },
  {
    id: 'glute-bridges',
    section: 'strength',
    name: 'Glute bridges',
    note: 'Both feet down.',
    dose: '3 × 12',
    muscle_groups: ['glutes'],
    demo_ids: [],
  },

  // ---- Stability (foundation block) ----
  {
    id: 'spanish-squat-hold',
    section: 'stability',
    name: 'Spanish squat hold with band',
    note: 'Anchor the band behind both knees and sit back into the hold. For more load, hold a dumbbell goblet-style.',
    dose: '3 × 30 sec',
    muscle_groups: ['quads'],
    demo_ids: ['v-kneehaber-spanish'],
  },
  {
    id: 'split-squat-hold',
    section: 'stability',
    name: 'Split-squat hold',
    note: 'Hold a comfortable split-squat depth with the front foot fully planted and the torso tall.',
    dose: '~30 sec each side',
    muscle_groups: ['quads', 'glutes'],
    demo_ids: ['v-kneehaber-split'],
  },
  {
    id: 'single-leg-balance-supported',
    section: 'stability',
    name: 'Single-leg balance (supported)',
    note: 'Hand on wall.',
    dose: '3 × 20 sec each side',
    muscle_groups: ['stability'],
    demo_ids: [],
  },

  // ---- Cool-down (foundation block) ----
  {
    id: 'hamstring-stretch',
    section: 'cooldown',
    name: 'Hamstring stretch',
    note: 'Ease into the stretch; no bouncing.',
    dose: '30 sec each',
    muscle_groups: ['hamstrings'],
    demo_ids: ['v-bobbrad-hamstring', 'v-weshape-stretch'],
  },
  {
    id: 'calf-stretch',
    section: 'cooldown',
    name: 'Calf stretch at wall',
    note: 'Keep the back heel grounded.',
    dose: '30 sec each',
    muscle_groups: ['calves'],
    demo_ids: ['v-sommer-calf', 'v-hoopes-calf', 'v-bobbrad-calf'],
  },
  {
    id: 'backward-walk',
    section: 'cooldown',
    name: 'Backward walk',
    note: 'Use a clear, level path and move with control.',
    dose: '1 min',
    muscle_groups: ['quads', 'calves'],
    demo_ids: ['v-maloney-backward', 'v-benpatrick-backward'],
  },
];

/* Featured demos: ids into the video library, resolved to full video
 * objects below. To rotate the featured set, change only these ids. */
const FEATURED_DEMO_IDS = ['v-djkim-featured', 'v-kneehaber-featured', 'v-pauli-featured'];
const FEATURED_DEMOS = FEATURED_DEMO_IDS.map(resolveVideo);

/* Resolve every exercise's demo_ids into full video objects from the
 * video library. `demos` keeps working for all downstream code (server
 * responses, phase resolution, clients), while the catalog itself only
 * carries ids. Swapping videos never requires touching this file. */
for (const ex of EXERCISES) {
  ex.demos = ex.demo_ids.map(resolveVideo);
}

/* ---------------- Phases (PT-approved 3-phase program) ----------------
 *
 * The program runs in 3 phases x ~3 weeks each, 3 sessions per week
 * (SESSIONS_PER_PHASE = 9 sessions per phase).
 *
 * Each phase lists its exercises in order. A phase entry can override the
 * catalog dose (dose) or the catalog note (note). Use note_append to ADD a
 * phase-specific coaching cue after the catalog note instead of replacing it.
 * Demo URLs are never invented here: exercises resolve their demos from the
 * video library via demo_ids, and new exercises intentionally have an empty
 * demo_ids array.
 */

const SESSIONS_PER_PHASE = 9;

const PHASES = [
  {
    id: 1,
    name: 'Reactivate',
    weeks: 'Weeks 1-3',
    goal: 'Quad activation, range of motion, balance. No loaded knee bending.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'straight-leg-raises' },
      { exercise_id: 'glute-bridges' },
      { exercise_id: 'single-leg-balance-supported' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk', note_append: 'Slow. Only once normal forward walk feels steady.' },
    ],
  },
  {
    id: 2,
    name: 'Reload',
    weeks: 'Weeks 4-6',
    goal: 'Reintroduce loaded patterns. Bilateral before unilateral.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'goblet-squat', dose: '3 × 8', note_append: 'Light load. Phase 2 dose.' },
      { exercise_id: 'step-ups', dose: '3 × 8 each side', note_append: 'Low step, bodyweight to light dumbbells.' },
      { exercise_id: 'db-romanian-deadlift', dose: '3 × 10', note_append: 'Light load.' },
      { exercise_id: 'spanish-squat-hold', dose: '3 × 20 sec' },
      { exercise_id: 'split-squat-hold', dose: '~20 sec each side' },
      { exercise_id: 'single-leg-rdl', dose: '3 × 6 each side', note_append: 'Bodyweight with wall support.' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
  {
    id: 3,
    name: 'Return',
    weeks: 'Weeks 7-9',
    goal: 'The full routine. Bulgarian split squats enter here.',
    exercises: [
      { exercise_id: 'ankle-pumps-heel-slides' },
      { exercise_id: 'quad-sets' },
      { exercise_id: 'goblet-squat' },
      { exercise_id: 'bulgarian-split-squat' },
      { exercise_id: 'step-ups' },
      { exercise_id: 'db-romanian-deadlift' },
      { exercise_id: 'single-leg-rdl' },
      { exercise_id: 'spanish-squat-hold' },
      { exercise_id: 'split-squat-hold' },
      { exercise_id: 'hamstring-stretch' },
      { exercise_id: 'calf-stretch' },
      { exercise_id: 'backward-walk' },
    ],
  },
];

/**
 * Advancement checklist. The user must confirm every item before the
 * "advance to the next phase" action is allowed.
 */
const ADVANCEMENT_CHECKLIST = [
  { id: 'no-swelling', label: 'No swelling after sessions' },
  { id: 'pain-ok', label: 'Pain 2/10 or less during, zero the next morning' },
  { id: 'good-control', label: 'Every set completed with good control' },
];

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

/**
 * Resolve a phase into its concrete program: the phase's ordered exercises
 * with catalog fields merged and phase-specific doses/notes applied.
 * Returns { id, name, weeks, goal, sessions_target, exercises: [...] } where
 * each exercise carries { id, section, name, note, dose, muscle_groups,
 * demos, order }.
 */
function resolvePhase(phaseId) {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) throw new Error('unknown phase: ' + phaseId);
  const exercises = phase.exercises.map((entry, i) => {
    const base = EXERCISE_BY_ID.get(entry.exercise_id);
    if (!base) throw new Error('unknown exercise in phase ' + phaseId + ': ' + entry.exercise_id);
    let note = entry.note !== undefined ? entry.note : base.note;
    if (entry.note_append) note = note + ' ' + entry.note_append;
    return {
      id: base.id,
      section: base.section,
      name: base.name,
      note,
      dose: entry.dose !== undefined ? entry.dose : base.dose,
      muscle_groups: base.muscle_groups,
      demos: base.demos,
      order: i,
    };
  });
  return {
    id: phase.id,
    name: phase.name,
    weeks: phase.weeks,
    goal: phase.goal,
    sessions_target: SESSIONS_PER_PHASE,
    exercises,
  };
}

module.exports = { SECTIONS, EXERCISES, FEATURED_DEMOS, PHASES, ADVANCEMENT_CHECKLIST, SESSIONS_PER_PHASE, resolvePhase };
