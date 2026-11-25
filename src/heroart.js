// Pixel-Art für Held, Rüstungen, Schaufeln und Spezialwaffen.
// Held: 20×24-Rahmen, Körper beginnt bei x=4, y=8 (Kollisionsbox 10×14 liegt bei x=5, y=10).
// Rüstung = Umhang (hinten) + Beine + Torso + Helm, jeweils als Segmente [y, x, 'pixel'].
// Buchstaben werden über die Palette der Stufe eingefärbt, '.' bleibt durchsichtig.
// fx: Effekte, die der Renderer zusätzlich zeichnet.

export const K = '#140c1c';

const TORSO = [[14, 7, 'kkaaakk'], [15, 6, 'kAAAAAAk'], [16, 5, 'kAAaAAaAAk'], [17, 5, 'kaAAAAAAak'], [18, 5, 'kkaaxxaakk'], [19, 6, 'kaaaaaak']];
const PADS = [[14, 3, 'kkkk'], [15, 2, 'kAhAk'], [16, 2, 'kaAak'], [17, 3, 'kkk'], [14, 13, 'kkkk'], [15, 13, 'kAhAk'], [16, 13, 'kaAak'], [17, 14, 'kkk']];

export const ARMOR_ART = [
  { // 0 Holz: Eimerhelm aus Dauben mit Spross
    pal: { a: '#5a3a22', A: '#9a6a3a', h: '#d8a860', x: '#8a8a98', e: '#ffb43a', v: '#140c1c', c: '#d8403a', C: '#7a1f2a', g: '#56d065' },
    cape: [],
    torso: TORSO,
    helm: [[5, 8, 'kkkk'], [6, 7, 'kxhxxk'],
      [6, 6, 'k'], [6, 13, 'k'], [7, 6, 'kAhAAAak'], [8, 5, 'kAhAAAAAak'], [9, 5, 'kAAAkkkkkk'], [10, 5, 'kaAkvevevk'], [11, 5, 'kaAAkvvvvk'], [12, 5, 'kxxxxxxxxk'], [13, 6, 'kkkkkkkk']],
  },
  { // 1 Bronze: Rundhelm mit Nasenschutz und Rosshaarbusch
    pal: { a: '#8a4f1f', A: '#e09a52', h: '#ffe0b0', x: '#d8303a', X: '#8a1a22', e: '#ffe066', v: '#241a3a', c: '#3a7ab0', C: '#1f4470' },
    cape: [],
    torso: [...TORSO, ...PADS, [15, 4, 'h'], [15, 15, 'h']],
    helm: [[2, 10, 'kkk'], [3, 8, 'kkxxxk'], [4, 6, 'kkxxXxk'], [5, 4, 'kkxXXk'], [6, 3, 'kxXk'], [7, 3, 'kk'],
      [6, 8, 'kkkkk'], [7, 6, 'kAAhhAAk'], [8, 5, 'kAAhAAAAAk'], [9, 5, 'kaAAkkkkkk'], [10, 5, 'kaAAkvekAk'], [11, 5, 'kaAAkvvkAk'], [12, 5, 'kaaAAAAAak'], [13, 6, 'kkkkkkkk']],
  },
  { // 2 Eisen: Wikingerhelm mit Hörnern, Kettenhemd, Fellkragen
    scarf: ['#9ab060', '#4a5a30'],
    pal: { a: '#4e5866', A: '#a9b5c2', h: '#ffffff', x: '#6b4426', w: '#efe2c4', e: '#7fd0ff', v: '#141a24', c: '#5a6a40', C: '#2f3a20' },
    cape: [],
    torso: [[13, 5, 'kwwwwk'], [14, 7, 'kkaaakk'], [15, 6, 'kAaAaAak'], [16, 5, 'kaAaAaAaAk'], [17, 5, 'kAaAaAaAak'], [18, 5, 'kkxxxxxxkk'], [19, 6, 'kaAaAaAk']],
    helm: [[6, 7, 'kkkkkk'], [7, 6, 'kAhhAAAk'], [8, 5, 'kAhAAAAAAk'], [9, 5, 'kaaaaaaaak'], [10, 5, 'kaAAkvevAk'], [11, 5, 'kaAAkvvkAk'], [12, 5, 'kaaaaAAaak'], [13, 6, 'kkkkkkkk'],
      [3, 2, 'kk'], [4, 1, 'kwk'], [5, 1, 'kwk'], [6, 2, 'kwk'], [7, 3, 'kwwk'], [8, 4, 'kk'],
      [3, 16, 'kk'], [4, 16, 'kwk'], [5, 16, 'kwk'], [6, 15, 'kwk'], [7, 13, 'kwwk'], [8, 13, 'kk']],
  },
  { // 3 Stahl: Topfhelm mit Kreuzschlitz und Federbusch, königlicher Umhang
    pal: { a: '#5f7894', A: '#dfe9f3', h: '#ffffff', x: '#d8303a', w: '#ffffff', e: '#7fe0ff', v: '#0e1420', c: '#2a4aa8', C: '#18286a', y: '#ffd84a' },
    cape: [],
    torso: [...TORSO, [13, 2, 'kkkk'], [14, 1, 'kAhAAk'], [15, 1, 'kaAAak'], [16, 2, 'kkkk'], [13, 13, 'kkkk'], [14, 12, 'kAAhAk'], [15, 12, 'kaAAak'], [16, 13, 'kkkk'],
      [15, 9, 'x'], [16, 8, 'xxx'], [17, 9, 'x']],
    helm: [[0, 11, 'kk'], [1, 10, 'kwwk'], [2, 9, 'kwxwk'], [3, 8, 'kwxk'], [4, 7, 'kwwk'], [5, 7, 'kxk'],
      [6, 6, 'kkkkkkkk'], [7, 5, 'kAhhhAAAAk'], [8, 5, 'khAAAAAAAk'], [9, 5, 'kAAAvvvvvk'], [9, 11, 'e'], [10, 5, 'kAAAAAvAAk'], [11, 5, 'kAAAAAvAAk'], [12, 5, 'kaAAAAAAak'], [13, 6, 'kkkkkkkk']],
  },
  { // 4 Titan: Kammhelm mit Leuchtvisier, Stachel-Schulterpanzer
    scarf: ['#4fe0ff', '#2a6a8a'],
    pal: { a: '#3a4366', A: '#9aa8d8', h: '#dfe6ff', x: '#4fe0ff', e: '#4fe0ff', v: '#0a0e20', c: '#2a2e48', C: '#151828' },
    cape: [],
    torso: [...TORSO, [16, 9, 'xx'], [17, 9, 'xx'],
      [11, 2, 'k'], [12, 2, 'kk'], [13, 2, 'kkkkk'], [14, 1, 'khAAAk'], [15, 1, 'kaAAak'], [16, 2, 'kkkk'],
      [11, 17, 'k'], [12, 16, 'kk'], [13, 13, 'kkkkk'], [14, 13, 'kAAAhk'], [15, 14, 'kaAak'], [16, 14, 'kkk']],
    helm: [[0, 10, 'k'], [1, 9, 'khk'], [2, 9, 'khk'], [3, 8, 'khAk'], [4, 8, 'khAk'], [5, 7, 'khAAk'],
      [6, 6, 'kkkkkkkk'], [7, 5, 'kaAAAAAAAk'], [8, 5, 'kaAhhhhAAk'], [9, 5, 'kaeeeeeeek'], [10, 5, 'kaaAAAAAak'], [11, 5, 'kaAAkkkkAk'], [12, 6, 'kaaAAAak'], [13, 7, 'kkkkkk']],
    fx: 'visor',
  },
  { // 5 Adamantium: Kristallsplitter aus Helm und Schultern
    scarf: ['#7dffcf', '#1fb88a'],
    pal: { a: '#145a45', A: '#3fc896', h: '#b8ffe6', g: '#7dffcf', G: '#1fb88a', e: '#a0ff60', v: '#04140d', c: '#0e3a2c', C: '#06201a', x: '#7dffcf' },
    cape: [],
    torso: [...TORSO, [16, 9, 'gG'], [17, 9, 'Gg'],
      [11, 3, 'k'], [12, 3, 'kg'], [13, 2, 'kgGk'], [14, 2, 'kAAAk'], [15, 2, 'kaAak'], [16, 3, 'kkk'],
      [11, 15, 'k'], [12, 15, 'gk'], [13, 14, 'kGgk'], [14, 13, 'kAAAk'], [15, 13, 'kaAak'], [16, 13, 'kkk']],
    helm: [[2, 6, 'k'], [3, 5, 'kgk'], [4, 5, 'kGk'], [5, 5, 'kGk'],
      [0, 10, 'k'], [1, 9, 'kgk'], [2, 9, 'kgk'], [3, 9, 'kGk'], [4, 9, 'kGk'], [5, 9, 'kGk'],
      [3, 13, 'k'], [4, 12, 'kgk'], [5, 12, 'kGk'],
      [6, 6, 'kkkkkkkk'], [7, 5, 'kAAhAAAAAk'], [8, 5, 'kAhAAAAAak'], [9, 5, 'kaAAkkkkkk'], [10, 5, 'kaAAkvevek'], [11, 5, 'kaAAkvvvvk'], [12, 5, 'kaaAAAAAak'], [13, 6, 'kkkkkkkk']],
    fx: 'shine',
  },
  { // 6 Mithril: Elfischer Flügelhelm, wallender weisser Umhang
    pal: { a: '#7f8cb3', A: '#e8eeff', h: '#ffffff', x: '#6ad0ff', e: '#9af0ff', v: '#1a2040', c: '#f4f4ff', C: '#b8c0e0' },
    cape: [],
    torso: [...TORSO, [16, 8, 'x'], [17, 9, 'x'], [16, 10, 'x'], [18, 9, 'xx']],
    helm: [[3, 2, 'kk'], [4, 1, 'khk'], [5, 1, 'khhk'], [6, 2, 'khhk'], [7, 3, 'khhk'], [8, 4, 'kk'],
      [4, 15, 'kk'], [5, 15, 'khk'], [6, 14, 'khhk'], [7, 13, 'khk'],
      [4, 10, 'kk'], [5, 9, 'khk'], [6, 7, 'kkhAAkk'], [7, 6, 'kAhAAAAk'], [8, 5, 'kAhAAxAAAk'], [9, 5, 'kAAAAkkkkk'], [10, 5, 'kAAAkveevk'], [11, 5, 'kAAAAkvvkk'], [12, 5, 'kaAAAAAAak'], [13, 6, 'kkkkkkkk']],
    fx: 'sparkle',
  },
  { // 7 Sternenmetall: Sternenkrone, Nebelumhang voller Sterne
    scarf: ['#a88aff', '#4a2a9a'],
    pal: { a: '#2a1a6a', A: '#5a4ac0', h: '#c8b8ff', y: '#ffd84a', w: '#ffffff', e: '#ffe066', v: '#0a0420', c: '#3a1a7a', C: '#1a0a40', x: '#ffd84a' },
    cape: [],
    torso: [...TORSO, [18, 5, 'kkyyyyyykk'], [16, 8, 'w'], [17, 12, 'w'], [15, 10, 'y']],
    helm: [[0, 10, 'k'], [1, 9, 'kyk'], [2, 8, 'kyyyk'], [3, 9, 'kyk'], [3, 6, 'k'], [4, 5, 'kyk'], [3, 13, 'k'], [4, 12, 'kyk'],
      [5, 6, 'kkkkkkkk'], [6, 5, 'kyyyyyyyyk'], [7, 5, 'kaAAaAAaAk'], [8, 5, 'kAaAAwAAak'], [9, 5, 'kaAAAkkkkk'], [10, 5, 'kAaAkvevek'], [11, 5, 'kaAAkvvvvk'], [12, 5, 'kaaAAwAAak'], [13, 6, 'kkkkkkkk']],
    fx: 'stars',
  },
  { // 8 Drachenknochen: Drachenschädel als Helm, Knochenrippen, zerfetzter Umhang
    pal: { a: '#4a2a20', A: '#a07e52', h: '#ffffff', w: '#f2e6c8', e: '#ff4020', v: '#1a0a08', c: '#7a1020', C: '#3a0810', x: '#f2e6c8' },
    cape: [],
    torso: [[14, 7, 'kkaaakk'], [15, 6, 'kawwwwak'], [16, 5, 'kaawaawaak'], [17, 5, 'kaawwwwaak'], [18, 5, 'kkaaxxaakk'], [19, 6, 'kaaaaaak']],
    helm: [[3, 5, 'k'], [4, 4, 'kwk'], [3, 2, 'kk'], [4, 1, 'kwk'], [5, 1, 'kwk'], [6, 2, 'kwk'], [7, 3, 'kwk'],
      [5, 7, 'kkkkk'], [6, 6, 'kwwhwwk'], [7, 5, 'kwwwwwwwk'], [8, 5, 'kwwkekwwwkk'], [9, 5, 'kwwwwwwwwwwk'], [10, 5, 'kvwvwvwvwvk'], [11, 5, 'kaavvvvvak'], [12, 5, 'kaaaaaaaak'], [13, 6, 'kkkkkkkk']],
    fx: 'embers',
  },
  { // 9 Leere-Kristall: schwarze Rüstung mit glühenden Rissen, schwebende Splitter
    scarf: ['#ff4fd8', '#8a1a7a'],
    pal: { a: '#1e0c30', A: '#4a2a68', x: '#ff4fd8', e: '#ffb0f0', h: '#ff9af0', v: '#000000', c: '#14081f', C: '#0a0410' },
    cape: [],
    torso: [[14, 7, 'kkaaakk'], [15, 6, 'kaxaaaak'], [16, 5, 'kaaaxaaxak'], [17, 5, 'kaaxaaaxak'], [18, 5, 'kkaaxeaakk'], [19, 6, 'kaaxaaak']],
    helm: [[2, 8, 'k'], [3, 7, 'kxk'], [4, 8, 'k'], [1, 12, 'k'], [2, 11, 'kxk'], [3, 12, 'k'],
      [6, 7, 'kkkkkk'], [7, 6, 'kaAaaxak'], [8, 5, 'kaaxaaaAak'], [9, 5, 'kaaaxaaaak'], [10, 5, 'kaaakeeeek'], [11, 5, 'kaaxkkkkkk'], [12, 5, 'kaaaaxaaak'], [13, 6, 'kkkkkkkk']],
    fx: 'void',
  },
  { // 10 Chronostahl: goldenes Uhrwerk, Uhr auf der Brust, Zahnrad-Heiligenschein
    scarf: ['#ffcf4a', '#a07a10'],
    pal: { a: '#7a5610', A: '#ffcf4a', h: '#fff2b0', y: '#ffe680', w: '#fff8e8', e: '#40e0ff', v: '#1a1408', c: '#1f4a4a', C: '#0f2a2a', x: '#40e0ff' },
    cape: [],
    torso: [...TORSO, [15, 8, 'kwwk'], [16, 7, 'kwwkwk'], [17, 7, 'kwkwwk'], [18, 8, 'kwwk']],
    helm: [[3, 10, 'k'], [4, 9, 'kyk'], [5, 7, 'kkkkkk'], [6, 6, 'kyAhAAyk'], [7, 5, 'kyAAAAAAyk'], [8, 5, 'kAAyyyyAAk'], [9, 5, 'kAAkkkkkkk'], [10, 5, 'kAAkvevevk'], [11, 5, 'kAAAkkkkAk'], [12, 5, 'kaAAyAAAak'], [13, 6, 'kkkkkkkk']],
    fx: 'gear',
  },
  { // 11 Urlicht: strahlendes Weissgold, Sonnenkamm, Heiligenschein und Lichtflügel
    pal: { a: '#d8b060', A: '#fff6dc', h: '#ffffff', y: '#ffd84a', e: '#ffffff', v: '#a06a10', c: '#fff0c0', C: '#e0b060', x: '#ffd84a' },
    cape: [],
    torso: [...TORSO, [18, 5, 'kkyyyyyykk'], [16, 9, 'yy'], [15, 9, 'h']],
    helm: [[0, 10, 'k'], [1, 9, 'kyk'], [1, 6, 'k'], [2, 7, 'ky'], [1, 14, 'k'], [2, 12, 'yk'], [2, 9, 'kyyk'], [3, 8, 'kyhyyk'], [4, 8, 'kyyyyk'], [5, 9, 'kkkk'],
      [6, 6, 'kkkkkkkk'], [7, 5, 'khhhhAAhhk'], [8, 5, 'khAAAAAAhk'], [9, 5, 'khAAkkkkkk'], [10, 5, 'khAAkyeeyk'], [11, 5, 'khAAAkkkkk'], [12, 5, 'kyhhhhhhyk'], [13, 6, 'kkkkkkkk']],
    fx: 'divine',
  },
];

