// Spiellogik ohne DOM: läuft im Browser und in Node-Tests gleich.
// Fester Zeitschritt: ein step() = 1/60 Sekunde.
import { SHOVEL, ARMOR } from './gear.js';

export const T = 16;
const SOLID = new Set(['#', 'D', 'S', 'B', '^', 'X']);
const GRAV = 0.36, MAXFALL = 6.5, RUN = 2.0, JUMP = 5.6, BOUNCE = 5.5;

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const cx = e => e.x + e.w / 2;
const sign = v => (v < 0 ? -1 : 1);

// kleiner deterministischer Zufall, damit Geister-Läufe reproduzierbar aussehen
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Game {
  constructor(level, gear, opt = {}) {
    this.level = level;
    this.sh = SHOVEL[gear.shovel];
    this.ar = ARMOR[gear.armor];
    this.gear = gear;
    this.tiles = level.map.map(r => r.split(''));
    this.h = this.tiles.length;
    this.w = this.tiles[0].length;
    this.rand = rng(opt.seed || 7);
    this.ents = []; this.parts = []; this.events = [];
    this.frame = 0; this.gems = 0; this.deaths = 0;
    this.done = false; this.shake = 0; this.sign = null; this.boss = null;
    this.rec = [];
    const signs = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.tiles[y][x];
      if ('.#=DSB^X'.includes(c)) continue;
      this.tiles[y][x] = '.';
      const px = x * T, py = y * T;
      switch (c) {
        case 'P': this.spawn = { x: px + 3, y: py + 2 }; break;
        case 'b': this.add(beetle(px + 1, py + 7)); break;
        case 'o': this.add(blorb(px + 2, py + 6)); break;
        case 'v': this.add(bat(px + 2, py + 2)); break;
        case 'G': this.add(gem(px + 4, py + 4, 5, true)); break;
        case 'h': this.add({ type: 'apple', x: px + 4, y: py + 8, w: 8, h: 8 }); break;
        case 'T': this.add({ type: 'chest', x: px + 1, y: py + 4, w: 14, h: 12, open: false }); break;
        case 'C': this.add({ type: 'lantern', x: px + 4, y: py + 2, w: 8, h: 14, lit: false }); break;
        case 'E': this.add({ type: 'goal', x: px + 2, y: py - 32, w: 12, h: 48 }); break;
        case 'i': { const s = { type: 'sign', x: px + 1, y: py + 2, w: 14, h: 14, text: '' }; signs.push(s); this.add(s); break; }
        case 'M': this.boss = this.add(mole(px - 8, py - 10)); break;
      }
    }
    signs.sort((a, b) => a.x - b.x).forEach((s, i) => { s.text = level.signs[i] || ''; });
    if (!this.spawn) this.spawn = { x: 24, y: 100 };
    this.check = { ...this.spawn };
    const p = this.p = {
      type: 'player', x: this.spawn.x, y: this.spawn.y, w: 10, h: 14, vx: 0, vy: 0,
      face: 1, hp: this.ar.hp, maxhp: this.ar.hp, atk: 0, atkCd: 0, pogo: false,
      inv: 0, hurt: 0, safe: 0, coyote: 0, jbuf: 0, jumping: false, dead: 0, drop: 0, anim: 0,
    };
    p.onGround = false;
  }

  add(e) { this.ents.push(e); return e; }
  ev(name, x, y) { this.events.push({ name, x, y }); }

  tile(tx, ty) {
    if (tx < 0 || tx >= this.w) return '#';
    if (ty < 0 || ty >= this.h) return '.';
    return this.tiles[ty][tx];
  }
  solid(tx, ty) { return SOLID.has(this.tile(tx, ty)); }

  moveX(b) {
    b.x += b.vx; b.hitWall = false;
    const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + b.w - 0.01) / T);
      for (let ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = tx * T - b.w; b.vx = 0; b.hitWall = true; break; }
    } else if (b.vx < 0) {
      const tx = Math.floor(b.x / T);
      for (let ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = (tx + 1) * T; b.vx = 0; b.hitWall = true; break; }
    }
  }
  moveY(b) {
    const prevBot = b.y + b.h;
    b.y += b.vy; b.onGround = false; b.spike = false; b.ground = null;
    const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
    if (b.vy > 0) {
      const ty = Math.floor((b.y + b.h) / T);
      for (let tx = l; tx <= r; tx++) {
        const c = this.tile(tx, ty);
        if (SOLID.has(c) || (c === '=' && prevBot <= ty * T + 0.5 && !b.drop)) {
          b.y = ty * T - b.h; b.vy = 0; b.onGround = true;
          if (c === '^') b.spike = true;
          if (!b.ground || c === 'B') b.ground = { c, tx, ty };
        }
      }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y / T);
      for (let tx = l; tx <= r; tx++) if (this.solid(tx, ty)) { b.y = (ty + 1) * T; b.vy = 0; b.hitCeil = true; break; }
    }
  }

  burst(x, y, n, col, spd = 2, grav = 0.15, life = 30) {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2, v = spd * (0.3 + this.rand());
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: life * (0.6 + this.rand() * 0.6), col, grav });
    }
  }
  dropGems(x, y, total) {
    while (total > 0) {
      const v = total >= 20 && this.rand() < 0.4 ? 20 : total >= 5 && this.rand() < 0.6 ? 5 : 1;
      total -= v;
      const g = this.add(gem(x - 3, y - 3, v, false));
      g.vx = (this.rand() - 0.5) * 3; g.vy = -2 - this.rand() * 2.5;
    }
  }
  breakTile(tx, ty) {
    const c = this.tile(tx, ty);
    this.tiles[ty][tx] = '.';
    this.burst(tx * T + 8, ty * T + 8, 12, c === 'S' ? 'stone' : 'dirt', 2.2);
    this.shake = Math.max(this.shake, 3);
    this.ev(c === 'S' ? 'crack' : 'dig', tx * T, ty * T);
    this.dropGems(tx * T + 8, ty * T + 8, c === 'S' ? 12 : 2 + Math.floor(this.rand() * 5));
  }

  step(inp) {
    this.events.length = 0;
    if (!this.done) this.frame++;
    this.stepPlayer(inp);
    for (const e of this.ents) if (!e.dead && e.update) e.update(this, e);
    this.contacts();
    this.ents = this.ents.filter(e => !e.dead);
    for (const q of this.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vx *= 0.97; q.life--; }
    this.parts = this.parts.filter(q => q.life > 0);
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
    if (this.shake > 0) this.shake *= 0.85, this.shake < 0.3 && (this.shake = 0);
    // Geist aufzeichnen (jeder 2. Frame)
    if (!this.done && this.frame % 2 === 0) this.rec.push([Math.round(this.p.x), Math.round(this.p.y), this.poseFlags()]);
  }

  pose() {
    const p = this.p;
    if (p.dead) return 5;
    if (p.atk > 0) return 3;
    if (p.pogo) return 4;
    if (!p.onGround) return 2;
    return Math.abs(p.vx) > 0.3 ? 1 : 0;
  }
  poseFlags() { return this.pose() | (this.p.face < 0 ? 8 : 0) | ((this.p.anim >> 3 & 1) << 4); }

  stepPlayer(i) {
    const p = this.p;
    if (p.dead) { if (--p.dead === 0) this.respawn(); return; }
    if (this.done) { p.vx *= 0.8; p.vy = Math.min(MAXFALL, p.vy + GRAV); this.moveX(p); this.moveY(p); return; }
    p.anim++;
    if (p.inv > 0) p.inv--;
    if (p.safe > 0) p.safe--;
    if (p.drop > 0) p.drop--;
    if (p.hurt > 0) p.hurt--;
    else {
      const acc = p.onGround ? 0.32 : 0.22;
      if (i.left && !i.right) { p.vx = Math.max(-RUN, p.vx - acc); p.face = -1; }
      else if (i.right && !i.left) { p.vx = Math.min(RUN, p.vx + acc); p.face = 1; }
      else { p.vx *= p.onGround ? 0.68 : 0.93; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
    }
    p.coyote = p.onGround ? 6 : Math.max(0, p.coyote - 1);
    p.jbuf = i.jumpP ? 7 : Math.max(0, p.jbuf - 1);
    if (p.jbuf && p.onGround && i.down && p.groundC === '=') { p.drop = 10; p.y += 2; p.jbuf = 0; p.onGround = false; }
    else if (p.jbuf && p.coyote && p.hurt <= 0) {
      p.vy = -JUMP; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.jumping = true; this.ev('jump');
    }
    if (!i.jump && p.jumping && p.vy < -2.2) p.vy = -2.2;

    if (p.atkCd > 0) p.atkCd--;
    if (i.attackP && p.atk === 0 && p.atkCd === 0) { p.atk = 16; p.hits = new Set(); this.ev('swing'); }
    if (p.atk > 0) { p.atk--; if (p.atk === 0) p.atkCd = 3; if (p.atk <= 12 && p.atk >= 5) this.swing(); }
    p.pogo = !p.onGround && i.down && p.atk === 0 && p.hurt <= 0;

    p.vy = Math.min(MAXFALL, p.vy + GRAV);
    if (p.pogo && p.vy > 0) this.pogoCheck();
    this.moveX(p);
    this.moveY(p);
    if (p.onGround) {
      p.jumping = false; p.groundC = p.ground && p.ground.c;
      if (p.ground && p.ground.c === 'B') {
        p.vy = -(p.pogo ? 8.6 : 7); p.onGround = false;
        this.ev('boing', p.x, p.y); this.burst(cx(p), p.y + p.h, 8, 'spore', 1.5);
      } else if (p.spike) {
        if (this.ar.spike > 0) this.hurtPlayer(this.ar.spike, 0, true);
        else { p.vy = -4; p.onGround = false; }
      }
    }
    if (p.y > this.h * T + 40) this.kill();
  }

  pogoCheck() {
    const p = this.p, sh = this.sh;
    const box = { x: p.x + 1, y: p.y + p.h, w: p.w - 2, h: p.vy + 3 };
    let hit = false;
    for (const e of this.ents) {
      if (e.dead || !overlap(box, e)) continue;
      if (e.foe && !e.hidden) { e.hurtBy(this, e, sh.dmg, 0); hit = true; }
      else if (e.type === 'chest' && !e.open) { this.openChest(e); hit = true; }
      else if (e.type === 'rock') { e.dead = true; this.burst(cx(e), e.y, 8, 'stone'); hit = true; }
    }
    const ty = Math.floor((box.y + box.h) / T);
    for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - 0.01) / T); tx++) {
      const c = this.tile(tx, ty);
      if (c === 'D' || (c === 'S' && sh.stone)) { this.breakTile(tx, ty); hit = true; }
    }
    if (hit) {
      p.vy = -BOUNCE * sh.pogo; p.jumping = false; p.safe = 10;
      this.ev('bounce', p.x, p.y);
      this.burst(cx(p), p.y + p.h, 6, 'spark', 1.6, 0.05, 14);
    }
  }

  swing() {
    const p = this.p, sh = this.sh;
    const box = { x: p.face > 0 ? p.x + p.w : p.x - sh.reach, y: p.y + 2, w: sh.reach, h: 10 };
    for (const e of this.ents) {
      if (e.dead || p.hits.has(e) || !overlap(box, e)) continue;
      if (e.foe && !e.hidden) { p.hits.add(e); e.hurtBy(this, e, sh.dmg, p.face); }
      else if (e.type === 'chest' && !e.open) { p.hits.add(e); this.openChest(e); }
      else if (e.type === 'rock') { e.dead = true; this.burst(cx(e), e.y + 5, 8, 'stone'); this.ev('crack'); }
    }
    for (let ty = Math.floor(box.y / T); ty <= Math.floor((box.y + box.h - 0.01) / T); ty++)
      for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - 0.01) / T); tx++) {
        const c = this.tile(tx, ty);
        if (c === 'D' || (c === 'S' && sh.stone)) this.breakTile(tx, ty);
        else if (c === 'S' && !p.hits.has('clink')) {
          p.hits.add('clink'); this.ev('clink'); this.burst(tx * T + (p.face > 0 ? 0 : 16), p.y + 7, 6, 'spark', 2, 0.05, 12);
        }
      }
  }

  openChest(e) {
    e.open = true; this.ev('chest', e.x, e.y); this.shake = 4;
    this.burst(cx(e), e.y, 16, 'spark', 2.5, 0.05, 20);
    this.dropGems(cx(e), e.y, 80);
  }

  hurtPlayer(dmg, dir, spike) {
    const p = this.p;
    if (p.inv > 0 || p.dead || this.done) { if (spike) { p.vy = -6; p.onGround = false; } return; }
    p.hp -= dmg;
    p.inv = 70; p.hurt = Math.round(14 * this.ar.kb) + 4;
    p.vx = (dir || -p.face) * 2.2 * this.ar.kb; p.vy = spike ? -6 : -3; p.onGround = false; p.jumping = false;
    this.shake = 5; this.ev('hurt');
    if (p.hp <= 0) this.kill();
  }
  kill() {
    const p = this.p;
    if (p.dead) return;
    p.dead = 70; p.hp = 0; this.deaths++;
    const lost = Math.floor(this.gems * 0.25);
    this.gems -= lost;
    this.burst(cx(p), p.y + 7, 24, 'hero', 3, 0.1, 40);
    this.ev('die'); this.shake = 8;
  }
  respawn() {
    const p = this.p;
    Object.assign(p, { x: this.check.x, y: this.check.y, vx: 0, vy: 0, hp: p.maxhp, inv: 60, hurt: 0, atk: 0, pogo: false });
    if (this.boss && this.boss.state !== 'idle' && !this.boss.dead) this.resetBoss();
  }

  contacts() {
    const p = this.p;
    this.sign = null;
    if (p.dead) return;
    for (const e of this.ents) {
      if (e.dead || !overlap(p, e)) continue;
      switch (e.type) {
        case 'gem': if (e.age > 10) { e.dead = true; this.gems += e.val; this.ev('gem', e.x, e.y); this.burst(e.x + 3, e.y + 3, 4, 'spark', 1, 0, 10); } break;
        case 'apple': if (p.hp < p.maxhp) { e.dead = true; p.hp = Math.min(p.maxhp, p.hp + 2); this.ev('heal'); } break;
        case 'lantern': if (!e.lit) { for (const o of this.ents) if (o.type === 'lantern') o.lit = false; e.lit = true; this.check = { x: e.x - 1, y: e.y }; this.ev('check'); this.burst(e.x + 4, e.y + 4, 14, 'spark', 1.5, 0, 24); } break;
        case 'goal': if (!this.done && !(this.boss && !this.boss.dead)) { this.done = true; this.ev('win'); this.burst(cx(e), e.y + 6, 30, 'spark', 3, 0.05, 40); } break;
        case 'sign': this.sign = e.text; break;
        case 'rock': if (!e.landed) { e.dead = true; this.hurtPlayer(1, sign(cx(p) - cx(e))); } break;
        default:
          if (e.foe && !e.hidden && p.safe <= 0 && e.dmg) this.hurtPlayer(e.dmg, sign(cx(p) - cx(e)));
      }
    }
    if (this.boss && this.boss.state === 'idle' && this.level.gate != null && p.x > (this.level.gate + 2) * T) this.startBoss();
  }

  /* ---------- Boss ---------- */
  setGate(c) { for (let y = 2; y <= 10; y++) this.tiles[y][this.level.gate] = c; }
  startBoss() { this.setGate('X'); this.boss.state = 'roar'; this.boss.t = 70; this.shake = 6; this.ev('bossStart'); }
  resetBoss() {
    const b = this.boss;
    Object.assign(b, { x: b.home.x, y: b.home.y, hp: b.maxhp, state: 'idle', t: 0, hidden: false, vx: 0, vy: 0 });
    this.ents = this.ents.filter(e => e.type !== 'rock');
    this.setGate('.');
  }
  bossDefeated(b) {
    b.state = 'dying'; b.t = 100; b.foe = false; this.ev('bossDie'); this.shake = 10;
  }
}

