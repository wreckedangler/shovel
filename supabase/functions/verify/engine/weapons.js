// Legendäre und mythische Waffen. Sie ersetzen die Schaufel-Optik und legen einen Effekt
// auf die Werte der aktuellen Schaufel-Stufe (Schaden, Reichweite, Stein bleiben erhalten).
// Freigeschaltet werden sie nur über Bedingungen, nie über Edelsteine.

export const RARITY = {
  gewoehnlich: { name: 'Gewöhnlich', col: '#cfc4ae', glow: '#8a8170' },
  selten: { name: 'Selten', col: '#5ab8ff', glow: '#2a78d0' },
  episch: { name: 'Episch', col: '#c58bff', glow: '#7a3ad0' },
  legendaer: { name: 'Legendär', col: '#ffd84a', glow: '#ffb020' },
  mythisch: { name: 'Mythisch', col: '#ff7ae0', glow: '#9a4cff' },
};

export const WEAPONS = [
  { id: 'federklinge', name: 'Federklinge', rar: 'legendaer', dark: '#3a8fd0', light: '#e8f8ff', handle: '#d8d8e8',
    perk: 'Ein weiterer Luftsprung, schnellerer Lauf und eine längere Klinge.',
    hint: 'Über dem Moosweg wartet die höchste Münze. Lass jedes Wesen leben und weiche jedem Dorn aus.',
    cond: '1-1 mit der höchsten Münze, ohne besiegte Gegner, Schaden oder Tod abschließen.' },
  { id: 'blitzspaten', name: 'Blitzspaten', rar: 'legendaer', dark: '#c09000', light: '#fff36a', handle: '#3a2a60',
    perk: 'Kürzere Hiebe lassen sich lückenlos verketten. Du läufst schneller.',
    hint: 'Die Uhr zählt zwanzig Schläge. Der Moosweg zählt jeden Schritt.',
    cond: 'Den Moosweg in weniger als 20 Sekunden abschließen.' },
  { id: 'erdfresser', name: 'Erdfresser', rar: 'legendaer', dark: '#6a3a1a', light: '#e0a050', handle: '#3a2010',
    perk: 'Frisst Erde im 3×3-Feld und fördert dreifache Erdbeute.',
    hint: 'Erst wenn keine Erde mehr übrig ist, öffne den Ausgang zur Goldader.',
    cond: 'In 1-2 sämtliche Erde ausheben und durch die Geheimtür entkommen.' },
  { id: 'goldschaufel', name: 'Goldschaufel des Königs', rar: 'legendaer', dark: '#b07a10', light: '#fff0a0', handle: '#7a1830',
    perk: 'Verdoppelt Edelsteine und zieht sie aus 96 Pixeln Entfernung an.',
    hint: 'Drei Truhen im ersten Reich. Das letzte Siegel liegt im Tresor der Zeit.',
    cond: 'Die Truhen aus 1-1, 1-2 und 1-3 sowie eine Truhe in 2-G öffnen.' },
  { id: 'geisterklinge', name: 'Geisterklinge', rar: 'legendaer', dark: '#3a9ab0', light: '#c8ffff', handle: '#2a3a5a', ghost: true,
    perk: 'Ein langer, unverwundbarer Luft-Sprint mit A.',
    hint: 'Sechs Sekunden Vorsprung vor einem fremden Schatten, noch bevor die Zielzeit schlägt.',
    cond: 'Einen fremden Geist um mindestens 6 Sekunden schlagen und die Zielzeit einhalten.' },
  { id: 'sternenspaten', name: 'Sternenspaten', rar: 'mythisch', dark: '#3a2a9a', light: '#d8c8ff', handle: '#1a1040',
    perk: 'Zwei Sterne pro Abpraller. Ab dem dritten folgt ein zweites, höheres Sternenpaar.',
    hint: 'Achtzehn Sterne lang darf kein Fuß den Boden streifen.',
    cond: '18 Schaufel-Abpraller hintereinander ohne Bodenkontakt.' },
  { id: 'maulwurfkralle', name: 'Maulwurfkralle', rar: 'mythisch', dark: '#7a3010', light: '#ff9a50', handle: '#2a1408',
    perk: 'Bodenhiebe senden zwei Erdwellen in entgegengesetzte Richtungen.',
    hint: 'Wer dem Rostmaulwurf mit Holz und ohne Wunde begegnet, erbt seine Krallen.',
    cond: 'Den Rostmaulwurf mit Holzschaufel, ohne Spezialwaffe und ohne Schaden im Kampf besiegen.' },
  { id: 'seelenschaufel', name: 'Seelenschaufel', rar: 'mythisch', dark: '#3a1060', light: '#b07aff', handle: '#120820',
    perk: 'Einmal pro Level mit allen Herzen auferstehen und sofort den Rausch entfachen.',
    hint: 'Im Wurmgrund hört der Tod auf das letzte klopfende Herz.',
    cond: 'Q-2 ohne Tod mit genau einem verbleibenden Herz abschließen.' },
  { id: 'pendelhammer', name: 'Pendelhammer', rar: 'mythisch', dark: '#6a4a10', light: '#ffe08a', handle: '#2a1e10',
    perk: 'Abpraller erschüttern einen weiten Bereich auf beiden Seiten.',
    hint: 'Das Pendel zählt jeden Seitwärtshieb, selbst den ins Leere. Nur von oben bricht sein Takt.',
    cond: 'Das Pendelwerk nur mit Abprallern besiegen, ohne im Kampf einen Seitenhieb auszuführen.' },
  { id: 'spuerschaufel', name: 'Spürschaufel', rar: 'legendaer', dark: '#2a6a5a', light: '#9affd8', handle: '#3a2a1a',
    perk: 'Enthüllt verborgene Blöcke und Münzen. Ein Hieb öffnet falsche Wände aus der Ferne.',
    hint: 'Drei Münzen aus derselben Gruftwanderung wecken den Altar. Ein Grab mehr lässt ihn verstummen.',
    cond: 'Alle drei Münzen in X-0 in einem Lauf ohne Tod sammeln und den Gruftaltar berühren.', secret: true },
  { id: 'urfunke', name: 'Urfunke', rar: 'mythisch', dark: '#c02a00', light: '#ffe070', handle: '#400a00', secret: true,
    perk: 'Doppelter Schaden. Jeder dritte Hieb schleudert eine durchdringende Feuerlanze.',
    hint: 'Hol die Glut vom Himmel des Dornenkamms. Die kalte Schale über dem Sprungpilz wartet auf deine Rückkehr.',
    cond: 'Die Glut vom Himmelsaltar in 1-3 ohne Schaden oder Sturz zurück zur Feuerschale am Pilzplateau tragen.' },
];