// Beine: Schritt-Animationen, liegen bei x=4, y=20
export const LEGS = {
  stand: ['..kAk..kAk..', '..kAk..kAk..', '.kkak..kakk.', '.kkkk..kkkk.'],
  run1: ['..kAkk.kAk..', '.kAk...kkAk.', 'kkak.....kak', 'kkk......kkk'],
  run2: ['...kAkkAk...', '...kAkkAk...', '..kkakkak...', '..kkkkkkk...'],
  air: ['..kAkkkAk...', '..kakk.kak..', '...kk...kk..', '............'],
  pass: ['...kAkkAk...', '...kAkAk....', '..kkakak....', '..kkkkkk....'],
  fall: ['..kAk..kAk..', '..kAk..kAk..', '..kak..kak..', '..kk....kk..'],
};

// Schaufeln: waagrecht, Griff links, 7 Reihen hoch, Griff in Reihe 3
// h/H Griff · s/S Blatt · w Glanz · x Akzent · g Leuchten
export const SHOVEL_ART = [
  { pal: { h: '#6b4426', H: '#8a5a32', s: '#8a5a2a', S: '#c08a50', w: '#e8c088' }, rows: [ // Holz: grober Spaten mit Maserung
    '................', '.........kkkk...', 'kkkkkkkkksSSSk..', 'khHhhHhhksSsSSk.', 'kkkkkkkkksSSsk..', '.........kkkk...', '................'] },
  { pal: { h: '#6b4426', H: '#8a5a32', s: '#8a4f1f', S: '#e09a52', w: '#ffe0b0', x: '#5a3010' }, rows: [ // Bronze: rundes Blatt mit Niete
    '................', '.........kkkkk..', 'kkkkkkkkkSSwSSk.', 'khhhhhhhkSxSSSSk', 'kkkkkkkkkSSSSSk.', '.........kkkkk..', '................'] },
  { pal: { h: '#4a3020', H: '#6b4426', s: '#4e5866', S: '#a9b5c2', w: '#ffffff' }, rows: [ // Eisen: klassischer Spitzspaten
    '................', '.........kkkk...', 'kkkkkkkkkSwSSkk.', 'khhhhhhhksSSSSSk', 'kkkkkkkkkSSSSkk.', '.........kkkk...', '................'] },
  { pal: { h: '#3a2a20', H: '#d8303a', s: '#5f7894', S: '#eef5fc', w: '#ffffff', x: '#ffd84a' }, rows: [ // Stahl: Klinge mit Parierstange und rotem Griffband
    '........kk.......', '........kxkkkkk..', 'kkkkkkkkkxSwwSSk.', 'kHhHhHhkkxSSSSSSk', 'kkkkkkkkkxSSSSSk.', '........kxkkkkk..', '........kk.......'] },
  { pal: { h: '#20243a', H: '#4fe0ff', s: '#454f75', S: '#bcc8f2', g: '#4fe0ff', w: '#ffffff' }, rows: [ // Titan: kantig mit Energielinien
    '.........kkk.....', '........kSSSkk...', 'kkkkkkkkkSggSSkk.', 'khHhhHhhkSSSSSSSk', 'kkkkkkkkkSggSSkk.', '........kSSSkk...', '.........kkk.....'] },
  { pal: { h: '#0e3a2c', H: '#1fb88a', s: '#17735a', S: '#3fc896', g: '#b8ffe6', w: '#ffffff' }, rows: [ // Adamantium: gezackte Kristallklinge
    '..........k..k...', '.........kgkkgk..', 'kkkkkkkkkSgSgSSk.', 'khHhhHhhkSSgSSgSk', 'kkkkkkkkkSgSSgSk.', '.........kgkkgk..', '..........k..k...'] },
  { pal: { h: '#e8eeff', H: '#6ad0ff', s: '#7f8cb3', S: '#e8eeff', w: '#ffffff', x: '#6ad0ff' }, rows: [ // Mithril: Blattklinge mit geschwungenem Schutz
    '...........kk....', '......kk..kwSk...', 'kkkkkkkxkkSwSSk..', 'kHhHhHhkxkSSwSSSk', 'kkkkkkkxkkSSSSk..', '......kk..kSSk...', '...........kk....'] },
  { pal: { h: '#1a0a40', H: '#ffd84a', s: '#1e1250', S: '#4a3aa0', w: '#ffffff', x: '#ffd84a' }, rows: [ // Sternenmetall: Nachtblatt mit Sternspitze
    '................k..', '.........kkkk..kxk.', 'kkkkkkkkksSwSkkxxxk', 'khHhhHhhksSSwSkxwxk', 'kkkkkkkkksSSSkkxxxk', '.........kkkk..kxk.', '................k..'] },
  { pal: { h: '#3a1a10', H: '#7a1020', s: '#a08060', S: '#f2e6c8', w: '#ffffff', v: '#1a0a08' }, rows: [ // Drachenknochen: Kieferknochen mit Zähnen
    '.........kkkkk....', '........kSSSSSk...', 'kkkkkkkkkSSwSSSk..', 'khHhhHhhkSSSSSSSk.', 'kkkkkkkkkSvSvSvSk.', '........kSkSkSkk..', '.........k.k.k....'] },
  { pal: { h: '#14081f', H: '#ff4fd8', s: '#8a1a7a', S: '#ff4fd8', w: '#ffd0f8' }, rows: [ // Leere-Kristall: schwebende Splitter
    '............k......', '..........kk.kSk...', 'kkkkkkkkk.kSk.kSSk.', 'khHhhHhhk.kSwk.kwSk', 'kkkkkkkkk.kSk.kSSk.', '..........kk.kSk...', '............k......'] },
  { pal: { h: '#3a2a08', H: '#ffcf4a', s: '#a07a10', S: '#ffcf4a', w: '#fff8e8', y: '#40e0ff' }, rows: [ // Chronostahl: Zahnrad-Kopf
    '..........k.k.k..', '.........kSSSSSk.', 'kkkkkkkkkSSkkkSSk', 'khHhhHhhkSkwykSSk', 'kkkkkkkkkSSkkkSSk', '.........kSSSSSk.', '..........k.k.k..'] },
  { pal: { h: '#d8b060', H: '#ffd84a', s: '#ffd84a', S: '#fff6dc', w: '#ffffff' }, rows: [ // Urlicht: lange Lichtklinge
    '.........kkkkkkk...', '........kwwwwwwwkk.', 'kkkkkkkkkwSSSSSSwwk', 'kHhHhHhHkwSSSSSSSwk', 'kkkkkkkkkwSSSSSSwwk', '........kwwwwwwwkk.', '.........kkkkkkk...'] },
];

