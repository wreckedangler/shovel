import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { generateLevel } from '../src/gen.js';
import { replayOf, simulate } from '../src/replay.js';
import { ROAMERS } from '../src/roster.js';

const gear = { shovel: 0, armor: 0 };
const roamers = g => g.ents.filter(e => e.type === 'roamer');
const stamp = g => roamers(g).map(e => [e.design.id, e.x, e.y, e.hp, e.state]);
for (const level of [...LEVELS, generateLevel(7919, 4)]) {
  const g = new Game(level, gear, { roamerSeed: 4873 });
  if (level.duel != null) assert.equal(roamers(g).length, 0);
  else assert(roamers(g).length > 0, level.id);
  assert.deepEqual(stamp(g), stamp(new Game(level, gear, { roamerSeed: 4873 })));
  for (const e of roamers(g)) {
    assert(!g.solid(Math.floor(e.x / 16), Math.floor(e.y / 16)));
    assert(Math.hypot(e.x - g.p.x, e.y - g.p.y) > 58);
  }
}
const tested = new Set();
for (let i = 1; i <= 300 && tested.size < ROAMERS.length; i++) {
  const g = new Game(LEVELS[0], gear, { roamerSeed: Math.imul(i, 2654435761) >>> 0 });
  for (const e of roamers(g)) {
    if (tested.has(e.design.id)) continue;
    g.p.x = e.x + 14; g.p.y = e.y;
    e.t = 1; e.update(g, e);
    assert.equal(e.state, 'warn', e.design.name);
    for (let t = 0; t < 35; t++) e.update(g, e);
    assert.equal(e.state, 'stalk', e.design.name);
    assert(g.ents.every(a => Number.isFinite(a.x) && Number.isFinite(a.y)));
    tested.add(e.design.id);
  }
}
assert.equal(tested.size, 20);
const run = new Game(LEVELS[0], gear, { roamerSeed: 3000041 });
for (let t = 0; t < 900; t++) run.step({ right: true, attackP: t % 12 === 0 });
assert.deepEqual(stamp(simulate(replayOf(run))), stamp(run));
assert.equal(roamers(new Game(LEVELS[0], gear)).length, 0);
console.log('Alle 20 Arten haben ihren Angriff ausgeführt. Platzierung und Replay geprüft.');
