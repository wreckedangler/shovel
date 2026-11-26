// Käse-Bot: versucht jeden Boss allein durch „Schaufel-Sprung auf den Kopf und oben bleiben“ zu besiegen.
// Ein fairer Boss lässt das nicht zu: spätestens nach ein paar Abprallern in Folge wird man abgeworfen.
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';
import { cx } from '../src/core.js';

const MAX_CHAIN = 2;   // so viele Kopftreffer in Folge sind erlaubt, beim nächsten wirft der Boss ab
const bosses = LEVELS.filter(l => l.boss);
let fail = 0;
const rows = [];
for (const L of bosses) {
  const g = new Game(L, { shovel: 6, helm: 6, brust: 6, umhang: 6, hose: 6 }, { seed: 7, roamerSeed: 11 });
  let t = 0, chain = 0, maxChain = 0, hold = 0, started = false, landings = 0, hp0 = 0, killed = false;
  const b = g.boss;
  for (; t < 60 * 120 && !g.done; t++) {
    const p = g.p;
    if (!started) { started = b.state !== 'idle'; if (started) hp0 = b.hp; }
    const tx = b.dead ? p.x + 40 : cx(b), dx = tx - cx(p), inp = {};
    if (!started) { inp.right = true; if (g.frame % 40 === 0) { inp.jumpP = true; hold = 12; } }
    else if (p.onGround) {
      if (Math.abs(dx) > 6) { inp.right = dx > 0; inp.left = dx < 0; }
      if (Math.abs(dx) < 56 && !hold) { inp.jumpP = true; hold = 16; }
    } else {
      if (Math.abs(dx) > 3) { inp.right = dx > 0; inp.left = dx < 0; }
      inp.down = true;
    }
    if (hold > 0) { inp.jump = true; hold--; }
    const bh = b.hp, wasAir = !p.onGround, hc = g.headChain;
    g.step(inp);
    if (hc === 0) chain = 0;   // das Spiel hat eine Landung gezählt (z. B. kurz auf einem Sims)
    if (started && !b.dead && b.hp < bh && g.p.pogo !== false && wasAir) { chain++; maxChain = Math.max(maxChain, chain); }
    if (g.p.onGround && wasAir) { if (started) landings++; chain = 0; }
    if (b.dead || b.state === 'dying') { killed = true; break; }
  }
  const cheese = maxChain > MAX_CHAIN;
  rows.push(`${L.id.padEnd(5)} ${(L.name || '').padEnd(28).slice(0, 28)} Kopftreffer in Folge ${String(maxChain).padStart(2)} · Landungen ${String(landings).padStart(3)} · ${killed ? `besiegt nach ${Math.round(t / 60)} s` : `Boss ${b.hp}/${hp0 || b.maxhp}`}${cheese ? '  ← KÄSE' : ''}`);
  if (cheese) fail++;
}
console.log(rows.join('\n'));
console.log(fail ? `${fail} Bosse lassen sich durch Kopf-Camping besiegen` : 'Kein Boss lässt sich durch Kopf-Camping besiegen.');
process.exit(fail ? 1 : 0);
