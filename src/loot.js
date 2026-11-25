// Truhen, Relikte, Aussehen und Splitter. Reine Daten und Würfel-Logik, ohne DOM (Node-testbar).

export const RAR = [
  { id: 'gewoehnlich', name: 'Gewöhnlich', col: '#cfc4ae', glow: '#8a8170', shards: 5 },
  { id: 'selten', name: 'Selten', col: '#5ab8ff', glow: '#2a78d0', shards: 15 },
  { id: 'episch', name: 'Episch', col: '#c58bff', glow: '#7a3ad0', shards: 40 },
  { id: 'legendaer', name: 'Legendär', col: '#ffcf4a', glow: '#d08a10', shards: 120 },
];

// odds: Gewöhnlich / Selten / Episch / Legendär in Prozent. up: Chance, dass die Truhe beim Öffnen eine Stufe aufsteigt.
export const CHESTS = [
  { id: 'holz', name: 'Holztruhe', price: 250, odds: [68, 26, 5, 1], up: 0.12, col: '#b98a52', dark: '#6b4426', band: '#4e5866', multi: true },
  { id: 'eisen', name: 'Eisentruhe', price: 700, odds: [35, 45, 16, 4], up: 0.1, col: '#a9b5c2', dark: '#4e5866', band: '#2a2f38', multi: true },
  { id: 'gold', name: 'Goldtruhe', price: 1800, odds: [0, 55, 33, 12], up: 0.08, col: '#ffd84a', dark: '#a8741a', band: '#6b4426' },
  { id: 'urlicht', name: 'Urlicht-Truhe', price: 0, odds: [0, 0, 60, 40], up: 0, col: '#fff2cf', dark: '#ff9f3a', band: '#c84030', keyOnly: true },
];
export const PITY = 30; // spätestens nach so vielen Öffnungen ohne Legendär kommt eine legendäre Belohnung

// Relikte: 3 Plätze, jedes Relikt steigt durch Duplikate bis Stufe 3.
export const RELICS = [
  { id: 'magnet', name: 'Ziehstein', rar: 0, desc: l => `Edelsteine fliegen aus ${[0, 36, 52, 72][l]} px zu dir.` },
  { id: 'spaten', name: 'Grabmeisters Daumen', rar: 0, desc: l => `+${l} Edelstein pro gegrabenem Block.` },
  { id: 'sprint', name: 'Hasenpfote', rar: 0, desc: l => `+${l * 5}% Laufgeschwindigkeit.` },
  { id: 'gier', name: 'Elsterauge', rar: 1, desc: l => `+${[0, 15, 30, 50][l]}% Edelsteine.` },
  { id: 'rausch', name: 'Glutherz', rar: 1, desc: l => `Rausch füllt sich ${[0, 30, 60, 100][l]}% schneller.` },
  { id: 'herz', name: 'Eichenherz', rar: 1, desc: l => `+${l} Herz${l > 1 ? 'en' : ''}.` },
  { id: 'feder', name: 'Greifenfeder', rar: 2, desc: l => `Schaufel-Sprünge ${l * 6}% höher.` },
  { id: 'kette', name: 'Kettenglied', rar: 2, desc: l => `Kettenbonus ×${l + 1}.` },
  { id: 'glueck', name: 'Goldener Käfer', rar: 2, desc: l => `${[7, 14, 20, 28][l]}% goldene Gegner.` },
  { id: 'schild', name: 'Wächterrune', rar: 3, desc: l => `Blockt alle ${[0, 40, 30, 20][l]} s einen Treffer.` },
  { id: 'phoenix', name: 'Phönixasche', rar: 3, desc: l => `Einmal pro Level wiederbelebt mit ${l * 2} Herzen.` },
];
// Aussehen: Spur hinter dem Helden, Färbung und Aura.
export const COSMETICS = [
  { id: 'spur-blaetter', kind: 'spur', name: 'Herbstlaub', rar: 0 },
  { id: 'spur-funken', kind: 'spur', name: 'Schmiedefunken', rar: 0 },
  { id: 'spur-sterne', kind: 'spur', name: 'Sternenstaub', rar: 1 },
  { id: 'spur-flammen', kind: 'spur', name: 'Flammenschritt', rar: 2 },
  { id: 'spur-schatten', kind: 'spur', name: 'Schattenschleier', rar: 2 },
  { id: 'spur-regenbogen', kind: 'spur', name: 'Regenbogenpfad', rar: 3 },
  { id: 'farbe-purpur', kind: 'farbe', name: 'Purpurpatina', rar: 0, filter: 'hue-rotate(260deg) saturate(1.2)' },
  { id: 'farbe-smaragd', kind: 'farbe', name: 'Smaragdglanz', rar: 1, filter: 'hue-rotate(100deg) saturate(1.3)' },
  { id: 'farbe-frost', kind: 'farbe', name: 'Frostbiss', rar: 1, filter: 'hue-rotate(170deg) saturate(.8) brightness(1.15)' },
  { id: 'farbe-schatten', kind: 'farbe', name: 'Aschegestalt', rar: 2, filter: 'grayscale(1) brightness(.75) contrast(1.3)' },
  { id: 'farbe-gold', kind: 'farbe', name: 'Königsgold', rar: 3, filter: 'sepia(1) saturate(3.2) brightness(1.15)' },
  { id: 'aura-glut', kind: 'aura', name: 'Glutschein', rar: 1, col: '255,140,40' },
  { id: 'aura-frost', kind: 'aura', name: 'Frostlicht', rar: 2, col: '120,210,255' },
  { id: 'aura-urlicht', kind: 'aura', name: 'Urlicht', rar: 3, col: '255,236,170' },
];
export const ITEMS = [...RELICS.map(r => ({ ...r, kind: 'relikt' })), ...COSMETICS];
export const itemById = id => ITEMS.find(i => i.id === id);

