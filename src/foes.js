// Gegner, Bosse, Fallen-Objekte und Projektile. Jeder Eintrag ist eine Fabrik: (x, y) → Objekt mit update(g, e).
import { T, GRAV, MAXFALL, BOUNCE, overlap, cx, sign, fsin, fcos, fdist } from './core.js';

/* ---------- Objekte & Gegner ---------- */
function gem(x, y, val, fixed) {
  return { type: 'gem', x, y, w: 7, h: 7, val, vx: 0, vy: 0, fixed, age: fixed ? 99 : 0,
    update(g, e) {
      e.age++;
      const p = g.p;
      const R = Math.max(g.magnet || 22, g.gemPull || 0);
      if (e.age > 12 && !p.dead && Math.abs(cx(p) - e.x) < R && Math.abs(p.y + 7 - e.y) < R) {
        e.fixed = false; e.x += (cx(p) - 3 - e.x) * 0.25; e.y += (p.y + 4 - e.y) * 0.25; return;
      }
      if (e.fixed) return;
      e.vy = Math.min(5, e.vy + GRAV * 0.8);
      g.moveX(e); if (e.hitWall) e.vx = 0;
      const vy = e.vy; g.moveY(e);
      if (e.onGround) { e.vy = vy > 1 ? -vy * 0.45 : 0; e.vx *= 0.85; }
      if (e.age > 900) e.dead = true;
    } };
}

function hurtFoe(g, e, dmg, dir, src) {
  if (e.iframe > 0) return;
  if (src !== 'pogo') e.nonPogo = true;
  e.hp -= dmg; e.iframe = 10; e.flash = 8;
  g.ev('hit', e.x, e.y); g.shake = Math.max(g.shake, 2); g.freeze = Math.max(g.freeze, 3);
  if (g.cheat.konfetti) g.burst(e.x + e.w / 2, e.y, 24, 'confetti', 3, 0.08, 50);
  g.num(e.x + e.w / 2, e.y - 2, dmg, dmg >= 4 ? '#ff9a50' : '#ffffff');
  if (dir && e !== g.boss) e.vx = dir * 2.4;
  if (e.hp <= 0) {
    if (e === g.boss) return g.bossDefeated(e);
    if (e.elite === 'teilt' && !e.mini && MAKERS[e.type]) for (const d of [-1, 1]) { const m = MAKERS[e.type](e.x + d * 6, e.y - 4); m.mini = true; m.hp = 1; m.vx = d * 1.5; m.vy = -2; m.loot = 4; g.add(m); }
    e.dead = true; g.kills++; g.freeze = Math.max(g.freeze, 5); g.ev(e.golden ? 'golden' : 'poof', e.x, e.y); g.addRush(e.golden ? 40 : 12);
    if (e.golden) { g.banner = { text: 'GOLDENER GEGNER!', col: '#ffd84a', t: 60 }; g.burst(e.x + e.w / 2, e.y, 30, 'gold', 3, 0.05, 40); }
    g.burst(e.x + e.w / 2, e.y + e.h / 2, 14, 'poof', 2, 0.02, 24);
    g.dropGems(e.x + e.w / 2, e.y, e.loot || 8);
  }
}
const foeBase = (o) => ({ foe: true, iframe: 0, flash: 0, vx: 0, vy: 0, hurtBy: hurtFoe, ...o });

