// KI-Prüfung: ein Kampf-Bot tritt gegen jeden Boss auf allen fünf KI-Stärken an.
// Ausrüstung je Boss passend zum Spielfortschritt. Der Bot ist unverwundbar (jeder Treffer wird gezählt und sofort geheilt), damit sich Kämpfe vergleichen lassen.
// Gemessen: Dauer bis zum Sieg und erlittener Schaden. Höhere Stärke soll im Schnitt mehr Schaden bedeuten.
// node tools/aitest.mjs [Level-IDs …]
import { Game } from '../src/game.js';
import { levelById } from '../src/levels.js';
import { AI_LEVELS } from '../src/brain.js';
import { cx } from '../src/core.js';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['1-B', '2-B', '3-B', 'D-1', 'D-2', 'D-3', 'D-4', 'D-5', '4-1', '4-5', '4-10'];
const CAP = 60 * 180;
// Ausrüstung etwa so, wie man sie dort hat
const GEAR = { '1-B': 1, '2-B': 3, '3-B': 4 };
const tierFor = id => GEAR[id] ?? (id.startsWith('D-') ? 8 : 6);
function fight(L, ai) {
  const n = tierFor(L.id), g = new Game(L, { shovel: n, helm: n, brust: n, umhang: n, hose: n }, { seed: 7, roamerSeed: 11, ai });
  const b = g.boss;
  let dmg = 0, t = 0, hold = 0, started = false, hp0 = 0;
  for (; t < CAP && !g.done; t++) {
    const p = g.p;
    if (!started && b.state !== 'idle') { started = true; hp0 = b.hp; }
    const dx = (b.dead ? p.x + 40 : cx(b)) - cx(p), inp = {};
    const busy = ['rest', 'tired', 'stun'].includes(b.state);
    if (!started) { inp.right = true; if (t % 40 === 0) { inp.jumpP = true; hold = 12; } }
    else {
      // nah ran, wenn der Boss verschnauft; sonst etwas Abstand und auf Lücken warten
      const want = busy ? 10 : 46;
      if (Math.abs(dx) > want + 6) { inp.right = dx > 0; inp.left = dx < 0; }
      else if (Math.abs(dx) < want - 14 && !busy) { inp.right = dx < 0; inp.left = dx > 0; }
      else if (p.face !== Math.sign(dx)) { inp.right = dx > 0; inp.left = dx < 0; }
      if (Math.abs(dx) < 34 && t % 8 === 0) inp.attackP = true;
      if (p.onGround && Math.abs(dx) < 60 && !hold && (busy || t % 50 === 0)) { inp.jumpP = true; hold = 14; }
      if (!p.onGround && p.vy > 0) inp.down = true;
    }
    // Geschossen über den Kopf springen
    if (p.onGround && !hold && g.ents.some(e => e.type === 'eproj' && Math.abs(cx(e) - cx(p)) < 30 && e.y > p.y - 10)) { inp.jumpP = true; hold = 12; }
    if (hold > 0) { inp.jump = true; hold--; }
    g.step(inp);
    if (g.p.hp < g.p.maxhp) { dmg += g.p.maxhp - g.p.hp; g.p.hp = g.p.maxhp; }
    if (b.dead || b.state === 'dying') break;
  }
  return { won: b.dead || b.state === 'dying', s: t / 60, dmg, hp: hp0 || b.maxhp, left: b.hp };
}
const rows = [], sum = AI_LEVELS.map(() => 0);
console.log('Boss'.padEnd(6) + AI_LEVELS.map(n => n.padStart(18)).join(''));
for (const id of IDS) {
  const L = levelById(id); if (!L) continue;
  const cells = AI_LEVELS.map((_, ai) => {
    const r = fight(L, ai); sum[ai] += r.dmg;
    return (r.won ? `${r.s.toFixed(0)}s` : `${r.left}/${r.hp}`).padStart(8) + ` ${String(r.dmg).padStart(3)} Schaden`.padStart(10);
  });
  console.log(id.padEnd(6) + cells.join(''));
}
console.log('Summe Schaden je Stärke: ' + sum.map((v, i) => `${AI_LEVELS[i]} ${v}`).join(' · '));
if (sum[4] <= sum[0]) { console.log('FEHLER: höhere KI-Stärke macht die Bosse nicht gefährlicher'); process.exit(1); }
