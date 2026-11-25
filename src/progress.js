// Fortschritt: Erfolge, Ränge, Gesamtfortschritt, Schal-Stile, Tagesschatz.
import { LEVELS } from './levels.js';
import { WEAPONS } from './weapons.js';
import { countFakeGroups } from './game.js';

// Zählwerte einmal aus den Karten berechnen
export const LEVEL_INFO = Object.fromEntries(LEVELS.map(l => {
  const all = l.map.join('');
  const coins = (all.match(/O/g) || []).length;
  const secrets = (all.match(/H/g) || []).length + countFakeGroups(l.map.map(r => r.split('')));
  return [l.id, { coins, secrets }];
}));
export const TOTAL_COINS = Object.values(LEVEL_INFO).reduce((n, i) => n + i.coins, 0);

export const coinsOf = (D, id) => (D.coins[id] || []).length;
export const totalCoins = D => Object.values(D.coins).reduce((n, c) => n + c.length, 0);
export const totalSecrets = D => Object.values(D.secrets).reduce((n, c) => n + c, 0);
export const TOTAL_SECRETS = Object.values(LEVEL_INFO).reduce((n, i) => n + i.secrets, 0);

export function rankFor(level, r) {
  // r: { frames, deaths, coinsGot, coinsTotal, secretsGot, secretsTotal }
  let p = r.frames <= level.par * 60 ? 3 : r.frames <= level.par * 90 ? 2 : 1;
  p += r.deaths === 0 ? 2 : r.deaths <= 2 ? 1 : 0;
  p += !r.coinsTotal || r.coinsGot === r.coinsTotal ? 2 : r.coinsGot > 0 ? 1 : 0;
  p += !r.secretsTotal || r.secretsGot === r.secretsTotal ? 1 : 0;
  return p >= 7 ? 'S' : p >= 5 ? 'A' : p >= 3 ? 'B' : 'C';
}
export const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 };

export function completion(D) {
  const normal = LEVELS.filter(l => !l.secret), secret = LEVELS.filter(l => l.secret);
  const parts = [
    [normal.filter(l => D.cleared[l.id]).length, normal.length, 20],
    [secret.filter(l => D.cleared[l.id]).length, secret.length, 10],
    [Object.values(D.stars).flat().filter(Boolean).length, normal.length * 3, 15],
    [totalCoins(D), TOTAL_COINS, 20],
    [Math.min(totalSecrets(D), TOTAL_SECRETS), TOTAL_SECRETS, 10],
    [Object.keys(D.weapons).length, WEAPONS.length, 15],
    [Object.keys(D.ach).length, ACH.length, 10],
  ];
  return Math.floor(parts.reduce((s, [a, b, w]) => s + (b ? Math.min(1, a / b) * w : 0), 0));
}

