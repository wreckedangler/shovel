// Schatten-Arena: KI gegen KI auf allen Karten. Prüft, dass Kämpfe enden, die Seiten fair sind
// und starke Ausrüstung hilft, aber nicht alles entscheidet.
import { Match, ShadeAI, ARENAS, WARDENS, cleanGear } from '../src/arena.js';

let fail = 0;
const bad = m => { console.log('FEHLER', m); fail++; };
function duel(arena, gA, gB, seed, skA = 0.6, skB = 0.6, styleA, styleB) {
  const m = new Match({ arena, meGear: gA, foe: { name: 'B', gear: gB, style: styleB, rating: 1200 }, seed, skill: skB, autoPogo: false });
  const ai = new ShadeAI(seed * 31 + 5, styleA || { aggr: 0.6, pogo: 0.4, air: 0.5 }, skA);
  let frames = 0, hits = 0;
  while (!m.over && frames < 60 * 60 * 9) {
    m.step(m.state === 'fight' ? ai.think(m.A, m.B) : {});
    for (const e of m.events) if (e.name === 'pvpHit') hits++;
    frames++;
  }
  if (!m.over) bad(`${arena}: Kampf endet nicht (Seed ${seed})`);
  return { ...m.result, frames, hits };
}
const fmt = s => (s / 60).toFixed(0) + ' s';
const MID = cleanGear({ shovel: 4, weapon: null, helm: 4, brust: 4, umhang: 4, hose: 4 });
const N = +(process.argv[2] || 24);
for (const a of ARENAS) {
  let wA = 0, wB = 0, dr = 0, tf = 0, th = 0, rounds = 0, timeouts = 0;
  for (let s = 1; s <= N; s++) {
    const r = duel(a.id, MID, MID, s);
    if (r.draw) dr++; else if (r.won) wA++; else wB++;
    tf += r.frames; th += r.hits; rounds += r.rounds;
  }
  console.log(`${a.name.padEnd(13)} gleiche Ausrüstung: links ${wA} · rechts ${wB} · remis ${dr} · Ø ${fmt(tf / N)} · Ø Treffer ${(th / N).toFixed(1)} · Ø Runden ${(rounds / N).toFixed(1)}`);
  if (Math.abs(wA - wB) > N * 0.42) bad(`${a.name}: Seiten unfair (${wA}:${wB})`);
  if (dr > N * 0.4) bad(`${a.name}: zu viele Remis (${dr})`);
  if (th / N < 4) bad(`${a.name}: kaum Treffer – die KI findet den Gegner nicht`);
}
// Ausrüstung: stärkster Wächter gegen Knappen bei gleicher Geschicklichkeit
{
  const top = WARDENS[WARDENS.length - 1].gear, low = WARDENS[0].gear;
  let w = 0; const n = N;
  for (let s = 1; s <= n; s++) { const a = ARENAS[s % 3].id; const r = duel(a, top, low, 100 + s); if (r.won) w++; }
  console.log(`Ausrüstung Leerenwandler gegen Grauer Knappe (gleiches Können): ${w}/${n} Siege`);
  if (w === n) bad('Topausrüstung gewinnt immer – zu stark');
  if (w < n * 0.4) bad('Topausrüstung bringt nichts');
}
// Können: starke KI gegen schwache, gleiche Ausrüstung
{
  let w = 0; const n = N;
  for (let s = 1; s <= n; s++) { const r = duel(ARENAS[s % 3].id, MID, MID, 200 + s, 0.9, 0.2); if (r.won) w++; }
  console.log(`Können 0.9 gegen 0.2 (gleiche Ausrüstung): ${w}/${n} Siege`);
  if (w < n * 0.6) bad('Können zählt zu wenig');
}
// Ein Spieler, der nur dasteht, wird gefunden und besiegt (die KI kommt überall hin)
for (const a of ARENAS) {
  let lost = 0, tf = 0; const n = 12;
  for (let s = 1; s <= n; s++) {
    const m = new Match({ arena: a.id, meGear: MID, foe: { name: 'B', gear: MID, style: { aggr: 0.5, pogo: 0.4, air: 0.5 } }, seed: 300 + s, skill: 0.5 });
    let f = 0; while (!m.over && f < 60 * 60 * 6) { m.step({}); f++; }
    if (m.result && !m.result.won && !m.result.draw) lost++; tf += f;
  }
  console.log(`${a.name.padEnd(13)} gegen Stillsteher: ${lost}/${n} gefunden und besiegt · Ø ${fmt(tf / n)}`);
  if (lost < n) bad(`${a.name}: KI erreicht einen stillstehenden Spieler nicht immer`);
  if (tf / n > 60 * 70) bad(`${a.name}: KI braucht zu lange zum Gegner`);
}
// Bitgenau: gleicher Seed, gleicher Ausgang
{
  const a = duel('saegeschlund', MID, MID, 77), b = duel('saegeschlund', MID, MID, 77);
  if (a.frames !== b.frames || a.hits !== b.hits) bad('nicht deterministisch');
}
console.log(fail ? `${fail} Fehler` : 'Alles ok');
process.exit(fail ? 1 : 0);
