'use strict';
/* Adaptive Workout Coach program: the 35-minute adult session.
 *
 * Source of truth: Ask AI's synthesis (exercise table, session rule,
 * timing check, safety notes). Names, descriptions, and YouTube URLs come
 * from Ask AI's checked exercises-adult.json pool (51 moves), used as given.
 *
 * Equipment is bodyweight, dumbbells, and resistance bands. Each main set
 * is its own screen. workSec estimates a reps set (about 3 seconds a rep,
 * 4 with a slow 3-second lowering, both sides for per-side moves) and only
 * feeds the time estimate. */
(function (root) {
  const SE = root.SessionEngine || (typeof require === 'function' ? require('./session-engine.js') : null);

  /* Change the session length here. Warm-up and cool-down stay about
   * 5 minutes each; the main block fills the rest. */
  const SESSION_MINUTES = 35;
  /* Synthesis: past 36 minutes, drop set 3 of the lower-body pair. */
  const DROP_SET3_OVER_SEC = (SESSION_MINUTES + 1) * 60;
  const TRANSITION_SEC = 8;
  const WARMUP_REST_SEC = 10;
  const COOLDOWN_REST_SEC = 10;
  const LOWER_REST_SEC = 45;
  const MAIN_REST_SEC = 30;
  const KNEE_CAUTION = 'Stop if you feel sharp pain.';
  const FOCUS = ['Lower', 'Upper', 'Knee', 'Arms'];
  const FOCUS_LABEL = { Lower: 'Lower body', Upper: 'Upper body', Knee: 'Knee recovery', Arms: 'Arms' };
  const FOCUS_OPTIONS = [
    { id: 'mix', name: 'Mix (upper, lower, arms, and knee recovery)' },
    { id: 'Upper', name: 'Upper body' },
    { id: 'Lower', name: 'Lower body' },
    { id: 'Arms', name: 'Arms' },
    { id: 'Knee', name: 'Knee recovery' },
  ];
  /* Single-focus sessions aim for this window. Mix stays at SESSION_MINUTES. */
  const FOCUS_MIN_SEC = 20 * 60;
  const FOCUS_MAX_SEC = 30 * 60;
  const FOCUS_MIN_MOVES = 4;
  const SETS = { Lower: 3, Upper: 2, Knee: 2, Arms: 2 };

  const t = (seconds, label) => ({ kind: 'time', seconds: seconds, label: label || seconds + ' sec' });
  const tSides = (each, label) => ({ kind: 'time', seconds: each * 2, perSide: true, label: label || each + ' sec each side' });
  const r = (reps, label, workSec) => ({ kind: 'reps', reps: reps, label: label, workSec: workSec });
  const BW = ['bodyweight'];
  const DB = ['dumbbells'];
  const BAND = ['bands'];

  /* role: which slot of the session rule may draw the move.
   *   warm-up: warm-pulse, warm-hinge, warm-shoulder, warm-glute, warm-squat
   *   main:    Lower squat|hinge, Upper push|pull, Knee quad|stabilizer,
   *            Arms biceps|triceps
   *   cool-down: walk, calf-ham, chest-shoulder, hip-quad, cool-extra
   *   library: in Ask AI's pool, not drawn by the session rule (no dose). */
  const MOVES = [
    /* ---- Warm-up ---- */
    { id: 'easy-march', name: 'Easy March', phase: 'warmup', role: 'warm-pulse', equipment: BW,
      cue: 'Tall chest, soft knees, relaxed arms.', dose: t(45),
      description: 'March in place to raise the pulse, swinging the arms naturally. Keep a tall chest and soft knees.',
      url: 'https://www.youtube.com/watch?v=0JROAaEiWgA' },
    { id: 'step-jacks', name: 'Step Jacks', phase: 'warmup', role: 'warm-pulse', equipment: BW, extra: true,
      cue: 'Step out and back, no jump.', dose: t(45),
      description: 'Step one foot out and back while the arms move up and down, with no jump. This is a low-impact way to raise the pulse.',
      url: 'https://www.youtube.com/watch?v=p3Lbu-ujehU' },
    { id: 'arm-circles', name: 'Arm Circles', phase: 'warmup', role: 'warm-shoulder', equipment: BW,
      cue: 'Smooth circles, ribs down, no shrug.', dose: r(20, '10 forward + 10 back', 30),
      description: 'Make smooth circles with the arms, first forward and then back. Keep the ribs down and do not shrug.',
      url: 'https://www.youtube.com/watch?v=kxyZyR93rVA' },
    { id: 'band-pull-apart', name: 'Band Pull-Apart', phase: 'warmup', role: 'warm-shoulder', equipment: BAND,
      cue: 'Long arms, squeeze shoulder blades, do not shrug.', dose: r(12, '10 to 12 reps', 36),
      description: 'Hold a light band at shoulder height and pull it apart, then return slowly. Squeeze the shoulder blades without shrugging.',
      url: 'https://www.youtube.com/watch?v=kZNeqj-wtE0' },
    { id: 'leg-swings', name: 'Leg Swings', phase: 'warmup', role: 'warm-hinge', equipment: BW,
      cue: 'Hold the wall, swing from the hip, torso still.', dose: r(16, '8 each leg', 32),
      description: 'Hold a wall and swing one leg forward and back from the hip. Keep the torso still and the swing controlled.',
      url: 'https://www.youtube.com/watch?v=OB0GjxpPGS0' },
    { id: 'hip-hinge-drill', name: 'Hip Hinge Drill', phase: 'warmup', role: 'warm-hinge', equipment: BW,
      cue: 'Soft knees, hips back, flat back.', dose: r(10, '8 to 10 reps', 30),
      description: 'Push the hips back with soft knees and a flat back, then stand tall. Feel the work in the hips and hamstrings.',
      url: 'https://www.youtube.com/watch?v=3njtLxRY8ZA' },
    { id: 'bodyweight-good-morning', name: 'Bodyweight Good Morning', phase: 'warmup', role: 'warm-hinge', equipment: BW, extra: true,
      cue: 'Soft knees, flat back, hinge and stand tall.', dose: r(10, '10 reps', 30),
      description: 'Hinge at the hips with a soft knee bend, then return to standing. Keep the back flat and move slowly.',
      url: 'https://www.youtube.com/watch?v=61zbhuRiwQg' },
    { id: 'glute-bridge', name: 'Glute Bridge', phase: 'warmup', role: 'warm-glute', equipment: BW,
      cue: 'Ribs down, squeeze at the top, do not arch.', dose: r(10, '10 reps', 30),
      description: 'Lie on the back with bent knees and lift the hips, then lower with control. Squeeze the glutes at the top without arching.',
      url: 'https://www.youtube.com/watch?v=PhTDzR0TpZs' },
    { id: 'bodyweight-squat', name: 'Bodyweight Squat', phase: 'warmup', role: 'warm-squat', equipment: BW,
      cue: 'Hips back, knees track over mid-foot, comfortable depth.', dose: r(10, '10 reps, comfortable depth', 30),
      description: 'Sit the hips back and down to a comfortable depth, then stand tall. Keep the knees tracking over the feet.',
      url: 'https://www.youtube.com/watch?v=8uoaYwS6iFM' },
    { id: 'sit-to-stand', name: 'Sit-to-Stand', phase: 'warmup', role: 'warm-squat', equipment: BW,
      cue: 'Stand with no hands, sit down slowly.', dose: r(10, '10 reps', 30),
      description: 'Stand up from a chair without using the hands, then sit down slowly. Keep the chest tall and the knees over the feet.',
      url: 'https://www.youtube.com/watch?v=HF3n5EAmhGg' },

    /* ---- Main: lower body (3 sets, 45 s rest) ---- */
    { id: 'goblet-squat', name: 'Goblet Squat', phase: 'main', focus: 'Lower', role: 'squat', equipment: DB,
      cue: 'Dumbbell at the chest, heels down, depth only as comfortable.', dose: r(12, '10 to 12 reps', 40), kneeLoad: true,
      description: 'Hold one dumbbell at the chest and squat to a comfortable depth. Keep the heels down and the knees tracking over the feet.',
      url: 'https://www.youtube.com/watch?v=CkFzgR55gho' },
    { id: 'reverse-lunge', name: 'Reverse Lunge', phase: 'main', focus: 'Lower', role: 'squat', equipment: ['bodyweight', 'dumbbells'],
      cue: 'Short step back, torso tall, front knee over mid-foot.', dose: r(16, '8 each leg', 48), kneeLoad: true,
      description: 'Step back, lower until the back knee hovers, then push up through the front foot. Keep the torso tall.',
      url: 'https://www.youtube.com/watch?v=u_zSfK5ZFU4' },
    { id: 'low-step-up', name: 'Low Step-Up', phase: 'main', focus: 'Lower', role: 'squat', equipment: ['bodyweight', 'dumbbells'],
      cue: 'Whole foot on the step, push the heel, no bounce off the back foot.', dose: r(16, '8 each leg', 48), kneeLoad: true,
      description: 'Step onto a low, stable step with the whole foot, stand tall, and step down with control. Do not push off the back foot.',
      url: 'https://www.youtube.com/watch?v=7AtIjR-QqVA' },
    { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', phase: 'main', focus: 'Lower', role: 'hinge', equipment: DB,
      cue: 'Soft knees, hips back, weights stay close to the legs.', dose: r(12, '10 to 12 reps', 40),
      description: 'Hold dumbbells, push the hips back, and slide the weights down the legs, then stand tall. Keep the spine neutral.',
      url: 'https://www.youtube.com/watch?v=FQKfr1YDhEk' },
    { id: 'dumbbell-glute-bridge', name: 'Dumbbell Glute Bridge', phase: 'main', focus: 'Lower', role: 'hinge', equipment: DB,
      cue: 'Weight on the hips, drive through the heels, pause at the top.', dose: r(12, '12 reps', 40),
      description: 'Place a dumbbell on the hips, drive through the heels, and lift, then lower slowly. Pause at the top.',
      url: 'https://www.youtube.com/watch?v=V-Pk0ZfoszU' },

    /* ---- Main: upper body (2 sets) ---- */
    { id: 'incline-or-knee-push-up', name: 'Incline or Knee Push-Up', jsonName: 'Incline Push-Up', phase: 'main', focus: 'Upper', role: 'push', equipment: BW,
      cue: 'Straight line from head to heels or knees, elbows about 45 degrees.', dose: r(12, '8 to 12 reps', 36),
      description: 'Place the hands on a bench or counter and lower the chest, then press up. Keep the body in one straight line.',
      url: 'https://www.youtube.com/watch?v=cfns5VDVVvk' },
    { id: 'knee-push-up', name: 'Knee Push-Up', phase: 'main', focus: 'Upper', role: 'push', equipment: BW,
      cue: 'Straight line from head to knees, elbows about 45 degrees.', dose: r(12, '8 to 12 reps', 36),
      description: 'From the knees, lower the chest with control, then press up. Keep a straight line from head to knees.',
      url: 'https://www.youtube.com/watch?v=lFR1GWy1Dcs' },
    { id: 'dumbbell-floor-press', name: 'Dumbbell Floor Press', phase: 'main', focus: 'Upper', role: 'push', equipment: DB,
      cue: 'Elbows about 45 degrees, upper arms touch the floor, press up.', dose: r(12, '10 to 12 reps', 40),
      description: 'Lie on the back and press dumbbells up, then lower until the upper arms touch the floor. Keep the elbows at about 45 degrees.',
      url: 'https://www.youtube.com/watch?v=uUGDRwge4F8' },
    { id: 'dumbbell-overhead-press', name: 'Dumbbell Overhead Press', phase: 'main', focus: 'Upper', role: 'push', equipment: DB,
      cue: 'Ribs down, press straight up, no low-back arch.', dose: r(10, '8 to 10 reps', 32),
      description: 'Press dumbbells straight up, then lower with control. Keep the ribs down and do not arch the low back.',
      url: 'https://www.youtube.com/watch?v=B-aVuyhvLHU' },
    { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', phase: 'main', focus: 'Upper', role: 'pull', equipment: DB,
      cue: 'Flat back, elbow toward the hip, do not twist.', dose: r(20, '10 each side', 60),
      description: 'Hinge with a flat back and pull one elbow toward the hip, then lower slowly. Do not twist the torso.',
      url: 'https://www.youtube.com/watch?v=dFzUjzfih7k' },
    { id: 'band-row', name: 'Band Row', phase: 'main', focus: 'Upper', role: 'pull', equipment: BAND,
      cue: 'Elbows back, squeeze the shoulder blades, slow return.', dose: r(15, '12 to 15 reps', 45),
      caution: 'Anchor the band on something stable.',
      description: 'Anchor a band and pull the elbows back, then return slowly. Squeeze the shoulder blades and keep the shoulders down.',
      url: 'https://www.youtube.com/watch?v=LSkyinhmA8k' },
    { id: 'band-face-pull', name: 'Band Face Pull', phase: 'main', focus: 'Upper', role: 'pull', equipment: BAND, extra: true,
      cue: 'Elbows high, pull toward the face, slow return.', dose: r(15, '12 to 15 reps', 45),
      caution: 'Anchor the band on something stable and keep it off the face.',
      description: 'Pull a band toward the face with the elbows high, then return slowly. Squeeze the upper back.',
      url: 'https://www.youtube.com/watch?v=JBpj9-3tP0c' },

    /* ---- Main: knee strength and stability (2 sets). Shallow and
     * unloaded: no jumping, no deep or weighted knee bends. ---- */
    { id: 'partial-wall-sit', name: 'Partial Wall Sit', phase: 'main', focus: 'Knee', role: 'quad', equipment: BW,
      cue: 'Back flat, shallow bend (about 45 to 60 degrees), knees over mid-foot, keep breathing.',
      dose: t(30, '20 to 30 sec, shallow bend'),
      description: 'Lean the back on a wall and hold a shallow bend, about 45 to 60 degrees. Keep the knees over the feet and breathe normally.',
      url: 'https://www.youtube.com/watch?v=pjbGm5EQd1s' },
    { id: 'straight-leg-raise', name: 'Straight-Leg Raise', phase: 'main', focus: 'Knee', role: 'quad', equipment: BW,
      cue: 'Tighten the thigh, knee straight, lift to the other knee\u2019s height, lower in 3 seconds.', dose: r(20, '10 each leg', 80),
      description: 'Lie on the back, tighten the thigh, and lift the straight leg to the height of the other bent knee. Lower slowly.',
      url: 'https://www.youtube.com/watch?v=4UBnTSqRlD0' },
    { id: 'banded-terminal-knee-extension', name: 'Banded Terminal Knee Extension', phase: 'main', focus: 'Knee', role: 'quad', equipment: BAND,
      cue: 'Small bend to a gentle straighten, squeeze the quad 2 seconds, do not snap the knee.', dose: r(24, '12 to 15 each leg', 72),
      description: 'Anchor a band behind the knee and straighten the leg against the band with a gentle quad squeeze. Do not snap into lockout.',
      url: 'https://www.youtube.com/watch?v=WEcLkuvcMZc' },
    { id: 'short-arc-quad', name: 'Short-Arc Quad', phase: 'main', focus: 'Knee', role: 'quad', equipment: BW,
      cue: 'Support the knee on a rolled towel, straighten, lower slowly.', dose: r(24, '10 to 15 each leg', 72),
      description: 'Support the knee over a rolled towel and straighten the leg, then lower slowly. Squeeze the thigh at the top.',
      url: 'https://www.youtube.com/watch?v=ehGDUl8JbBI' },
    { id: 'quad-sets', name: 'Quad Sets', phase: 'main', focus: 'Knee', role: 'quad', equipment: BW, extra: true,
      cue: 'Leg straight, press the back of the knee down, hold 3 seconds.', dose: r(20, '10 each leg, 3-second squeeze', 80),
      description: 'Sit or lie with the leg straight and tighten the thigh to press the back of the knee down, then relax. Keep the breathing easy.',
      url: 'https://www.youtube.com/watch?v=T0bvxUOpwOw' },
    { id: 'banded-side-steps', name: 'Banded Side Steps', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BAND,
      cue: 'Small knee bend, toes forward, knees do not cave in.', dose: r(20, '10 steps each way', 40),
      description: 'Place a mini band around the legs and take small steps sideways. Keep the toes forward, a slight knee bend, and the knees from caving in.',
      url: 'https://www.youtube.com/watch?v=5VtGyiddPh4' },
    { id: 'standing-band-hamstring-curl', name: 'Standing Band Hamstring Curl', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BAND,
      cue: 'Hips still, heel toward the glute, lower slowly.', dose: r(24, '12 each leg', 60),
      description: 'Anchor a band and curl one heel toward the glute, then lower slowly. Keep the hips still.',
      url: 'https://www.youtube.com/watch?v=-dwKh9QzoKc' },
    { id: 'side-lying-hip-abduction', name: 'Side-Lying Hip Abduction', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BW,
      cue: 'Heel leads slightly, hips stacked, do not roll back.', dose: r(20, '8 to 12 each leg', 60),
      description: 'Lie on the side and lift the top leg, leading slightly with the heel, then lower slowly. Keep the hips stacked.',
      url: 'https://www.youtube.com/watch?v=CTmFNSDJTR8' },
    { id: 'banded-clamshell', name: 'Banded Clamshell', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BAND,
      cue: 'Feet together, open the top knee, hips stay still.', dose: r(24, '10 to 15 each side', 60),
      description: 'Lie on the side with a light band above the knees, feet together, and open the top knee. Keep the hips still.',
      url: 'https://www.youtube.com/watch?v=m_ZPapmqeNM' },
    { id: 'standing-band-hip-abduction', name: 'Standing Band Hip Abduction', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BAND, extra: true,
      cue: 'Stand tall, move the leg out slowly, torso still.', dose: r(24, '12 each leg', 60),
      description: 'Stand tall with a band and slowly kick one leg out to the side, then return. Keep the work in the hip and the torso still.',
      url: 'https://www.youtube.com/watch?v=4qr26RNU3EQ' },
    { id: 'monster-walk', name: 'Monster Walk', phase: 'main', focus: 'Knee', role: 'stabilizer', equipment: BAND, extra: true,
      cue: 'Small controlled steps, slight knee bend, knees out over the toes.', dose: r(20, '10 steps forward + 10 back', 40),
      description: 'With a band around the legs, take controlled steps forward, back, or slightly out. Keep a slight knee bend and the knees over the toes.',
      url: 'https://www.youtube.com/watch?v=1flJ9_AZ2qY' },

    /* ---- Main: arms (2 sets) ---- */
    { id: 'dumbbell-biceps-curl', name: 'Dumbbell Biceps Curl', phase: 'main', focus: 'Arms', role: 'biceps', equipment: DB,
      cue: 'Elbows at the sides, no swing, lower in 3 seconds.', dose: r(12, '10 to 12 reps', 48),
      description: 'Curl the dumbbells without swinging, then lower in about 3 seconds. Keep the elbows close to the sides.',
      url: 'https://www.youtube.com/watch?v=6DeLZ6cbgWQ' },
    { id: 'hammer-curl', name: 'Hammer Curl', phase: 'main', focus: 'Arms', role: 'biceps', equipment: DB,
      cue: 'Palms facing in, elbows pinned.', dose: r(12, '10 to 12 reps', 40),
      description: 'Curl with the palms facing in and the elbows pinned. Do not lean or swing the weights.',
      url: 'https://www.youtube.com/watch?v=5FAuyZuvJFg' },
    { id: 'band-curl', name: 'Band Curl', phase: 'main', focus: 'Arms', role: 'biceps', equipment: BAND,
      cue: 'Stand on the band, elbows pinned, no lean.', dose: r(15, '12 to 15 reps', 45),
      description: 'Stand on a band and curl the handles toward the shoulders, then lower slowly. Keep the elbows pinned.',
      url: 'https://www.youtube.com/watch?v=AaA7Yj3zHiU' },
    { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', phase: 'main', focus: 'Arms', role: 'triceps', equipment: DB,
      cue: 'Elbows forward, ribs down. Swap to a band pressdown if the shoulder pinches.', dose: r(12, '10 to 12 reps', 40),
      description: 'Lower one dumbbell behind the head, then straighten the arms. Keep the elbows forward and the ribs down.',
      url: 'https://www.youtube.com/watch?v=-Vyt2QdsR7E' },
    { id: 'band-triceps-pressdown', name: 'Band Triceps Pressdown', phase: 'main', focus: 'Arms', role: 'triceps', equipment: BAND,
      cue: 'Elbows pinned, straighten without snapping.', dose: r(15, '12 to 15 reps', 45),
      caution: 'Anchor the band high on something stable.',
      description: 'Anchor a band high and straighten the elbows, then return slowly. Keep the upper arms still.',
      url: 'https://www.youtube.com/watch?v=Y3CDzx-oj3k' },
    { id: 'dumbbell-kickback', name: 'Dumbbell Kickback', phase: 'main', focus: 'Arms', role: 'triceps', equipment: DB,
      cue: 'Hinge, upper arm still, no swing.', dose: r(24, '10 to 12 each side', 72),
      description: 'Hinge with a flat back, keep the upper arm still, and straighten the elbow, then return slowly. Do not swing.',
      url: 'https://www.youtube.com/watch?v=m9me06UBPKc' },

    /* ---- Cool-down ---- */
    { id: 'easy-walk', name: 'Easy Walk', phase: 'cooldown', role: 'walk', equipment: BW,
      cue: 'Easy pace, let breathing settle.', dose: t(60),
      description: 'Walk or march in place at an easy pace until breathing settles. Keep the shoulders relaxed.',
      url: 'https://www.youtube.com/watch?v=4wF8l7YjSNg' },
    { id: 'standing-calf-stretch', name: 'Standing Calf Stretch', phase: 'cooldown', role: 'calf-ham', equipment: BW,
      cue: 'Heel down, gentle only. No bouncing.', dose: tSides(30),
      description: 'Stand facing a wall with the back heel down and lean forward gently. Keep the stretch mild.',
      url: 'https://www.youtube.com/watch?v=mafo7o7OnFo' },
    { id: 'hamstring-stretch', name: 'Seated or Standing Hamstring Stretch', jsonName: 'Hamstring Stretch', phase: 'cooldown', role: 'calf-ham', equipment: BW,
      cue: 'Long back, hinge from the hips, mild pull only.', dose: tSides(30),
      description: 'Sit or stand, hinge from the hips with a long back, and stop at a mild pull. Do not bounce.',
      url: 'https://www.youtube.com/watch?v=1rscgJNW27g' },
    { id: 'doorway-chest-stretch', name: 'Doorway Chest Stretch', phase: 'cooldown', role: 'chest-shoulder', equipment: BW,
      cue: 'Forearm on the frame, step through gently, no pinching.', dose: tSides(30),
      description: 'Place a forearm on a door frame and step through gently. Keep the stretch mild and do not let the shoulder pinch.',
      url: 'https://www.youtube.com/watch?v=qv6el4OhHjA' },
    { id: 'cross-body-shoulder-stretch', name: 'Cross-Body Shoulder Stretch', phase: 'cooldown', role: 'chest-shoulder', equipment: BW,
      cue: 'Shoulders down, pull the arm across the chest.', dose: tSides(20),
      description: 'Pull one arm across the chest with the shoulders down. Keep the stretch gentle and the neck relaxed.',
      url: 'https://www.youtube.com/watch?v=swvXpKN832E' },
    { id: 'standing-quadriceps-stretch', name: 'Standing Quadriceps Stretch', phase: 'cooldown', role: 'hip-quad', equipment: BW,
      cue: 'Knees close, no arch in the low back.', dose: tSides(30),
      description: 'Hold a wall, gently pull one heel toward the seat, and stand tall. Keep the knees close and the low back neutral.',
      url: 'https://www.youtube.com/watch?v=XyLe1EfUM9w' },
    { id: 'figure-4-stretch', name: 'Figure-4 Stretch', phase: 'cooldown', role: 'hip-quad', equipment: BW,
      cue: 'Ankle on the opposite knee, no torque through the knee.', dose: tSides(30),
      description: 'Place one ankle on the opposite knee and lean forward slightly with a long back. Do not twist the knee.',
      url: 'https://www.youtube.com/watch?v=2E8WWX4cOc4' },
    { id: 'overhead-triceps-stretch', name: 'Overhead Triceps Stretch', phase: 'cooldown', role: 'cool-extra', equipment: BW, extra: true,
      cue: 'Ribs down, gentle assist at the elbow.', dose: tSides(20),
      description: 'Reach one hand down the back and gently assist at the elbow. Keep the ribs down and the stretch mild.',
      url: 'https://www.youtube.com/watch?v=qsyrvNY8uBA' },
    { id: 'standing-upper-back-reach', name: 'Standing Upper-Back Reach', phase: 'cooldown', role: 'cool-extra', equipment: BW, extra: true,
      cue: 'Reach forward, let the upper back round a little, breathe.', dose: t(30),
      description: 'Reach the arms forward and let the upper back round slightly while you breathe. Keep the stretch gentle.',
      url: 'https://www.youtube.com/watch?v=Cus9IRgnvcY' },
    { id: 'open-book-rotation', name: 'Open-Book Rotation', phase: 'cooldown', role: 'cool-extra', equipment: BW, extra: true,
      cue: 'Knees stacked, rotate through the upper back, slow.', dose: r(10, '5 each side', 40),
      description: 'Lie on the side with the knees stacked and rotate the top arm open through the upper back. Move slowly and breathe.',
      url: 'https://www.youtube.com/watch?v=YMswmjk7Qj4' },

    /* ---- Library: in Ask AI's pool, not drawn by the synthesis session
     * rule (no slot names them), so no dose is set. ---- */
    { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', phase: 'main', focus: 'Upper', role: 'library', equipment: DB,
      description: 'Raise light dumbbells out to the sides to about shoulder height, then lower slowly. Keep a soft bend in the elbows.',
      url: 'https://www.youtube.com/watch?v=XPPfnSEATJA' },
    { id: 'standing-calf-raise', name: 'Standing Calf Raise', phase: 'main', focus: 'Lower', role: 'library', equipment: BW,
      description: 'Rise onto the balls of both feet, then lower slowly. Stand tall and use a wall for balance if needed.',
      url: 'https://www.youtube.com/watch?v=53AqckwzW9Y' },
  ];

  const SAFETY_NOTES = [
    'Stop the session for chest pain, unusual shortness of breath, faintness, sharp joint pain, or a knee that catches, swells, or gives way.',
    'Knees track over mid-foot. Breathe through holds; do not hold your breath.',
    'Bands: check for nicks, anchor them on something stable, never let go under tension.',
    'Dumbbells: clear the floor, control the lowering, never drop a weight from overhead.',
  ];

  const BY_ID = new Map(MOVES.map(m => [m.id, m]));
  const byRole = role => MOVES.filter(m => m.role === role);

  function pick(list, rand) {
    if (!list.length) throw new Error('no move available for this slot');
    return list[Math.floor(rand() * list.length)];
  }

  const PAIRS = {
    Lower: ['squat', 'hinge'],
    Upper: ['push', 'pull'],
    Knee: ['quad', 'stabilizer'],
    Arms: ['biceps', 'triceps'],
  };

  function normalizeFocus(focus) {
    return FOCUS.indexOf(focus) !== -1 ? focus : 'mix';
  }

  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* Two moves per focus area. The session must include at least one
   * dumbbell move and one band move; otherwise it is drawn again. */
  function pickMain(rand) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const picks = [];
      FOCUS.forEach(f => PAIRS[f].forEach(role => picks.push(pick(byRole(role), rand))));
      const uses = gear => picks.some(m => m.equipment.indexOf(gear) !== -1);
      if (uses('dumbbells') && uses('bands')) return picks;
    }
    throw new Error('could not draw a main block with dumbbells and bands');
  }

  /* All unique main moves in one focus, alternating the two patterns so
   * both appear even if the list is later trimmed. */
  function pickFocusMoves(focus, rand) {
    const pools = PAIRS[focus].map(role => shuffle(byRole(role), rand));
    const out = [];
    const used = new Set();
    const max = Math.max(pools[0].length, pools[1].length);
    for (let i = 0; i < max; i++) {
      pools.forEach(pool => {
        const m = pool[i];
        if (m && !used.has(m.id)) {
          out.push(m);
          used.add(m.id);
        }
      });
    }
    return out;
  }

  function pickWarmup(rand, focus) {
    return ['warm-pulse', 'warm-hinge', 'warm-shoulder', 'warm-glute', 'warm-squat'].map(role => {
      let pool = byRole(role);
      if (focus === 'Knee' && role === 'warm-squat') {
        const preferred = pool.filter(m => m.id === 'sit-to-stand');
        if (preferred.length) pool = preferred;
      }
      return pick(pool, rand);
    });
  }

  function pickCooldown(rand, focus) {
    const out = ['walk', 'calf-ham', 'chest-shoulder', 'hip-quad'].map(role => pick(byRole(role), rand));
    let rest = MOVES.filter(m => m.phase === 'cooldown' && m.role !== 'walk' && out.indexOf(m) === -1);
    if (focus === 'Arms' || focus === 'Upper') {
      const liked = rest.filter(m => m.id === 'overhead-triceps-stretch' || m.id === 'standing-upper-back-reach' || m.role === 'chest-shoulder');
      if (liked.length) rest = liked;
    }
    if (focus === 'Lower' || focus === 'Knee') {
      const liked = rest.filter(m => m.role === 'calf-ham' || m.role === 'hip-quad');
      if (liked.length) rest = liked;
    }
    out.push(pick(rest, rand));
    return out;
  }

  function slotFor(move, extra) {
    const d = move.dose;
    return Object.assign({
      id: move.id,
      name: move.name,
      phase: move.phase,
      focus: move.focus ? FOCUS_LABEL[move.focus] : '',
      equipment: move.equipment.slice(),
      dose: { kind: d.kind, reps: d.reps, seconds: d.seconds, label: d.label, perSide: d.perSide === true },
      workSec: d.workSec,
      demoUrl: move.url,
      note: move.cue,
      caution: move.focus === 'Knee' ? KNEE_CAUTION : (move.caution || ''),
    }, extra || {});
  }

  /* Sets of one move, each its own screen. Lower-body sets rest 45 s,
   * everything else in the main block rests 30 s. */
  function setSlots(move, sets) {
    const out = [];
    for (let s = 1; s <= sets; s++) {
      out.push(slotFor(move, {
        id: move.id + '-set' + s,
        dose: Object.assign(slotFor(move).dose, { label: 'Set ' + s + ' of ' + sets + ' \u00b7 ' + move.dose.label }),
        restSec: move.focus === 'Lower' ? LOWER_REST_SEC : MAIN_REST_SEC,
        demoUrl: s === 1 ? move.url : '',
      }));
    }
    return out;
  }

  function titleFor(focus) {
    if (focus === 'mix') return "Today's " + SESSION_MINUTES + '-minute session';
    return "Today's " + FOCUS_LABEL[focus].toLowerCase() + ' session';
  }

  function makePlan(focus, warm, mainMoves, cool, setsFor, rand) {
    const slots = warm.concat(
      mainMoves.reduce((acc, m) => acc.concat(setSlots(m, typeof setsFor === 'function' ? setsFor(m) : setsFor)), []),
      cool);
    const plan = {
      id: 'adult-' + focus + '-' + Math.floor(rand() * 1e9).toString(36),
      title: titleFor(focus),
      targetMinutes: SESSION_MINUTES,
      focus: focus,
      transitionSec: TRANSITION_SEC,
      notes: SAFETY_NOTES,
      slots: slots,
    };
    if (focus !== 'mix') plan.targetMinutes = Math.max(1, Math.round(SE.estimateSeconds(plan) / 60));
    return plan;
  }

  /* Warm-up (5 moves), main (8 moves: 2 Lower, 2 Upper, 2 Knee, 2 Arms, in
   * that order, as straight sets), cool-down (5 moves). Past 36 minutes,
   * the lower pair drops its third set. */
  function buildMix(rand) {
    const warm = pickWarmup(rand, 'mix').map(m => slotFor(m, { restSec: WARMUP_REST_SEC }));
    const main = pickMain(rand);
    const cool = pickCooldown(rand, 'mix').map(m => slotFor(m, { restSec: COOLDOWN_REST_SEC }));
    const plan = lowerSets => makePlan('mix', warm, main, cool, m => (m.focus === 'Lower' ? lowerSets : SETS[m.focus]), rand);
    const full = plan(SETS.Lower);
    return SE.estimateSeconds(full) > DROP_SET3_OVER_SEC ? plan(SETS.Lower - 1) : full;
  }

  /* A single-focus main block uses only that group's moves, covers both
   * patterns, and trims sets or moves so the estimate is about 20 to 30
   * minutes. */
  function buildFocus(focus, rand) {
    const warm = pickWarmup(rand, focus).map(m => slotFor(m, { restSec: WARMUP_REST_SEC }));
    const cool = pickCooldown(rand, focus).map(m => slotFor(m, { restSec: COOLDOWN_REST_SEC }));
    const moves = pickFocusMoves(focus, rand);
    const minMoves = Math.min(FOCUS_MIN_MOVES, moves.length);
    let best = null;
    let bestDist = Infinity;
    for (let n = moves.length; n >= minMoves; n--) {
      for (let s = 0; s < 2; s++) {
        const sets = [3, 2][s];
        const candidate = makePlan(focus, warm, moves.slice(0, n), cool, sets, rand);
        const sec = SE.estimateSeconds(candidate);
        const dist = sec < FOCUS_MIN_SEC ? FOCUS_MIN_SEC - sec : (sec > FOCUS_MAX_SEC ? sec - FOCUS_MAX_SEC : 0);
        if (dist === 0) return candidate;
        if (dist < bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }
    }
    return best;
  }

  function buildSession(options) {
    const opts = options || {};
    const rand = typeof opts.rand === 'function' ? opts.rand : Math.random;
    const focus = normalizeFocus(opts.focus);
    return focus === 'mix' ? buildMix(rand) : buildFocus(focus, rand);
  }

  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const AdultProgram = {
    SESSION_MINUTES: SESSION_MINUTES,
    LOWER_REST_SEC: LOWER_REST_SEC,
    MAIN_REST_SEC: MAIN_REST_SEC,
    KNEE_CAUTION: KNEE_CAUTION,
    FOCUS: FOCUS,
    FOCUS_LABEL: FOCUS_LABEL,
    FOCUS_OPTIONS: FOCUS_OPTIONS,
    FOCUS_MIN_SEC: FOCUS_MIN_SEC,
    FOCUS_MAX_SEC: FOCUS_MAX_SEC,
    MOVES: MOVES,
    SAFETY_NOTES: SAFETY_NOTES,
    byId: id => BY_ID.get(id) || null,
    normalizeFocus: normalizeFocus,
    buildSession: buildSession,
    seeded: seeded,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = AdultProgram;
  else root.AdultProgram = AdultProgram;
})(typeof window !== 'undefined' ? window : globalThis);
