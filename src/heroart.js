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
  rosenschliff: ['..........x.......', '.........xrx......', 'kkkkkkkkkkxkkkk...', 'kHhhhhhhkSSSSSSk.W', 'kkkkkkkkkkkkkkk...', '..................', '..................'],
  kielbrecher: ['.........k.....k..', '........kSk...kSk.', 'kkkkkkkkkSk...kSk.', 'kHhhhhhhkSSSSSSSk.', 'kkkkkkkkkkkSSSkkk.', '...........kxk....', '............k.....'],
  zwillingsstimme: ['.........kkkkkkkk.', '........kSSSSSSSSk', 'kkkkkkkkkSkkkkkkk.', 'kHhhhhhhkSk.......', 'kkkkkkkkkSkkkkk...', '........kSSSSSSk..', '.........kkkkkk...'],
  blindzirkel: ['............k.....', '...........kSk....', 'kkkkkkkkkk.kSk....', 'kHhhhhhhkxkSSk....', 'kkkkkkkkkk.kSkk...', '...........k.kSk..', '..............kk..'],
  sternamboss: ['.........kkkkkk...', '.........kSSSSk...', 'kkkkkkkkkSSxSSSk..', 'kHhhhhhhkSxWxSSSk.', 'kkkkkkkkkSSxSSSk..', '.........kSSSSk...', '.........kkkkkk...'],
  letztesoehr: ['..................', '..............kk..', 'kkkkkkkkkkkkkkkSk.', 'kHhhhhhhhhhhhkSkSk', 'kkkkkkkkkkkkkkkSk.', '.r....r....r..kk..', 'r.rr.r.rr.r.r.....'],
  elfenbein: ['..........kkk.....', '.........kWWWk....', 'kkkkkkkkkWWwWWk...', 'kHhhhhhhkWWWwWWk..', 'kkkkkkkkkWWWWWk...', '.........kWWWk....', '..........kkk.....'],
  urfunke: ['...........k.k....', '..........kxkxk...', 'kkkkkkkkk.kSxSxk..', 'kHhhhhhhkkSSWSSSk.', 'kkkkkkkkkSSSSSk...', '.........kkkkk....', '..................'],
};

// Formen der Truhen-Waffen (gleiche Konvention wie WEAPON_ART, Farben aus weapons.js)
export const WEAPON_SHAPES = {
  spaten: ['..........kkk.....', '.........kSSSk....', 'kkkkkkkkkSwSSSk...', 'kHhhhhhhkSSwSSSk..', 'kkkkkkkkkSSSSSk...', '.........kSSSk....', '..........kkk.....'],
  axt: ['.........kkkkk....', '........kSSSSSk...', 'kkkkkkkkkSwSSk....', 'kHhhhhhhkSSSk.....', 'kkkkkkkkkSSSSk....', '........kSSSSSk...', '.........kkkkk....'],
  sichel: ['...........kkkk...', '..........kSSSSk..', 'kkkkkkkkkkSk..kSk.', 'kHhhhhhhkSSk...kk.', 'kkkkkkkkkkk.......', '..................', '..................'],
  faecher: ['.........k.k.k.k..', '........kSkSkSkSk.', 'kkkkkkkkkSxSxSxSk.', 'kHhhhhhhkSSwSSSSk.', 'kkkkkkkkkSxSxSxSk.', '........kSkSkSkSk.', '.........k.k.k.k..'],
  haken: ['..............kk..', '.............kSSk.', 'kkkkkkkkkkkkkSkSk.', 'kHhhhhhhkSSSSSkSk.', 'kkkkkkkkkkkkkk.kk.', '..................', '..................'],
  bumerang: ['.........kk.......', '........kSSk......', 'kkkkkkkkkSwSk.....', 'kHhhhhhhkkSSSSkkk.', 'kkkkkkkkk.kSSSSSSk', '...........kkkkkk.', '..................'],
  sense: ['.........kkkkkkk..', '........kSSSSSSSk.', 'kkkkkkkkkSkkkkkkSk', 'kHhhhhhhhhk.....kk', 'kkkkkkkkkkk.......', '..................', '..................'],
  anker: ['.........k....k...', '........kSk..kSk..', 'kkkkkkkkkSk..kSk..', 'kHhhhhhhkSSSSSSk..', 'kkkkkkkkkSk..kSk..', '........kSk..kSk..', '.........k....k...'],
  speer: ['..................', '...............k..', 'kkkkkkkkkkkkkkkSk.', 'kHhhhhhhhhhhhkSwSk', 'kkkkkkkkkkkkkkkSk.', '...............k..', '..................'],
  keule: ['.........kkkkk....', '........kSkSkSk...', 'kkkkkkkkkSSSSSSk..', 'kHhhhhhhkSSwSSSSk.', 'kkkkkkkkkSSSSSSk..', '........kSkSkSk...', '.........kkkkk....'],
  saege: ['..................', '.........kkkkkkk..', 'kkkkkkkkkSSSSSSSk.', 'kHhhhhhhkSwSSSSSk.', 'kkkkkkkkkSSSSSSSk.', '.........kSkSkSk..', '..........k.k.k...'],
  dreizack: ['..........kkkkk...', '.........kSk.kSk..', 'kkkkkkkkkkSkkkSkk.', 'kHhhhhhhhhSSSSSSSk', 'kkkkkkkkkkSkkkSkk.', '.........kSk.kSk..', '..........kkkkk...'],
  klinge: ['..................', '.........kkkkkkk..', 'kkkkkkkkxSwwwSSSk.', 'kHhHhHhkxSSSSSSSSk', 'kkkkkkkkxSSSSSSSk.', '.........kkkkkkk..', '..................'],
};