// Truhen-Waffen: aus Effekt-Bausteinen zusammengesetzt, Form (shape) und Material bestimmen das Aussehen.
// rar-Index für die Truhen: 0 gewöhnlich · 1 selten · 2 episch · 3 legendär
export const RAR_KEY = ['gewoehnlich', 'selten', 'episch', 'legendaer'];
const MAT = {
  sumpf: ['#3a5a20', '#b0d070', '#3a2a10'], frost: ['#3a6a9a', '#e0f8ff', '#2a3a5a'], gold: ['#a07010', '#fff0a0', '#6a1020'], rost: ['#6a3a1a', '#d09050', '#3a2a20'],
  knochen: ['#8a7a5a', '#fff6e0', '#4a2a1a'], asche: ['#3a3434', '#c0b8b0', '#1a1414'], blut: ['#6a0a14', '#ff5a5a', '#2a0808'], mond: ['#4a4a8a', '#f0f0ff', '#1a1a3a'],
  glut: ['#a03010', '#ffd060', '#3a1008'], leere: ['#2a0a4a', '#ff8af0', '#0a0414'], obsidian: ['#1a1420', '#c02a3a', '#3a3040'],
};
const CW = [];
const W_ = (id, name, rar, shape, mat, fx, perk) => CW.push({ id, name, rar: RAR_KEY[rar], lr: rar, shape, dark: MAT[mat][0], light: MAT[mat][1], handle: MAT[mat][2], fx, perk, chest: true,
  hint: 'Liegt in den Truhen der Schatzkammer.', cond: 'In einer Truhe gefunden.' });
