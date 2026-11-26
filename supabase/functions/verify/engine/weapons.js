// Legendäre und mythische Waffen. Sie ersetzen die Schaufel-Optik und legen einen Effekt
// auf die Werte der aktuellen Schaufel-Stufe (Schaden, Reichweite, Stein bleiben erhalten).
// Freigeschaltet werden sie nur über Bedingungen, nie über Edelsteine.

export const RARITY = {
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
  const m = { run: 2.0, jump: 5.6, reach: 0, atkLen: 11, dmgMul: 1, gemMul: 1, area: false, dirtMul: 1, stars: false, wave: false, soul: false, dash: false, fire: false, quake: false, seer: false };
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
