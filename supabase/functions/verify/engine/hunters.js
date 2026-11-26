import { T, GRAV, MAXFALL, cx, fsin } from './core.js';
import { foeBase, hurtFoe, eproj } from './foes.js';
import { HUNTS } from './hunts.js';

// Alle Attacken haben eine sichtbare Ausholzeit. Ziel und Blickrichtung stehen
// ab Beginn der Warnung fest, sodass selbst die letzte Stufe ausweichbar ist.
const footprints = {
  acorn: [13, 16], drop: [12, 12], moth: [22, 11], stag: [37, 34],
  crab: [21, 11], reed: [12, 24], jelly: [17, 19], frog: [34, 24],
  louse: [16, 10], drill: [12, 17], wasp: [20, 10], furnace: [42, 26],
  shell: [19, 16], wing: [25, 12], geode: [17, 14], oracle: [27, 37],
  viper: [24, 10], newt: [18, 12], chimney: [14, 24], dragon: [42, 31],
  pendulum: [14, 21], fork: [12, 23], clock: [17, 18], bell: [32, 36],
  cap: [20, 16], root: [14, 22], ray: [26, 10], hydra: [44, 34],
  wolf: [23, 16], spider: [22, 12], crown: [18, 19], whale: [48, 27],
  crescent: [16, 22], urchin: [18, 16], mantis: [16, 24], cloak: [32, 40],
  voidmoth: [27, 14], claw: [18, 18], thorn: [13, 25], maw: [46, 39],
};
const windupBonus = { dash: 4, jump: 2, quake: 10, shock: 5, arrow: -5, rain: 8, rest: -6 };

function action(g, e, beat = 0) {
  const dir = e.face, speed = 1.3 + e.rank * 0.09;
  const x = cx(e), y = e.y + e.h / 2;
  const shot = (x, y, vx, vy, kind) => g.add(eproj(x, y, vx, vy, kind));
  switch (e.action) {
    case 'dash': e.vx = dir * (2.2 + 0.13 * e.rank); break;
    case 'jump': e.vy = -5.2; e.vx = dir * 1.7; break;
    case 'arrow': shot(x, y, dir * 2.8, 0, 'arrow'); break;
    case 'gear': shot(x, y, dir * speed, -3.6, 'gear'); break;
    case 'spore': shot(x, y, dir * speed, -2.8, 'spore'); break;
    case 'fan':
      for (const lift of [-4.2, -2.2, -0.6]) shot(x, y, dir * speed, lift, 'spore');
      break;
    case 'volley': {
      const reaches = [0.6, 1.4, 2.2];
      for (const reach of (g.enemyRevision ? reaches.slice(beat, beat + 1) : reaches)) shot(x, y, dir * speed * reach, -3.6, 'spore');
      break;
    }
    case 'bolt': shot(e.targetX, T + 2, 0, 2.7, 'bolt'); break;
    case 'rain': {
      const lanes = [-32, 0, 32];
      for (const dx of (g.enemyRevision ? lanes.slice(beat, beat + 1) : lanes)) shot(e.targetX + dx, T + 2, 0, 2.7, 'bolt');
      break;
    }
    case 'shock': shot(x, 11 * T - 10, dir * 2.0, 0, 'shock'); break;
    case 'quake':
      for (const d of [-1, 1]) shot(x, 11 * T - 10, d * 2.3, 0, 'shock');
      break;
  }
}

function move(g, e, stride) {
  if (e.design.move === 'fly') {
    e.x += e.vx;
    e.y = e.home.y + fsin((g.frame + e.home.x) / 21) * 9;
  } else {
    e.vy = Math.min(MAXFALL, e.vy + GRAV);
    g.moveX(e); g.moveY(e);
    if (e.design.move === 'hop' && stride && e.onGround && e.t % 35 === 0) e.vy = -3.3;
  }
  // Weder die Vorhut noch der Boss können über die Arenagrenze springen.
  const limit = Math.min(e.right, Math.max(e.left, e.x));
  if (e.x !== limit) { e.x = limit; e.vx = 0; }
}

