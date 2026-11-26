// Meister-Sets und Signaturwaffen: jede Fähigkeit wird einmal ausgelöst und auf Wirkung geprüft.
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SETS, setPieces, armorStats, uniqueById } from '../src/armor.js';
import { duelDeeds } from '../src/sets.js';
import { eproj, beetle, plat } from '../src/foes.js';

const MAP = ['#'.repeat(40), ...Array.from({ length: 11 }, (_, y) => '#' + (y === 9 ? '.P' + '.'.repeat(36) : '.'.repeat(38)) + '#'), '#'.repeat(40), '#'.repeat(40)];
const LV = { id: 'TEST', name: 'Test', theme: 'wald', map: MAP, signs: [], par: 99 };
const gearOf = (set, weapon = null) => { const g = { shovel: 3, weapon }; for (const id of setPieces(set)) g[uniqueById(id).slot] = id; return g; };
const run = (g, n, inp = {}) => { for (let i = 0; i < n; i++) g.step(typeof inp === 'function' ? inp(i) : inp); };
const ground = g => { run(g, 40); assert(g.p.onGround, 'Held steht nicht'); };
let n = 0; const ok = m => { n++; if (process.env.V) console.log('ok', m); };

// Set vollständig = Fähigkeit aktiv, drei Teile = nicht aktiv
for (const sid of Object.keys(SETS)) {
  const g = gearOf(sid); assert.equal(armorStats(g).set, sid);
  const three = { ...g, helm: 2 }; assert.equal(armorStats(three).set, null);
}
ok('Sets aktivieren nur vollständig');

{ // Glasrose: Wende in der Luft, Pfeil zerbricht
  const g = new Game(LV, gearOf('glasrose'), {}); ground(g);
  run(g, 6, i => ({ right: true, jumpP: i === 0, jump: true })); run(g, 2, { left: true, jump: true });
  assert(g.sx.glass, 'keine Glassilhouette');
  const a = g.add(eproj(g.sx.glass.x + 14, g.sx.glass.y + 6, -3.4, 0, 'arrow'));
  run(g, 8); assert(a.dead, 'Pfeil nicht zerbrochen'); ok('Glasrose');
}
{ // Ebbe: Ducken hält gegen Rückstoss
  const g = new Game(LV, gearOf('ebbe'), {}); ground(g); const x0 = g.p.x;
  run(g, 2, { down: true }); g.hurtPlayer(1, 1); run(g, 20, { down: true });
  assert(Math.abs(g.p.x - x0) < 0.5, 'Anker hält nicht'); ok('Ebbe');
}
{ // Vesper: zwei Ringe streifen, dann schweben
  const g = new Game(LV, gearOf('vesper'), {}); ground(g);
  for (let k = 0; k < 2; k++) { const e = g.add(eproj(g.p.x + 30, g.p.y - 12, -2, 0, 'shock')); e.h = 6; run(g, 40); }
  assert.equal(g.sx.wing, 2, 'Flügel nicht geladen');
  run(g, 20, i => ({ jumpP: i === 0, jump: true })); assert(g.sx.hover > 0 || g.sx.wing === 0, 'kein Schweben'); ok('Vesper');
}
{ // Kreide: drei harte Landungen → Dreieck verlangsamt Gegner
  const g = new Game(LV, gearOf('kreide'), {}); ground(g);
  const b = g.add(beetle(56, 0)); b.update = (_, e) => { if (e.iframe) e.iframe--; if (e.flash) e.flash--; }; b.y = 184 - b.h / 2; b.dmg = 0;
  for (const dx of [0, 80, 40]) { g.p.x = 40 + dx; g.p.y -= 70; g.p.vy = 5; g.p.onGround = false; run(g, 40); }
  assert(g.sx.tri || b.slowT > 0, 'kein Dreieck'); ok('Kreide');
}
{ // Esse: drei Geschosse zerschlagen, harte Landung löst weitere auf
  const g = new Game(LV, gearOf('esse'), {}); ground(g);
  for (let k = 0; k < 3; k++) { g.add(eproj(g.p.x + g.p.w + 4, g.p.y + 4, 0, 0, 'spore')).vy = 0; run(g, 1, { attackP: true }); run(g, 14); }
  assert.equal(g.sx.heat, 3, 'Esse nicht geheizt');
  const far = g.add(eproj(g.p.x + 20, g.p.y, 0, 0, 'spore')); far.update = () => {};
  g.p.y -= 80; g.p.vy = 6; g.p.onGround = false; run(g, 30);
  assert(far.dead, 'Ring löst Geschoss nicht auf'); ok('Esse');
}
{ // Naht: Faden nach Verlassen einer Plattform zieht zurück
  const g = new Game(LV, gearOf('naht'), {}); ground(g);
  const pl = plat(g.p.x - 8, g.p.y + g.p.h - 30, 'x'); pl.update = () => {}; g.plats.push(pl);
  g.p.y = pl.y - g.p.h - 1; g.p.vy = 0; g.p.onGround = false; run(g, 3); assert(g.p.plat === pl, 'steht nicht auf der Plattform');
  let k = 0; while (!g.sx.thread && k++ < 60) run(g, 1, { right: true }); assert(g.sx.thread, 'kein Faden');
  run(g, 1, { jumpP: true, jump: true, down: true });
  assert(Math.abs(g.p.y + g.p.h - pl.y) < 1, 'nicht zurückgezogen'); ok('Naht');
}
{ // Schatten: Ducken, verfehlter Hieb zieht Gegner heran
  const g = new Game(LV, gearOf('schatten'), {}); ground(g);
  const b = g.add(beetle(g.p.x + 90, g.p.y + 6)); b.update = (_, e) => { if (e.iframe) e.iframe--; if (e.flash) e.flash--; }; b.vx = 0;
  run(g, 5, { down: true }); run(g, 1, { attackP: true }); run(g, 16);
  const d0 = Math.abs(b.x - g.p.x); run(g, 20);
  assert(g.sx.pull || Math.abs(b.x - g.p.x) < d0 || Math.abs(b.x - g.p.x) < 80, 'kein Heranziehen'); ok('Schatten');
}

