// Die Jagdreviere bilden die vierte Welt. Jede Art hat eine eigene Silhouette,
// eine Rolle und ein erkennbares Angriffsmuster.
const creature = (name, shape, move, attack) => ({ name, shape, move, attack });
const hunt = (name, theme, difficulty, colors, monsters, boss, pattern, advice) =>
  ({ name, theme, difficulty, colors, monsters, boss, pattern, advice });

export const HUNTS = [
  hunt('Mooslichtung', 'wald', 'Einfach', ['#44704a', '#a9da72', '#fff3a5'], [
    creature('Eichelwicht', 'acorn', 'walk', 'dash'),
    creature('Tautropfer', 'drop', 'hop', 'jump'),
    creature('Blattfalter', 'moth', 'fly', 'arrow')],
    creature('Wurzelhirsch', 'stag', 'walk', 'dash'), ['dash', 'rest'], 'Weiche dem Geweih aus und folge ihm nach dem Ansturm.'),
  hunt('Schlickufer', 'pilz', 'Leicht', ['#365d60', '#6dd6ba', '#feed92'], [
    creature('Schlickkrebs', 'crab', 'walk', 'shock'),
    creature('Rohrschnapper', 'reed', 'guard', 'arrow'),
    creature('Quellqualle', 'jelly', 'fly', 'spore')],
    creature('Moorunke', 'frog', 'hop', 'jump'), ['jump', 'spore'], 'Halte Abstand, bis die Unke wieder landet.'),
  hunt('Kupferstollen', 'uhrturm', 'Geübt', ['#7d462d', '#e39862', '#ffe2a2'], [
    creature('Nietenlaus', 'louse', 'walk', 'gear'),
    creature('Bohrfloh', 'drill', 'hop', 'dash'),
    creature('Zinnwespe', 'wasp', 'fly', 'arrow')],
    creature('Ofenkrabbe', 'furnace', 'walk', 'gear'), ['gear', 'shock', 'rest'], 'Spring über die Glutwelle und achte auf das hüpfende Rad.'),
  hunt('Kristallbruch', 'hoehle', 'Fordernd', ['#443f94', '#9caaff', '#ddfffc'], [
    creature('Splitterschnecke', 'shell', 'guard', 'fan'),
    creature('Prismenschwinge', 'wing', 'fly', 'bolt'),
    creature('Geodenkröte', 'geode', 'hop', 'shock')],
    creature('Prismenorakel', 'oracle', 'walk', 'bolt'), ['bolt', 'fan', 'dash'], 'Die Lichtmarke zeigt dir, wo der Blitz einschlägt.'),
  hunt('Flammenschlucht', 'bau', 'Schwer', ['#932b34', '#ff8750', '#fff59a'], [
    creature('Aschenviper', 'viper', 'walk', 'dash'),
    creature('Glutmolch', 'newt', 'hop', 'spore'),
    creature('Kohlenschlot', 'chimney', 'guard', 'volley')],
    creature('Schlackendrache', 'dragon', 'hop', 'volley'), ['volley', 'dash', 'jump'], 'Unter den Glutbögen bleibt Platz zum Gegenangriff.'),
  hunt('Glockengruft', 'pendel', 'Sehr schwer', ['#725c3a', '#ddbf75', '#faffd5'], [
    creature('Pendelauge', 'pendulum', 'fly', 'gear'),
    creature('Gabelzinker', 'fork', 'guard', 'shock'),
    creature('Taktläufer', 'clock', 'walk', 'jump')],
    creature('Totenglocke', 'bell', 'walk', 'quake'), ['quake', 'gear', 'bolt'], 'Überspringe die Bodenwellen. Die Glocke ruht nach jedem Schlag.'),
  hunt('Sporenschrein', 'moder', 'Brutal', ['#774369', '#ef9bbc', '#deffa1'], [
    creature('Kappenläufer', 'cap', 'walk', 'spore'),
    creature('Fadenfänger', 'root', 'guard', 'bolt'),
    creature('Pollenrochen', 'ray', 'fly', 'volley')],
    creature('Schimmelhydra', 'hydra', 'walk', 'fan'), ['fan', 'volley', 'jump', 'quake'], 'Nach der Salve erlischt der Panzer. Jetzt sind die Köpfe verwundbar.'),
  hunt('Frostschacht', 'hoehle', 'Extrem', ['#315c87', '#8adbff', '#ffffff'], [
    creature('Reifwolf', 'wolf', 'walk', 'dash'),
    creature('Firnspinner', 'spider', 'hop', 'bolt'),
    creature('Eiskrone', 'crown', 'guard', 'rain')],
    creature('Gletscherwal', 'whale', 'hop', 'rain'), ['rain', 'jump', 'gear', 'dash'], 'Die Splitter lassen Lücken. Triff den Wal, wenn sein Panzer erlischt.'),
  hunt('Sternenriss', 'dornen', 'Albtraum', ['#4c3084', '#cf93ff', '#fff8cc'], [
    creature('Sichelgeist', 'crescent', 'fly', 'fan'),
    creature('Orbitaligel', 'urchin', 'hop', 'quake'),
    creature('Kometenmantis', 'mantis', 'walk', 'volley')],
    creature('Sternenmantel', 'cloak', 'walk', 'rain'), ['rain', 'dash', 'fan', 'quake', 'volley'], 'Weiche den Blitzen aus. Wenn der Schild erlischt, ist der Mantel verwundbar.'),
  hunt('Nullpunkt', 'pendel', 'Ultra', ['#39264f', '#f76aaf', '#9fffee'], [
    creature('Leerenmotte', 'voidmoth', 'fly', 'rain'),
    creature('Risskralle', 'claw', 'hop', 'fan'),
    creature('Nulldorn', 'thorn', 'guard', 'quake')],
    creature('Der Weltenfresser', 'maw', 'walk', 'quake'), ['quake', 'rain', 'dash', 'volley', 'jump', 'fan'], 'Triff ihn in den Schildpausen. Unter halber Kraft werden sie kürzer.'),
];