/* ---------- Bausteine für einzigartige Rüstungsteile ---------- */
// Materialien: dunkle Fantasie-Paletten. a dunkel · A Grundton · h Glanz · x Akzent · X Akzent dunkel · e Leuchten · v Sehschlitz · c/C Stoff · w Knochen/Weiss · y Gold · g/G Edelstein
export const MATERIALS = {
  obsidian: { a: '#141018', A: '#2e2638', h: '#6a5a80', x: '#c02a3a', X: '#6a1020', e: '#ff3a3a', v: '#000000', c: '#2a1020', C: '#140810', w: '#8a7aa0', y: '#d4b46a', g: '#ff3a3a', G: '#8a1020' },
  knochen: { a: '#7a6a50', A: '#d8ccb0', h: '#fff6e0', x: '#5a1010', X: '#2a0808', e: '#ff4020', v: '#1a0a08', c: '#4a3a2a', C: '#2a2018', w: '#f2e6c8', y: '#d4b46a', g: '#ff4020', G: '#8a2010' },
  blut: { a: '#3a0810', A: '#8a1020', h: '#ff5a5a', x: '#ffd84a', X: '#a07010', e: '#ff2020', v: '#100004', c: '#6a0a14', C: '#30040a', w: '#d8c0b0', y: '#ffd84a', g: '#ff2020', G: '#6a0a14' },
  leere: { a: '#140828', A: '#3a1a60', h: '#a070ff', x: '#ff4fd8', X: '#8a1a7a', e: '#ff9af0', v: '#000000', c: '#1a0a30', C: '#08020f', w: '#c8a8ff', y: '#ff9af0', g: '#ff4fd8', G: '#8a1a7a' },
  gold: { a: '#6a4a10', A: '#d4a030', h: '#fff0a0', x: '#8a1020', X: '#4a0810', e: '#ffffff', v: '#1a1004', c: '#5a1020', C: '#2a0810', w: '#fff6d0', y: '#ffd84a', g: '#e0304f', G: '#8a1020' },
  rost: { a: '#4a2a14', A: '#9a5a2a', h: '#e0a060', x: '#5a5a60', X: '#2a2a30', e: '#ffb040', v: '#140a04', c: '#5a4030', C: '#2a1a10', w: '#c0a080', y: '#d0a040', g: '#ffb040', G: '#8a4a10' },
  frost: { a: '#2a4a6a', A: '#8ac8f0', h: '#f0ffff', x: '#ffffff', X: '#6a9ac0', e: '#80f0ff', v: '#0a1420', c: '#3a5a8a', C: '#1a2a4a', w: '#e0f8ff', y: '#bff6ff', g: '#80f0ff', G: '#3a8ac0' },
  glut: { a: '#3a1008', A: '#a03010', h: '#ffb040', x: '#ffe070', X: '#c06010', e: '#ffd040', v: '#100400', c: '#6a1808', C: '#300800', w: '#ff8a30', y: '#ffe070', g: '#ffd040', G: '#ff6a10' },
  jade: { a: '#0e3a2c', A: '#2a9a6a', h: '#a0ffd0', x: '#ffd84a', X: '#a07010', e: '#7dffcf', v: '#04140d', c: '#0e3a2c', C: '#06201a', w: '#c8ffe8', y: '#ffd84a', g: '#7dffcf', G: '#1fb88a' },
  silber: { a: '#5a6070', A: '#c8d0e0', h: '#ffffff', x: '#4a6ad0', X: '#2a3a8a', e: '#9ad8ff', v: '#0e1420', c: '#2a3a6a', C: '#141c3a', w: '#ffffff', y: '#ffd84a', g: '#9ad8ff', G: '#4a6ad0' },
  asche: { a: '#2a2828', A: '#6a6460', h: '#b0a8a0', x: '#ff6a30', X: '#8a2a10', e: '#ffa060', v: '#0a0808', c: '#3a3434', C: '#1a1616', w: '#8a8480', y: '#c0a060', g: '#ff6a30', G: '#8a2a10' },
  mond: { a: '#3a3a6a', A: '#9a9ad8', h: '#f0f0ff', x: '#ffd84a', X: '#a07a10', e: '#ffffff', v: '#0a0a20', c: '#2a2a5a', C: '#14143a', w: '#e0e0ff', y: '#ffd84a', g: '#bff6ff', G: '#6a6ad0' },
  sumpf: { a: '#2a3a18', A: '#5a7a30', h: '#b0d070', x: '#d0a040', X: '#6a5010', e: '#d0ff60', v: '#0a1004', c: '#3a4a20', C: '#1a2410', w: '#a0b080', y: '#d0a040', g: '#d0ff60', G: '#5a8a20' },
  // Meister-Sets
  glasrose: { a: '#2a2630', A: '#4a4458', h: '#ffc8dc', x: '#f489ac', X: '#a04a70', e: '#c5ffff', v: '#141018', c: '#3a3444', C: '#1e1a26', w: '#ffe4ee', y: '#f489ac', g: '#c5ffff', G: '#f489ac' },
  ebbe: { a: '#1e3a3c', A: '#3c7a74', h: '#8ad8c8', x: '#f3bd72', X: '#9a6a2a', e: '#f3bd72', v: '#081414', c: '#2a4a58', C: '#14262e', w: '#c8ece4', y: '#d4a050', g: '#f3bd72', G: '#5caeaf' },
  vesper: { a: '#2a1e40', A: '#524171', h: '#ae8ded', x: '#ffde84', X: '#a07a2a', e: '#ffde84', v: '#0e0818', c: '#3e2c5a', C: '#1e142e', w: '#e0d0ff', y: '#ffde84', g: '#ae8ded', G: '#ffde84' },
  kreide: { a: '#3a3e44', A: '#6a7078', h: '#d0cdc3', x: '#ffa293', X: '#a05a50', e: '#fff6e8', v: '#16181c', c: '#4a4e56', C: '#24272c', w: '#f4f0e4', y: '#d0cdc3', g: '#ffa293', G: '#d0cdc3' },
  esse: { a: '#2a1410', A: '#8a4a28', h: '#dd8b55', x: '#a8efff', X: '#3a6a8a', e: '#a8efff', v: '#0a0606', c: '#1a1210', C: '#0a0606', w: '#ffcf9a', y: '#dd8b55', g: '#a8efff', G: '#dd8b55' },
  naht: { a: '#141018', A: '#d4bbc3', h: '#fff3f0', x: '#fa4055', X: '#8a1a2a', e: '#ffd84a', v: '#08060a', c: '#1a141e', C: '#0a080c', w: '#ffefe0', y: '#ffd84a', g: '#fa4055', G: '#ffd84a' },
  schatten: { a: '#0e0a12', A: '#2a2232', h: '#48354f', x: '#f4dfaf', X: '#8a7a50', e: '#f4dfaf', v: '#000000', c: '#181320', C: '#08060c', w: '#f4dfaf', y: '#c8a850', g: '#f4dfaf', G: '#48354f' },
};
// Zusätzliche Helm-Grundformen
export const HELM_BASES = {
  kapuze: [[4, 8, 'kkkk'], [5, 7, 'kAAAAk'], [6, 6, 'kAhAAAAk'], [7, 5, 'kAhAAAAAAk'], [8, 5, 'kAAAkkkkkk'], [9, 4, 'kAAAkvvvvvk'], [10, 4, 'kAAAkvevevk'], [11, 4, 'kaAAkvvvvvk'], [12, 4, 'kaaAAkkkkkk'], [13, 5, 'kkaaaaaak'], [14, 6, 'kkkkkkk']],
  maske: [[5, 7, 'kkkkkk'], [6, 6, 'kwwwwwwk'], [7, 5, 'kwwhwwwwwk'], [8, 5, 'kwwwwwwwwk'], [9, 5, 'kwkekwkekk'], [10, 5, 'kwkkkwkkkk'], [11, 5, 'kwwwwkwwwk'], [12, 5, 'kawvwvwvwk'], [13, 6, 'kkkkkkkk']],
  grosshelm: [[5, 6, 'kkkkkkkk'], [6, 5, 'kAAhhAAAAk'], [7, 5, 'kAhAAAAAAk'], [8, 5, 'kAAAAAAAAk'], [9, 5, 'kaAAvvvvvk'], [10, 5, 'kaAAkekekk'], [11, 5, 'kaAAAAvAAk'], [12, 5, 'kaaAAAAAak'], [13, 5, 'kkkkkkkkkk']],
  kronhelm: [[6, 6, 'kkkkkkkk'], [7, 5, 'kAhAAAAAAk'], [8, 5, 'kAAAAAAAAk'], [9, 5, 'kaAAkkkkkk'], [10, 5, 'kaAAkvevek'], [11, 5, 'kaAAkvvvvk'], [12, 5, 'kaaAAAAAak'], [13, 6, 'kkkkkkkk']],
};
// Verzierungen (werden über die Grundform gemalt)
export const HELM_DECO = {
  hoerner: [[1, 2, 'kk'], [2, 1, 'kwk'], [3, 1, 'kwk'], [4, 1, 'kwwk'], [5, 2, 'kwwk'], [6, 3, 'kwk'], [7, 4, 'kk'], [1, 16, 'kk'], [2, 16, 'kwk'], [3, 16, 'kwk'], [4, 15, 'kwwk'], [5, 14, 'kwwk'], [6, 14, 'kwk'], [7, 14, 'kk']],
  krone: [[1, 6, 'k'], [1, 9, 'kk'], [1, 13, 'k'], [2, 5, 'kyk'], [2, 8, 'kyyk'], [2, 12, 'kyk'], [3, 5, 'kyykyykyyk'], [4, 5, 'kyxyyyyxyk'], [5, 5, 'kkkkkkkkkk']],
  stacheln: [[1, 7, 'k'], [2, 7, 'kw'], [0, 10, 'k'], [1, 10, 'kw'], [2, 10, 'kw'], [1, 13, 'k'], [2, 13, 'kw'], [3, 6, 'kwk'], [3, 9, 'kwwk'], [3, 12, 'kwk']],
  geweih: [[0, 3, 'k.k'], [1, 3, 'kwk'], [1, 1, 'kk'], [2, 2, 'kwwk'], [3, 4, 'kwk'], [4, 5, 'kwk'], [0, 14, 'k.k'], [1, 14, 'kwk'], [1, 17, 'kk'], [2, 14, 'kwwk'], [3, 13, 'kwk'], [4, 12, 'kwk']],
  einhorn: [[1, 13, 'kk'], [2, 12, 'kwk'], [3, 11, 'kwk'], [4, 10, 'kwk']],
  federn: [[0, 10, 'kk'], [1, 9, 'kxxk'], [2, 8, 'kxXxk'], [3, 7, 'kxXk'], [4, 7, 'kxk']],
  kiefer: [[12, 5, 'kwvwvwvwvk'], [13, 6, 'kwkwkwkk'], [14, 7, 'k.k.k']],
  schnabel: [[10, 14, 'kyk'], [11, 14, 'kyyk'], [12, 14, 'kk']],
  laterne: [[1, 9, 'kkk'], [2, 9, 'kek'], [3, 9, 'kek'], [4, 8, 'kkkkk']],
  sterne: [[2, 6, 'y'], [1, 12, 'y'], [3, 14, 'w']],
  nieten: [[7, 7, 'h'], [7, 12, 'h'], [12, 7, 'y'], [12, 12, 'y']],
  dornen: [[3, 6, 'k.k.k.k.k'], [4, 6, 'xkxkxkxkx']],
  schellen: [[4, 3, 'kk'], [5, 2, 'kxxk'], [6, 2, 'kyyk'], [7, 3, 'kk'], [4, 15, 'kk'], [5, 15, 'kxxk'], [6, 15, 'kyyk'], [7, 15, 'kk']],
};
export const TORSO_DECO = {
  stacheln: [[10, 3, 'k'], [11, 3, 'kw'], [12, 2, 'kwwk'], [13, 2, 'kkkk'], [10, 16, 'k'], [11, 15, 'wk'], [12, 14, 'kwwk'], [13, 14, 'kkkk']],
  rune: [[15, 9, 'ee'], [16, 8, 'e..e'], [17, 9, 'ee']],
  kern: [[15, 8, 'kxxk'], [16, 8, 'xeex'], [17, 8, 'xeex'], [18, 8, 'kxxk']],
  rippen: [[15, 7, 'wkwkwk'], [16, 6, 'wwkwwkww'], [17, 7, 'wkwkwk']],
  nieten: [[15, 7, 'g'], [15, 12, 'g'], [17, 8, 'g'], [17, 11, 'g']],
  ketten: [[15, 6, 'x.x.x.x.'], [16, 7, 'x.x.x.x'], [17, 6, 'x.x.x.x.']],
  schaedel: [[15, 8, 'kwwk'], [16, 8, 'wvvw'], [17, 8, 'kwwk'], [18, 9, 'vv']],
  spiegel: [[15, 7, 'kwwwwk'], [16, 7, 'whhhhw'], [17, 7, 'kwwwwk']],
  schuppen: [[15, 6, 'xAxAxAxA'], [16, 7, 'AxAxAxA'], [17, 6, 'xAxAxAxA']],
  dornen: [[14, 5, 'x'], [14, 14, 'x'], [19, 5, 'x'], [19, 14, 'x']],
  federn: [[14, 4, 'kwk'], [15, 3, 'kwwk'], [16, 3, 'kwk']],
};
// Umhang hinter dem Rücken (Held schaut nach rechts: Rücken links)
export const CAPES = {
  kurz: [[14, 5, 'kk'], [15, 4, 'kcc'], [16, 3, 'kccC'], [17, 3, 'kcCC'], [18, 3, 'kccC'], [19, 3, 'kcCk'], [20, 4, 'kk']],
  lang: [[14, 5, 'kk'], [15, 4, 'kcc'], [16, 3, 'kccC'], [17, 2, 'kccCC'], [18, 2, 'kcCCC'], [19, 2, 'kccCC'], [20, 1, 'kccCCk'], [21, 1, 'kcCCk'], [22, 1, 'kccCk'], [23, 2, 'kkkk']],
  zerfetzt: [[14, 5, 'kk'], [15, 4, 'kcc'], [16, 3, 'kccC'], [17, 2, 'kccCC'], [18, 2, 'kcCCC'], [19, 1, 'kccCCk'], [20, 1, 'kc.Ck'], [21, 1, 'k..Ck'], [22, 2, 'k.k']],
  fluegel: [[9, 1, 'kk'], [10, 0, 'khck'], [11, 0, 'khcck'], [12, 0, 'kcccCk'], [13, 0, 'kccCCk'], [14, 0, 'kcCCk'], [15, 1, 'kcCk'], [16, 1, 'kcCk'], [17, 2, 'kCk'], [18, 2, 'kk']],
  kragen: [[11, 4, 'kk'], [12, 3, 'kcck'], [13, 3, 'kcCk'], [14, 3, 'kcCk'], [15, 3, 'kcCk'], [16, 3, 'kCCk'], [17, 3, 'kcCk'], [18, 4, 'kCk'], [19, 4, 'kk']],
};
// Beinstile: verändern die Schritt-Zeilen (r = Zeile 0–3)
export const LEG_STYLES = {
  glatt: (row) => row,
  schienen: (row, r) => (r === 0 ? row.replace(/A/g, 'h') : row),
  runen: (row, r) => (r === 1 ? row.replace(/A/g, 'e') : row),
  stiefel: (row, r) => (r === 2 ? row.replace(/a/g, 'x') : r === 3 ? row.replace(/k/g, 'k') : row),
  krallen: (row, r) => (r === 3 ? row.replace(/^(\.*)k/, '$1x').replace(/k(\.*)$/, 'x$1') : r === 2 ? row.replace(/a/g, 'h') : row),
};
