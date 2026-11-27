// Ausrüstung: 12 Materialstufen. AVAILABLE bestimmt, wie viele aktuell kaufbar sind.
// Neue Welten schalten weitere Stufen frei (AVAILABLE erhöhen + Perks implementieren).

export const TIERS = [
  { id: 'holz',           name: 'Holz',           dark: '#6b4426', light: '#b98a52' },
  { id: 'bronze',         name: 'Bronze',         dark: '#8a4f1f', light: '#e9a25a' },
  { id: 'eisen',          name: 'Eisen',          dark: '#4e5866', light: '#a9b5c2' },
  { id: 'stahl',          name: 'Stahl',          dark: '#5f7894', light: '#eef5fc' },
  { id: 'titan',          name: 'Titan',          dark: '#454f75', light: '#bcc8f2' },
  { id: 'adamantium',     name: 'Adamantium',     dark: '#17735a', light: '#7dffcf' },
  { id: 'mithril',        name: 'Mithril',        dark: '#7f8cb3', light: '#ffffff' },
  { id: 'sternenmetall',  name: 'Sternenmetall',  dark: '#33247a', light: '#c9a8ff' },
  { id: 'drachenknochen', name: 'Drachenknochen', dark: '#a07e52', light: '#fff2cf' },
  { id: 'leerekristall',  name: 'Leere-Kristall', dark: '#1e0e38', light: '#ff4fd8' },
  { id: 'chronostahl',    name: 'Chronostahl',    dark: '#75560c', light: '#ffd84a' },
  { id: 'urlicht',        name: 'Urlicht',        dark: '#ff9f3a', light: '#ffffff' },
];

// Ausrüstungsmodell 3: Startstufe und Höchststufe je Seltenheit (0 gewöhnlich · 1 selten · 2 episch · 3 legendär/Set).
// Grundstücke und die Grundschaufel (ohne Effekt) enden bei Mithril.
export const GRUND_CAP = 6;
export const RAR_START = [2, 4, 6, 7], RAR_CAP = [4, 6, 9, 11];
export const AVAILABLE = 12;          // Stufen 7–12 brauchen zusätzlich Splitter aus Truhen (loot.js SHARD_PRICE)
// Preise steigen ab Mithril steil an: die letzten Stufen sind ein Langzeitziel (Urlicht ist sehr selten)
export const PRICE = [0, 150, 450, 1100, 2400, 4200, 6500, 9500, 14000, 22000, 34000, 52000];
// Die drei höchsten Stufen kosten zusätzlich ein Boss-Material (je Gegenstand, Hand und Rüstung gleich)
export const MATS = {
  kern: { name: 'Leerenkern', col: '#ff4fd8', txt: 'Rostmaulwurf, Pendelwerk, Morchelmutter und Wächter der Tiefe' },
  chrono: { name: 'Chrono-Splitter', col: '#ffd84a', txt: 'Qualpfade und Jagd-Anführer ab Revier 6' },
  funke: { name: 'Urlicht-Funke', col: '#fff2cf', txt: 'Meisterduelle' },
};
export const MAT_COST = { 9: ['kern', 1], 10: ['chrono', 2], 11: ['funke', 2] };
// Erster Sieg: garantiert · Wiederholung: Chance
export const MAT_DROP = {
  '1-B': ['kern', 1, 0.2], '2-B': ['kern', 1, 0.2], '3-B': ['kern', 1, 0.2],
  'Q-1': ['chrono', 2, 0.1], 'Q-2': ['chrono', 2, 0.1], 'Q-3': ['chrono', 2, 0.1],
  '4-6': ['chrono', 1, 0.1], '4-7': ['chrono', 1, 0.1], '4-8': ['chrono', 1, 0.1], '4-9': ['chrono', 1, 0.1], '4-10': ['chrono', 1, 0.1],
  'D-1': ['funke', 1, 0.1], 'D-2': ['funke', 1, 0.1], 'D-3': ['funke', 1, 0.1], 'D-4': ['funke', 1, 0.1], 'D-5': ['funke', 1, 0.1],
  'D-6': ['funke', 2, 0.1], 'D-7': ['funke', 2, 0.1],
};