W_('giftklinge', 'Giftklinge', 0, 'sichel', 'sumpf', { poison: true }, 'Vergiftet: Gegner verlieren 3 s lang jede Sekunde 1 Leben.');
W_('windfaecher', 'Windfächer', 0, 'faecher', 'frost', { push: true }, 'Jeder Hieb schleudert Gegner weit fort.');
W_('gluecksspaten', 'Glücksspaten', 0, 'spaten', 'gold', { luck: 15 }, '+15 % goldene Gegner im Level.');
W_('rostbeil', 'Rostbeil', 0, 'axt', 'rost', { dmgAdd: 1, atkLen: 14 }, '+1 Schaden, dafür langsamere Hiebe.');
W_('knochenhaken', 'Knochenhaken', 0, 'haken', 'knochen', { reach: 6 }, 'Längerer Arm: +6 Reichweite.');
W_('aschenschaufel', 'Aschenschaufel', 0, 'spaten', 'asche', { poison: true, fire: true }, 'Setzt Gegner in Brand (Schaden über Zeit).');
W_('bumerangschaufel', 'Bumerangschaufel', 1, 'bumerang', 'rost', { boomerang: true }, 'Jeder Hieb wirft einen Bumerang, der zurückkehrt.');
W_('saugschaufel', 'Saugschaufel', 1, 'sense', 'blut', { vamp: true }, 'Alle 5 besiegten Gegner ein Herz zurück (höchstens 4 pro Level, mit Regeneration geteilt).');
W_('ankerschaufel', 'Ankerschaufel', 1, 'anker', 'rost', { dmgMul: 2, atkLen: 16, run: 0.92 }, 'Doppelter Schaden, aber schwer: langsame Hiebe, langsamerer Lauf.');
W_('splitterhieb', 'Splitterhieb', 1, 'axt', 'frost', { shards: true }, 'Treffer sprengen zwei Splitter ab, die weitere Gegner treffen.');
W_('moorsense', 'Moorsense', 1, 'sense', 'sumpf', { poison: true, reach: 5 }, 'Lange Sense mit Gift.');
W_('sternensichel', 'Sternensichel', 1, 'sichel', 'mond', { stars: true }, 'Schaufel-Sprünge schleudern zwei Sterne.');
W_('kettenblitz', 'Kettenblitz', 2, 'speer', 'mond', { chain: true }, 'Treffer springen als Blitz auf einen zweiten Gegner über.');
W_('frostspaten', 'Frostspaten', 2, 'spaten', 'frost', { frost: true }, 'Getroffene Gegner erstarren 3 s zu Eis – und tragen dich.');
W_('donnerkeule', 'Donnerkeule', 2, 'keule', 'asche', { thunder: true }, 'Schaufel-Sprünge senden Donnerwellen nach links und rechts.');
W_('blutsaege', 'Blutsäge', 2, 'saege', 'blut', { vamp: true, dmgAdd: 1 }, '+1 Schaden, alle 5 Siege ein Herz.');
W_('glutdreizack', 'Glutdreizack', 2, 'dreizack', 'glut', { reach: 8, fire: true, poison: true }, 'Lang, brennend, gnadenlos.');
W_('erdbrecher', 'Erdbrecher', 2, 'keule', 'rost', { area: true, wave: true }, 'Gräbt 3×3 und sendet am Boden eine Erdwelle.');
W_('lichtspeer', 'Lichtspeer', 3, 'speer', 'gold', { reach: 14, chain: true, atkLen: 13 }, 'Gewaltige Reichweite, Blitz springt über. Etwas träge.');
W_('echoschaufel', 'Echoschaufel', 3, 'spaten', 'leere', { echo: true, run: 0.95 }, 'Jeder Hieb wiederholt sich nach 0,3 s. Etwas langsamer Lauf.');
W_('koenigsklinge', 'Klinge des Gefallenen Königs', 3, 'klinge', 'obsidian', { dmgMul: 1.5, fire: true, gems: 0.75 }, '×1,5 Schaden und Feuer. Nachteil: −25 % Edelsteine.');
W_('leerensense', 'Sense der Leere', 3, 'sense', 'leere', { vamp: true, shards: true, reach: 6, atkLen: 14 }, 'Saugt Leben, splittert, reicht weit. Träge Hiebe.');
W_('tiefenhammer', 'Hammer der Tiefe', 3, 'keule', 'obsidian', { quake: true, thunder: true, run: 0.9 }, 'Druckwelle und Donner bei jedem Schaufel-Sprung. Schwer.');
W_('frostzahn', 'Frostzahn', 3, 'speer', 'frost', { frost: true, chain: true, dmgMul: 0.8 }, 'Eis und Blitz. Nachteil: −20 % Schaden.');
WEAPONS.push(...CW);
export const CHEST_WEAPONS = CW;