// Spezialwaffen (gleiche Konvention). Farben kommen aus weapons.js (dark→s, light→S, handle→h).
export const WEAPON_ART = {
  federklinge: ['..........kk......', '.........kSSkk....', 'kkkkkkkkkSwSSSkk..', 'kHhhhhhhkwSwSwSSSk', 'kkkkkkkkkSwSSSkk..', '.........kSSkk....', '..........kk......'],
  blitzspaten: ['............kk....', '...........kSk....', 'kkkkkkkkkkSSk.....', 'kHhhhhhhkSSwSSSk..', 'kkkkkkkkk..kSSk...', '..........kSk.....', '..........kk......'],
  erdfresser: ['.........kkkkkk...', '........kSSSSSSk..', 'kkkkkkkkkSsssSSk..', 'kHhhhhhhkSsssSSk..', 'kkkkkkkkkSSSSSSk..', '........kwkwkwkwk.', '.........k.k.k.k..'],
  goldschaufel: ['........k.k.......', '........kxkkkkk...', 'kkkkkkkkkSSWSSSk..', 'kHhHhHhkxSSrSSSSk.', 'kkkkkkkkkSSSSSSk..', '........kxkkkkk...', '........k.k.......'],
  geisterklinge: ['.........kkk......', '........kSSSkk....', 'kkkkkkkkkSwSSSkk..', 'kHhhhhhhkSSwSSSSk.', 'kkkkkkkkkSSSwSkk..', '.........kSSkk.k..', '..........kk...k..'],
  sternenspaten: ['................k..', '.........kkkk..kWk.', 'kkkkkkkkksSwSkkWWWk', 'kHhhhhhhksSSwSkWxWk', 'kkkkkkkkksSSSkkWWWk', '.........kkkk..kWk.', '................k..'],
  maulwurfkralle: ['.........kSSSSk...', '........kSkkkkk...', 'kkkkkkkkkSSSSSSk..', 'kHhhhhhhkSkkkkk...', 'kkkkkkkkkSSSSSSk..', '........kSkkkkk...', '.........kSSSSk...'],
  seelenschaufel: ['.........kkkkkk...', '........kSSSSSSk..', 'kkkkkkkkkkkkkkSSk.', 'kHhhhhhhkSk...kSk.', 'kkkkkkkkkSk....kk.', '.........kk.......', '..................'],
  pendelhammer: ['.........kkkkkk...', '.........kSSSSk...', 'kkkkkkkkkSSWSSSk..', 'kHhhhhhhkSSSSSSSk.', 'kkkkkkkkkSSSSSSk..', '.........kSSSSk...', '.........kkkkkk...'],
  spuerschaufel: ['.........kkk......', '........kSWSk.....', 'kkkkkkkkkSSSSk....', 'kHhhhhhhkSWSWSk...', 'kkkkkkkkkSSSSk....', '........kSWSk.....', '.........kkk......'],
  urfunke: ['...........k.k....', '..........kxkxk...', 'kkkkkkkkk.kSxSxk..', 'kHhhhhhhkkSSWSSSk.', 'kkkkkkkkkSSSSSk...', '.........kkkkk....', '..................'],
};