function beetle(x, y) {
  return foeBase({ type: 'beetle', x, y, w: 14, h: 9, hp: 1, dmg: 1, dir: -1, loot: 8,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      if (Math.abs(e.vx) > 0.6) e.vx *= 0.85; else e.vx = 0.45 * e.dir;
      e.vy = Math.min(MAXFALL, e.vy + GRAV);
      g.moveX(e);
      if (e.hitWall) e.dir *= -1;
      g.moveY(e);
      if (e.onGround) {
        const ahead = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T);
        if (!g.solid(ahead, Math.floor((e.y + e.h + 2) / T))) e.dir *= -1;
      }
      if (e.y > g.h * T + 20) e.dead = true;
    } });
}
// Getragene Seelen schweben dem Helden nach (Update in stepTraps)
// Fallstachel: hängt an der Decke, zittert, wenn du darunter bist, und stürzt herab
function icicle(x, y) {
  return { type: 'icicle', x, y, w: 10, h: 14, ox: x, oy: y, vy: 0, state: 'hang', t: 0,
    update(g, e) {
      const p = g.p;
      if (e.state === 'hang' && Math.abs(cx(p) - (e.x + 5)) < 20 && p.y > e.y && p.y - e.y < 170) { e.state = 'shake'; e.t = 24; g.ev('crack', e.x, e.y); }
      else if (e.state === 'shake' && --e.t <= 0) { e.state = 'fall'; e.vy = 0; }
      else if (e.state === 'fall') {
        e.vy = Math.min(7, e.vy + GRAV); e.y += e.vy;
        if (g.solid(Math.floor((e.x + 5) / T), Math.floor((e.y + e.h) / T)) || e.y > g.h * T) { e.state = 'gone'; e.t = 240; g.burst(e.x + 5, e.y + 12, 10, 'stone', 2); g.ev('crack', e.x, e.y); }
      } else if (e.state === 'gone' && --e.t <= 0) { e.state = 'hang'; e.x = e.ox; e.y = e.oy; }
    } };
}
// Kreissäge auf Schiene: fährt 3 Kacheln hin und her
function saw(x, y, axis) {
  const ph = (x / T) * 0.7 + (y / T) * 0.3;
  return { type: 'saw', axis, ox: x, oy: y, x, y, w: 14, h: 14, rot: 0,
    update(g, e) { const t = g.frame * 0.03 + ph; if (axis === 'x') e.x = e.ox + fsin(t) * 48; else e.y = e.oy + fsin(t) * 48; e.rot += 0.3; if (g.frame % 4 === 0) g.parts.push({ x: e.x + 7, y: e.y + 13, vx: (Math.random() - 0.5) * 2, vy: -1, life: 10, col: 'spark', grav: 0.15 }); } };
}
// Springkröte: lauert und springt dem Helden entgegen
function toad(x, y) {
  return foeBase({ type: 'toad', x, y, w: 12, h: 10, hp: 2, dmg: 1, t: 60, face: -1, loot: 10,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); if (e.hitWall) e.vx = -e.vx * 0.5; g.moveY(e);
      const p = g.p, dx = cx(p) - cx(e);
      if (e.onGround) {
        e.vx *= 0.7; e.face = dx < 0 ? -1 : 1;
        if (--e.t <= 0 && Math.abs(dx) < 120 * (g.stealth || 1)) {
          // nicht in Abgründe springen
          const longHop = g.enemyRevision && Math.abs(dx) > 62;
          const speed = longHop ? 2.05 : 1.6, lift = longHop ? 5.1 : 4.6;
          const reach = g.enemyRevision ? speed * (2 * lift / GRAV - 1) : 34;
          const land = Math.floor((cx(e) + e.face * reach) / T);
          let safe = false; for (let k = 0; k < 4; k++) if (g.solid(land, Math.floor((e.y + e.h) / T) + k)) safe = true;
          if (safe) { e.vx = e.face * speed; e.vy = -lift; g.ev('boing', e.x, e.y); }
          e.t = 70 + Math.floor(g.rand() * 40);
        }
      }
      if (e.y > g.h * T + 20) e.dead = true;
    } });
}
// Irrlicht: schwebt durch Wände, kreist um seinen Ort und zieht langsam zum Helden. Ideal für Pogo-Ketten.
function wisp(x, y) {
  return foeBase({ type: 'wisp', x, y, w: 9, h: 9, hp: 1, dmg: 1, ax: x, ay: y, ph: x * 0.07, loot: 6, float: true,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const p = g.p, d = fdist(cx(p) - e.ax, p.y - e.ay);
      if (d < 90 && !p.dead) { e.ax += Math.sign(cx(p) - e.ax) * 0.18; e.ay += Math.sign(p.y - 4 - e.ay) * 0.12; }
      e.ph += 0.045;
      e.x = e.ax + fcos(e.ph) * 14 + e.vx * 4; e.y = e.ay + fsin(e.ph * 2) * 6; e.vx *= 0.9;
      if ((g.frame + Math.floor(e.ax)) % 5 === 0) g.parts.push({ x: e.x + 4, y: e.y + 6, vx: 0, vy: 0.2, life: 18, col: 'ice', grav: 0 });
    } });
}
// Stachelschnecke: Pogo auf den Panzer tut weh. Von der Seite treffen!
function snail(x, y) {
  return foeBase({ type: 'snail', x, y, w: 14, h: 10, hp: 3, dmg: 1, dir: -1, loot: 14, spiky: true,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      if (Math.abs(e.vx) > 0.4) e.vx *= 0.85; else e.vx = 0.22 * e.dir;
      e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); if (e.hitWall) e.dir *= -1; g.moveY(e);
      if (e.onGround) { const ahead = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T); if (!g.solid(ahead, Math.floor((e.y + e.h + 2) / T))) e.dir *= -1; }
      if (e.y > g.h * T + 20) e.dead = true;
    } });
}
function blorb(x, y) {
  return foeBase({ type: 'blorb', x, y, w: 12, h: 10, hp: 2, dmg: 1, t: 40, loot: 10,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      e.vy = Math.min(MAXFALL, e.vy + GRAV);
      if (e.onGround) {
        e.vx *= 0.75;
        const dx = cx(g.p) - cx(e);
        if (--e.t <= 0 && Math.abs(dx) < 150 * (g.stealth || 1)) { e.vy = -4.2; e.vx = sign(dx) * 1.3; e.t = 70; g.ev('blob', e.x, e.y); }
      }
      g.moveX(e); g.moveY(e);
      if (e.y > g.h * T + 20) e.dead = true;
    } });
}
function bat(x, y) {
  return foeBase({ type: 'bat', x, y, w: 12, h: 8, hp: 1, dmg: 1, state: 'hang', t: 0, loot: 6,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const dx = cx(g.p) - cx(e), dy = g.p.y - e.y;
      if (e.state === 'hang') { const st = g.stealth || 1; if (Math.abs(dx) < 96 * st && Math.abs(dy) < 110 * st) { e.state = 'fly'; g.ev('screech', e.x, e.y); } return; }
      e.t++;
      e.vx = Math.max(-1.25, Math.min(1.25, e.vx + sign(dx) * 0.05));
      e.vy = Math.max(-0.9, Math.min(0.9, dy * 0.02)) + fsin(e.t / 9) * 0.9;
      e.x += e.vx; e.y += e.vy;
    } });
}

