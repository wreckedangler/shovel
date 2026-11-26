// Rüstung in vier Teilen: Helm, Brustpanzer, Umhang, Hose.
// Jeder Platz hat die 12 schmiedbaren Materialstufen aus gear.js und dazu viele einzigartige Stücke,
// die aus Effekt-Bausteinen zusammengesetzt sind (EFFECTS). Alle Effekte werden in game.js umgesetzt.
// Wichtig: vier Teile derselben Stufe ergeben exakt die alte Rüstung ARMOR[n] (Wiederholungen bleiben gültig).
// Reine Daten und Rechnungen ohne DOM (läuft auch in Node und in der Prüf-Funktion auf dem Server).
import { PRICE } from './gear.js';

export const SLOTS = [
  { id: 'helm', name: 'Helm', icon: 'helm' },
  { id: 'brust', name: 'Brustpanzer', icon: 'brust' },
  { id: 'umhang', name: 'Umhang', icon: 'umhang' },
  { id: 'hose', name: 'Hose', icon: 'hose' },
];
export const SLOT_IDS = ['helm', 'brust', 'umhang', 'hose'];
export const slotName = id => (SLOTS.find(s => s.id === id) || { name: id }).name;

/* ---------- Werte der geschmiedeten Stufen ---------- */
// Summe der vier Teile = ARMOR[n]: Herzen, Rückstoss (in Zwanzigsteln Schutz), Stachelschutz, Schutzzeit, Schild, Luftsprung, Magnet, Rückspulen
const HP = {
  brust: [2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 7],
  helm: [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5],
  hose: [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
  umhang: [0, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 4],
};
const KB = { helm: [0, 0, 4, 5, 5, 10, 10, 10, 10, 10, 10, 10], brust: [0, 0, 4, 5, 5, 10, 10, 10, 10, 10, 10, 10] };
const SPIKE = { brust: t => (t >= 3 ? 1 : 0), hose: t => (t >= 8 ? 1 : 0) };
const INV = { helm: t => (t >= 11 ? 80 : t >= 4 ? 60 : 0) };

// Werte eines Teils auf Stufe t (ohne Effekte)
export function tierStats(slot, t) {
  return {
    hp: HP[slot][t], kb: (KB[slot] || [])[t] || 0, spike: SPIKE[slot] ? SPIKE[slot](t) : 0, inv: INV[slot] ? INV[slot](t) : 0,
    ward: slot === 'umhang' && t >= 6 ? 1 : 0, air: slot === 'hose' ? (t >= 11 ? 2 : t >= 7 ? 1 : 0) : 0,
    magnet: slot === 'umhang' && t >= 9, rewind: slot === 'umhang' && t >= 10,
  };
}
// Kurzbeschreibung einer geschmiedeten Stufe
export function tierPerk(slot, t) {
  const s = tierStats(slot, t), out = [`${s.hp} Herz${s.hp === 1 ? '' : 'en'}`];
  if (s.kb) out.push(`Rückstoss −${s.kb * 5} %`);
  if (s.spike) out.push(slot === 'hose' ? 'Stachelfeste Sohlen' : 'Stacheln halb so schlimm');
  if (s.inv) out.push(`+${(s.inv / 60).toFixed(1).replace('.', ',')} s Schutz nach Treffer`);
  if (s.ward) out.push('Erster Treffer pro Level verpufft');
  if (s.air) out.push(s.air > 1 ? 'Dreifachsprung' : 'Doppelsprung');
  if (s.rewind) out.push('Rückspulen bei Absturz');
  else if (s.magnet) out.push('Edelstein-Glanz');
  return out.join(' · ');
}
// Schmiedepreis eines Teils: ein Drittel der alten Rüstung (alle vier zusammen kosten etwas mehr als früher eine)
export const piecePrice = t => Math.round((PRICE[t] || 0) / 30) * 10;

/* ---------- Effekt-Bausteine ---------- */
// v: Stärke. txt: Beschreibung. cap: Obergrenze nach dem Stapeln. bad: Nachteil. bool: nur an/aus.
// Mehrere Stücke mit demselben Effekt stapeln abnehmend: stärkster voll, zweiter halb, dritter ein Viertel …
export const EFFECTS = {
  hp: { txt: v => `+${v} Herz${v > 1 ? 'en' : ''}`, cap: 4, pts: 1 },
  kb: { txt: v => `Rückstoss −${v * 25} %`, cap: 4, pts: 0.4 },
  inv: { txt: v => `+${(v * 20 / 60).toFixed(1).replace('.', ',')} s Schutz nach Treffer`, cap: 2, pts: 0.5 },
  spike: { txt: () => 'Stacheln schaden 1 weniger', cap: 1, pts: 0.6 },
  ward: { txt: v => `${v} Schildladung${v > 1 ? 'en' : ''} pro Level`, cap: 2, pts: 1.2 },
  regen: { txt: v => `Alle ${v} s ein Herz zurück (höchstens 4 pro Level)`, min: true, pts: 2 },
  gemShield: { txt: () => 'Alle 50 Edelsteine eine Schildladung (höchstens 2)', bool: true, pts: 1.2 },
  thorns: { txt: v => `Wer dich berührt, erleidet ${v} Schaden`, cap: 2, pts: 1 },
  ember: { txt: () => 'Wirst du getroffen, bricht ein Feuerstoss aus', bool: true, pts: 0.8 },
  mirror: { txt: () => 'Spiegelt feindliche Geschosse zurück (kurze Abklingzeit)', bool: true, pts: 1.5 },
  phoenix: { txt: v => `Einmal pro Level Wiederbelebung mit ${v} Herzen`, cap: 4, pts: 2.5 },
  rewind: { txt: () => 'Absturz spult zurück, ganz ohne Herzverlust', bool: true, pts: 1.2 },
  run: { txt: v => `+${v} % Lauftempo`, cap: 25, pts: 0.08 },
  jump: { txt: v => `+${v} % Sprungkraft`, cap: 10, pts: 0.15 },
  air: { txt: () => '+1 Luftsprung', bool: true, pts: 1.5 },
  glide: { txt: () => 'Sprung halten im Fallen: gleiten', bool: true, pts: 1.2 },
  wall: { txt: () => 'Wandsprung: an Wänden abstossen (dafür höchstens 1 Luftsprung)', bool: true, pts: 1.5 },
  gust: { txt: () => 'Rückenwind: in der Luft schneller', bool: true, pts: 0.8 },
  ice: { txt: () => 'Gleitet wie auf Eis, schneller Antritt', bool: true, pts: 0.4 },
  feather: { txt: v => `−${v} % Schwerkraft`, cap: 20, pts: 0.08 },
  shadow: { txt: () => 'In der Luft nochmals Sprung: Schattensprint durch Gegner', bool: true, pts: 1.5 },
  stars: { txt: () => 'Schaufel-Sprünge schleudern zwei Sterne', bool: true, pts: 1 },
  stomp: { txt: () => 'Schaufel-Sprünge und harte Landungen erschüttern den Boden', bool: true, pts: 1 },
  sparks: { txt: () => 'Beim Laufen bleibt eine brennende Funkenspur', bool: true, pts: 0.9 },
  horns: { txt: () => 'Kopfstösse von unten zerschlagen Erde und Stein', bool: true, pts: 0.6 },
  dmg: { txt: v => `+${Math.round(v * 25)} % Schaden (abgerundet)`, cap: 2, pts: 1.5 },
  pogo: { txt: v => `Schaufel-Sprünge ${v} % höher`, cap: 20, pts: 0.05 },
  light: { txt: () => 'Grosser Lichtkreis, Fallen glühen auf', bool: true, pts: 0.3 },
  seer: { txt: () => 'Zeigt verborgene Blöcke und falsche Wände', bool: true, pts: 0.5 },
  magnet: { txt: () => 'Edelsteine fliegen von weit her zu dir', bool: true, pts: 0.4 },
  stealth: { txt: () => 'Gegner bemerken dich viel später', bool: true, pts: 0.6 },
  calm: { txt: () => 'Bei 1 Herz: Zeitlupe für alle Gegner', bool: true, pts: 0.8 },
  gems: { txt: v => `+${v} % Edelsteine`, cap: 100, pts: 0.02 },
  luck: { txt: v => `+${v} % goldene Gegner`, cap: 20, pts: 0.04 },
  rush: { txt: v => `Rausch füllt sich ${v} % schneller`, cap: 80, pts: 0.01 },
  // Set: alle vier Teile eines Sets aktivieren die Set-Fähigkeit (siehe sets.js)
  set: { txt: v => SETS[v] ? `${SETS[v].name}: ${SETS[v].txt}` : '', str: true, pts: 0 },
  // Nachteile
  fool: { txt: () => 'Nachteil: Herzen halbiert', bool: true, bad: true, pts: -3 },
  glass: { txt: () => 'Nachteil: jeder Treffer kostet 1 Herz mehr', bool: true, bad: true, pts: -2.5 },
  slow: { txt: v => `Nachteil: −${v} % Lauftempo`, cap: 25, bad: true, pts: -0.08 },
  heavy: { txt: v => `Nachteil: −${v} % Sprungkraft`, cap: 15, bad: true, pts: -0.15 },
  frail: { txt: v => `Nachteil: −${v} Herz${v > 1 ? 'en' : ''}`, cap: 4, bad: true, pts: -1 },
  dim: { txt: () => 'Nachteil: kleiner Lichtkreis', bool: true, bad: true, pts: -0.3 },
};

/* ---------- Einzigartige Stücke ---------- */
// Aussehen (look): b = Grundform, d = Verzierungen, m = Material (Palette), f = leuchtende Effekte [art, farbe], s = Beinstil, sc = Schalfarben
// Grundformen: Helm 0–11 = Formen der Stufen, 'kapuze', 'maske', 'grosshelm', 'kronhelm'; Brust 0–11; Umhang 'kurz', 'lang', 'zerfetzt', 'fluegel', 'kragen'; Hose = Stil
// rar: 0 gewöhnlich · 1 selten · 2 episch · 3 legendär. Die Stufe (Eisen bis Urlicht) steht unten in TIER_OF,
// geschmiedete Stufen desselben Platzes heben sie an (siehe pieceOf).
const BASE_TIER = [0, 1, 2, 3];
const U = [];
const P = (slot, id, name, rar, fx, look, extra = {}) => U.push({ slot, id, name, rar, tier: BASE_TIER[rar], fx, look, ...extra });

// Helme
P('helm', 'laternenhelm', 'Laternenhelm', 0, { light: true }, { b: 0, m: 'rost', d: ['laterne'], f: [['flames', '#ffd84a']] });
P('helm', 'rabenhelm', 'Rabenhelm', 0, { seer: true }, { b: 'kapuze', m: 'obsidian', d: ['schnabel'], f: [['eyes', '#ff3a3a']] });
P('helm', 'hoernerhelm', 'Hörnerhelm', 0, { horns: true }, { b: 'grosshelm', m: 'knochen', d: ['hoerner'] });
P('helm', 'wachthelm', 'Wachthelm des Söldners', 0, { hp: 1 }, { b: 3, m: 'rost', d: [] });
P('helm', 'lauscherkappe', 'Lauscherkappe', 0, { stealth: true }, { b: 'kapuze', m: 'sumpf', d: ['federn'] });
P('helm', 'elsternhaube', 'Elsternhaube', 0, { gems: 15 }, { b: 1, m: 'gold', d: ['federn'] });
P('helm', 'sternenhelm', 'Sternenhelm', 1, { stars: true }, { b: 7, m: 'mond', d: ['sterne'], f: [['sparkle', '#ffffff']] });
P('helm', 'eisenstirn', 'Eisenstirn', 1, { kb: 2 }, { b: 'grosshelm', m: 'asche', d: ['nieten'] });
P('helm', 'langewacht', 'Helm der Langen Wacht', 1, { inv: 2 }, { b: 4, m: 'silber', d: ['federn'], f: [['visor', '#bff6ff']] });
P('helm', 'kaeferkrone', 'Goldkäfer-Krone', 1, { luck: 10 }, { b: 'kronhelm', m: 'gold', d: ['krone'] });
P('helm', 'raserkopf', 'Haupt des Rasenden', 1, { rush: 40 }, { b: 5, m: 'blut', d: ['stacheln'], f: [['eyes', '#ff2020']] });
P('helm', 'dornenkrone', 'Dornenkrone', 1, { thorns: 1 }, { b: 'maske', m: 'sumpf', d: ['dornen'] });
P('helm', 'visier', 'Visier der Ruhe', 2, { calm: true, inv: 1 }, { b: 4, m: 'leere', d: ['einhorn'], f: [['visor', '#ff9af0'], ['eyes', '#ff4fd8']] });
P('helm', 'waechterkopf', 'Kopf des Wächters', 2, { hp: 2 }, { b: 'grosshelm', m: 'jade', d: ['federn', 'nieten'], f: [['eyes', '#7dffcf']] });
P('helm', 'knochenreisser', 'Knochenreisser', 2, { horns: true, dmg: 1 }, { b: 'maske', m: 'knochen', d: ['hoerner', 'kiefer'], f: [['eyes', '#ff4020']] });
P('helm', 'mondkrone', 'Mondsichelkrone', 2, { light: true, seer: true }, { b: 11, m: 'mond', d: ['krone'], f: [['halo', '#e0e0ff']] });
P('helm', 'verschlinger', 'Schädel des Verschlingers', 2, { gems: 25, rush: 30 }, { b: 8, m: 'knochen', d: ['geweih'], f: [['embers', '#ff4020']] });
P('helm', 'narrenkrone', 'Krone des Narren', 3, { gems: 100, luck: 15, fool: true }, { b: 'kronhelm', m: 'gold', d: ['krone', 'schellen'], f: [['halo', '#ffd84a'], ['sparkle', '#fff6b0']] });
P('helm', 'gefallenerkoenig', 'Krone des Gefallenen Königs', 3, { hp: 3, ward: 1, slow: 10 }, { b: 'grosshelm', m: 'obsidian', d: ['krone', 'hoerner'], f: [['eyes', '#ff2020'], ['aura', '#c02a3a']] });
P('helm', 'leerenblick', 'Blick der Leere', 3, { seer: true, calm: true, stealth: true, frail: 1 }, { b: 'maske', m: 'leere', d: ['geweih'], f: [['void', '#ff4fd8'], ['eyes', '#ff9af0']] });
// Brustpanzer
P('brust', 'federleib', 'Federleib', 0, { feather: 12 }, { b: 6, m: 'silber', d: ['federn'] });
P('brust', 'edelsteinpanzer', 'Edelsteinpanzer', 0, { gemShield: true }, { b: 5, m: 'frost', d: ['nieten'] });
P('brust', 'soeldnerhemd', 'Kettenhemd des Söldners', 0, { hp: 1 }, { b: 2, m: 'rost', d: ['ketten'] });
P('brust', 'gerberwams', 'Gerberwams', 0, { kb: 1 }, { b: 0, m: 'rost', d: ['ketten'] });
P('brust', 'igelbrust', 'Igelbrust', 0, { spike: true }, { b: 4, m: 'asche', d: ['stacheln'] });
P('brust', 'goldwams', 'Goldwams', 0, { gems: 15 }, { b: 1, m: 'gold', d: ['nieten'] });
P('brust', 'dornenpanzer', 'Dornenpanzer', 1, { thorns: 1 }, { b: 4, m: 'sumpf', d: ['stacheln', 'dornen'] });
P('brust', 'glutkern', 'Glutkern', 1, { ember: true }, { b: 8, m: 'glut', d: ['kern'], f: [['embers', '#ff8a2a'], ['rune', '#ffd040']] });
P('brust', 'geduld', 'Panzer der Geduld', 1, { inv: 2 }, { b: 3, m: 'silber', d: ['rune'] });
P('brust', 'rippenpanzer', 'Rippenpanzer', 1, { hp: 1, kb: 1 }, { b: 8, m: 'knochen', d: ['rippen'] });
P('brust', 'runenplatte', 'Runenplatte', 1, { ward: 1 }, { b: 10, m: 'jade', d: ['rune'], f: [['rune', '#7dffcf']] });
P('brust', 'blutrausch', 'Brust des Blutrauschs', 1, { rush: 40, dmg: 1, frail: 1 }, { b: 9, m: 'blut', d: ['kern'], f: [['rune', '#ff2020']] });
P('brust', 'lebensquell', 'Lebensquell', 2, { regen: 30 }, { b: 3, m: 'jade', d: ['kern'], f: [['rune', '#7dffcf'], ['aura', '#30d080']] });
P('brust', 'bollwerk', 'Bollwerk', 2, { hp: 3, kb: 2, slow: 10 }, { b: 4, m: 'rost', d: ['stacheln', 'nieten'] });
P('brust', 'spiegelplatte', 'Spiegelplatte', 2, { mirror: true }, { b: 11, m: 'silber', d: ['spiegel'], f: [['shine', '#ffffff']] });
P('brust', 'schaedelpanzer', 'Schädelpanzer', 2, { thorns: 2, spike: true }, { b: 8, m: 'knochen', d: ['schaedel', 'stacheln'], f: [['eyes', '#ff4020']] });
P('brust', 'sternenherz', 'Sternenherz', 2, { stars: true, pogo: 10 }, { b: 7, m: 'mond', d: ['rune'], f: [['stars', '#ffd84a']] });
P('brust', 'herzderleere', 'Herz der Leere', 3, { regen: 20, ember: true, glass: true }, { b: 9, m: 'leere', d: ['kern', 'stacheln'], f: [['void', '#ff4fd8'], ['aura', '#9a4cff']] });
P('brust', 'drachenschuppe', 'Drachenschuppenpanzer', 3, { hp: 2, spike: true, ember: true, slow: 8 }, { b: 8, m: 'glut', d: ['schuppen', 'stacheln'], f: [['embers', '#ff8a2a'], ['aura', '#ff6a20']] });
P('brust', 'blutpakt', 'Blutpakt', 3, { thorns: 2, dmg: 1, frail: 2 }, { b: 9, m: 'blut', d: ['schaedel'], f: [['drip', '#c00010'], ['aura', '#ff2030']] });
// Umhänge
P('umhang', 'magnetmantel', 'Magnetmantel', 0, { magnet: true }, { b: 'kurz', m: 'blut', sc: ['#e04040', '#4080e0'] });
P('umhang', 'sturmmantel', 'Sturmmantel', 0, { gust: true }, { b: 'lang', m: 'frost' });
P('umhang', 'wanderermantel', 'Wanderermantel', 0, { run: 8 }, { b: 'kurz', m: 'sumpf' });
P('umhang', 'stillemantel', 'Mantel der Stille', 0, { stealth: true }, { b: 'kragen', m: 'asche' });
P('umhang', 'glueckslumpen', 'Glückslumpen', 0, { luck: 10 }, { b: 'zerfetzt', m: 'gold' });
P('umhang', 'daunenumhang', 'Daunenumhang', 0, { feather: 10 }, { b: 'lang', m: 'silber' });
P('umhang', 'gleitumhang', 'Gleitumhang', 1, { glide: true }, { b: 'fluegel', m: 'mond' });
P('umhang', 'funkenmantel', 'Funkenmantel', 1, { sparks: true }, { b: 'zerfetzt', m: 'glut', f: [['embers', '#ffb040']] });
P('umhang', 'waechterumhang', 'Wächterumhang', 1, { ward: 1 }, { b: 'kragen', m: 'jade' });
P('umhang', 'aschenschleppe', 'Aschenschleppe', 1, { inv: 2 }, { b: 'lang', m: 'asche', f: [['ash', '#8a8480']] });
P('umhang', 'sternenschleier', 'Sternenschleier', 1, { stars: true }, { b: 'lang', m: 'mond', f: [['stars', '#ffd84a']] });
P('umhang', 'jaegerumhang', 'Jägerumhang', 1, { run: 12 }, { b: 'kurz', m: 'rost' });
P('umhang', 'schattenumhang', 'Schattenumhang', 2, { shadow: true }, { b: 'zerfetzt', m: 'obsidian', f: [['void', '#6a3aa0']] });
P('umhang', 'rueckspulmantel', 'Mantel des Rückspulens', 2, { rewind: true, inv: 1 }, { b: 'kragen', m: 'gold', f: [['gear', '#ffcf4a']] });
P('umhang', 'mantelderleere', 'Mantel der Leere', 2, { stealth: true, seer: true }, { b: 'lang', m: 'leere', f: [['void', '#ff4fd8']] });
P('umhang', 'rabenschwingen', 'Rabenschwingen', 2, { glide: true, feather: 10 }, { b: 'fluegel', m: 'obsidian', f: [['ash', '#3a2458']] });
P('umhang', 'glutschleppe', 'Glutschleppe', 2, { sparks: true, run: 8 }, { b: 'zerfetzt', m: 'glut', f: [['embers', '#ff8a2a']] });
P('umhang', 'phoenixmantel', 'Phönixmantel', 3, { phoenix: 3, sparks: true, frail: 1 }, { b: 'fluegel', m: 'glut', sc: ['#ff8a2a', '#ffd84a'], f: [['flames', '#ff8a2a'], ['aura', '#ff6a20']] });
P('umhang', 'ewigerkoenig', 'Mantel des Ewigen Königs', 3, { ward: 2, magnet: true, slow: 8 }, { b: 'lang', m: 'gold', sc: ['#8a1020', '#ffd84a'], f: [['aura', '#ffd84a'], ['sparkle', '#fff6b0']] });
P('umhang', 'sturmschwingen', 'Schwingen des Sturms', 3, { glide: true, gust: true, heavy: 8 }, { b: 'fluegel', m: 'frost', f: [['sparkle', '#bff6ff'], ['aura', '#80d0ff']] });
// Hosen
P('hose', 'sprintstiefel', 'Sprintstiefel', 0, { run: 12 }, { s: 'stiefel', m: 'blut' });
P('hose', 'eislaeufer', 'Eisläufer', 0, { ice: true }, { s: 'schienen', m: 'frost' });
P('hose', 'federschritt', 'Federschritt', 0, { jump: 5 }, { s: 'glatt', m: 'silber' });
P('hose', 'leisetreter', 'Leisetreter', 0, { stealth: true }, { s: 'glatt', m: 'asche' });
P('hose', 'dornensohlen', 'Dornensohlen', 0, { spike: true }, { s: 'krallen', m: 'sumpf' });
P('hose', 'eisenschienen', 'Eisenschienen', 0, { kb: 1 }, { s: 'schienen', m: 'rost' });
P('hose', 'sprungfeder', 'Sprungfeder', 1, { jump: 8 }, { s: 'runen', m: 'jade' });
P('hose', 'wolkenhose', 'Wolkenhose', 1, { air: true }, { s: 'glatt', m: 'mond', f: [['feet', '#ffffff']] });
P('hose', 'stampfer', 'Stampfer', 1, { stomp: true }, { s: 'stiefel', m: 'rost' });
P('hose', 'kniebrecher', 'Kniebrecher', 1, { hp: 1, kb: 1 }, { s: 'schienen', m: 'knochen' });
P('hose', 'glutsohlen', 'Glutsohlen', 1, { sparks: true }, { s: 'runen', m: 'glut', f: [['feet', '#ff8a2a']] });
P('hose', 'schatzgraeber', 'Hose des Schatzgräbers', 1, { gems: 20 }, { s: 'stiefel', m: 'gold' });
P('hose', 'wandlaeufer', 'Wandläufer', 2, { wall: true }, { s: 'krallen', m: 'obsidian', f: [['feet', '#ff3a3a']] });
P('hose', 'wolfslaeufe', 'Wolfsläufe', 2, { run: 12, jump: 5 }, { s: 'krallen', m: 'asche' });
P('hose', 'gauklerbeine', 'Federbeine des Gauklers', 2, { pogo: 15, stomp: true }, { s: 'runen', m: 'gold' });
P('hose', 'himmelsstufen', 'Himmelsstufen', 2, { air: true, feather: 8 }, { s: 'runen', m: 'mond', f: [['feet', '#bff6ff']] });
P('hose', 'dornenlaeufe', 'Dornenläufe', 2, { thorns: 1, spike: true }, { s: 'krallen', m: 'sumpf' });
P('hose', 'drachenklauen', 'Drachenklauen', 3, { wall: true, stomp: true, heavy: 6 }, { s: 'krallen', m: 'glut', f: [['feet', '#ff8a2a'], ['aura', '#ff6a20']] });
P('hose', 'siebenmeilen', 'Siebenmeilenstiefel', 3, { run: 20, ice: true, glass: true }, { s: 'stiefel', m: 'leere', f: [['feet', '#ff4fd8'], ['void', '#ff4fd8']] });
P('hose', 'knochenkoenig', 'Läufe des Knochenkönigs', 3, { air: true, jump: 5, frail: 2 }, { s: 'schienen', m: 'knochen', f: [['feet', '#ff4020'], ['aura', '#fff2cf']] });

// Meister-Sets: je vier Teile mit den Grundwerten ihrer Schmiedestufe; zusammen aktivieren sie die Set-Fähigkeit.
// Freigeschaltet beim ersten Sieg im jeweiligen Meisterduell (auch rückwirkend).
export const SETS = {
  glasrose: { name: 'Ornat der Glasrose', duel: 'D-1', txt: 'Wende in der Luft, und eine Glassilhouette bleibt 0,45 s stehen. Ein Pfeil zerbricht daran (alle 8 s).' },
  ebbe: { name: 'Lotse der Ebbe', duel: 'D-2', txt: 'Ducken am Boden wirft den Gürtelanker: kein Sog und kein seitlicher Rückstoss, solange du duckst.' },
  vesper: { name: 'Vespergewand', duel: 'D-3', txt: 'Streift dich ein Schallring knapp, lädt sich ein Flügel. Mit zwei Ladungen: Sprung halten zum Schweben (0,5 s).' },
  kreide: { name: 'Gewand der Durchschrift', duel: 'D-4', txt: 'Drei harte Landungen zeichnen ein Dreieck (Seiten bis 96 px). Gegner darin werden 2 s verlangsamt.' },
  esse: { name: 'Die tragbare Esse', duel: 'D-5', txt: 'Hiebe zerschlagen Geschosse. Drei davon heizen die Esse, die nächste harte Landung löst Geschosse im Umkreis auf.' },
  naht: { name: 'Ornat der losen Naht', duel: 'D-6', txt: 'Nach dem Verlassen einer beweglichen Plattform hält ein Faden 0,7 s. Sprung und Abwärts ziehen dich zurück (alle 6 s).' },
  schatten: { name: 'Hofstaat eines Schattens', duel: 'D-7', txt: 'Ducken lässt deinen Schatten zurück. Verfehlst du danach einen Hieb, zieht er einen Gegner 0,6 s zu dir (alle 5 s).' },
};
const SETP = (set, slot, id, name, look) => P(slot, id, name, 3, { set }, look, { tier: 0, set });
SETP('glasrose', 'helm', 'spiegelhalbmaske', 'Spiegelhalbmaske', { b: 'maske', m: 'glasrose', d: ['dornen'], f: [['sparkle', '#c5ffff'], ['eyes', '#f489ac']] });
SETP('glasrose', 'brust', 'facettenkuerass', 'Facettenkürass', { b: 6, m: 'glasrose', d: ['spiegel'], f: [['rune', '#f489ac']] });
SETP('glasrose', 'umhang', 'glasblaetter', 'Mantel aus Glasblättern', { b: 'zerfetzt', m: 'glasrose', f: [['sparkle', '#ffc8dc']] });
SETP('glasrose', 'hose', 'rosengamaschen', 'Rosengamaschen', { s: 'stiefel', m: 'glasrose' });
SETP('ebbe', 'helm', 'taucherglocke', 'Taucherglocke', { b: 'grosshelm', m: 'ebbe', d: ['nieten'], f: [['visor', '#f3bd72']] });
SETP('ebbe', 'brust', 'ballastweste', 'Ballastweste', { b: 3, m: 'ebbe', d: ['ketten'] });
SETP('ebbe', 'umhang', 'rahsegel', 'Rahsegel', { b: 'lang', m: 'ebbe' });
SETP('ebbe', 'hose', 'kettenstiefel', 'Kettenstiefel', { s: 'schienen', m: 'ebbe' });
SETP('vesper', 'helm', 'fuehlerreif', 'Fühlerreif', { b: 7, m: 'vesper', d: ['geweih'], f: [['eyes', '#ffde84']] });
SETP('vesper', 'brust', 'klangbrust', 'Klangbrust', { b: 5, m: 'vesper', d: ['rune'], f: [['rune', '#ffde84']] });
SETP('vesper', 'umhang', 'glockenschwingen', 'Glockenschwingen', { b: 'fluegel', m: 'vesper', f: [['sparkle', '#ffde84']] });
SETP('vesper', 'hose', 'samtstulpen', 'Samtstulpen', { s: 'glatt', m: 'vesper' });
SETP('kreide', 'helm', 'radiermaske', 'Radiermaske', { b: 'maske', m: 'kreide', d: ['kiefer'], f: [['eyes', '#ffa293']] });
SETP('kreide', 'brust', 'schiefertafel', 'Schiefertafel', { b: 4, m: 'kreide', d: ['schuppen'] });
SETP('kreide', 'umhang', 'spinnenriss', 'Spinnenriss', { b: 'zerfetzt', m: 'kreide' });
SETP('kreide', 'hose', 'graphitstelzen', 'Graphitstelzen', { s: 'schienen', m: 'kreide' });
SETP('esse', 'helm', 'eklipsenvisier', 'Eklipsenvisier', { b: 'grosshelm', m: 'esse', d: ['hoerner'], f: [['visor', '#a8efff']] });
SETP('esse', 'brust', 'ofenherz', 'Ofenherz', { b: 8, m: 'esse', d: ['kern'], f: [['embers', '#dd8b55']] });
SETP('esse', 'umhang', 'schlackenmantel', 'Schlackenmantel', { b: 'kragen', m: 'esse', f: [['embers', '#ff8a2a']] });
SETP('esse', 'hose', 'ambosssohlen', 'Ambosssohlen', { s: 'stiefel', m: 'esse' });
SETP('naht', 'helm', 'porzellanlarve', 'Porzellanlarve', { b: 'maske', m: 'naht', f: [['eyes', '#fa4055']] });
SETP('naht', 'brust', 'lackmieder', 'Lackmieder', { b: 9, m: 'naht', d: ['nieten'] });
SETP('naht', 'umhang', 'sechsarmschleier', 'Sechsarmiger Schleier', { b: 'zerfetzt', m: 'naht', f: [['rune', '#fa4055']] });
SETP('naht', 'hose', 'saumstiefel', 'Saumstiefel', { s: 'stiefel', m: 'naht' });
SETP('schatten', 'helm', 'messingkrone', 'Schiefe Messingkrone', { b: 'kronhelm', m: 'schatten', d: ['krone'], f: [['void', '#48354f']] });
SETP('schatten', 'brust', 'russwams', 'Rußwams', { b: 10, m: 'schatten', d: ['schaedel'] });
SETP('schatten', 'umhang', 'wandschatten', 'Überlanger Wandschatten', { b: 'lang', m: 'schatten', f: [['void', '#f4dfaf']] });
SETP('schatten', 'hose', 'lautlose', 'Lautlose Sohlen', { s: 'krallen', m: 'schatten' });
export const setPieces = set => U.filter(u => u.set === set).map(u => u.id);

export const UNIQUES = U;
const BY_ID = new Map(U.map(u => [u.id, u]));
export const uniqueById = id => BY_ID.get(id) || null;
// Stufe jedes Stücks: seine Werte entsprechen mindestens dieser Schmiedestufe (geschmiedet höher geht weiterhin).
// Holz und Bronze bleiben den geschmiedeten Teilen. Truhenfunde: gewöhnlich Eisen/Stahl, selten Titan/Adamantium,
// episch Mithril bis Drachenknochen (stärkere Effekte = höhere Stufe). Boss-Stücke und Meister-Sets nach Fortschritt.
// legacy: alte Basis-Stufe (für Wiederholungen von vor dieser Einteilung, armorRevision 0).
const TIER_OF = {
  2: ['laternenhelm', 'rabenhelm', 'elsternhaube', 'gerberwams', 'igelbrust', 'goldwams', 'magnetmantel', 'stillemantel', 'glueckslumpen', 'eislaeufer', 'dornensohlen', 'eisenschienen'], // Eisen
  3: ['hoernerhelm', 'wachthelm', 'lauscherkappe', 'federleib', 'edelsteinpanzer', 'soeldnerhemd', 'sturmmantel', 'wanderermantel', 'daunenumhang', 'sprintstiefel', 'federschritt', 'leisetreter'], // Stahl
  4: ['eisenstirn', 'kaeferkrone', 'raserkopf', 'dornenpanzer', 'glutkern', 'blutrausch', 'funkenmantel', 'aschenschleppe', 'jaegerumhang', 'stampfer', 'glutsohlen', 'schatzgraeber'], // Titan
  5: ['sternenhelm', 'langewacht', 'dornenkrone', 'geduld', 'rippenpanzer', 'runenplatte', 'gleitumhang', 'waechterumhang', 'sternenschleier', 'sprungfeder', 'wolkenhose', 'kniebrecher', 'drachenklauen'], // Adamantium
  6: ['mondkrone', 'verschlinger', 'spiegelplatte', 'sternenherz', 'schattenumhang', 'rueckspulmantel', 'mantelderleere', 'wandlaeufer', 'dornenlaeufe'], // Mithril
  7: ['visier', 'waechterkopf', 'bollwerk', 'schaedelpanzer', 'herzderleere', 'glutschleppe', 'wolfslaeufe', 'gauklerbeine'], // Sternenmetall
  8: ['knochenreisser', 'narrenkrone', 'gefallenerkoenig', 'lebensquell', 'rabenschwingen', 'himmelsstufen'], // Drachenknochen
  9: ['drachenschuppe', 'phoenixmantel', 'siebenmeilen', 'spiegelhalbmaske', 'facettenkuerass', 'glasblaetter', 'rosengamaschen', 'taucherglocke', 'ballastweste', 'rahsegel', 'kettenstiefel'], // Leere-Kristall
  10: ['leerenblick', 'ewigerkoenig', 'sturmschwingen', 'fuehlerreif', 'klangbrust', 'glockenschwingen', 'samtstulpen', 'radiermaske', 'schiefertafel', 'spinnenriss', 'graphitstelzen', 'eklipsenvisier', 'ofenherz', 'schlackenmantel', 'ambosssohlen'], // Chronostahl
  11: ['blutpakt', 'knochenkoenig', 'porzellanlarve', 'lackmieder', 'sechsarmschleier', 'saumstiefel', 'messingkrone', 'russwams', 'wandschatten', 'lautlose'], // Urlicht
};
for (const [t, list] of Object.entries(TIER_OF)) for (const id of list) { const u = BY_ID.get(id); if (!u) throw new Error('Stufe für unbekanntes Stück ' + id); u.legacy = u.tier; u.tier = +t; }
for (const u of U) if (u.legacy === undefined) throw new Error('Keine Stufe für ' + u.id);
// Beschreibung der Effekte eines Stücks
export const effectText = fx => Object.entries(fx).map(([k, v]) => EFFECTS[k].txt(v)).join(' · ');

// Endgegner und Qualpfade schenken beim ersten Sieg je ein legendäres Stück
export const BOSS_REWARD = { '1-B': 'drachenklauen', '2-B': 'rueckspulmantel', '3-B': 'herzderleere', 'Q-1': 'narrenkrone', 'Q-2': 'gefallenerkoenig', 'Q-3': 'phoenixmantel',
  // Verborgene Meisterduelle
  'D-1': 'siebenmeilen', 'D-2': 'drachenschuppe', 'D-3': 'sturmschwingen', 'D-4': 'leerenblick', 'D-5': 'ewigerkoenig',
  'D-6': 'blutpakt', 'D-7': 'knochenkoenig' };

/* ---------- Ausrüstung lesen ---------- */
// rev 0: alte Basis-Stufen (Wiederholungen von früher)
// Wert eines Platzes: Zahl (Stufe) oder Text 'id' bzw. 'id@stufe' (einzigartiges Stück, Werte mindestens auf seiner Basis-Stufe)
export function pieceOf(slot, v, rev = 1) {
  if (typeof v === 'string') {
    const [id, t] = v.split('@'), it = uniqueById(id);
    if (it && it.slot === slot) return { slot, tier: Math.max(rev ? it.tier : it.legacy, Math.min(11, Math.floor(+t || 0))), item: it };
    return { slot, tier: 0, item: null };
  }
  const t = Number.isFinite(v) ? Math.max(0, Math.min(11, Math.floor(v))) : 0;
  return { slot, tier: t, item: null };
}
// Normalisiert die Rüstung aus dem gear-Objekt. Altes Format { armor: n } = alle vier Teile auf Stufe n.
export function loadout(gear) {
  const o = {};
  for (const s of SLOT_IDS) { const v = gear && gear[s]; o[s] = v === undefined || v === null ? (gear && Number.isFinite(gear.armor) ? gear.armor : 0) : v; }
  return o;
}
export const loadoutKey = set => SLOT_IDS.map(s => set[s]).join('|');

// Stapeln: stärkster Wert voll, jeder weitere halb so stark wie der vorige, danach Obergrenze
function stack(vals, cap, min) {
  if (min) return Math.min(...vals);
  vals.sort((a, b) => b - a);
  let t = 0; vals.forEach((v, i) => { t += v / 2 ** i; });
  t = Math.round(t * 100) / 100;
  return cap ? Math.min(cap, t) : t;
}
// Zusammenrechnen aller vier Teile (inklusive Obergrenzen). Ergebnis enthält die alten ARMOR-Felder (hp, kb, spike, inv, ward, air, magnet, rewind).
export function armorStats(set, rev = 1) {
  let hp = 0, kbPts = 0, spikeRes = 0, inv = 0, ward = 0, air = 0, magnet = false, rewind = false;
  const tiers = {}, items = {}, raw = {};
  for (const s of SLOT_IDS) {
    const pc = pieceOf(s, set[s], rev), st = tierStats(s, pc.tier);
    tiers[s] = pc.tier; items[s] = pc.item ? pc.item.id : null;
    hp += st.hp; kbPts += st.kb; spikeRes += st.spike; inv += st.inv; ward += st.ward; air += st.air; magnet = magnet || st.magnet; rewind = rewind || st.rewind;
    if (pc.item) for (const k in pc.item.fx) if (k !== 'set') (raw[k] = raw[k] || []).push(pc.item.fx[k]);
  }
  const fx = {};
  // Set-Fähigkeit nur mit allen vier Teilen
  const sets = SLOT_IDS.map(s => { const pc = pieceOf(s, set[s]); return pc.item && pc.item.set; }), fullSet = sets[0] && sets.every(x => x === sets[0]) ? sets[0] : null;
  for (const k in raw) { const E = EFFECTS[k]; fx[k] = E.bool ? true : stack(raw[k].map(Number), E.cap, E.min); }
  // Werte mit Effekten verrechnen (Obergrenzen zentral hier)
  hp += (fx.hp || 0) - (fx.frail || 0);
  if (fx.fool) hp = Math.ceil(hp / 2);
  hp = Math.max(1, Math.min(24, hp));
  kbPts = Math.min(20, kbPts + (fx.kb || 0) * 5);
  spikeRes = Math.min(2, spikeRes + (fx.spike ? 1 : 0));
  inv = Math.min(100, inv + Math.round((fx.inv || 0) * 20));
  ward = Math.min(2, ward + (fx.ward || 0));
  air = Math.min(fx.wall ? 1 : 2, air + (fx.air ? 1 : 0));
  if (fx.rewind) rewind = true;
  const run = 1 + Math.min(25, fx.run || 0) / 100 - (fx.slow || 0) / 100;
  const jump = 1 + Math.min(10, fx.jump || 0) / 100 - (fx.heavy || 0) / 100;
  // Sprunghöhe (Kraft² / Schwerkraft) aus Rüstung höchstens +20 %: Sprungkraft und Leichtigkeit stapeln nicht frei
  let grav = 1 - Math.min(20, fx.feather || 0) / 100;
  if (jump * jump / grav > 1.2) grav = Math.min(1, jump * jump / 1.2);
  return {
    hp, kb: (20 - kbPts) / 20, spike: Math.max(0, 2 - spikeRes), inv: inv ? 50 + inv : undefined, ward, air, magnet, rewind,
    run, jump, grav, pogo: 1 + Math.min(20, fx.pogo || 0) / 100, gems: 1 + Math.min(100, fx.gems || 0) / 100,
    luck: Math.min(20, fx.luck || 0) / 100, rush: 1 + Math.min(80, fx.rush || 0) / 100, dmgMul: 1 + Math.min(2, fx.dmg || 0) * 0.25,
    fx, tiers, items, set: fullSet,
  };
}

/* ---------- Fairness für die Schatten-Arena (PvP) ---------- */
// Drückt die Werte in ein enges Band: Ausrüstung zählt, entscheidet aber keinen Kampf allein.
export function pvpNormalize(st) {
  const lerp = (v, lo, hi, a, b) => a + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (b - a);
  const fx = { ...st.fx };
  for (const k of ['phoenix', 'rewind', 'regen', 'seer', 'light', 'stealth', 'calm', 'magnet', 'gems', 'luck', 'rush', 'fool']) delete fx[k];
  if (fx.thorns) fx.thorns = 1;
  return {
    ...st, fx,
    hp: Math.round(lerp(st.hp, 1, 24, 8, 12)),
    kb: Math.max(0.5, st.kb), spike: st.spike, inv: Math.min(80, st.inv || 50), ward: Math.min(1, st.ward), air: Math.min(1, st.air),
    run: Math.max(0.95, Math.min(1.1, st.run)), jump: Math.max(0.97, Math.min(1.05, st.jump)), grav: Math.max(0.92, st.grav),
    pogo: Math.min(1.08, st.pogo), dmgAdd: Math.min(1, st.dmgAdd), gems: 1, luck: 0, rush: 1, rewind: false, magnet: false, set: null,
  };
}
