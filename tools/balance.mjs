// Balance-Prüfung: probiert alle Kombinationen aus Rüstungsteilen (je Platz Stufe + 20 Stücke),
// danach die besten mit allen Waffen und Relikt-Sätzen. Werte kommen direkt aus der Spiellogik (Game),
// damit alle Obergrenzen genau so gelten wie im Spiel.
// Wertung: wirksame Herzen × Schaden × Beweglichkeit. Gemeldet wird, wenn ein Aufbau mehr als LIMIT-mal
// so stark ist wie ein vernünftiger Vergleich derselben Stufe (geschmiedete Rüstung, gleiche Schaufel, beste Relikte, beste Tat-Waffe).
// Auf Stufe N: Grundstücke bis Mithril, Stücke ab einer Startstufe bis N+1, aufgewertet bis min(Höchststufe, N).
// node tools/balance.mjs [--quick]
import { Game } from '../src/game.js';
import { UNIQUES, SLOT_IDS } from '../src/armor.js';
import { WEAPONS, weaponById } from '../src/weapons.js';

const LIMIT = 2.5, QUICK = process.argv.includes('--quick');
const LV = { id: 'BAL', name: 'Balance', theme: 'wald', map: ['..........', '.P........', '##########'], signs: [] };
const RELIC_SETS = [];
{
  const R = ['herz', 'sprint', 'feder', 'phoenix', 'schild'];
  for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) for (let c = b + 1; c < R.length; c++) RELIC_SETS.push({ [R[a]]: 3, [R[b]]: 3, [R[c]]: 3 });
}
function score(g) {
  const F = g.af, m = g.mod, p = g.p, R = g.relic;
  const heal = Math.min(4, (F.regen ? 120 / F.regen : 0) + (m.vamp ? 3 : 0));
  const revive = Math.max(R.phoenix ? R.phoenix * 2 : 0, m.soul ? p.maxhp : 0, F.phoenix || 0);
  const blocks = g.wardN + (F.gemShield ? 1.5 : 0) + (R.schild ? 1.5 : 0);
  const EH = (p.maxhp + blocks + heal + revive * 0.8) * (F.glass ? 0.6 : 1) * ((g.ar.inv || 50) / 50) ** 0.3 * (1 + (1 - g.ar.kb) * 0.1) * (g.ar.spike === 0 ? 1.05 : 1) * (F.mirror ? 1.08 : 1) * (F.calm ? 1.04 : 1) * (F.thorns ? 1 + F.thorns * 0.04 : 1);
  let bonus = 0;
  for (const [k, v] of [['chain', 0.3], ['shards', 0.25], ['thunder', 0.2], ['quake', 0.25], ['echo', 0.7], ['boomerang', 0.3], ['poison', 0.3], ['stars', 0.15], ['frost', 0.2], ['wave', 0.15], ['push', 0.05]]) if (m[k]) bonus += v;
  if (F.stomp) bonus += 0.15; if (F.sparks) bonus += 0.08; if (F.ember) bonus += 0.06; if (F.thorns) bonus += 0.05 * F.thorns;
  const DMG = g.dmg * (11 / m.atkLen) * Math.sqrt(g.reach / 16) * (1 + bonus);
  const MOB = (m.run / 2) * (m.jump / 5.6) ** 2 / (g.pgrav / 0.36) * (1 + 0.25 * g.airJumps) * (F.glide ? (F.wall || g.airJumps >= 2 ? 1.07 : 1.15) : 1) * (F.wall ? 1.25 : 1) * (F.gust ? 1.05 : 1) * (m.dash ? 1.1 : 1) * g.pogoMul;
  return { s: EH * DMG * MOB, EH, DMG, MOB };
}
const opts = {};
// Waffen haben ihre eigene Stufe (Ausrüstungsmodell 3): auf Stufe N aufgewertet bis min(Höchststufe, N), mindestens ihre Startstufe
const handOf = (N, weapon) => { const w = weapon && weaponById(weapon); return w ? Math.min(w.cap, Math.max(w.start, N)) : N; };
const make = (N, set, weapon, relics) => new Game(LV, { shovel: handOf(N, weapon), weapon, ...set }, { relics });
const reachable = (N, w) => !w || weaponById(w).start <= N + 1;
const flags = [];
const out = [];
const tiers = QUICK ? [5] : [2, 5, 8, 11];
for (const N of tiers) {
  for (const s of SLOT_IDS) opts[s] = [Math.min(N, 6), ...UNIQUES.filter(u => u.slot === s && u.start <= N + 1).map(u => `${u.id}@${Math.min(u.cap, Math.max(u.start, N))}`)];
  // Vergleich: geschmiedete Rüstung Stufe N, beste Relikte, beste erreichbare Waffe (Waffen haben eigene Stufen)
  let base = 0, baseRaw = score(make(N, { armor: N }, null, {})).s;
  for (const w of [null, ...WEAPONS.map(w => w.id)].filter(w => reachable(N, w))) for (const R of RELIC_SETS) base = Math.max(base, score(make(N, { armor: N }, w, R)).s);
  // 1) alle Rüstungskombinationen ohne Waffe und Relikte
  const top = [];
  let n = 0;
  for (const h of opts.helm) for (const b of opts.brust) for (const u of opts.umhang) for (const o of opts.hose) {
    const set = { helm: h, brust: b, umhang: u, hose: o }, g = make(N, set, null, {}), sc = score(g); n++;
    const F = g.af;
    // Unsterblichkeit und Geometrie-Abkürzungen
    if (g.p.maxhp + 4 + (F.phoenix || 0) + g.wardN > 40) flags.push(`Stufe ${N}: fast unsterblich ${JSON.stringify(set)}`);
    if (g.airJumps >= 2 && F.glide && F.wall) flags.push(`Stufe ${N}: Gleiten + Wandsprung + 2 Luftsprünge ${JSON.stringify(set)}`);
    if (sc.MOB > 2.4) flags.push(`Stufe ${N}: Beweglichkeit ×${sc.MOB.toFixed(2)} ${JSON.stringify(set)}`);
    top.push({ set, s: sc.s }); if (top.length > 400) { top.sort((a, b) => b.s - a.s); top.length = 150; }
  }
  top.sort((a, b) => b.s - a.s); top.length = Math.min(top.length, QUICK ? 30 : 120);
  // 2) die besten Rüstungen mit allen Waffen und Relikt-Sätzen
  let best = [];
  for (const t of top) for (const w of [null, ...WEAPONS.map(w => w.id)].filter(w => reachable(N, w))) for (const R of RELIC_SETS) {
    const g = make(N, t.set, w, R), sc = score(g);
    best.push({ set: t.set, w, R, ...sc });
    if (best.length > 2000) { best.sort((a, b) => b.s - a.s); best.length = 50; }
  }
  best.sort((a, b) => b.s - a.s); best = best.slice(0, 5);
  const ratio = best[0].s / base;
  out.push({ N, n, base, baseRaw, best, ratio });
  if (ratio > LIMIT) flags.push(`Stufe ${N}: bester Aufbau ×${ratio.toFixed(2)} über dem Vergleich`);
}
const fmt = b => `${SLOT_IDS.map(s => String(b.set[s]).split('@')[0]).join(' / ')} · ${b.w || 'Schaufel'} · ${Object.keys(b.R).join('+')}`;
for (const o of out) {
  console.log(`\nStufe ${o.N + 1}: ${o.n} Rüstungskombinationen. Vergleich ${o.base.toFixed(0)} (ohne Relikte/Waffe ${o.baseRaw.toFixed(0)})`);
  for (const b of o.best) console.log(`  ×${(b.s / o.base).toFixed(2)}  Herzen ${b.EH.toFixed(1)} · Schaden ${b.DMG.toFixed(1)} · Bewegung ${b.MOB.toFixed(2)}  ${fmt(b)}`);
}
const uniq = [...new Set(flags)];
console.log(`\n${uniq.length ? uniq.slice(0, 30).join('\n') + (uniq.length > 30 ? `\n… ${uniq.length - 30} weitere` : '') : 'Keine Ausreisser.'}`);
console.log(`Höchstes Verhältnis: ×${Math.max(...out.map(o => o.ratio)).toFixed(2)} (Grenze ×${LIMIT})`);
process.exit(uniq.length ? 1 : 0);