function mole(x, y) {
  const m = foeBase({ type: 'mole', x, y, w: 30, h: 26, hp: 24, maxhp: 24, dmg: 2, state: 'idle', t: 0, face: -1, next: 'charge',
    home: { x, y },
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const p = g.p, dx = cx(p) - cx(e), fast = e.hp <= e.maxhp / 2 ? 1.35 : 1;
      const grav = () => { e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); g.moveY(e); };
      switch (e.state) {
        case 'idle': grav(); return;
        case 'roar': e.vx = 0; grav(); if (--e.t <= 0) { e.state = 'walk'; e.t = 80; } if (e.t % 10 === 0) g.shake = 3; return;
        case 'walk':
          e.face = sign(dx); e.vx = e.face * 0.7 * fast; grav();
          if (--e.t <= 0) { e.state = e.next === 'charge' ? 'wind' : 'sink'; e.next = e.next === 'charge' ? 'dig' : 'charge'; e.t = 34; }
          return;
        case 'wind': e.vx = 0; e.face = sign(dx); grav(); if (--e.t <= 0) { e.state = 'charge'; g.ev('charge'); } return;
        case 'charge':
          e.vx = e.face * 3.3 * fast; grav();
          if (e.hitWall) {
            e.state = 'stun'; e.t = 70; g.shake = 9; g.ev('thud');
            for (let k = 0; k < (fast > 1 ? 5 : 3); k++) {
              const rx = (g.level.gate + 2 + Math.floor(g.rand() * 22)) * T;
              g.add(rock(rx, 2 * T + 2, 16 + k * 14));
            }
          }
          return;
        case 'stun': e.vx = 0; grav(); if (--e.t <= 0) { e.state = 'walk'; e.t = 60; } return;
        case 'sink':
          e.vx = 0; if (e.t % 4 === 0) g.burst(cx(e), e.y + e.h, 3, 'dirt', 1.5);
          if (--e.t <= 0) { e.state = 'under'; e.hidden = true; e.t = 70; }
          return;
        case 'under':
          e.tx = cx(p);
          if (e.t < 36 && e.t % 3 === 0) g.burst(e.tx, 11 * T, 2, 'dirt', 1.4);
          if (e.t === 36) g.ev('rumble');
          if (--e.t <= 0) {
            e.hidden = false; e.x = Math.max((g.level.gate + 1) * T, Math.min((g.w - 1) * T - e.w, e.tx - e.w / 2));
            e.y = 11 * T - e.h; e.vy = -6.5; e.state = 'pop'; g.shake = 7; g.ev('pop');
            g.burst(cx(e), 11 * T, 20, 'dirt', 3);
          }
          return;
        case 'pop': grav(); if (e.onGround) { e.state = 'walk'; e.t = 70; } return;
        case 'dying':
          e.vx = 0; grav();
          if (e.t % 8 === 0) { g.burst(e.x + g.rand() * e.w, e.y + g.rand() * e.h, 10, 'poof', 2.5, 0, 24); g.ev('boom'); g.shake = 6; }
          if (--e.t <= 0) {
            e.dead = true; g.dropGems(cx(e), e.y, 300);
            g.add({ type: 'goal', x: Math.round(cx(e) / T) * T + 2, y: 11 * T - 48, w: 12, h: 48 });
            g.setGate('.'); g.ev('win2');
          }
          return;
      }
    } });
  return m;
}
function rock(x, y, delay) {
  return { type: 'rock', x, y, w: 10, h: 10, vy: 0, vx: 0, delay,
    update(g, e) {
      if (e.delay > 0) { e.delay--; return; }
      e.vy = Math.min(7, e.vy + 0.25); e.y += e.vy;
      if (g.solid(Math.floor((e.x + 5) / T), Math.floor((e.y + e.h) / T))) {
        e.dead = true; g.burst(e.x + 5, e.y + 8, 10, 'stone', 2); g.ev('crack');
      }
    } };
}