// Erfolge: test(D) wird nach jedem Level und bei Ereignissen geprüft
export const ACH = [
  { id: 'start', name: 'Erste Schritte', desc: 'Den Moosweg schaffen.', gems: 50, test: D => D.cleared['1-1'] },
  { id: 'dig100', name: 'Maulwurfsehre', desc: '100 Erdblöcke ausgraben.', gems: 100, test: D => D.stats.dug >= 100 },
  { id: 'dig500', name: 'Tunnelkönig', desc: '500 Erdblöcke ausgraben.', gems: 400, test: D => D.stats.dug >= 500 },
  { id: 'chain5', name: 'Hüpfburg', desc: 'Pogo-Kette ×5.', gems: 100, test: D => D.stats.bestChain >= 5 },
  { id: 'chain8', name: 'Flummi', desc: 'Pogo-Kette ×8.', gems: 250, test: D => D.stats.bestChain >= 8 },
  { id: 'coin1', name: 'Glänzend', desc: 'Die erste Schaufelmünze finden.', gems: 50, test: D => totalCoins(D) >= 1 },
  { id: 'coin15', name: 'Münzsammler', desc: '15 Schaufelmünzen.', gems: 300, test: D => totalCoins(D) >= 15 },
  { id: 'coin30', name: 'Münzmeister', desc: '30 Schaufelmünzen.', gems: 800, test: D => totalCoins(D) >= 30 },
  { id: 'coinAll', name: 'Alles, was glänzt', desc: 'Jede einzelne Schaufelmünze.', gems: 3000, test: D => totalCoins(D) >= TOTAL_COINS },
  { id: 'sec1', name: 'Neugierig', desc: 'Das erste Geheimnis entdecken.', gems: 50, test: D => totalSecrets(D) >= 1 },
  { id: 'sec10', name: 'Schatzsucher', desc: '10 Geheimnisse entdecken.', gems: 400, test: D => totalSecrets(D) >= 10 },
  { id: 'secLevel', name: 'Durch die Hintertür', desc: 'Ein Geheimlevel finden.', gems: 200, test: D => Object.keys(D.secretOpen).length >= 1 },
  { id: 'gruft', name: 'Grabesruhe', desc: 'Die Schaufelgruft schaffen.', gems: 1500, test: D => D.cleared['X-0'] },
  { id: 'golden', name: 'Goldfieber', desc: 'Einen goldenen Gegner besiegen.', gems: 100, test: D => D.stats.golden >= 1 },
  { id: 'rush', name: 'Im Rausch', desc: 'Den Rausch auslösen.', gems: 100, test: D => D.stats.rush >= 1 },
  { id: 'rush10', name: 'Dauerrausch', desc: '10-mal im Rausch.', gems: 400, test: D => D.stats.rush >= 10 },
  { id: 'jackpot', name: 'Jackpot', desc: 'Eine legendäre Truhe öffnen.', gems: 300, test: D => D.stats.legendChest >= 1 },
  { id: 'flag', name: 'Gipfelstürmer', desc: 'Auf der Fahnenspitze landen.', gems: 100, test: D => D.stats.flag >= 1 },
  { id: 'sleep', name: 'Nickerchen', desc: 'Einfach mal nichts tun.', gems: 50, test: D => D.stats.sleep >= 1 },
  { id: 'die10', name: 'Hartnäckig', desc: '10-mal gefallen, 10-mal aufgestanden.', gems: 50, test: D => D.deathsTotal >= 10 },
  { id: 'boss1', name: 'Maulwurfjäger', desc: 'Den Rostmaulwurf besiegen.', gems: 200, test: D => D.cleared['1-B'] },
  { id: 'boss2', name: 'Uhrmacher', desc: 'Das Pendelwerk anhalten.', gems: 300, test: D => D.cleared['2-B'] },
  { id: 'boss3', name: 'Pilzbezwinger', desc: 'Die Morchelmutter besiegen.', gems: 400, test: D => D.cleared['3-B'] },
  { id: 'clean', name: 'Unberührbar', desc: 'Einen Boss ohne Schaden besiegen.', gems: 300, test: D => D.stats.bossClean >= 1 },
  { id: 'rankS', name: 'Meisterlich', desc: 'Einen S-Rang holen.', gems: 200, test: D => Object.values(D.ranks).includes('S') },
  { id: 'rankW1', name: 'Perfektionist', desc: 'S-Rang in allen Levels von Welt 1.', gems: 800, test: D => ['1-1', '1-2', '1-3', '1-B'].every(id => D.ranks[id] === 'S') },
  { id: 'weap5', name: 'Waffensammler', desc: '5 Spezialwaffen besitzen.', gems: 400, test: D => Object.keys(D.weapons).length >= 5 },
  { id: 'retro', name: 'Damals …', desc: 'Den Retro-Modus finden.', gems: 100, test: D => D.stats.retro >= 1 },
  { id: 'daily7', name: 'Treue Seele', desc: '7 Tage in Folge den Tagesschatz holen.', gems: 500, test: D => D.daily.streak >= 7 },
  { id: 'rich', name: 'Steinreich', desc: 'Insgesamt 10 000 Edelsteine verdienen.', gems: 300, test: D => D.earned >= 10000 },
];

// Schal-Stile für die Garderobe
export const SCARVES = [
  { id: 'auto', name: 'Rüstungsfarbe', need: 'Immer verfügbar', ok: () => true },
  { id: 'gold', name: 'Goldschal', need: '15 Schaufelmünzen', ok: D => totalCoins(D) >= 15 },
  { id: 'feuer', name: 'Flammenschal', need: 'Erfolg „Unberührbar“', ok: D => D.ach.clean },
  { id: 'regen', name: 'Regenbogenschal', need: '10 Erfolge', ok: D => Object.keys(D.ach).length >= 10 },
  { id: 'nacht', name: 'Sternennacht', need: '30 Schaufelmünzen', ok: D => totalCoins(D) >= 30 },
  { id: 'geist', name: 'Geisterschleier', need: 'Geisterklinge besitzen', ok: D => D.weapons.geisterklinge },
  { id: 'retro', name: 'Retro-Grün', need: 'Retro-Modus gefunden', ok: D => D.stats.retro >= 1 },
];

export function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export function yesterday() { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