export const weaponById = id => WEAPONS.find(w => w.id === id) || null;

export function hasRoyalChests(chests) {
  const levels = new Set(Object.keys(chests).filter(key => chests[key]).map(key => key.split(':')[0]));
  return ['1-1', '1-2', '1-3', '2-G'].every(id => levels.has(id));
}

export function finishWeapons(game, ghosts) {
  const won = [];
  const { id, par } = game.level;
  if (id === '1-1' && game.kills === 0 && game.hurtCount === 0 && game.deaths === 0 && game.coins.includes(game.highCoin))
    won.push('federklinge');
  if (id === '1-1' && game.frame < 20 * 60) won.push('blitzspaten');
  if (id === '1-2' && game.exit === 'secret' && game.dirtTotal > 0 && game.dirtLeft() === 0)
    won.push('erdfresser');
  if (id === 'Q-2' && game.deaths === 0 && game.p.hp === 1) won.push('seelenschaufel');
  if (game.frame <= par * 60 && ghosts.some(g => !g.own && g.verified !== false && g.frames - game.frame >= 360))
    won.push('geisterklinge');
  return won;
}

// Wirkung im Spiel
export function weaponMods(id) {
  const m = { run: 2.0, jump: 5.6, reach: 0, atkLen: 11, dmgMul: 1, gemMul: 1, area: false, dirtMul: 1, stars: false, wave: false, soul: false, dash: false, fire: false, quake: false, seer: false,
    poison: false, push: false, luck: 0, dmgAdd: 0, boomerang: false, vamp: false, shards: false, chain: false, frost: false, thunder: false, echo: false, heavy: 0 };
  const cw = id && CW.find(w => w.id === id);
  if (cw) {
    const f = cw.fx;
    for (const k of ['poison', 'push', 'boomerang', 'vamp', 'shards', 'chain', 'frost', 'thunder', 'echo', 'fire', 'stars', 'area', 'wave', 'quake']) if (f[k]) m[k] = true;
    if (f.luck) m.luck = f.luck / 100;
    if (f.dmgAdd) m.dmgAdd = f.dmgAdd;
    if (f.reach) m.reach = f.reach;
    if (f.dmgMul) m.dmgMul = f.dmgMul;
    if (f.gems) m.gemMul = f.gems;
    if (f.run) m.run *= f.run;
    if (f.atkLen) m.heavy = f.atkLen;
    return m;
  }
  switch (id) {
    case 'federklinge': m.run = 2.35; m.jump = 6.05; m.reach = 4; break;
    case 'blitzspaten': m.run = 2.3; m.atkLen = 7; break;
    case 'erdfresser': m.area = true; m.dirtMul = 3; break;
    case 'goldschaufel': m.gemMul = 2; break;
    case 'geisterklinge': m.dash = true; break;
    case 'sternenspaten': m.stars = true; break;
    case 'maulwurfkralle': m.wave = true; break;
    case 'seelenschaufel': m.soul = true; break;
    case 'pendelhammer': m.quake = true; break;
    case 'spuerschaufel': m.seer = true; break;
    case 'urfunke': m.dmgMul = 2; m.fire = true; break;
  }
  return m;
}
