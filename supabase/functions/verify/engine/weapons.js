// Legendäre und mythische Waffen. Sie ersetzen die Schaufel-Optik und legen einen Effekt
// auf die Werte der aktuellen Schaufel-Stufe (Schaden, Reichweite, Stein bleiben erhalten).
// Freigeschaltet werden sie nur über Bedingungen, nie über Edelsteine.

export const RARITY = {
  legendaer: { name: 'Legendär', col: '#ffd84a', glow: '#ffb020' },
  mythisch: { name: 'Mythisch', col: '#ff7ae0', glow: '#9a4cff' },
};

export const WEAPONS = [
  { id: 'federklinge', name: 'Federklinge', rar: 'legendaer', dark: '#3a8fd0', light: '#e8f8ff', handle: '#d8d8e8',
    perk: 'Schneller laufen, höher springen, längere Klinge.',
    hint: 'Wer im Moosweg keinem Wesen ein Leid tut, dem wächst eine Feder.',
    cond: '1-1 schaffen, ohne einen einzigen Gegner zu besiegen.' },
  { id: 'blitzspaten', name: 'Blitzspaten', rar: 'legendaer', dark: '#c09000', light: '#fff36a', handle: '#3a2a60',
    perk: 'Rasend schnelle Hiebe und schnellerer Lauf.',
    hint: 'Durchquere den Moosweg, bevor das Moos es merkt.',
    cond: '1-1 in unter 25 Sekunden schaffen.' },
  { id: 'erdfresser', name: 'Erdfresser', rar: 'legendaer', dark: '#6a3a1a', light: '#e0a050', handle: '#3a2010',
    perk: 'Gräbt Erde im Umkreis von 3×3, doppelte Beute aus Erde.',
    hint: 'Die Wurzelhöhlen wollen restlos umgegraben werden.',
    cond: 'In 1-2 jeden einzelnen Erdblock ausgraben und das Ziel erreichen.' },
  { id: 'goldschaufel', name: 'Goldschaufel des Königs', rar: 'legendaer', dark: '#b07a10', light: '#fff0a0', handle: '#7a1830',
    perk: 'Jeder Edelstein zählt doppelt.',
    hint: 'Drei Truhen schlafen hinter Stein. Weck sie alle.',
    cond: 'Die drei verborgenen Truhen in Welt 1 öffnen.' },
  { id: 'geisterklinge', name: 'Geisterklinge', rar: 'legendaer', dark: '#3a9ab0', light: '#c8ffff', handle: '#2a3a5a', ghost: true,
    perk: 'In der Luft nochmals A: Geister-Sprint, dabei unverwundbar.',
    hint: 'Schlage einen fremden Geist um mehr als zwei Atemzüge.',
    cond: 'Den Geist eines anderen Spielers um mindestens 2 Sekunden schlagen.' },
  { id: 'sternenspaten', name: 'Sternenspaten', rar: 'mythisch', dark: '#3a2a9a', light: '#d8c8ff', handle: '#1a1040',
    perk: 'Jeder Schaufel-Abpraller schleudert zwei Sterne.',
    hint: 'Zwölfmal vom Himmel fallen, ohne die Erde zu berühren.',
    cond: 'Eine Kette von 12 Schaufel-Abprallern ohne Bodenkontakt.' },
  { id: 'maulwurfkralle', name: 'Maulwurfkralle', rar: 'mythisch', dark: '#7a3010', light: '#ff9a50', handle: '#2a1408',
    perk: 'Hiebe am Boden senden eine Erdwelle.',
    hint: 'Der Rostmaulwurf fällt, ohne dich je berührt zu haben.',
    cond: 'Den Rostmaulwurf besiegen, ohne Schaden zu nehmen.' },
  { id: 'seelenschaufel', name: 'Seelenschaufel', rar: 'mythisch', dark: '#3a1060', light: '#b07aff', handle: '#120820',
    perk: 'Einmal pro Level: Auferstehen statt Sterben, ohne Verlust.',
    hint: 'Zwanzigmal gefallen. Die Seele merkt sich jeden Sturz.',
    cond: '20 Tode insgesamt.' },
  { id: 'pendelhammer', name: 'Pendelhammer', rar: 'mythisch', dark: '#6a4a10', light: '#ffe08a', handle: '#2a1e10',
    perk: 'Schaufel-Sprünge lösen eine Druckwelle aus, die alles daneben trifft.',
    hint: 'Das Pendelwerk fällt nur durch Sprünge. Keine Klinge, die es seitlich berührt.',
    cond: 'Das Pendelwerk ausschliesslich mit Schaufel-Sprüngen besiegen.' },
  { id: 'spuerschaufel', name: 'Spürschaufel', rar: 'legendaer', dark: '#2a6a5a', light: '#9affd8', handle: '#3a2a1a',
    perk: 'Zeigt falsche Wände und unsichtbare Blöcke. Schaufelmünzen pulsieren durch Wände.',
    hint: 'Ganz unten, wo die alten Schaufler ruhen, liegt ein Werkzeug, das Geheimnisse riecht.',
    cond: 'Das Ende der Schaufelgruft erreichen.', secret: true },
  { id: 'urfunke', name: 'Urfunke', rar: 'mythisch', dark: '#c02a00', light: '#ffe070', handle: '#400a00', secret: true,
    perk: 'Doppelter Schaden, jeder Hieb brennt.',
    hint: 'Über dem Dornenkamm, wo kein gewöhnlicher Sprung hinreicht, glimmt etwas.',
    cond: 'Den Altar hoch über dem Dornenkamm finden.' },
];

export const weaponById = id => WEAPONS.find(w => w.id === id) || null;

// Wirkung im Spiel
export function weaponMods(id) {
  const m = { run: 2.0, jump: 5.6, reach: 0, atkLen: 16, dmgMul: 1, gemMul: 1, area: false, dirtMul: 1, stars: false, wave: false, soul: false, dash: false, fire: false, quake: false, seer: false };
  switch (id) {
    case 'federklinge': m.run = 2.35; m.jump = 6.05; m.reach = 4; break;
    case 'blitzspaten': m.run = 2.3; m.atkLen = 9; break;
    case 'erdfresser': m.area = true; m.dirtMul = 2; break;
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
