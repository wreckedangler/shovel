// Beweist mit einer Strahlsuche, dass ein Level schaffbar ist (ohne Tod, ohne Waffen, Holz-Ausrüstung).
// node tools/solve.mjs 2-1 [schaufel] [rüstung]
import { levelById } from '../src/levels.js';
import { Game } from '../src/game.js';
import { generateLevel } from '../src/gen.js';
import { replayOf } from '../src/replay.js';
import { writeFileSync, mkdirSync } from 'fs';

const id = process.argv[2] || '1-1';
const gear = { shovel: +(process.argv[3] || 0), armor: +(process.argv[4] || 0) };
const L = process.env.GEN ? generateLevel(...process.env.GEN.split(':').map(Number)) : levelById(id);
const CH = 6;
const ACTS = [
  { right: 1 }, { right: 1, jump: 1, jp: 1 }, { right: 1, jump: 1 }, {}, { left: 1 }, { left: 1, jump: 1, jp: 1 },
  { right: 1, down: 1 }, { jump: 1, jp: 1 }, { right: 1, attack: 1 }, { left: 1, down: 1 }, { right: 1, jump: 1, jp: 1, down: 1 },
];
const vertical = L.map.length > 20;

// Optional: START=x,y (Kacheln) und TARGET=x,y (Kacheln) für Teilstrecken
const START = process.env.START && process.env.START.split(',').map(Number);
const TARGET = process.env.TARGET && process.env.TARGET.split(',').map(Number);
function run(seq) {
  const g = new Game(L, gear, { seed: 7 });
  if (START) { g.p.x = START[0] * 16 + 3; g.p.y = START[1] * 16 + 2; g.check = { x: g.p.x, y: g.p.y }; }
  for (const a of seq) for (let k = 0; k < CH; k++) {
    g.step({ left: !!a.left, right: !!a.right, down: !!a.down, jump: !!a.jump, jumpP: !!a.jp && k === 0, attack: !!a.attack, attackP: !!a.attack && k === 0 });
    if (g.deaths || g.p.hp < g.p.maxhp - 1) return { g, dead: true };
    if (g.done || (TARGET && g.p.onGround && g.p.x >= TARGET[0] * 16 && g.p.y <= TARGET[1] * 16)) return { g, done: true };
  }
  return { g };
}
// Abstand zum Ziel (Höhe zählt stärker), Stürze in die Tiefe sind Sackgassen
const goal0 = TARGET ? { x: TARGET[0] * 16, y: TARGET[1] * 16 - 34 } : new Game(L, gear).ents.find(e => e.type === 'goal');
const score = g => -(Math.abs(goal0.x - g.p.x) + Math.abs(goal0.y + 34 - g.p.y) * (vertical ? 2 : 0.6)) - (g.p.y > (vertical ? (g.h - 2) * 16 : 172) ? 3000 : 0) + (g.p.onGround ? 0 : -60);

let beam = [{ seq: [], s: 0 }];
const W = +(process.env.BEAM || 50), MAX = 400, t0 = Date.now();
let found = null, best = 0;
for (let d = 0; d < MAX && !found; d++) {
  const next = [], seen = new Set();
  for (const b of beam) for (const a of ACTS) {
    const seq = [...b.seq, a], r = run(seq);
    if (r.done) { found = r; break; }
    if (r.dead) continue;
    const key = `${Math.round(r.g.p.x / 4)},${Math.round(r.g.p.y / 4)},${Math.round(r.g.p.vy)}`;
    if (seen.has(key)) continue; seen.add(key);
    next.push({ seq, s: score(r.g), g: r.g });
    if (found) break;
  }
  if (process.env.DEBUG) console.log("d", d, "idle", next.filter(n => Math.round(n.g.p.x) === 339).map(n => Math.round(n.s)).join("|"), "next", next.length, "beam0", next[0] && Math.round(next[0].g.p.x/16), next[0] && Math.round(next[0].g.p.y/16));
  if (!next.length && process.env.DEBUG) {
    const b = beam[0]; const g = new Game(L, gear, { seed: 7 });
    if (START) { g.p.x = START[0] * 16 + 3; g.p.y = START[1] * 16 + 2; g.check = { x: g.p.x, y: g.p.y }; }
    b.seq.forEach((a, i) => { for (let k = 0; k < CH; k++) g.step({ left: !!a.left, right: !!a.right, down: !!a.down, jump: !!a.jump, jumpP: !!a.jp && k === 0, attack: !!a.attack, attackP: !!a.attack && k === 0 }); console.log(i, JSON.stringify(a), Math.round(g.p.x), Math.round(g.p.y), g.p.hp, !!g.p.plat, g.p.onGround); });
  }
  if (found || !next.length) break;
  next.sort((a, b) => b.s - a.s);
  // Vielfalt: höchstens 4 Kandidaten pro Kachel-Position, damit Warten/Umwege nicht verdrängt werden
  const per = {}; beam = [];
  for (const n of next) { const k = Math.round(n.g.p.x / 16) + ',' + Math.round(n.g.p.y / 16); if ((per[k] = (per[k] || 0) + 1) <= 4) beam.push(n); if (beam.length >= W) break; }
  best = Math.max(best, beam[0].s);
  if (d % 25 === 0) process.stdout.write(`  Tiefe ${d}: x=${Math.round(beam[0].g.p.x / 16)} y=${Math.round(beam[0].g.p.y / 16)}\n`);
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
// Mit SAVE=1 wird der gefundene Lauf als Probelauf für die Tests gespeichert
if (found && process.env.SAVE && !START && !TARGET) { mkdirSync('tests/replays', { recursive: true }); const name = (process.env.GEN ? 'gen-' + process.env.GEN.replace(':', '-') : id); writeFileSync(`tests/replays/${name}.json`, JSON.stringify({ ...replayOf(found.g), level: L.id })); console.log('gespeichert: tests/replays/' + name + '.json'); }
if (found) console.log(`${id}: SCHAFFBAR in ${(found.g.frame / 60).toFixed(1)} s Spielzeit (Suche ${secs} s)`);
else { console.log(`${id}: NICHT gefunden. Bester Stand x=${Math.round(beam[0].g.p.x / 16)} y=${Math.round(beam[0].g.p.y / 16)} (Suche ${secs} s)`); process.exitCode = 1; }
