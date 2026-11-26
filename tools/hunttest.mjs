// Alle Jagdreviere vom Eingang bis zum Ziel mit regulären Eingaben spielen.
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLDS, levelById } from '../src/levels.js';
import { HUNTS } from '../src/hunts.js';
import { drawHunter } from '../src/hunt-art.js';

const names = new Set(), silhouettes = new Set();
const drawContext = { fillRect() {}, drawImage() {}, save() {}, restore() {}, translate() {}, scale() {} };
globalThis.document = { createElement: () => ({ getContext: () => drawContext }) };
for (const id of WORLDS.find(world => world.id === 4).levels) {
  const level = levelById(id);
  const g = new Game(level, { shovel: 11, armor: 11 });
  const hunters = g.ents.filter(e => e.type === 'hunter');
  assert.equal(hunters.length, 4);
  assert.equal(hunters.filter(e => e.isChief).length, 1);
  for (const e of hunters) {
    names.add(e.design.name); silhouettes.add(e.design.shape);
    drawHunter(drawContext, e, 0);
  }
  for (let tick = 0; tick < 5400 && !g.done; tick++) {
    const approach = g.boss.state === 'idle';
    const target = approach ? 38 * 16 : g.boss.dead ? 60 * 16 + 6 : g.boss.x + g.boss.w / 2;
    const dx = target - (g.p.x + 5), stop = g.boss.dead ? 2 : 14;
    const hop = approach && tick % 48 < 18;
    g.step({ right: dx > stop || (dx > 0 && g.p.face < 0), left: dx < -stop || (dx < 0 && g.p.face > 0),
      jump: hop, jumpP: hop && tick % 48 === 0, attackP: tick % 7 === 0 });
  }
  assert.ok(g.done && g.boss.dead, id + ' muss nach dem Bosskampf abschliessbar sein');
  assert.equal(g.tile(level.gate, 10), '.');
  console.log(id, HUNTS[level.hunt].boss.name, g.frame);
}
assert.equal(names.size, 40); assert.equal(silhouettes.size, 40);