// Projektile der Waffen (Sterne, Erdwelle) und der Ausrüstung (Bumerang, Splitter, Spiegel, Donner, Funken)
const PSIZE = { wave: 10, thunder: 10, boomerang: 8, spark: 4, shard: 4, mirror: 6, star: 6 };
const PLIFE = { wave: 40, thunder: 30, boomerang: 80, spark: 50, shard: 40, mirror: 90, star: 50 };
function projHits(g, e, once) {
  for (const f of g.ents) if (f.foe && !f.hidden && !f.dead && !e.hit.has(f) && overlap(e, f)) { e.hit.add(f); f.hurtBy(g, f, e.dmg, sign(e.vx) || 0); if (once) { e.dead = true; return; } }
  for (const f of g.ents) if (f.type === 'chest' && !f.open && overlap(e, f)) g.openChest(f);
}
function proj(x, y, vx, vy, dmg, kind) {
  const sz = PSIZE[kind] || 6;
  return { type: 'proj', kind, x, y, w: sz, h: kind === 'thunder' ? 8 : sz, vx, vy, dmg, life: PLIFE[kind] || 50, hit: new Set(), t: 0,
    update(g, e) {
      if (kind === 'boomerang') {
        // fliegt hinaus, bremst ab und kehrt zum Helden zurück (durch Wände hindurch)
        e.t++;
        if (e.t < 20) { e.x += e.vx; e.vx *= 0.93; }
        else { if (e.t === 20) e.hit.clear(); const p = g.p, dx = cx(p) - 4 - e.x, dy = p.y + 3 - e.y, d = Math.max(1, fdist(dx, dy)); e.x += dx / d * 4.2; e.y += dy / d * 4.2; if (d < 8 || p.dead) { e.dead = true; return; } }
        if (--e.life <= 0) { e.dead = true; return; }
        if (g.frame % 3 === 0) g.parts.push({ x: e.x + 4, y: e.y + 4, vx: 0, vy: 0, life: 10, col: 'spark', grav: 0 });
        return projHits(g, e, false);
      }
      if (kind === 'spark') { if (--e.life <= 0) { e.dead = true; return; } if (g.frame % 6 === 0) g.parts.push({ x: e.x + 2, y: e.y, vx: 0, vy: -0.5, life: 12, col: 'fire', grav: 0 }); return projHits(g, e, false); }
      if (kind === 'shard' || kind === 'mirror' || kind === 'thunder') {
        e.x += e.vx; e.y += e.vy; if (kind === 'shard') e.vy += 0.15;
        if (--e.life <= 0 || g.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h / 2) / T))) { e.dead = true; g.burst(e.x + 3, e.y + 3, 5, kind === 'thunder' ? 'gold' : 'ice', 1.3); return; }
        if (g.frame % 3 === 0) g.parts.push({ x: e.x + 3, y: e.y + 3, vx: 0, vy: 0, life: 10, col: kind === 'thunder' ? 'gold' : 'ice', grav: 0 });
        return projHits(g, e, kind !== 'thunder');
      }
      e.x += e.vx; e.y += e.vy; e.vy += kind === 'star' ? 0.08 : 0;
      if (--e.life <= 0 || g.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h / 2) / T))) {
        e.dead = true; g.burst(e.x + 3, e.y + 3, 6, kind === 'wave' ? 'dirt' : 'spark', 1.5); return;
      }
      if (kind === 'wave' && !g.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h + 2) / T))) { e.dead = true; return; }
      if (g.frame % 3 === 0) g.parts.push({ x: e.x + 3, y: e.y + 3, vx: 0, vy: kind === 'wave' ? -1 : 0, life: 12, col: kind === 'wave' ? 'dirt' : kind === 'ember' ? 'fire' : 'star', grav: 0.05 });
      for (const f of g.ents) if (f.foe && !f.hidden && !f.dead && !e.hit.has(f) && overlap(e, f)) { e.hit.add(f); f.hurtBy(g, f, e.dmg, sign(e.vx)); if (kind === 'star') e.dead = true; }
      for (const f of g.ents) if (f.type === 'chest' && !f.open && overlap(e, f)) g.openChest(f);
    } };
}

