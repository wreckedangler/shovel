// Prüft Levels und lässt einen simplen Bot durch jedes Level laufen.
// node tools/test.mjs
import { LEVELS } from '../src/levels.js';
import { Game } from '../src/game.js';
import { encodeGhost, decodeGhost } from '../src/ghost.js';
import { replayOf, simulate } from '../src/replay.js';

await import('./weapontest.mjs');

let fail = 0;
const bad = m => { console.log('FEHLER', m); fail++; };

for (const L of LEVELS) {
  const w = L.map[0].length;
  L.map.forEach((r, i) => r.length !== w && bad(`${L.id} Reihe ${i} hat ${r.length} statt ${w}`));
  const all = L.map.join('');
  if (!all.includes('P')) bad(`${L.id} ohne Start`);
  if (!L.boss && !all.includes('E')) bad(`${L.id} ohne Ziel`);
  const signs = (all.match(/i/g) || []).length;
  if (signs !== L.signs.length) bad(`${L.id}: ${signs} Schilder, ${L.signs.length} Texte`);

  // Bot: läuft rechts, springt regelmässig, haut zu, pogo in der Luft
  const g = new Game(L, { shovel: 3, armor: 3 }, { seed: 3 });
  let maxX = 0;
  for (let f = 0; f < 60 * 90; f++) {
    const inp = { right: true, left: false, jump: f % 40 < 20, jumpP: f % 40 === 0, attack: false, attackP: f % 25 === 0, down: f % 40 > 26 };
    g.step(inp);
    maxX = Math.max(maxX, g.p.x);
    if (Number.isNaN(g.p.x) || Number.isNaN(g.p.y)) { bad(`${L.id} NaN`); break; }
    if (g.done) break;
  }
  // Determinismus: dieselben Eingaben müssen exakt denselben Lauf ergeben
  { const g2 = simulate({ ...replayOf(g), level: L.id }); const same = g2 && g2.frame === g.frame && g2.p.x === g.p.x && g2.p.y === g.p.y && g2.gems === g.gems && g2.deaths === g.deaths && g2.rec.length === g.rec.length;
    if (!same) bad(`${L.id} Wiederholung weicht ab (x ${g.p.x} vs ${g2 && g2.p.x})`); }
  console.log(`${L.id.padEnd(4)} ${L.name.padEnd(24)} Breite ${w}  Bot bis x=${Math.round(maxX / 16)}  fertig=${g.done}  Tode=${g.deaths}  Steine=${g.gems}  Frames=${g.frame}`);
  const code = await encodeGhost({ level: L.id, name: 'Bot', frames: g.frame, gear: { shovel: 3, armor: 3 }, rec: g.rec });
  const back = await decodeGhost(code);
  if (!back || back.rec.length !== g.rec.length || back.rec.some((s, i) => s[0] !== g.rec[i][0] || s[1] !== g.rec[i][1] || s[2] !== g.rec[i][2]))
    bad(`${L.id} Geist-Code nicht verlustfrei`);
  else console.log(`     Geist-Code ${code.length} Zeichen, ok`);
}
// Truhen: Verteilung, Garantie und Duplikate prüfen
{
  const { openChest, PITY, ITEMS } = await import('../src/loot.js');
  const D = { relics: {}, relicSlots: [null, null, null], cosmetics: {}, shards: 0, loot: { pity: 0, opened: 0 } };
  let s = 1; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cnt = [0, 0, 0, 0]; let maxDry = 0, dry = 0;
  for (let i = 0; i < 8000; i++) { const r = openChest(D, 'holz', rnd); cnt[r.rar]++; dry = r.rar === 3 ? 0 : dry + 1; maxDry = Math.max(maxDry, dry); }
  if (maxDry >= PITY) throw new Error('Garantie greift nicht: ' + maxDry);
  const all = ITEMS.every(i => i.kind === 'relikt' ? D.relics[i.id] === 3 : i.kind === 'ruestung' ? D.pieces[i.id] : i.kind === 'waffe' ? D.weapons[i.id] : D.cosmetics[i.id]);
  console.log(`Truhen: 8000 Holz → ${cnt.join('/')} · längste Durststrecke ${maxDry} · alles gesammelt ${all} · Splitter ${D.shards} · Slots ${D.relicSlots.join(',')}`);
}
console.log(fail ? `${fail} Fehler` : 'Alles ok');
process.exit(fail ? 1 : 0);