function updateHunter(g, e) {
  if (e.iframe) e.iframe--;
  if (e.flash) e.flash--;
  if (e.state === 'idle') return;
  if (e.state === 'dying') {
    if (--e.t === 0) {
      e.dead = true;
      g.setGate('.');
      g.dropGems(cx(e), e.y, 130 + e.rank * 15);
      g.add({ type: 'goal', x: 60 * T, y: 11 * T - 48, w: 12, h: 48 });
      g.ev('win2');
    }
    return;
  }
  if (e.state === 'roar') {
    if (--e.t <= 0) { e.state = 'stalk'; e.t = e.rank >= 6 ? 1 : 35; }
    return;
  }
  if (e.state === 'stalk') {
    const dx = cx(g.p) - cx(e);
    const near = Math.abs(dx) < (e.isChief ? 340 : 145);
    e.face = dx < 0 ? -1 : 1;
    const ranged = g.enemyRevision && !e.isChief && !['jump', 'dash', 'shock', 'quake'].includes(e.design.attack);
    const closing = near && Math.abs(dx) > (ranged ? 76 : 17) && e.design.move !== 'guard';
    e.vx = closing ? e.face * (0.34 + e.rank * 0.055) : 0;
    if (near && ranged && Math.abs(dx) < 44 && e.design.move !== 'guard') e.vx = -e.face * 0.48;
    move(g, e, closing);
    if (near && --e.t <= 0 && !g.p.dead) {
      e.action = e.pattern[e.cyc++ % e.pattern.length];
      e.targetX = Math.round(cx(g.p));
      e.state = 'warn'; e.t = Math.max(17, 44 - e.rank * 2);
      if (g.enemyRevision) e.t += windupBonus[e.action] || 0;
      e.windup = e.t;
      e.vx = 0;
    }
    return;
  }
  if (e.state === 'warn') {
    move(g, e, false);
    if (--e.t <= 0) {
      action(g, e);
      e.state = 'strike'; e.t = e.action === 'dash' ? 24 : g.enemyRevision && ['volley', 'rain'].includes(e.action) ? 22 : 15;
    }
    return;
  }
  if (g.enemyRevision) {
    if (['volley', 'rain'].includes(e.action) && (e.t === 15 || e.t === 8)) action(g, e, e.t === 15 ? 1 : 2);
    if (e.action === 'dash' && e.t <= 7) e.vx *= 0.82;
  }
  move(g, e, false);
  if (--e.t <= 0) {
    e.state = 'stalk';
    const enraged = e.isChief && e.hp * 2 <= e.maxhp;
    e.t = (enraged ? 46 : 78) - (e.isChief ? 4 : 2) * e.rank + (e.action === 'rest' ? 25 : 0);
    if (g.enemyRevision && e.isChief && e.rank >= 8) e.t = Math.max(enraged ? 32 : 55, e.t);
  }
}

function hunter(design, hunt, rank, slot, isChief, revision) {
  const w = revision ? footprints[design.shape][0] : isChief ? 26 + 2 * Math.floor(rank / 2) : 14 + slot;
  const h = revision ? footprints[design.shape][1] : isChief ? 25 + rank : 13 + slot;
  const x = (isChief ? 50 : [10, 20, 28][slot]) * T;
  const y = (design.move === 'fly' ? 9.5 : 11) * T - h;
  const hp = isChief ? 14 + rank * 7 : 1 + Math.floor((rank + slot) / 2);
  return foeBase({ type: 'hunter', design, rank, colors: hunt.colors, x, y, w, h, home: { x, y },
    title: design.name.toUpperCase(), isChief, hp, maxhp: hp,
    dmg: isChief ? 1 + Math.floor(rank / 3) : 1 + Math.floor(rank / 5),
    loot: 9 + rank * 3, face: -1, cyc: 0, state: isChief ? 'idle' : 'stalk', t: 44 + slot * 7,
    pattern: isChief ? hunt.pattern : [design.attack],
    left: (isChief ? 36 : 1) * T, right: (isChief ? 63 : 35) * T - w,
    update: updateHunter,
    hurtBy(g, e, damage, dir, source) {
      if (e.state === 'idle' || e.state === 'roar' || e.state === 'dying') return;
      // Die letzten Wächter öffnen ihre Panzerung erst nach einer Attacke.
      const guarded = e.isChief && e.rank >= 6 && e.state !== 'stalk';
      if (guarded) {
        g.ev('clink'); e.flash = 3; e.iframe = 7; return;
      }
      const braced = e.isChief && e.rank >= 4 && e.state === 'warn';
      hurtFoe(g, e, braced ? Math.ceil(damage / 3) : damage, dir, source);
    },
  });
}

export function populateHunt(g, index) {
  const hunt = HUNTS[index];
  hunt.monsters.forEach((design, slot) => g.add(hunter(design, hunt, index, slot, false, g.enemyRevision)));
  g.boss = g.add(hunter(hunt.boss, hunt, index, 0, true, g.enemyRevision));
}