// dmg: Schaden · reach: Reichweite in px · stone: zerschlägt Stein · pogo: Abprall-Faktor
export const SHOVEL = [
  { dmg: 1, reach: 14, pogo: 1.00, perk: 'Gräbt Erde' },
  { dmg: 2, reach: 15, pogo: 1.00, perk: 'Doppelter Schaden' },
  { dmg: 2, reach: 16, pogo: 1.04, stone: true, perk: 'Zerschlägt Stein' },
  { dmg: 3, reach: 19, pogo: 1.12, stone: true, perk: 'Mehr Reichweite, höherer Abpraller' },
  { dmg: 4, reach: 19, pogo: 1.12, stone: true, pogoDmg: 2, perk: 'Schaufel-Sprung trifft doppelt' },
  { dmg: 5, reach: 20, pogo: 1.15, stone: true, pogoDmg: 2, ore: true, perk: 'Gräbt violettes Erz' },
  { dmg: 5, reach: 22, pogo: 1.18, stone: true, fast: true, perk: 'Federleicht: schnellere Hiebe' },
  { dmg: 6, reach: 22, pogo: 1.18, stone: true, fast: true, stars: true, perk: 'Sternenhieb beim Abpraller' },
  { dmg: 7, reach: 24, pogo: 1.20, stone: true, fast: true, stars: true, fire: true, perk: 'Feuerhieb' },
  { dmg: 8, reach: 24, pogo: 1.22, stone: true, area: true, perk: 'Flächenhieb: gräbt drei Blöcke' },
  { dmg: 9, reach: 26, pogo: 1.24, stone: true, gem: 1.5, perk: 'Edelsteine ×1,5' },
  { dmg: 12, reach: 28, pogo: 1.28, stone: true, gem: 1.5, seer: true, perk: 'Alles leuchtet: Geheimnisse sichtbar' },
];

// hp: Herzen · kb: Rückstoss-Faktor · spike: Schaden durch Stacheln
export const ARMOR = [
  { hp: 4,  kb: 1.0, spike: 2, perk: 'Basisschutz' },
  { hp: 6,  kb: 1.0, spike: 2, perk: '+2 Herzen' },
  { hp: 8,  kb: 0.6, spike: 2, perk: '+2 Herzen, weniger Rückstoss' },
  { hp: 10, kb: 0.5, spike: 1, perk: '+2 Herzen, Stacheln halb so schlimm' },
  { hp: 11, kb: 0.5, spike: 1, inv: 110, perk: 'Längerer Schutz nach Treffer' },
  { hp: 12, kb: 0.0, spike: 1, inv: 110, perk: 'Kein Rückstoss mehr' },
  { hp: 12, kb: 0.0, spike: 1, inv: 110, ward: true, perk: 'Erster Treffer pro Level verpufft' },
  { hp: 13, kb: 0.0, spike: 1, inv: 110, ward: true, air: 1, perk: 'Doppelsprung' },
  { hp: 14, kb: 0.0, spike: 0, inv: 110, ward: true, air: 1, perk: 'Stacheln egal' },
  { hp: 15, kb: 0.0, spike: 0, inv: 110, ward: true, air: 1, magnet: 1, perk: 'Edelsteine fliegen zu dir' },
  { hp: 16, kb: 0.0, spike: 0, inv: 110, ward: true, air: 1, magnet: 1, rewind: true, perk: 'Rückspulen bei Absturz' },
  { hp: 20, kb: 0.0, spike: 0, inv: 130, ward: true, air: 2, magnet: 1, rewind: true, perk: 'Dreifachsprung, ewiger Glanz' },
];
