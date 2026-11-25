// Welt-Themen: Farben, Kulisse und Musik.
// Musik: 32 Achtelnoten pro Schleife, "." = Pause, "-" = Ton halten.

export const THEMES = {
  wald: {
    sky: ['#24164a', '#6e3a72', '#ff9b6a'], far: '#4b2d63', near: '#2b1a42', deco: 'baum',
    dirt: '#5a3426', dirtL: '#8c5638', dirtD: '#3a2018', grass: '#56d065', grassD: '#2a8a3c',
    stone: '#666a7c', stoneL: '#a0a3b4', plank: '#a8703e', stars: '#ffe7b8',
    music: { bpm: 138,
      lead: 'E5 . G5 . A5 G5 E5 . D5 . E5 G5 C5 - - . E5 . G5 . A5 C6 B5 . A5 . G5 E5 D5 - - .',
      bass: 'C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 . C3 . C3 . G2 . G2 . F2 . F2 . G2 . G2 .' } },
  hoehle: {
    sky: ['#0b0614', '#170d2a', '#26163c'], far: '#211339', near: '#150b25', deco: 'kristall',
    dirt: '#45293b', dirtL: '#77506a', dirtD: '#26141f', grass: '#8a62d8', grassD: '#4a3488',
    stone: '#55536a', stoneL: '#8d8aa8', plank: '#7a5a48', stars: '#7fe6ff',
    music: { bpm: 112,
      lead: 'A4 . C5 . E5 . D5 C5 B4 - - . G4 . A4 . A4 . C5 . E5 . G5 F5 E5 - D5 . E5 - - .',
      bass: 'A2 . . A2 E2 . . E2 F2 . . F2 G2 . . G2 A2 . . A2 E2 . . E2 F2 . . F2 E2 . E2 .' } },
  dornen: {
    sky: ['#170d2c', '#56204e', '#e8634a'], far: '#3c1a3a', near: '#200c22', deco: 'dorn',
    dirt: '#4a2a2c', dirtL: '#7c4a3e', dirtD: '#2a1416', grass: '#d0485e', grassD: '#7a2038',
    stone: '#6a5a66', stoneL: '#a8939f', plank: '#9a6a40', stars: '#ffd0e0',
    music: { bpm: 150,
      lead: 'D5 . F5 . A5 . G5 F5 E5 . C5 . D5 - - . D5 . F5 . A5 . C6 A5 B5 . G5 . A5 - - .',
      bass: 'D3 . D3 D3 A2 . A2 . C3 . C3 C3 G2 . G2 . D3 . D3 D3 A2 . A2 . G2 . G2 . A2 . A2 .' } },
  bau: {
    sky: ['#140606', '#33100c', '#6e2410'], far: '#3a1510', near: '#1f0a07', deco: 'lava',
    dirt: '#4a2418', dirtL: '#7c4228', dirtD: '#2a1008', grass: '#d0702a', grassD: '#7a3a18',
    stone: '#5d4a46', stoneL: '#9a807a', plank: '#8a5a30', stars: '#ffb070',
    music: { bpm: 168,
      lead: 'E5 . E5 . G5 . E5 . D5 . E5 . B4 - - . E5 . E5 . G5 . A5 . B5 . A5 . G5 . F#5 .',
      bass: 'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 D2 D3 B1 B2 B1 B2' } },
  uhrturm: {
    sky: ['#0b1820', '#1d3a44', '#c0804a'], far: '#1a3038', near: '#10222a', deco: 'zahnrad',
    dirt: '#3c3532', dirtL: '#6c5c4c', dirtD: '#221c1a', grass: '#d0a040', grassD: '#7a5a20',
    stone: '#55666e', stoneL: '#98b0b8', plank: '#b88a40', stars: '#ffd890',
    music: { bpm: 126,
      lead: 'A4 . E5 . A5 . G5 E5 F5 . E5 . D5 - - . C5 . E5 . A5 . B5 C6 B5 . G5 . A5 - - .',
      bass: 'A2 . E3 . A2 . E3 . F2 . C3 . G2 . D3 . A2 . E3 . A2 . E3 . F2 . C3 . E2 . E3 .' } },
  glocke: {
    sky: ['#120e24', '#3a2a52', '#e0a060'], far: '#2a2240', near: '#18122a', deco: 'zahnrad',
    dirt: '#3a3036', dirtL: '#6a5a60', dirtD: '#201a1e', grass: '#e0b050', grassD: '#8a6420',
    stone: '#5a5a70', stoneL: '#a0a0b8', plank: '#c09048', stars: '#ffe0a0',
    music: { bpm: 140,
      lead: 'E5 . B4 . E5 . F#5 G5 F#5 . E5 . D5 - B4 . E5 . G5 . B5 . A5 G5 F#5 . D5 . E5 - - .',
      bass: 'E2 . B2 . E2 . B2 . D2 . A2 . D2 . A2 . C2 . G2 . C2 . G2 . B1 . F#2 . B1 . B2 .' } },
  pendel: {
    sky: ['#160808', '#3a1a10', '#a0602a'], far: '#3a2014', near: '#200e08', deco: 'zahnrad',
    dirt: '#3a2a22', dirtL: '#6a4a34', dirtD: '#20140e', grass: '#e0a040', grassD: '#8a5a1a',
    stone: '#5a4e4a', stoneL: '#9a8a80', plank: '#b07a30', stars: '#ffc080',
    music: { bpm: 172,
      lead: 'A4 A4 . C5 . A4 . E5 D5 . C5 . B4 - - . A4 A4 . C5 . A4 . F5 E5 . D5 . E5 - - .',
      bass: 'A1 A2 A1 A2 A1 A2 A1 A2 F1 F2 F1 F2 E1 E2 E1 E2 A1 A2 A1 A2 A1 A2 A1 A2 D2 D3 D2 D3 E1 E2 E1 E2' } },
  pilz: {
    sky: ['#0a1a24', '#1a3a3a', '#3a6a5a'], far: '#1a3438', near: '#0e2226', deco: 'pilz',
    dirt: '#3a2e36', dirtL: '#6a5060', dirtD: '#201820', grass: '#7adf9a', grassD: '#2a8a5a',
    stone: '#566a6a', stoneL: '#9ab8b0', plank: '#9a7050', stars: '#c8ffe0',
    music: { bpm: 118,
      lead: 'D5 . F5 . A5 . G5 . F5 E5 D5 . C5 - - . D5 . F5 . A5 . C6 . A5 G5 F5 . E5 - - .',
      bass: 'D2 . A2 . D3 . A2 . A#1 . F2 . C2 . G2 . D2 . A2 . D3 . A2 . A#1 . C2 . A1 . A2 .' } },
  grotte: {
    sky: ['#040a10', '#0a1a20', '#10282a'], far: '#0e2024', near: '#081416', deco: 'pilz',
    dirt: '#2a2430', dirtL: '#4a4050', dirtD: '#16121a', grass: '#5ad0c8', grassD: '#1a7a78',
    stone: '#4a5458', stoneL: '#8a9a9a', plank: '#7a5a48', stars: '#7affe0',
    music: { bpm: 96,
      lead: 'E5 . . B4 . . G5 . F#5 . . D5 . . E5 - B4 . . E5 . . G5 . A5 . . F#5 . . E5 - -',
      bass: 'E2 . . . B1 . . . C2 . . . D2 . . . E2 . . . B1 . . . C2 . . . B1 . . .' } },
  moder: {
    sky: ['#100a18', '#2a1430', '#5a2a4a'], far: '#2a1830', near: '#180c1c', deco: 'pilz',
    dirt: '#3a2430', dirtL: '#6a4050', dirtD: '#1e1018', grass: '#e070a0', grassD: '#8a3060',
    stone: '#5a4a56', stoneL: '#9a8090', plank: '#8a5a48', stars: '#ffb0d8',
    music: { bpm: 176,
      lead: 'D5 D5 . F5 . D5 . A5 G5 . F5 . E5 - - . D5 D5 . F5 . D5 . A#5 A5 . G5 . A5 - - .',
      bass: 'D2 D3 D2 D3 D2 D3 D2 D3 A#1 A#2 A#1 A#2 A1 A2 A1 A2 D2 D3 D2 D3 D2 D3 D2 D3 G1 G2 G1 G2 A1 A2 A1 A2' } },
  karte: {
    sky: ['#120a1e', '#2a1640', '#4a2058'], far: '#2e1846', near: '#1c0e2e', deco: 'baum',
    dirt: '#5a3426', dirtL: '#8c5638', dirtD: '#3a2018', grass: '#56d065', grassD: '#2a8a3c',
    stone: '#666a7c', stoneL: '#a0a3b4', plank: '#a8703e', stars: '#ffe7b8',
    music: { bpm: 100,
      lead: 'C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - E5 - G5 - C6 - B5 - A5 - G5 - E5 - - -',
      bass: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . A2 . E3 . A2 . E3 . F2 . C3 . G2 . G2 .' } },
};