// Signaturwaffen: Wirkung auf einen Käfer
const foeAt = (g, dx) => { const b = g.add(beetle(g.p.x + dx, g.p.y + 6)); b.update = (_, e) => { if (e.iframe) e.iframe--; if (e.flash) e.flash--; }; b.hp = 99; return b; };
{ const g = new Game(LV, { shovel: 3, weapon: 'rosenschliff' }, {}); ground(g); const b = foeAt(g, 18);
  run(g, 1, { attackP: true }); run(g, 20); const h = b.hp; assert(g.sx.tip, 'keine Spitze'); run(g, 1, { attackP: true }); run(g, 20);
  assert(b.hp <= h - 2, 'Rückweg trifft nicht'); ok('Rosenschliff'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'kielbrecher' }, {}); ground(g); run(g, 1, { attackP: true }); run(g, 20);
  assert(g.sx.anch, 'kein Anker'); run(g, 40, { left: true }); const x0 = g.p.x;
  run(g, 4, i => ({ jumpP: i === 0, jump: true })); run(g, 1, { attackP: true }); assert(g.p.x > x0 + 10, 'kein Zug zum Anker'); ok('Kielbrecher'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'zwillingsstimme' }, {}); ground(g); const far = foeAt(g, 10 + g.reach - 2);
  run(g, 1, { attackP: true }); run(g, 16); assert(g.sx.note, 'kein tiefer Ton'); const h = far.hp;
  far.x = g.p.x + g.p.w + 1; run(g, 1, { attackP: true }); run(g, 16); assert(far.hp < h, 'keine Resonanz'); ok('Zwillingsstimme'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'blindzirkel' }, {}); ground(g); run(g, 1, { attackP: true }); run(g, 16);
  assert(g.sx.piv, 'kein Standbein'); const c = g.sx.piv, b = g.add(beetle(c.x + 20, c.y - 10)); b.update = (_, e) => { if (e.iframe) e.iframe--; if (e.flash) e.flash--; }; b.hp = 99;
  run(g, 1, { attackP: true }); assert(b.hp < 99, 'Halbkreis trifft nicht'); ok('Blindzirkel'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'sternamboss' }, {}); ground(g); run(g, 1, { attackP: true }); run(g, 16);
  assert(g.sx.shard, 'kein Splitter'); const s = g.sx.shard; g.p.x = s.x - g.p.w / 2; g.p.y = s.y - 40; g.p.vy = 3; g.p.onGround = false;
  g.ents.push({ type: 'cog', x: s.x - 6, y: s.y - 2, w: 12, h: 8 });
  run(g, 20, { down: true }); assert(!g.sx.shard && g.ents.some(e => e.type === 'proj' && e.kind === 'star'), 'kein Sternschuss'); ok('Sternamboss'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'letztesoehr' }, {}); ground(g); const a = foeAt(g, 18), b = foeAt(g, -30);
  run(g, 1, { attackP: true }); run(g, 16); run(g, 1, { left: true }); run(g, 1, { attackP: true }); run(g, 16);
  b.x -= 80; const ha = a.hp; run(g, 2); assert(a.hp < ha, 'Naht reisst nicht'); ok('Das letzte Öhr'); }
{ const g = new Game(LV, { shovel: 3, weapon: 'elfenbein' }, {}); ground(g);
  g.ents.push({ type: 'cog', x: g.p.x - 1, y: g.p.y + g.p.h - 2, w: 12, h: 4 }); g.p.y -= 40; g.p.vy = 3; g.p.onGround = false;
  run(g, 30, { down: true }); assert(g.sx.mark, 'keine Marke'); const m = g.sx.mark, b = g.add(beetle(m.x - 6, m.y - 10)); b.update = (_, e) => { if (e.iframe) e.iframe--; if (e.flash) e.flash--; }; b.hp = 99;
  run(g, 70, { right: true }); assert(b.hp < 99, 'Schattenklinge trifft nicht'); ok('Elfenbein'); }

// Fundbedingung Sereia: ohne Heilung gewinnen gibt Rosenschliff
{ const g = { level: { id: 'D-1' }, done: true, dl: { healed: false, ok: {}, cut: new Set(), bx: [], seg: null } }; assert.deepEqual(duelDeeds(g), ['rosenschliff']);
  g.dl.healed = true; assert.deepEqual(duelDeeds(g), []); ok('Fundbedingung'); }
console.log(`${n} Prüfungen: Sets und Signaturwaffen wirken.`);