// Splitter-Preise für die Schmiedestufen 7–12 (Index 6–11)
export const SHARD_PRICE = [0, 0, 0, 0, 0, 0, 40, 70, 110, 160, 230, 320];

export function relicMods(D) {
  const m = {};
  for (const id of D.relicSlots || []) if (id && D.relics[id]) m[id] = D.relics[id];
  return m;
}

// Eine Öffnung. rand: () => [0,1). Verändert D (Inventar, Pity) und gibt das Ergebnis zurück.
export function openChest(D, chestId, rand = Math.random) {
  let ci = CHESTS.findIndex(c => c.id === chestId);
  const from = ci;
  if (rand() < CHESTS[ci].up && ci < CHESTS.length - 2) ci++;   // nie automatisch zur Urlicht-Truhe
  const chest = CHESTS[ci];
  let r = rand() * 100, rar = 0;
  for (let k = 0, acc = 0; k < 4; k++) { acc += chest.odds[k]; if (r < acc) { rar = k; break; } rar = k; }
  while (chest.odds[rar] === 0 && rar < 3) rar++;
  D.loot.pity++;
  const pity = rar < 3 && D.loot.pity >= PITY;
  if (pity) rar = 3;
  if (rar === 3) D.loot.pity = 0;
  D.loot.opened++;
  const pool = ITEMS.filter(i => i.rar === rar);
  // Fehlende Gegenstände sind doppelt so wahrscheinlich wie Duplikate
  const weights = pool.map(i => (owned(D, i) ? 1 : 2));
  let w = rand() * weights.reduce((a, b) => a + b, 0), item = pool[0];
  for (let k = 0; k < pool.length; k++) { w -= weights[k]; if (w <= 0) { item = pool[k]; break; } }
  const res = { chest: chest.id, upgraded: ci !== from, rar, item: item.id, pity };
  if (item.kind === 'relikt') {
    const lvl = D.relics[item.id] || 0;
    if (lvl === 0) { D.relics[item.id] = 1; res.isNew = true; const free = D.relicSlots.indexOf(null); if (free >= 0) D.relicSlots[free] = item.id; }
    else if (lvl < 3) { D.relics[item.id] = lvl + 1; res.levelUp = lvl + 1; }
    else { res.shards = RAR[rar].shards; }
  } else if (!D.cosmetics[item.id]) { D.cosmetics[item.id] = true; res.isNew = true; }
  else res.shards = RAR[rar].shards;
  if (res.shards) D.shards += res.shards;
  return res;
}
export const owned = (D, i) => (i.kind === 'relikt' ? (D.relics[i.id] || 0) >= 3 : !!D.cosmetics[i.id]);

// Pixel-Symbole der Relikte (für ui und Enthüllung). k=Umriss, Farben je Buchstabe.
export const RELIC_ART = {
  magnet: ['.kk...kk.', 'kRRk.kBBk', 'kRRk.kBBk', 'kRRk.kBBk', 'kRRkkkBBk', 'kRRRRRBBk', '.kRRRRBk.', '..kkkkk..'],
  spaten: ['...kkk...', '..kYYYk..', '..kYWYk..', '..kYYYk..', '...kBk...', '...kBk...', '..kBBBk..', '..kkkkk..'],
  sprint: ['..kk.....', '.kWWk....', '.kWWWk...', '..kWWWk..', '...kWWWk.', '..kWWWWk.', '.kWWkkWk.', '.kkk..kk.'],
  gier: ['..kkkkk..', '.kWWWWWk.', 'kWWkkkWWk', 'kWkGGGkWk', 'kWkGkGkWk', 'kWWkkkWWk', '.kWWWWWk.', '..kkkkk..'],
  rausch: ['...k.k...', '..kOkOk..', '.kOYOYOk.', 'kOYYYYYOk', 'kOYWWWYOk', '.kOYYYOk.', '..kOOOk..', '...kkk...'],
  herz: ['.kk...kk.', 'kRRk.kRRk', 'kRWRkRRRk', 'kRRRRRRRk', '.kRRRRRk.', '..kRRRk..', '...kRk...', '....k....'],
  feder: ['......kk.', '.....kWWk', '....kWWBk', '...kWWBk.', '..kWWBk..', '.kWWBk...', '.kkBk....', 'kk.k.....'],
  kette: ['.kkk.....', 'kYYYk....', 'kY.kkkk..', 'kYYkYYYk.', '.kkkY.Yk.', '...kYYYk.', '....kkk..', '.........'],
  glueck: ['..k...k..', '...kkk...', '..kYYYk..', '.kYWYYYk.', '.kYYkYYk.', '.kYYkYYk.', '..kYYYk..', '...kkk...'],
  schild: ['.kkkkkkk.', 'kBBBBBBBk', 'kBWBBBWBk', 'kBBWWWBBk', 'kBBBWBBBk', '.kBBBBBk.', '..kBBBk..', '...kkk...'],
  phoenix: ['k...k...k', 'kOk.k.kOk', '.kOkYkOk.', '.kOYWYOk.', '..kOYOk..', '...kOk...', '..kOkOk..', '..k...k..'],
};
export const RELIC_PAL = { k: '#120c08', R: '#d04030', B: '#5ab8ff', Y: '#ffd84a', W: '#fff2cf', G: '#2a2018', O: '#ff8a2a' };
