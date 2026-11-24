// Levels werden aus 20 Kacheln breiten Segmenten zusammengesetzt (14 Reihen hoch).
// Kürzere Segmente werden oben mit Luft aufgefüllt.
//
// Kacheln:  # Boden   = Plattform (von unten durchspringbar)   D Erde (grabbar)
//           S Stein (ab Eisen-Schaufel)   ^ Stacheln   B Sprungpilz
// Objekte:  P Start   C Laterne/Checkpoint   E Ziel   G Edelstein   h Apfel
//           T Truhe   i Schild   b Käfer   o Blorb   v Fledermaus   M Boss   Q Altar

export const ROWS = 14; // Standardhöhe; Levels dürfen höher sein (siehe 1-3)

function seg(...rows) {
  while (rows.length < ROWS) rows.unshift('');
  return rows;
}
function build(segs) {
  const out = Array.from({ length: ROWS }, () => '');
  for (const s of segs) {
    const w = Math.max(...s.map(r => r.length));
    s.forEach((r, i) => { out[i] += r.padEnd(w, '.'); });
  }
  return out;
}
const G3 = '####################';
const CEIL = [G3, G3];

/* ---------- 1-1 Moosweg ---------- */
const L1 = build([
  seg('..............G.G...',
      '....................',
      '.............===....',
      '.P.i...i.D..........', G3, G3, G3),
  seg('..........GGG.......',
      '....................',
      '...............##...',
      '...i..b.....DD.##...', G3, G3, G3),
  seg('......GG............',
      '....................',
      '....................',
      '..........b.........',
      '####...####^^^######',
      '####...#############',
      '####...#############'),
  seg('..............G.....',
      '.............===....',
      '....................',
      '.........===........',
      '................DDD.',
      '.....===........DDD.',
      '..C....h........DDD.', G3, G3, G3),
  seg('.....v..............',
      '....................',
      '....................',
      '......===..===......',
      '....................',
      '####............####',
      '####............####',
      '####............####'),
  seg('..............SSS...',
      '....b....i....STS...', G3, G3, G3),
  seg('...GGG..............',
      '....................',
      '....................',
      '...........o....E...', G3, G3, G3),
]);

/* ---------- 1-2 Wurzelhöhlen ---------- */
const L2 = build([
  seg(...CEIL, '', '', '', '', '',
      '...........G.G.G....',
      '....................',
      '..........=======...',
      '.P.i...D......o.....', G3, G3, G3),
  seg(...CEIL, '', '', '', '', '', '', '', '',
      '......D...D...D.....',
      '####..............##',
      '####..............##',
      '####^^^^^^^^^^^^^^##'),
  seg(...CEIL,
      '...........G........',
      '..........===.......',
      '....................',
      '......===......v....',
      '....................',
      '..........===.......',
      '....................',
      '......===...........',
      '..C.................', G3, G3, G3),
  seg(G3, G3, G3, G3, G3, G3, G3, G3,
      '......DD.......D....',
      '......DD....o..D....',
      '......DD.......D....', G3, G3, G3),
  seg(...CEIL, '', '', '', '', '', '', '',
      '........===.........',
      '..o..............o..',
      '######.......#######',
      '######.......#######',
      '######.......#######'),
  seg(...CEIL, '', '', '', '', '',
      '....GGG.............',
      '....................',
      '...===.......SSS....',
      '.........o...STS..E.', G3, G3, G3),
]);

/* ---------- 1-3 Dornenkamm ---------- */
const WALL = '..........##########';
const L3 = build([
  seg('...........GGG......',
      '....................',
      '....................',
      '....................',
      '.P.i....B...........',
      '##########...#######',
      '##########...#######',
      '##########^^^#######'),
  seg('....v.....v....v....',
      '....................',
      '....................',
      '......=...=...=.....',
      '....................',
      '###^^^^^^^^^^^^^^###', G3, G3),
  seg('...........GGG......',
      '....................',
      WALL, WALL, WALL, WALL, WALL,
      '...i...B..##########', G3, G3, G3),
  seg('......b.............',
      '##########...#######', '##########...#######', '##########...#######',
      '##########...#######', '##########...#######', '##########...#######',
      '##########...#######', '##########...#######', '##########...#######'),
  seg('..C.................',
      '######..............',
      '######..............',
      '######...o..........',
      '######..####........',
      '######..####...v....',
      '######..####........', G3, G3, G3),
  seg('....GGG.............',
      '....................',
      'SSS===..............',
      'STS...b....B....E...', G3, G3, G3),
]);

// Geheimer Himmelspfad über dem Dornenkamm: 6 zusätzliche Reihen oben.
// Pilz auf dem Plateau → Schaufel-Sprung → Wolkenplattform → Kette aus 12 Erdblöcken → Altar.
function addSky(map, n, place) {
  const w = map[0].length;
  const sky = Array.from({ length: n }, () => '.'.repeat(w).split(''));
  const rows = [...sky, ...map.map(r => r.split(''))];
  for (const [x, y, str] of place) for (let i = 0; i < str.length; i++) rows[y][x + i] = str[i];
  return rows.map(r => r.join(''));
}
const SKY = [
  [62, 5, '====='], [63, 6, 'G'], [63, 10, 'B'],
  [105, 5, '====='], [107, 4, 'Q'],
];
for (let k = 0; k < 12; k++) SKY.push([69 + k * 3, 6, 'D']);
for (let k = 0; k < 6; k++) SKY.push([70 + k * 6, 3, 'G']);
const L3S = addSky(L3, 6, SKY);

/* ---------- 1-B Bau des Rostmaulwurfs ---------- */
const LB = [
  '####################################',
  '####################################',
  '...................................#',
  '...................................#',
  '...................................#',
  '...................................#',
  '...................................#',
  '...................................#',
  '...................................#',
  '..............===.......===........#',
  '.P..h..C..................M........#',
  '####################################',
  '####################################',
  '####################################',
];

export const WORLDS = [
  { id: 1, name: 'Wurzelgrund', levels: ['1-1', '1-2', '1-3', '1-B'] },
];

export const LEVELS = [
  { id: '1-1', name: 'Moosweg', theme: 'wald', map: L1, par: 40,
    signs: ['◀ ▶ LAUFEN · A SPRINGEN',
            'B = SCHAUFEL. GRAB DIE ERDHAUFEN AUS!',
            'IN DER LUFT ▼ HALTEN = SCHAUFEL-SPRUNG. SPRING SO AUF GEGNER!',
            'STEIN? DAFÜR BRAUCHST DU EINE EISEN-SCHAUFEL. KOMM SPÄTER WIEDER!'] },
  { id: '1-2', name: 'Wurzelhöhlen', theme: 'hoehle', map: L2, par: 55,
    signs: ['ERDBLÖCKE ZERFALLEN BEIM SCHAUFEL-SPRUNG. WO LANDEST DU DANN?'] },
  { id: '1-3', name: 'Dornenkamm', theme: 'dornen', map: L3S, par: 65,
    signs: ['PILZE FEDERN DICH HOCH. MIT ▼ SCHAUFEL-SPRUNG NOCH HÖHER!',
            'ZU HOCH? SPRING, HALTE ▼ UND LANDE AUF DEM PILZ!'] },
  { id: '1-B', name: 'Bau des Rostmaulwurfs', theme: 'bau', map: LB, gate: 10, boss: true, par: 80,
    signs: [] },
];

export const levelById = id => LEVELS.find(l => l.id === id);
