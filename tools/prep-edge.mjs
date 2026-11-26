// Kopiert die DOM-freie Spiel-Engine in die Edge Function (supabase/functions/verify/engine/).
import { mkdirSync, copyFileSync } from 'fs';
const dir = 'supabase/functions/verify/engine';
mkdirSync(dir, { recursive: true });
for (const f of ['game.js', 'core.js', 'foes.js', 'duels.js', 'duel-combat.js', 'hunts.js', 'hunters.js', 'roamers.js', 'roster.js', 'levels.js', 'gen.js', 'gear.js', 'weapons.js', 'replay.js', 'daily.js', 'armor.js']) copyFileSync('src/' + f, `${dir}/${f}`);
console.log('Engine kopiert nach', dir);
