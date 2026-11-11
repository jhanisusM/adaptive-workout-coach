'use strict';
/* Session builder tests: what a generated 35-minute session contains,
 * checked across many seeds. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const AP = require(path.join(__dirname, '..', 'docs', 'program.js'));
const SE = require(path.join(__dirname, '..', 'docs', 'session-engine.js'));
const SOURCE = require(path.join(__dirname, 'fixtures', 'exercises-adult.json'));

const SEEDS = 1000;
const baseId = slot => slot.id.replace(/-set\d$/, '');
const moveOf = slot => AP.byId(baseId(slot));
function each(fn, focus) {
  const f = focus || 'mix';
  for (let seed = 0; seed < SEEDS; seed++) fn(AP.buildSession({ focus: f, rand: AP.seeded(seed * 104729 + 1) }), seed, f);
}
/* Main-block moves in order, one entry per move (not per set). */
function mainMoves(plan) {
  const out = [];
  plan.slots.filter(s => s.phase === 'main').forEach(s => {
    const id = baseId(s);
    if (!out.length || out[out.length - 1].id !== id) out.push({ id: id, sets: 0, move: moveOf(s) });
    out[out.length - 1].sets++;
  });
  return out;
}

test('the session length lives in one constant: 35 minutes', () => {
  assert.strictEqual(AP.SESSION_MINUTES, 35);
  each(plan => assert.strictEqual(plan.targetMinutes, 35));
});

test('phases run warm-up, main, cool-down, in that order', () => {
  each(plan => {
    const order = plan.slots.map(s => SE.PHASES.indexOf(s.phase));
    assert.ok(order.every(i => i >= 0));
    assert.deepStrictEqual(order, order.slice().sort((a, b) => a - b));
  });
});

test('5 warm-up moves, 8 main moves (2 Lower, 2 Upper, 2 Knee, 2 Arms in that order), 5 cool-down moves', () => {
  each(plan => {
    const counts = SE.phaseCounts(plan.slots);
    assert.strictEqual(counts.warmup, 5);
    assert.strictEqual(counts.cooldown, 5);
    const main = mainMoves(plan);
    assert.deepStrictEqual(main.map(m => m.move.focus), ['Lower', 'Lower', 'Upper', 'Upper', 'Knee', 'Knee', 'Arms', 'Arms']);
    assert.strictEqual(new Set(main.map(m => m.id)).size, 8);
    main.forEach(m => assert.strictEqual(m.sets, m.move.focus === 'Lower' ? m.sets : 2));
    const lowerSets = main.filter(m => m.move.focus === 'Lower').map(m => m.sets);
    assert.ok(lowerSets.every(n => n === lowerSets[0] && (n === 2 || n === 3)));
  });
});

test('each focus pair covers two patterns: squat + hinge, push + pull, quad + stabilizer, biceps + triceps', () => {
  each(plan => {
    assert.deepStrictEqual(mainMoves(plan).map(m => m.move.role),
      ['squat', 'hinge', 'push', 'pull', 'quad', 'stabilizer', 'biceps', 'triceps']);
  });
});

test('every session uses both dumbbells and bands', () => {
  each(plan => {
    const gear = new Set([].concat.apply([], plan.slots.filter(s => s.phase === 'main').map(s => s.equipment)));
    assert.ok(gear.has('dumbbells') && gear.has('bands'), Array.from(gear).join());
  });
});

test('rest: 45 seconds after lower-body sets, 30 after other main sets, none after the last move', () => {
  each(plan => {
    plan.slots.filter(s => s.phase === 'main').forEach(s => {
      assert.strictEqual(s.restSec, moveOf(s).focus === 'Lower' ? 45 : 30, s.id);
    });
    assert.strictEqual(SE.create(plan).restSecAfter(plan.slots.length - 1), 0);
  });
});

test('the knee group has no jumping, no dumbbells, no deep knee bends, and says to stop for sharp pain', () => {
  const knee = AP.MOVES.filter(m => m.focus === 'Knee');
  assert.ok(knee.length >= 6);
  knee.forEach(m => {
    assert.strictEqual(m.equipment.indexOf('dumbbells'), -1, m.name);
    assert.doesNotMatch(m.name + ' ' + m.cue, /jump|hop|plyo|deep|pistol|lunge|split squat|bulgarian/i, m.name);
  });
  each(plan => {
    plan.slots.filter(s => moveOf(s).focus === 'Knee').forEach(s => assert.strictEqual(s.caution, 'Stop if you feel sharp pain.'));
  });
});

test('no jumping anywhere in the adult session', () => {
  each(plan => plan.slots.forEach(s => assert.doesNotMatch(s.name, /jump(?!ing jack)|hop|plyo/i, s.name)));
});

test('demos only on the first set; every demo is a real https YouTube link', () => {
  each(plan => {
    plan.slots.forEach(s => {
      if (/-set[23]$/.test(s.id)) assert.strictEqual(s.demoUrl, '');
      else if (s.demoUrl) assert.ok(SE.embedUrl(s.demoUrl).indexOf('https://www.youtube-nocookie.com/embed/') === 0, s.demoUrl);
    });
  });
});