/* ---------- Objekte & Gegner ---------- */
function gem(x, y, val, fixed) {
  return { type: 'gem', x, y, w: 7, h: 7, val, vx: 0, vy: 0, fixed, age: fixed ? 99 : 0,
    update(g, e) {
      e.age++;
      if (e.fixed) return;
      e.vy = Math.min(5, e.vy + GRAV * 0.8);
      g.moveX(e); if (e.hitWall) e.vx = 0;
      const vy = e.vy; g.moveY(e);
      if (e.onGround) { e.vy = vy > 1 ? -vy * 0.45 : 0; e.vx *= 0.85; }
      if (e.age > 900) e.dead = true;
    } };
}

function hurtFoe(g, e, dmg, dir) {
  if (e.iframe > 0) return;
  e.hp -= dmg; e.iframe = 10; e.flash = 8;
  g.ev('hit', e.x, e.y); g.shake = Math.max(g.shake, 2);
  if (dir && e.type !== 'mole') e.vx = dir * 1.8;
  if (e.hp <= 0) {
    if (e.type === 'mole') return g.bossDefeated(e);
    e.dead = true; g.ev('poof', e.x, e.y);
    g.burst(e.x + e.w / 2, e.y + e.h / 2, 14, 'poof', 2, 0.02, 24);
    g.dropGems(e.x + e.w / 2, e.y, e.loot || 8);
  }
}
const foeBase = (o) => ({ foe: true, iframe: 0, flash: 0, vx: 0, vy: 0, hurtBy: hurtFoe, ...o });

function beetle(x, y) {
  return foeBase({ type: 'beetle', x, y, w: 14, h: 9, hp: 2, dmg: 1, dir: -1, loot: 8,
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
function blorb(x, y) {
  return foeBase({ type: 'blorb', x, y, w: 12, h: 10, hp: 2, dmg: 1, t: 40, loot: 10,
    update(g, e) {
      if (e.iframe) e.iframe--; if (e.flash) e.flash--;
      e.vy = Math.min(MAXFALL, e.vy + GRAV);
      if (e.onGround) {
        e.vx *= 0.75;
        const dx = cx(g.p) - cx(e);
        if (--e.t <= 0 && Math.abs(dx) < 150) { e.vy = -4.2; e.vx = sign(dx) * 1.3; e.t = 70; g.ev('blob', e.x, e.y); }
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
      if (e.state === 'hang') { if (Math.abs(dx) < 96 && Math.abs(dy) < 110) { e.state = 'fly'; g.ev('screech', e.x, e.y); } return; }
      e.t++;
      e.vx = Math.max(-1.25, Math.min(1.25, e.vx + sign(dx) * 0.05));
      e.vy = Math.max(-0.9, Math.min(0.9, dy * 0.02)) + Math.sin(e.t / 9) * 0.9;
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