/* ---------- Welt 2: Uhrturm ---------- */
function plat(x, y, axis) {
  // 3 Kacheln breit, schwingt 3 Kacheln (waagrecht) bzw. 3 Kacheln (senkrecht) um den Ursprung
  const ph = (x / T) * 0.45 + (y / T) * 0.4; // benachbarte Plattformen schwingen gegenläufig
  return { type: 'plat', axis, ox: x, oy: y, x, y, w: 48, h: 8, dx: 0, dy: 0,
    update(g, e) {
      const t = g.frame * 0.022 + ph, nx = axis === 'x' ? e.ox + fsin(t) * 48 : e.ox, ny = axis === 'y' ? e.oy + fsin(t) * 48 : e.oy;
      e.dx = nx - e.x; e.dy = ny - e.y; e.x = nx; e.y = ny;
    } };
}
function knight(x, y) {
  return foeBase({ type: 'knight', x, y, w: 12, h: 14, hp: 3, dmg: 1, dir: -1, t: 0, loot: 14,
    hurtBy(g, e, dmg, dir, src) {
      const front = sign(cx(g.p) - cx(e)) === e.dir;
      if (src !== 'pogo' && dir && front) {
        g.ev('clink'); g.burst(e.dir > 0 ? e.x + e.w : e.x, e.y + 7, 8, 'spark', 2, 0.05, 12);
        if (!g.p.dead) { g.p.vx = e.dir * 2.4; g.p.hurt = Math.max(g.p.hurt, 6); }
        g.num(cx(e), e.y - 4, 'BLOCK', '#a9b5c2'); e.vx = -e.dir * 0.8;
        return;
      }
      hurtFoe(g, e, dmg, dir, src);
    },
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const dx = cx(g.p) - cx(e);
      if (++e.t % 80 === 0 && Math.abs(dx) < 130 * (g.stealth || 1)) e.dir = sign(dx);
      if (Math.abs(e.vx) > 0.5) e.vx *= 0.85; else e.vx = 0.35 * e.dir;
      e.vy = Math.min(MAXFALL, e.vy + GRAV);
      g.moveX(e); if (e.hitWall) e.dir *= -1;
      g.moveY(e);
      if (e.onGround) { const ahead = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T); if (!g.solid(ahead, Math.floor((e.y + e.h + 2) / T))) e.dir *= -1; }
      if (e.y > g.h * T + 20) e.dead = true;
    } });
}
function kuckuck(x, y) {
  return foeBase({ type: 'kuckuck', x, y, w: 14, h: 10, hp: 1, dmg: 1, ox: x, oy: y, dir: 1, t: 0, loot: 10,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      e.t++; e.x += e.dir * 0.8;
      if (e.x > e.ox + 56) e.dir = -1; if (e.x < e.ox - 56) e.dir = 1;
      e.y = e.oy + fsin(e.t / 20) * 3;
      if (e.t % 110 === 0 && Math.abs(cx(g.p) - cx(e)) < 120 * (g.stealth || 1) && g.p.y > e.y) { g.add(eproj(cx(e) - 2, e.y + e.h, 0, 2.4, 'bolt')); g.ev('screech'); }
    } });
}
function eproj(x, y, vx, vy, kind) {
  const sz = { shock: [12, 10], gear: [12, 12], bolt: [4, 8], spore: [7, 7], arrow: [10, 3] }[kind];
  return { type: 'eproj', kind, x, y, w: sz[0], h: sz[1], vx, vy, dmg: 1, life: kind === 'gear' ? 300 : 160, bounces: 0,
    update(g, e) {
      if (--e.life <= 0) { e.dead = true; return; }
      if (kind === 'spore') {
        e.vy = Math.min(5, e.vy + 0.18); e.x += e.vx; e.y += e.vy;
        if (g.solid(Math.floor((e.x + 3) / T), Math.floor((e.y + 6) / T))) { e.dead = true; g.burst(e.x + 3, e.y + 4, 8, 'spore', 1.4); }
        return;
      }
      if (kind === 'arrow') { e.x += e.vx; if (g.solid(Math.floor((e.vx > 0 ? e.x + e.w : e.x) / T), Math.floor((e.y + 1) / T))) { e.dead = true; g.burst(e.x + 5, e.y + 1, 5, 'spark', 1.2); g.ev('clink'); } return; }
      if (kind === 'bolt') { e.y += e.vy; if (g.solid(Math.floor((e.x + 2) / T), Math.floor((e.y + e.h) / T))) { e.dead = true; g.burst(e.x + 2, e.y + 6, 5, 'spark', 1.2); } return; }
      if (kind === 'shock') { g.moveX(e); if (e.hitWall) { e.dead = true; g.burst(e.x + 6, e.y + 6, 8, 'dust', 1.5); } if (g.frame % 2) g.parts.push({ x: e.x + 2 + g.rand() * 8, y: e.y + 8, vx: 0, vy: -1.2, life: 12, col: 'spark', grav: 0.05 }); return; }
      e.vy = Math.min(MAXFALL, e.vy + GRAV * 0.8); const vy = e.vy;
      g.moveX(e); if (e.hitWall) { e.dead = true; g.burst(e.x + 6, e.y + 6, 8, 'spark', 1.5); return; }
      g.moveY(e); if (e.onGround && vy > 1 && e.bounces < 2) { e.vy = -vy * 0.55; e.bounces++; }
    } };
}
function golem(x, y) {
  return foeBase({ type: 'golem', title: 'PENDELWERK', x, y, w: 28, h: 30, hp: 32, maxhp: 32, dmg: 2, state: 'idle', t: 0, face: -1, cyc: 0, home: { x, y },
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const p = g.p, dx = cx(p) - cx(e), fast = e.hp <= e.maxhp / 2 ? 1.3 : 1;
      const grav = () => { e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); g.moveY(e); };
      switch (e.state) {
        case 'idle': grav(); return;
        case 'roar': e.vx = 0; grav(); if (e.t % 10 === 0) g.shake = 3; if (--e.t <= 0) { e.state = 'walk'; e.t = 70; } return;
        case 'walk':
          e.face = sign(dx); e.vx = e.face * 0.6 * fast; grav();
          if (--e.t <= 0) { e.state = e.cyc++ % 2 ? 'throw' : 'crouch'; e.t = e.state === 'crouch' ? 26 : 36; }
          return;
        case 'crouch': e.vx = 0; grav(); if (--e.t <= 0) { e.state = 'leap'; e.vy = -7.2; e.vx = Math.max(-2.4, Math.min(2.4, dx / 36)); g.ev('charge'); } return;
        case 'leap':
          grav(); if (e.hitWall) e.vx = 0;
          if (e.onGround) {
            e.state = 'tired'; e.t = 80; g.shake = 9; g.ev('thud'); g.freeze = Math.max(g.freeze, 4);
            for (const d of [-1, 1]) g.add(eproj(cx(e) - 6 + d * 12, e.y + e.h - 10, d * 3 * fast, 0, 'shock'));
          }
          return;
        case 'throw':
          e.vx = 0; e.face = sign(dx); grav();
          if (e.t % 10 === 0 && e.t > 0 && (e.t <= 30 || fast > 1)) { g.add(eproj(cx(e) - 6, e.y + 2, e.face * (1.2 + g.rand() * 1.3) * fast, -3.8, 'gear')); g.ev('swing'); }
          if (--e.t <= 0) { e.state = 'walk'; e.t = 80; }
          return;
        case 'tired': e.vx = 0; grav(); if (--e.t <= 0) { e.state = 'walk'; e.t = 50; } return;
        case 'dying':
          e.vx = 0; grav();
          if (e.t % 8 === 0) { g.burst(e.x + g.rand() * e.w, e.y + g.rand() * e.h, 10, 'spark', 2.5, 0, 24); g.ev('boom'); g.shake = 6; }
          if (--e.t <= 0) {
            e.dead = true; g.dropGems(cx(e), e.y, 400);
            g.add({ type: 'goal', x: Math.round(cx(e) / T) * T + 2, y: e.y + e.h - 48, w: 12, h: 48 });
            g.setGate('.'); g.ev('win2');
          }
          return;
      }
    } });
}

