// Prüft Rüstungsteile und Truhen-Waffen in der echten Spiellogik.
// node tools/geartest.mjs
import { LEVELS, levelById } from '../src/levels.js';
import { Game } from '../src/game.js';
import { UNIQUES, armorStats, loadout } from '../src/armor.js';
import { CHEST_WEAPONS } from '../src/weapons.js';
import { ARMOR } from '../src/gear.js';
import { replayOf, simulate } from '../src/replay.js';

let fail = 0;
const bad = m => { console.log('FEHLER', m); fail++; };
const ok = (c, m) => { if (!c) bad(m); else console.log('ok    ', m); };
const bot = f => ({ right: true, left: false, jump: f % 40 < 20, jumpP: f % 40 === 0, attack: false, attackP: f % 25 === 0, down: f % 40 > 26 });

// 1. Gleichwertigkeit: vier gleiche Stufen = alte Rüstung
for (let n = 0; n < 12; n++) {
  const s = armorStats(loadout({ armor: n })), o = ARMOR[n];
  if (s.hp !== o.hp || s.kb !== o.kb || s.spike !== o.spike || s.inv !== o.inv || !!s.ward !== !!o.ward || s.air !== (o.air || 0) || !!s.magnet !== !!o.magnet || !!s.rewind !== !!o.rewind) bad(`Stufe ${n} weicht von ARMOR ab`);
}
console.log('ok     Stufen 0–11 entsprechen exakt der alten Rüstung');

// 2. Gemischte Ausrüstung mit vielen Effekten: 600 Bilder auf 1-1, deterministisch
const mixed = { shovel: 3, weapon: 'frostspaten', helm: 'visier', brust: 'lebensquell', umhang: 'gleitumhang', hose: 'wandlaeufer' };
{
  const L = levelById('1-1'), g = new Game(L, mixed, { seed: 3 });
  for (let f = 0; f < 600; f++) g.step(bot(f));
  ok(!Number.isNaN(g.p.x) && g.frame > 0, `gemischte Ausrüstung läuft 600 Bilder (x=${Math.round(g.p.x)}, Tode ${g.deaths})`);
  const g2 = simulate({ ...replayOf(g), level: '1-1' });
  ok(g2.p.x === g.p.x && g2.p.y === g.p.y && g2.frame === g.frame, 'Wiederholung mit gemischter Ausrüstung ist deterministisch');
}
// 3. Regeneration heilt
{
  const g = new Game(levelById('1-1'), { shovel: 0, armor: 0, brust: 'lebensquell' }, { seed: 3 });
  g.p.hp = 1; let healed = 0;
  for (let f = 0; f < 60 * 32; f++) { g.p.inv = 5; g.step({}); if (g.p.hp > 1) { healed = f; break; } }
  ok(healed > 0, `Lebensquell heilt nach ${(healed / 60).toFixed(1)} s`);
}
// 4. Gleiten bremst den Fall
{
  const fall = umhang => {
    const g = new Game(levelById('1-1'), { shovel: 0, armor: 0, umhang }, { seed: 3 });
    g.p.y -= 120; g.p.vy = 0; let maxV = 0;
    for (let f = 0; f < 40; f++) { g.step({ jump: true }); maxV = Math.max(maxV, g.p.vy); }
    return maxV;
  };
  const a = fall(0), b = fall('gleitumhang');
  ok(b < a && b <= 1.11, `Gleitumhang: Fallgeschwindigkeit ${b.toFixed(2)} statt ${a.toFixed(2)}`);
}
// 5. Wandsprung
{
  const g = new Game(levelById('1-1'), { shovel: 0, armor: 0, hose: 'wandlaeufer' }, { seed: 3 });
  const p = g.p; p.wallT = 4; p.wallDir = 1; p.onGround = false; p.coyote = 0; g.p.y -= 40;
  g.step({ jumpP: true, jump: true });
  ok(p.vy < -4 && p.vx < 0, `Wandläufer stösst ab (vx ${p.vx.toFixed(1)}, vy ${p.vy.toFixed(1)})`);
}
// 6. Narrenkrone halbiert Herzen, Bollwerk gibt mehr
{
  const a = new Game(levelById('1-1'), { shovel: 0, armor: 3, helm: 'narrenkrone' }, {}), b = new Game(levelById('1-1'), { shovel: 0, armor: 3, brust: 'bollwerk' }, {});
  ok(a.p.maxhp < 10 && a.mod.gemMul >= 2, `Narrenkrone: ${a.p.maxhp} Herzen, Edelsteine ×${a.mod.gemMul}`);
  ok(b.p.maxhp > 10 && b.ar.kb < 0.5, `Bollwerk: ${b.p.maxhp} Herzen, Rückstoss ${b.ar.kb}`);
}
// 7. Spiegelplatte wirft Geschosse zurück, Frost friert ein, Wiederbelebung nur einmal
{
  const g = new Game(levelById('1-1'), { shovel: 3, armor: 3, brust: 'spiegelplatte' }, {});
  g.step({});
  const { eproj } = await import('../src/foes.js');
  const e = g.add(eproj(g.p.x, g.p.y + 2, 2, 0, 'arrow')); const hp = g.p.hp;
  g.step({});
  ok(e.dead && g.p.hp === hp && g.ents.some(o => o.kind === 'mirror'), 'Spiegelplatte spiegelt einen Pfeil');
  const f = new Game(levelById('1-1'), { shovel: 3, armor: 3, weapon: 'frostspaten' }, {});
  const foe = f.ents.find(o => o.foe && o.hp > 1) || f.ents.find(o => o.foe); foe.hp = 9; f.hitFoe(foe, 1, 1);
  ok(foe.frozen > 0, 'Frostspaten friert Gegner ein');
  const r = new Game(levelById('1-1'), { shovel: 3, armor: 3, weapon: 'seelenschaufel', umhang: 'phoenixmantel' }, { relics: { phoenix: 3 } });
  r.step({}); r.kill(); const after1 = r.p.dead; r.kill(); const after2 = r.p.dead;
  ok(!after1 && after2 > 0, 'Wiederbelebung höchstens einmal pro Level (drei Quellen)');
}
// 8. Jedes Stück und jede Waffe: kurzer Lauf auf mehreren Levels ohne Absturz
const lv = ['1-1', '1-3', '2-2', '3-2', '1-B'].map(levelById).filter(Boolean);
let runs = 0;
for (const u of UNIQUES) for (const L of lv) {
  try { const g = new Game(L, { shovel: 5, armor: 5, [u.slot]: u.id }, { seed: 5 }); for (let f = 0; f < 400; f++) { g.step(bot(f)); if (Number.isNaN(g.p.x + g.p.y)) throw new Error('NaN'); } runs++; }
  catch (err) { bad(`${u.id} auf ${L.id}: ${err.message}`); }
}
for (const w of CHEST_WEAPONS) for (const L of lv) {
  try { const g = new Game(L, { shovel: 5, armor: 5, weapon: w.id }, { seed: 5 }); for (let f = 0; f < 400; f++) { g.step(bot(f)); if (Number.isNaN(g.p.x + g.p.y)) throw new Error('NaN'); } runs++; }
  catch (err) { bad(`${w.id} auf ${L.id}: ${err.message}`); }
}
console.log(`ok     ${runs} Kurzläufe (${UNIQUES.length} Rüstungsteile, ${CHEST_WEAPONS.length} Waffen, ${lv.length} Levels)`);
void LEVELS;
console.log(fail ? `${fail} Fehler` : 'Alles ok');
process.exit(fail ? 1 : 0);
