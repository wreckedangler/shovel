import { T, GRAV, MAXFALL, cx, fsin } from './core.js';
import { foeBase, hurtFoe, eproj } from './foes.js';
import { HUNTS } from './hunts.js';

// Alle Attacken haben eine sichtbare Ausholzeit. Ziel und Blickrichtung stehen
// ab Beginn der Warnung fest, sodass selbst die letzte Stufe ausweichbar ist.
function action(g, e) {
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
    case 'volley':
      for (const reach of [0.6, 1.4, 2.2]) shot(x, y, dir * speed * reach, -3.6, 'spore');
      break;
    case 'bolt': shot(e.targetX, T + 2, 0, 2.7, 'bolt'); break;
    case 'rain':
      for (const dx of [-32, 0, 32]) shot(e.targetX + dx, T + 2, 0, 2.7, 'bolt');
      break;
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
    const closing = near && Math.abs(dx) > 17 && e.design.move !== 'guard';
    e.vx = closing ? e.face * (0.34 + e.rank * 0.055) : 0;
    move(g, e, closing);
    if (near && --e.t <= 0 && !g.p.dead) {
      e.action = e.pattern[e.cyc++ % e.pattern.length];
      e.targetX = Math.round(cx(g.p));
      e.state = 'warn'; e.t = Math.max(17, 44 - e.rank * 2);
      e.vx = 0;
    }
    return;
  }
  if (e.state === 'warn') {
    move(g, e, false);
    if (--e.t <= 0) {
      action(g, e);
      e.state = 'strike'; e.t = e.action === 'dash' ? 24 : 15;
    }
    return;
  }
  move(g, e, false);
  if (--e.t <= 0) {
    e.state = 'stalk';
    const enraged = e.isChief && e.hp * 2 <= e.maxhp;
    e.t = (enraged ? 46 : 78) - (e.isChief ? 4 : 2) * e.rank + (e.action === 'rest' ? 25 : 0);
  }
}

function hunter(design, hunt, rank, slot, isChief) {
  const w = isChief ? 26 + 2 * Math.floor(rank / 2) : 14 + slot;
  const h = isChief ? 25 + rank : 13 + slot;
  const x = (isChief ? 50 : [10, 20, 24][slot]) * T;  // nicht direkt neben der Laterne (31)
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
  hunt.monsters.forEach((design, slot) => g.add(hunter(design, hunt, index, slot, false)));
  g.boss = g.add(hunter(hunt.boss, hunt, index, 0, true));
}