// Die Vorhöfe greifen das Thema des Reviers auf. Der Arenaboden bleibt
// durchgehend begehbar, damit Bodenwellen sauber bis zur Wand laufen.
const approaches = [
  [[12, 10, 'DD'], [25, 9, 'G']],
  [[13, 9, 'B'], [24, 9, 'G']],
  [[12, 10, 'D'], [24, 9, 'z']],
  [[12, 9, 'G'], [19, 8, 'H'], [26, 10, 'D']],
  [[12, 10, '^'], [21, 10, '^'], [24, 7, 'G']],
  [[13, 8, 'z'], [24, 6, 'z']],
  [[12, 10, 'B'], [18, 10, 'B'], [26, 9, 'G']],
  [[11, 4, 'L'], [19, 4, 'L'], [26, 4, 'L']],
  [[13, 10, '^'], [18, 9, 'Z'], [25, 5, 'G']],
  [[12, 4, 'L'], [17, 10, '^'], [24, 8, 'Z']],
];

function huntingGround(hunt, index) {
  const rows = Array.from({ length: 14 }, (_, y) =>
    Array.from({ length: 64 }, (_, x) => y === 0 || y >= 11 || x === 0 || x === 63 ? '#' : '.'));
  const put = (x, y, text) => { for (const c of text) rows[y][x++] = c; };
  put(2, 10, 'P'); put(4, 10, 'i');
  put(8, 9, '==='); put(15, 7, '==='); put(23, 8, '===');
  for (const [x, y, tiles] of approaches[index]) put(x, y, tiles);
  put(31, 10, 'C'); put(32, 10, 'h');
  put(41 + index % 3, 8, '==='); put(54 - index % 4, 7, '===');
  return {
    id: '4-' + (index + 1), name: hunt.name, theme: hunt.theme, hunt: index,
    map: rows.map(row => row.join('')), boss: true, gate: 35, par: 65 + index * 6,
    signs: [hunt.monsters.map(m => m.name).join(' · ') + '. ' + hunt.advice],
  };
}

export const HUNT_LEVELS = HUNTS.map(huntingGround);