/* ---------- Welt 3: Pilzwald ---------- */
function spitter(x, y) {
  return foeBase({ type: 'spitter', x, y, w: 14, h: 12, hp: 2, dmg: 1, t: 30, face: -1, loot: 12,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const dx = cx(g.p) - cx(e);
      if (g.enemyRevision) {
        if (e.windup) {
          if (--e.windup === 0) {
            g.add(eproj(cx(e) - 3, e.y - 2, e.aim, -3.6, 'spore'));
            g.ev('blob', e.x, e.y);
          }
        } else {
          e.face = sign(dx);
          if (++e.t % 96 === 0 && Math.abs(dx) < 150 * (g.stealth || 1)) {
            e.windup = 15;
            e.aim = Math.max(-2.4, Math.min(2.4, dx / 45));
          }
        }
        return;
      }
      e.face = sign(dx);
      if (++e.t % 110 === 0 && Math.abs(dx) < 150 * (g.stealth || 1)) {
        const v = Math.max(-2.4, Math.min(2.4, dx / 45));
        g.add(eproj(cx(e) - 3, e.y - 2, v, -3.6, 'spore')); g.ev('blob', e.x, e.y); e.puff = 10;
      }
      if (e.puff) e.puff--;
    } });
}
function morchel(x, y) {
  return foeBase({ type: 'morchel', title: 'MORCHELMUTTER', x, y, w: 30, h: 30, hp: 38, maxhp: 38, dmg: 2, state: 'idle', t: 0, face: -1, cyc: 0, home: { x, y },
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      const p = g.p, dx = cx(p) - cx(e), fast = e.hp <= e.maxhp / 2 ? 1.3 : 1;
      const grav = () => { e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); g.moveY(e); };
      switch (e.state) {
        case 'idle': grav(); return;
        case 'roar': e.vx = 0; grav(); if (e.t % 10 === 0) g.shake = 3; if (--e.t <= 0) { e.state = 'walk'; e.t = 60; } return;
        case 'walk': e.face = sign(dx); e.vx = e.face * 0.5 * fast; grav(); if (--e.t <= 0) { e.state = ['hop', 'volley', 'hop', 'summon'][e.cyc++ % 4]; e.t = 30; e.hops = 3; } return;
        case 'hop':
          grav();
          if (e.onGround) {
            e.vx = 0;
            if (e.landed) { e.landed = false; g.shake = 6; g.ev('thud'); for (const d of [-1, 1]) g.add(eproj(cx(e) - 6 + d * 12, e.y + e.h - 10, d * 2.6 * fast, 0, 'shock')); if (--e.hops <= 0) { e.state = 'tired'; e.t = 70; return; } }
            if (--e.t <= 0) { e.vy = -6.4; e.vx = Math.max(-2.6, Math.min(2.6, dx / 40)); e.landed = true; e.t = 14; g.ev('boing'); }
          }
          return;
        case 'volley':
          e.vx = 0; grav();
          if (e.t % 6 === 0 && e.t > 0) { const k = (30 - e.t) / 6; g.add(eproj(cx(e) - 3, e.y, (k - 2) * 0.9 * fast + sign(dx) * 0.6, -4.4, 'spore')); g.ev('blob'); }
          if (--e.t <= 0) { e.state = 'walk'; e.t = 70; }
          return;
        case 'summon':
          e.vx = 0; grav();
          if (e.t === 15 && g.ents.filter(o => o.type === 'blorb' && !o.dead).length < 3) for (const d of [-1, 1]) { const b = blorbAt(cx(e) + d * 24, e.y + 10); b.vy = -3; g.add(b); }
          if (--e.t <= 0) { e.state = 'walk'; e.t = 60; }
          return;
        case 'tired': e.vx = 0; grav(); if (--e.t <= 0) { e.state = 'walk'; e.t = 50; } return;
        case 'dying':
          e.vx = 0; grav();
          if (e.t % 8 === 0) { g.burst(e.x + g.rand() * e.w, e.y + g.rand() * e.h, 10, 'spore', 2.5, 0, 24); g.ev('boom'); g.shake = 6; }
          if (--e.t <= 0) {
            e.dead = true; g.dropGems(cx(e), e.y, 500);
            g.add({ type: 'goal', x: Math.round(cx(e) / T) * T + 2, y: e.y + e.h - 48, w: 12, h: 48 });
            g.setGate('.'); g.ev('win2');
          }
          return;
      }
    } });
}
function blorbAt(x, y) { return blorb(x, y); }

export const MAKERS = { beetle, blorb, toad, snail, bat, knight, kuckuck, spitter, wisp };
export { gem, hurtFoe, foeBase, beetle, icicle, saw, toad, wisp, snail, blorb, bat, mole, rock, proj, plat, knight, kuckuck, eproj, golem, spitter, morchel, blorbAt };
