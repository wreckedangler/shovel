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

export const AVAILABLE = 4;           // Holz bis Stahl in Welt 1
export const PRICE = [0, 150, 450, 1100, 2400, 4200, 7000, 11000, 16000, 23000, 32000, 45000];

// dmg: Schaden · reach: Reichweite in px · stone: zerschlägt Stein · pogo: Abprall-Faktor
export const SHOVEL = [
  { dmg: 1, reach: 14, pogo: 1.00, perk: 'Gräbt Erde' },
  { dmg: 2, reach: 15, pogo: 1.00, perk: 'Doppelter Schaden' },
  { dmg: 2, reach: 16, pogo: 1.04, stone: true, perk: 'Zerschlägt Stein' },
  { dmg: 3, reach: 19, pogo: 1.12, stone: true, perk: 'Mehr Reichweite, höherer Abpraller' },
  { dmg: 4, reach: 19, pogo: 1.12, stone: true, perk: 'Doppel-Abpraller' },
  { dmg: 5, reach: 20, pogo: 1.15, stone: true, perk: 'Gräbt Erz' },
  { dmg: 5, reach: 22, pogo: 1.18, stone: true, perk: 'Federleicht: schnellere Hiebe' },
  { dmg: 6, reach: 22, pogo: 1.18, stone: true, perk: 'Sternenhieb (Projektil)' },
  { dmg: 7, reach: 24, pogo: 1.20, stone: true, perk: 'Feuerspur beim Abpraller' },
  { dmg: 8, reach: 24, pogo: 1.22, stone: true, perk: 'Gleitet kurz durch Wände' },
  { dmg: 9, reach: 26, pogo: 1.24, stone: true, perk: 'Zeitlupe beim Abpraller' },
  { dmg: 12, reach: 28, pogo: 1.28, stone: true, perk: 'Alles leuchtet' },
];

// hp: Herzen · kb: Rückstoss-Faktor · spike: Schaden durch Stacheln
export const ARMOR = [
  { hp: 4,  kb: 1.0, spike: 2, perk: 'Basisschutz' },
  { hp: 6,  kb: 1.0, spike: 2, perk: '+2 Herzen' },
  { hp: 8,  kb: 0.6, spike: 2, perk: '+2 Herzen, weniger Rückstoss' },
  { hp: 10, kb: 0.5, spike: 1, perk: '+2 Herzen, Stacheln halb so schlimm' },
  { hp: 11, kb: 0.5, spike: 1, perk: 'Kurzer Schild nach Treffer' },
  { hp: 12, kb: 0.4, spike: 1, perk: 'Lava-fest' },
  { hp: 12, kb: 0.4, spike: 1, perk: 'Höher springen' },
  { hp: 13, kb: 0.3, spike: 1, perk: 'Doppelsprung' },
  { hp: 14, kb: 0.3, spike: 0, perk: 'Stacheln egal' },
  { hp: 15, kb: 0.2, spike: 0, perk: 'Unsichtbar für Fledermäuse' },
  { hp: 16, kb: 0.2, spike: 0, perk: 'Rückspulen bei Absturz' },
  { hp: 20, kb: 0.0, spike: 0, perk: 'Unerschütterlich' },
];
