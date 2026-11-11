'use strict';
/* The guided session engine, screens, shared CSS, and engine tests ship as
 * identical copies in kids-workout-coach and adaptive-workout-coach. This
 * test fails when a copy drifts from the hash recorded in
 * shared-files.sha256. After a deliberate change, copy the file to both
 * repos and update the hash in both manifests:
 *   sha256sum docs/session-engine.js docs/session-screens.js docs/session.css <tests>/session-engine.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'shared-files.sha256');

function entries() {
  return fs.readFileSync(MANIFEST, 'utf8').split('\n').filter(Boolean).map(line => {
    const m = /^([0-9a-f]{64})\s+(\S+)$/.exec(line);
    assert.ok(m, 'bad manifest line: ' + line);
    return { hash: m[1], name: path.basename(m[2]) };
  });
}
function locate(name) {
  const candidates = [path.join(ROOT, 'docs', name), path.join(__dirname, name)];
  const found = candidates.find(p => fs.existsSync(p));
  assert.ok(found, name + ' not found');
  return found;
}

test('the manifest lists the four shared files', () => {
  assert.deepStrictEqual(entries().map(e => e.name).sort(),
    ['session-engine.js', 'session-engine.test.js', 'session-screens.js', 'session.css']);
});

entries().forEach(e => {
  test('shared file ' + e.name + ' matches its recorded hash', () => {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(locate(e.name))).digest('hex');
    assert.strictEqual(actual, e.hash, e.name + ' drifted from the shared copy');
  });
});
