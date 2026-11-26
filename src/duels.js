// Verborgene Duelle, unabhängig von der Weltfolge. Die Siegel lesen auch ältere Spielstände.
export const DUELS = [
  { id: 'D-1', name: 'Sereia, die Glasfechterin', hall: 'Scherbengarten', theme: 'grotte', colors: ['#544275','#f489ac','#c5ffff'], hp: 104, h: 32, w: 32,
    hint: 'Drei Schaufelmünzen vom Dornenkamm spiegeln eine zweite Welt.', open: d => (d.coins['1-3'] || []).length >= 3,
    second: 'Rosenschnitt', advice: 'Überspring ihren Ausfall. Nach dem letzten Stich ist ihr Rücken ungeschützt.',
    patterns: [['lunge','fan'], ['lunge','return','fan']], ledges: [[19,8,4],[32,7,3]],
    art: '.......3.....3../.....3.23...32../.....2223..32.../.....2132.32..../......22232...../.....12222....../....3222112...../...32.222122..../..32.21122112.../.32.22.1122122../32.22...1122122./..22.....1211122/..1.......22.11./.11.......11....' },
  { id: 'D-2', name: 'Brunn, der Flutvogt', hall: 'Trockendock', theme: 'bau', colors: ['#365363','#5caeaf','#f3bd72'], hp: 126, h: 36, w: 35,
    hint: 'Plündere die Truhe im Tresor der Zeit und finde seinen Ausgang.', open: d => !!d.cleared['2-G'] && Object.keys(d.chests).some(k=>k.startsWith('2-G:') && d.chests[k]),
    second: 'Springflut', advice: 'Die Welle bleibt am Boden. Spare den Sprung für den Moment, in dem der Sog einsetzt.',
    patterns: [['tide','anchor'], ['undertow','anchor','tide']], ledges: [[18,8,5],[30,8,5]],
    art: '....3....3...../....232232...../....213312...../..3322222233.../.322212212223../.212211112212../..1222332212.../...22122122..3./..321111123..2./.32222222223.2./..211222112..2./..211..211.3.23/..333..333..222' },
  { id: 'D-3', name: 'Vesper, der Glockenfalter', hall: 'Stummer Glockenturm', theme: 'glocke', colors: ['#524171','#ae8ded','#ffde84'], hp: 112, h: 32, w: 40,
    hint: 'Zwölf Schaufel-Abpraller ohne Bodenkontakt lassen eine stumme Glocke erklingen.', open: d => d.stats.bestChain >= 12,
    second: 'Nachhall', advice: 'Achte auf die Lücken zwischen den Schallringen. Zum Gegenangriff sinkt Vesper auf Bodenhöhe.',
    patterns: [['chime','rain'], ['echo','rain','chime']], ledges: [[15,7,4],[24,8,3],[34,6,4]],
    art: '3......3.3......3/23.....2.2.....32/2233...232...3322/212233.222.332212/.211322212223112./..2122213122212../...23322122332.../..2232121212322../.2221..222..1222./.21....232....12./..1....232....1../........3........' },
  { id: 'D-4', name: 'Die Kreidewitwe', hall: 'Archiv der Fußspuren', theme: 'hoehle', colors: ['#514459','#d0cdc3','#ffa293'], hp: 132, h: 29, w: 39,
    hint: 'Hinterlasse in jedem der drei Qualpfade eine Spur bis zum Ziel.', open: d => ['Q-1','Q-2','Q-3'].every(id=>d.cleared[id]),
    second: 'Durchschrift', advice: 'Kreuze merken sich deine Position. Laufe nach der Markierung weiter und wende erst nach dem Einschlag.',
    patterns: [['record','fan'], ['palimpsest','lunge','record']], ledges: [[17,7,3],[29,8,5]],
    art: '3..3.......3..3/.2..23...32..2./..2..23332..2../...222111222.../.3222113112223./32..2111112..23/...221333122.../..21.21112.12../.21..22122..12./21...21.12...12/1...21...12...1/....1.....1....' },
  { id: 'D-5', name: 'Nadir, der Sternenschmied', hall: 'Amboss der Nacht', theme: 'pendel', colors: ['#564168','#dd8b55','#a8efff'], hp: 164, h: 37, w: 38,
    hint: 'Erst wenn der Weltenfresser im Nullpunkt fällt, hört man den letzten Amboss.', open: d => !!d.cleared['4-10'],
    second: 'Supernova', advice: 'Verlasse die Sternmarke. Springe beim Hammerschlag und nutze die Pause nach der Salve.',
    patterns: [['forge','meteor','lunge'], ['nova','meteor','return','forge']], ledges: [[17,8,4],[26,7,3],[34,8,4]],
    art: '....3...3....3333/....23.32...32223/....23332...32223/...2213122...223./..322222223...2../.32211211223..2../.21123332112222../..12222222112..../...22111222....../..2212321222...../.221111111122..../..222...2222...../..212....212...../.3333...3333.....' },
  { id:'D-6', name:'Die Nahtmutter', hall:'Die letzte Schneiderstube', theme:'grotte', colors:['#2b243b','#d4bbc3','#ffefe0'], hp:216, w:66, h:64,
    hint:'Scherben und Kreide führen zur Schneiderstube. Gewinne die Duelle gegen Sereia und die Kreidewitwe.',
    open:d=>!!(d.cleared['D-1'] && d.cleared['D-4']), second:'Sechs Hände', advice:'Weiche der Nadel aus. Trenne jeden hellen Knoten, solange sein Faden durchhängt. Jeder Arm lässt sich einmal pro Phase lösen.',
    ledges:[], art:'.....3..3..3...../....323232323..../..3..2222222..3../.232..23332..232./..122.23332.221../3..112.223.211..3/23...1222221...32/.222212222212222./.1...2222222...1./32.22122222122.23/.222.1221221.222./...2222.2222...../.32211222112223../321..1222221..123/...22221112222.../..2212222222122../.222211221122222./22211122222111222' },
  { id:'D-7', name:'Der Nullfürst', hall:'Der Thron ohne Licht', theme:'hoehle', colors:['#181320','#48354f','#f4dfaf'], hp:224, w:10, h:14,
    hint:'Fünf alte Meister müssen sich verbeugen. Bezwinge die ersten fünf Geheimduelle.',
    open:d=>['D-1','D-2','D-3','D-4','D-5'].every(id=>d.cleared[id]), second:'Die stumme Krone', advice:'Setze einen Schaufel-Sprung an und locke den Fürsten in dessen Schatten. Verlasse die Markierung vor dem Einschlag nach zwei Kronenschlägen. Später zählt nur die Hand.',
    ledges:[[20,9,3],[31,8,3]], art:'..222.../.21112../.21212../..111.../.211123./1211213./..212.3./.11.11..' },
];

function arena(boss) {
  const grid = Array.from({ length: 14 }, (_, y) => Array.from({ length: 44 }, (_, x) =>
    x === 0 || x === 43 || y === 0 || y >= 11 ? '#' : '.'));
  grid[10][2] = 'P'; grid[10][4] = 'i'; grid[10][7] = 'C';
  for (const [x,y,w] of boss.ledges) for (let i = 0; i < w; i++) grid[y][x+i] = '=';
  return grid.map(row => row.join(''));
}
export const DUEL_LEVELS = DUELS.map((b,i) => ({ id: b.id, name: b.hall, theme: b.theme, map: arena(b),
  duel: i, gate: 10, boss: true, secret: true, par: 140 + i * 10, signs: [b.name + '. ' + b.advice] }));
