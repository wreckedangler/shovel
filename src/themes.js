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
  karte: {
    sky: ['#120a1e', '#2a1640', '#4a2058'], far: '#2e1846', near: '#1c0e2e', deco: 'baum',
    dirt: '#5a3426', dirtL: '#8c5638', dirtD: '#3a2018', grass: '#56d065', grassD: '#2a8a3c',
    stone: '#666a7c', stoneL: '#a0a3b4', plank: '#a8703e', stars: '#ffe7b8',
    music: { bpm: 100,
      lead: 'C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - E5 - G5 - C6 - B5 - A5 - G5 - E5 - - -',
      bass: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . A2 . E3 . A2 . E3 . F2 . C3 . G2 . G2 .' } },
};
