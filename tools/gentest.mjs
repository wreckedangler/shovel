// Prüft viele generierte Levels: Format, Erreichbarkeit (statisch), Spiel startet ohne Fehler.
// node tools/gentest.mjs [anzahl]
import { generateLevel, reachable } from '../src/gen.js';
import { Game } from '../src/game.js';
const N = +(process.argv[2] || 300);
let bad = 0; const styles = {}, biomes = {}; let coinMiss = 0;
for (let i = 0; i < N; i++) {
  const seed = 1000 + i * 7919, depth = 1 + (i % 50);
  const L = generateLevel(seed, depth);
  const w = L.map[0].length;
  if (L.map.some(r => r.length !== w)) { bad++; console.log('Zeilenlänge', L.id); continue; }
  const r = reachable(L.map);
  styles[L.style] = (styles[L.style] || 0) + 1; biomes[L.theme] = (biomes[L.theme] || 0) + 1;
  if (!r.ok) { bad++; if (bad < 6) console.log('UNERREICHBAR', L.id, L.style, L.theme, '\n' + L.map.join('\n')); }
  if (r.coins < r.coinTotal || r.coinTotal !== 3) coinMiss++;
  try { const g = new Game(L, { shovel: 0, armor: 0 }, { seed: 7 }); for (let k = 0; k < 120; k++) g.step({ right: k % 30 < 20, jump: k % 40 === 0, jumpP: k % 40 === 0 }); } catch (e) { bad++; console.log('Absturz', L.id, e.message); }
}
console.log(`${N} Levels · Fehler ${bad} · Münzen nicht alle erreichbar/≠3: ${coinMiss} · Bauarten ${JSON.stringify(styles)} · Biome ${JSON.stringify(biomes)}`);
process.exit(bad ? 1 : 0);