test('every move in exercises-adult.json is in the app with its exact URL; no yoga', () => {
  const byName = new Map(AP.MOVES.map(m => [m.jsonName || m.name, m]));
  assert.strictEqual(AP.MOVES.length, SOURCE.length);
  SOURCE.forEach(e => {
    const move = byName.get(e.nameOfExercise);
    assert.ok(move, e.nameOfExercise);
    assert.strictEqual(move.url, e.url, e.nameOfExercise);
  });
  AP.MOVES.forEach(m => assert.doesNotMatch(m.name + ' ' + (m.cue || '') + ' ' + (m.description || ''), /yoga/i, m.name));
});

test('every generated session lands between 32 and 37 minutes', () => {
  let lo = Infinity;
  let hi = 0;
  each(plan => {
    const min = SE.estimateSeconds(plan) / 60;
    lo = Math.min(lo, min);
    hi = Math.max(hi, min);
    assert.ok(min >= 32 && min <= 37, min.toFixed(2));
  });
  assert.ok(Math.abs((lo + hi) / 2 - AP.SESSION_MINUTES) < 1.5, 'centred on 35: ' + lo.toFixed(1) + '..' + hi.toFixed(1));
});

const FOCUS_SEEDS = 5000;
const SINGLE = ['Upper', 'Lower', 'Arms', 'Knee'];
const PAIRS_EXPECT = { Lower: ['squat', 'hinge'], Upper: ['push', 'pull'], Knee: ['quad', 'stabilizer'], Arms: ['biceps', 'triceps'] };
function eachFocus(focus, n, fn) {
  for (let seed = 0; seed < n; seed++) fn(AP.buildSession({ focus: focus, rand: AP.seeded(seed * 104729 + 17) }), seed);
}

test('the focus list is Mix plus the four single-focus options', () => {
  assert.deepStrictEqual(AP.FOCUS_OPTIONS.map(o => o.id), ['mix', 'Upper', 'Lower', 'Arms', 'Knee']);
  assert.strictEqual(AP.normalizeFocus(undefined), 'mix');
  assert.strictEqual(AP.normalizeFocus('nope'), 'mix');
  assert.strictEqual(AP.normalizeFocus('Knee'), 'Knee');
});

test('picking a single focus builds a session whose main moves are only that group', () => {
  SINGLE.forEach(focus => {
    eachFocus(focus, 400, plan => {
      assert.strictEqual(plan.focus, focus);
      assert.match(plan.title, new RegExp(AP.FOCUS_LABEL[focus], 'i'));
      const main = mainMoves(plan);
      assert.ok(main.length >= 4, focus + ' ' + main.length);
      main.forEach(m => {
        assert.strictEqual(m.move.focus, focus, m.id);
        assert.strictEqual(m.sets, main[0].sets);
        assert.ok(m.sets === 2 || m.sets === 3);
      });
      const roles = main.map(m => m.move.role);
      PAIRS_EXPECT[focus].forEach(role => assert.ok(roles.indexOf(role) !== -1, focus + ' missing ' + role));
      assert.strictEqual(SE.phaseCounts(plan.slots).warmup, 5);
      assert.strictEqual(SE.phaseCounts(plan.slots).cooldown, 5);
    });
  });
});

test('Mix sessions still include all four focus groups; a focus change changes the plan', () => {
  const mix = AP.buildSession({ focus: 'mix', rand: AP.seeded(42) });
  assert.deepStrictEqual(mainMoves(mix).map(m => m.move.focus), ['Lower', 'Lower', 'Upper', 'Upper', 'Knee', 'Knee', 'Arms', 'Arms']);
  SINGLE.forEach(focus => {
    const plan = AP.buildSession({ focus: focus, rand: AP.seeded(42) });
    assert.notDeepStrictEqual(mainMoves(plan).map(m => m.id), mainMoves(mix).map(m => m.id));
    assert.ok(mainMoves(plan).every(m => m.move.focus === focus));
  });
});

test('knee recovery sessions keep the stop-for-sharp-pain note and the knee rules', () => {
  eachFocus('Knee', 400, plan => {
    plan.slots.filter(s => s.phase === 'main').forEach(s => {
      assert.strictEqual(s.caution, 'Stop if you feel sharp pain.');
      assert.strictEqual(moveOf(s).equipment.indexOf('dumbbells'), -1, s.id);
    });
  });
});

test('session length stays honest: Mix about 33 to 37 minutes, each single focus about 20 to 30, over 5000 seeds', () => {
  ['mix'].concat(SINGLE).forEach(focus => {
    let lo = Infinity;
    let hi = 0;
    eachFocus(focus, FOCUS_SEEDS, plan => {
      const min = SE.estimateSeconds(plan) / 60;
      lo = Math.min(lo, min);
      hi = Math.max(hi, min);
      if (focus === 'mix') assert.ok(min >= 32 && min <= 37, min.toFixed(2));
      else assert.ok(min >= 20 && min <= 30, focus + ' ' + min.toFixed(2));
    });
    if (focus === 'mix') assert.ok(lo >= 32 && hi <= 37, focus + ' ' + lo + '..' + hi);
    else {
      assert.ok(lo >= 20 && hi <= 30, focus + ' ' + lo + '..' + hi);
      assert.ok(hi - lo < 10, focus + ' ' + lo + '..' + hi);
    }
  });
});
