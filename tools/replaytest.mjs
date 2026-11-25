// Spielt alle gespeicherten Probeläufe (tests/replays/*.json) nach. Schlägt fehl, wenn einer nicht mehr ins Ziel kommt.
// Probeläufe erzeugen: SAVE=1 node tools/solve.mjs <level> [schaufel] [rüstung]
import { readdirSync, readFileSync, existsSync } from 'fs';
import { simulate } from '../src/replay.js';
const dir = 'tests/replays';
const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')) : [];
let bad = 0;
for (const f of files) {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')), g = simulate(r);
  const ok = g && g.done && g.frame === r.frames;
  if (!ok) bad++;
  console.log(`${ok ? 'ok    ' : 'FEHLER'} ${f.padEnd(28)} ${g ? (g.frame / 60).toFixed(1) + ' s' : '–'}${ok ? '' : ` (erwartet ${(r.frames / 60).toFixed(1)} s, Ziel ${g && g.done})`}`);
}
console.log(`${files.length} Probeläufe, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
