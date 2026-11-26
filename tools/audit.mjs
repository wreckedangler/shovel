// Gegner- und Kartenprüfung über alle handgebauten Levels und eine Stichprobe erzeugter.
// Meldet: Gegner, die aus der Welt fallen, in Wänden stecken oder nie bewegen; Gegner direkt
// am Start oder an Laternen; zu lange Strecken ohne Laterne.
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { generateLevel } from '../src/gen.js';
import { T, SOLID, cx } from '../src/core.js';

const MOVERS = new Set(['beetle', 'blorb', 'knight', 'snail', 'toad']);
const issues = [];
const note = (lv, kind, msg) => issues.push({ lv, kind, msg });
const levels = [...LEVELS.filter(l => !l.duel && l.duel !== 0), ...[3, 7, 12, 20, 31].map(d => generateLevel(4242 + d, d))];
for (const L of levels) {
  const g = new Game(L, { shovel: 0, armor: 0 }, { seed: 7 });
  const id = L.id;
  // Der Held schaut nur zu: weit oben, unverwundbar, ausser Reichweite
  const foes = g.ents.filter(e => e.foe && e !== g.boss && !e.isChief && e.type !== 'roamer');
  const start = foes.map(e => ({ e, x: e.x, y: e.y }));
  // Startnähe
  const safe = [{ x: g.spawn.x, y: g.spawn.y, what: 'Start' }, ...g.ents.filter(e => e.type === 'lantern').map(e => ({ x: e.x, y: e.y, what: 'Laterne' }))];
  for (const e of foes) for (const s of safe) if (Math.abs(cx(e) - s.x) < 56 && Math.abs(e.y - s.y) < 40 && !e.float) note(id, 'Start', `${e.type} lauert ${Math.round(Math.abs(cx(e) - s.x))} px neben ${s.what} (${Math.round(e.x / T)},${Math.round(e.y / T)})`);
  // In Wänden
  for (const e of foes) { const tx = Math.floor(cx(e) / T), ty = Math.floor((e.y + e.h / 2) / T); if (SOLID.has(g.tile(tx, ty))) note(id, 'Wand', `${e.type} steckt in einer Wand (${tx},${ty})`); }
  // 40 s laufen lassen, Held geparkt
  const p = g.p; for (let t = 0; t < 2400; t++) { p.x = g.spawn.x; p.y = -400; p.vy = 0; p.inv = 99; p.hp = p.maxhp; g.step({}); }
  for (const s of start) {
    const e = s.e;
    if (e.dead && !g.ents.includes(e) && e.y > g.h * T - 4) note(id, 'Absturz', `${e.type} fällt in den Abgrund (${Math.round(s.x / T)},${Math.round(s.y / T)})`);
    else if (!e.dead && e.y > g.h * T) note(id, 'Absturz', `${e.type} fällt aus der Welt (${Math.round(s.x / T)},${Math.round(s.y / T)})`);
    else if (!e.dead && MOVERS.has(e.type) && Math.abs(e.x - s.x) < 1 && Math.abs(e.y - s.y) < 1) note(id, 'Starr', `${e.type} bewegt sich nie (${Math.round(s.x / T)},${Math.round(s.y / T)})`);
  }
  // Laternenabstand (handgebaute Levels)
  if (!L.gen && !L.boss) {
    const marks = [g.spawn.x, ...g.ents.filter(e => e.type === 'lantern').map(e => e.x), g.w * T].sort((a, b) => a - b);
    for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > 70 * T) note(id, 'Laterne', `${Math.round((marks[i] - marks[i - 1]) / T)} Kacheln ohne Laterne ab Spalte ${Math.round(marks[i - 1] / T)}`);
  }
}
const by = {}; for (const i of issues) (by[i.kind] = by[i.kind] || []).push(i);
for (const [k, list] of Object.entries(by)) { console.log(`\n## ${k} (${list.length})`); for (const i of list.slice(0, 40)) console.log(`${i.lv.padEnd(14)} ${i.msg}`); }
console.log(`\n${levels.length} Levels geprüft, ${issues.length} Auffälligkeiten`);
// Harte Fehler in handgebauten Levels brechen die Prüfung ab (Laternenabstände und starre Lauerer sind nur Hinweise)
const hard = issues.filter(i => ['Start', 'Wand', 'Absturz'].includes(i.kind) && !i.lv.startsWith('∞'));
if (hard.length) { console.log(`${hard.length} harte Fehler`); process.exit(1); }
