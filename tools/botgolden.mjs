// Nimmt für Levels, die der einfache Test-Bot schafft, dessen Lauf als Probelauf auf.
import { writeFileSync, mkdirSync } from 'fs';
import { LEVELS } from '../src/levels.js';
import { Game } from '../src/game.js';
import { replayOf } from '../src/replay.js';
mkdirSync('tests/replays', { recursive: true });
for (const L of LEVELS) {
  const g = new Game(L, { shovel: 3, armor: 3 }, { seed: 3 });
  for (let f = 0; f < 60 * 90 && !g.done; f++) g.step({ right: true, left: false, jump: f % 40 < 20, jumpP: f % 40 === 0, attack: false, attackP: f % 25 === 0, down: f % 40 > 26 });
  if (g.done) { writeFileSync(`tests/replays/${L.id}.json`, JSON.stringify({ ...replayOf(g), level: L.id })); console.log('Bot-Probelauf', L.id); }
}
