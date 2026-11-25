// Spiellogik ohne DOM: läuft im Browser und in Node-Tests gleich.
// Fester Zeitschritt: ein step() = 1/60 Sekunde.
import { SHOVEL, ARMOR } from './gear.js';
import { weaponMods } from './weapons.js';

export const T = 16;
const SOLID = new Set(['#', 'D', 'S', 'B', '^', 'X', 'V', 'R', 'F', 'J', 'c', 'A', 'K', 'I']);
const GRAV = 0.36, MAXFALL = 6.5, BOUNCE = 5.5;

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
    this.mod = weaponMods(gear.weapon);
    // Schmiede-Perks der hohen Stufen (kumulativ) und Relikte
    const m = this.mod, R = this.relic = opt.relics || {};
    for (let k = 0; k <= gear.shovel; k++) { const s = SHOVEL[k]; if (s.fast) m.atkLen = Math.min(m.atkLen, 12); if (s.stars) m.stars = true; if (s.fire) m.fire = true; if (s.area) m.area = true; if (s.seer) m.seer = true; }
    if (this.sh.gem) m.gemMul *= this.sh.gem;
    if (R.gier) m.gemMul *= [1, 1.15, 1.3, 1.5][R.gier];
    if (R.sprint) m.run *= 1 + R.sprint * 0.05;
    this.magnet = Math.max(22, [0, 36, 52, 72][R.magnet || 0], this.ar.magnet ? 60 : 0);
    this.rushMul = [1, 1.3, 1.6, 2][R.rausch || 0];
    this.pogoMul = 1 + (R.feder || 0) * 0.06;
    this.airJumps = this.ar.air || 0;
    this.ward = !!this.ar.ward; this.shieldT = 0; this.phoenix = R.phoenix || 0;
    this.dmg = Math.round(this.sh.dmg * this.mod.dmgMul);
    this.reach = this.sh.reach + this.mod.reach;
    // Statistiken für Sterne und Waffen-Bedingungen
    this.kills = 0; this.hurtCount = 0; this.bossHurt = 0; this.bossClean = false;
    this.chain = 0; this.maxChain = 0; this.soulUsed = false; this.streak = 0; this.streakT = 0;
    this.freeze = 0; this.nums = []; this.banner = null;
    this.tiles = level.map.map(r => r.split(''));
    this.h = this.tiles.length;
    this.w = this.tiles[0].length;
    this.rand = rng(opt.seed || 7);
    this.cheat = opt.cheats || {};
    this.pgrav = GRAV * (this.cheat.mond ? 0.5 : 1);
    this.ents = []; this.parts = []; this.events = []; this.vents = []; this.plats = []; this.traps = []; this.flips = new Map();
    this.frame = 0; this.gems = 0; this.deaths = 0; this.dirtTotal = 0;
    this.secretTotal = 0; this.secretsFound = 0; this.coins = []; this.crumbles = new Map();
    this.rush = 0; this.rushT = 0; this.idle = 0; this.flagBonus = false; this.exit = null;
    this.done = false; this.shake = 0; this.sign = null; this.boss = null;
    this.rec = [];
    const signs = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.tiles[y][x];
      if (c === 'D') this.dirtTotal++;
      if (c === 'V') this.vents.push({ tx: x, ty: y });
      if (c === 'H') this.secretTotal++;
      if (c === 'A') this.traps.push({ tx: x, ty: y, t: Math.floor(x * 37 % 110), warn: 0, face: 0 });
      if ('.#=DSB^XVRFHJcAKI'.includes(c)) continue;
      this.tiles[y][x] = '.';
      const px = x * T, py = y * T;
      switch (c) {
        case 'P': this.spawn = { x: px + 3, y: py + 2 }; break;
        case 'b': this.add(beetle(px + 1, py + 7)); break;
        case 'f': this.add(toad(px + 2, py + 6)); break;
        case 'w': this.add(wisp(px + 3, py + 3)); break;
        case 'q': this.add(snail(px + 1, py + 6)); break;
        case 'L': this.add(icicle(px + 3, py)); break;
        case 'Z': this.add(saw(px + 1, py + 1, 'x')); break;
        case 'U': this.add(saw(px + 1, py + 1, 'y')); break;
        case 'o': this.add(blorb(px + 2, py + 6)); break;
        case 'v': this.add(bat(px + 2, py + 2)); break;
        case 'G': this.add(gem(px + 4, py + 4, 5, true)); break;
        case 'O': this.add({ type: 'coin', x: px + 2, y: py + 2, w: 12, h: 12, idx: 0 }); break;
        case 'Y': this.add({ type: 'door', x: px, y: py - 8, w: 16, h: 24 }); break;
        case 's': this.add(spitter(px + 1, py + 4)); break;
        case 'N': this.boss = this.add(morchel(px - 8, py - 14)); break;
        case 'h': this.add({ type: 'apple', x: px + 4, y: py + 8, w: 8, h: 8 }); break;
        case 'T': this.add({ type: 'chest', x: px + 1, y: py + 4, w: 14, h: 12, open: false, key: `${level.id}:${x}:${y}` }); break;
        case 'Q': this.add({ type: 'altar', x: px - 4, y: py - 8, w: 24, h: 24, taken: false }); break;
        case 'C': this.add({ type: 'lantern', x: px + 4, y: py + 2, w: 8, h: 14, lit: false }); break;
        case 'E': this.add({ type: 'goal', x: px + 2, y: py - 32, w: 12, h: 48 }); break;
        case 'i': { const s = { type: 'sign', x: px + 1, y: py + 2, w: 14, h: 14, text: '' }; signs.push(s); this.add(s); break; }
        case 'M': this.boss = this.add(mole(px - 8, py - 10)); break;
        case 'W': this.boss = this.add(golem(px - 6, py - 14)); break;
        case 'm': this.plats.push(plat(px, py, 'x')); break;
        case 'n': this.plats.push(plat(px, py, 'y')); break;
        case 'z': this.add({ type: 'cog', x: px - 2, y: py - 2, w: 20, h: 20 }); break;
        case 'k': this.add(knight(px + 2, py + 2)); break;
        case 'u': this.add(kuckuck(px + 1, py + 3)); break;
      }
    }
    signs.sort((a, b) => a.x - b.x).forEach((s, i) => { s.text = level.signs[i] || ''; });
    this.secretTotal += countFakeGroups(this.tiles);
    // Hinter falschen Wänden verborgene Kammern bleiben abgedeckt, bis die Wand bricht
    this.hidden = new Set();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tiles[y][x] !== 'F') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cells = new Set(), st = [[x + dx, y + dy]]; let open = true;
        while (st.length && open) {
          const [a, b] = st.pop(), k = a + ',' + b;
          if (cells.has(k) || this.hidden.has(k)) continue;
          const c = this.tile(a, b);
          if (SOLID.has(c)) continue;
          if (b < 0 || b >= this.h || a < 0 || a >= this.w) { open = false; break; }
          cells.add(k); if (cells.size > 60) { open = false; break; }
          st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
        }
        if (open) for (const k of cells) this.hidden.add(k);
      }
    }
    // Münzen in fester Reihenfolge nummerieren (für den Spielstand)
    this.ents.filter(e => e.type === 'coin').sort((a, b) => a.x - b.x || a.y - b.y).forEach((c, i) => { c.idx = i; });
    // Seltene goldene Gegner (deterministisch pro Level)
    for (const e of this.ents) if (e.foe && e !== this.boss && ['beetle', 'blorb', 'knight', 'bat', 'spitter', 'kuckuck', 'toad', 'wisp', 'snail'].includes(e.type) && (this.rand() < [0.07, 0.14, 0.2, 0.28][this.relic.glueck || 0] || this.cheat.midas)) {
      e.golden = true; e.hp += 2; e.loot = 60;
    }
    this.coinTotal = this.ents.filter(e => e.type === 'coin').length;
    for (const tr of this.traps) tr.face = !this.solid(tr.tx - 1, tr.ty) ? -1 : 1;
    // Flüche, Elitegegner, Wächter
    const cu = this.curse = opt.curses || {};
    const foes = this.ents.filter(e => e.foe && e !== this.boss);
    if (cu.flut) for (const e of foes) if (MAKERS[e.type] && !e.float) { const c = MAKERS[e.type](e.x + 18, e.y); if (!this.solid(Math.floor((c.x + c.w) / T), Math.floor((c.y + 2) / T))) this.add(c); }
    const eliteP = cu.elite ? 1 : opt.elite || 0;
    for (const e of this.ents) if (e.foe && e !== this.boss && MAKERS[e.type] && this.rand() < eliteP) {
      e.elite = ['schnell', 'zaeh', 'teilt'][Math.floor(this.rand() * 3)];
      if (e.elite === 'zaeh') { e.hp *= 3; } e.loot = (e.loot || 8) * 3;
    }
    this.bossTier = opt.bossTier || 0;
    if (this.boss && this.bossTier) { this.boss.hp = this.boss.maxhp = Math.round(this.boss.maxhp * (1 + 0.35 * this.bossTier)); }
    this.noCheck = !!opt.noCheck;
    if (level.chase) {
      const ch = level.chase, vert = ch.kind === 'flut' || ch.kind === 'lava';
      this.chase = { ...ch, vert, pos: vert ? this.h * T + 60 : -90, t: 0 };
    }
    if (opt.timeLimit) this.timeLimit = opt.timeLimit;
    if (!this.spawn) this.spawn = { x: 24, y: 100 };
    this.check = { ...this.spawn };
    const p = this.p = {
      type: 'player', x: this.spawn.x, y: this.spawn.y, w: 10, h: 14, vx: 0, vy: 0,
      face: 1, hp: this.ar.hp + (R.herz || 0), maxhp: this.ar.hp + (R.herz || 0), airLeft: 0, atk: 0, atkCd: 0, pogo: false,
      inv: 0, hurt: 0, safe: 0, coyote: 0, jbuf: 0, jumping: false, dead: 0, drop: 0, anim: 0,
      land: 0, dash: 0, dashUsed: false,
    };
    p.onGround = false;
    if (opt.curses && opt.curses.einherz) p.hp = p.maxhp = 1;
  }

  add(e) { this.ents.push(e); return e; }
  ev(name, x, y, v) { this.events.push({ name, x, y, v }); }
  num(x, y, txt, col = '#fff') { this.nums.push({ x, y, txt: String(txt), col, life: 40 }); }
  // Dampfstoss: 70 von 120 Frames aktiv, Säule 6 Kacheln über dem Rohr
  // Geheimnisse
  secret(x, y, label) {
    this.secretsFound++; this.ev('secret', x, y);
    this.banner = { text: label || 'GEHEIMNIS!', sub: `${this.secretsFound} / ${this.secretTotal}`, col: '#7dffcf', t: 80 };
    this.burst(x, y, 24, 'spark', 2.5, 0.02, 30); this.freeze = Math.max(this.freeze, 8);
  }
  revealBlock(tx, ty) {
    this.tiles[ty][tx] = 'J'; this.shake = 4;
    this.dropGems(tx * T + 8, ty * T - 2, 25);
    this.secret(tx * T + 8, ty * T + 8, 'VERSTECKTER BLOCK!');
  }
  // Bröckelplattformen: zerfallen kurz nach dem Betreten, wachsen nach 3 Sekunden nach
  stepCrumbles() {
    for (const [k, c] of this.crumbles) {
      c.t++;
      if (c.state === 'shake' && c.t > 22) { this.tiles[c.ty][c.tx] = '.'; c.state = 'gone'; c.t = 0; this.burst(c.tx * T + 8, c.ty * T + 6, 8, 'crumble', 1.5); this.ev('crumble'); }
      else if (c.state === 'gone' && c.t > 180) {
        const p = this.p, box = { x: c.tx * T, y: c.ty * T, w: T, h: T };
        if (!overlap(p, box)) { this.tiles[c.ty][c.tx] = 'c'; this.crumbles.delete(k); }
      }
    }
  }
  touchCrumble(tx, ty) {
    const k = tx + ',' + ty;
    if (!this.crumbles.has(k)) this.crumbles.set(k, { tx, ty, t: 0, state: 'shake' });
  }
  addRush(n) {
    if (this.rushT > 0) return;
    this.rush = Math.max(0, Math.min(100, this.rush + (n > 0 ? n * this.rushMul : n)));
    if (this.rush >= 100) { this.rushT = 600; this.rush = 100; this.ev('rush'); this.banner = { text: 'RAUSCH!', sub: 'ALLES ZÄHLT DOPPELT', col: '#ffd84a', t: 70 }; this.freeze = Math.max(this.freeze, 12); }
  }
  ventOn(v) { return (this.frame + v.tx * 23) % 120 < 70; }
  dirtLeft() { let n = 0; for (const r of this.tiles) for (const c of r) if (c === 'D') n++; return n; }

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
      for (let tx = l; tx <= r; tx++) {
        if (b === this.p && this.tile(tx, ty) === 'H') { this.revealBlock(tx, ty); b.y = (ty + 1) * T; b.vy = 0; break; }
        if (this.solid(tx, ty)) { b.y = (ty + 1) * T; b.vy = 0; b.hitCeil = true; break; }
      }
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
  dig(tx, ty) {
    // Erdfresser: 3×3 Erde auf einmal
    this.breakTile(tx, ty);
    if (!this.mod.area) return;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.tile(tx + dx, ty + dy) === 'D') this.breakTile(tx + dx, ty + dy);
  }
  breakFake(tx, ty) {
    // Falsche Wand: alle verbundenen F-Kacheln brechen zusammen
    const stack = [[tx, ty]]; let n = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      if (this.tile(x, y) !== 'F') continue;
      this.tiles[y][x] = '.'; n++;
      this.revealAround(x, y);
      this.burst(x * T + 8, y * T + 8, 10, 'dirt', 2);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (n) { this.shake = 5; this.ev('crack'); this.secret(tx * T + 8, ty * T + 8, 'GEHEIMER GANG!'); }
  }
  revealAround(x, y) {
    const st = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    while (st.length) { const [a, b] = st.pop(), k = a + ',' + b; if (!this.hidden.has(k)) continue; this.hidden.delete(k); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  }
  isHidden(px, py) { return this.hidden.size > 0 && this.hidden.has(Math.floor(px / T) + ',' + Math.floor(py / T)); }
  breakTile(tx, ty) {
    const c = this.tile(tx, ty);
    if (c !== 'D' && c !== 'S' && c !== 'R' && !(c === '#' && this.cheat.maulwurf)) return;
    this.tiles[ty][tx] = '.';
    this.burst(tx * T + 8, ty * T + 8, 12, c === 'S' ? 'stone' : c === 'R' ? 'ore' : 'dirt', 2.2);
    this.shake = Math.max(this.shake, 3);
    this.ev(c === 'S' ? 'crack' : 'dig', tx * T, ty * T);
    this.dropGems(tx * T + 8, ty * T + 8, (c === 'R' ? 45 : c === 'S' ? 12 : (2 + Math.floor(this.rand() * 5)) * this.mod.dirtMul) + (this.relic.spaten || 0));
  }

  step(inp) {
    this.events.length = 0;
    for (const n of this.nums) { n.y -= 0.5; n.life--; }
    this.nums = this.nums.filter(n => n.life > 0);
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    // Hit-Stop: kurze Standbilder machen Treffer spürbar
    if (this.freeze > 0) { this.freeze--; if (inp.jumpP) this.p.jbuf = 7; if (inp.attackP) this.pendAtk = true; return; }
    if (this.streakT > 0 && --this.streakT === 0) this.streak = 0;
    if (!this.done) this.frame++;
    for (const pl of this.plats) pl.update(this, pl);
    this.stepCrumbles();
    if (this.rushT > 0) { this.rushT--; this.rush = this.rushT / 6; if (this.frame % 2 === 0) this.parts.push({ x: this.p.x + 5, y: this.p.y + 10, vx: -this.p.vx * 0.3, vy: -0.2, life: 18, col: 'gold', grav: 0 }); if (!this.rushT) this.rush = 0; }
    else if (this.rush > 0) this.rush = Math.max(0, this.rush - 0.06);
    const anyIn = inp.left || inp.right || inp.jump || inp.attack || inp.down;
    this.idle = anyIn ? 0 : this.idle + 1;
    if (this.idle === 900) this.ev('sleep');
    this.stepPlayer(inp);
    for (const e of this.ents) if (!e.dead && e.update) {
      e.update(this, e);
      if (!e.dead && (e.elite === 'schnell' || (e === this.boss && this.bossTier && this.frame % Math.max(2, 6 - this.bossTier) === 0))) e.update(this, e);
    }
    this.stepTraps();
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
    if (p.plat) { const pl = p.plat, vx0 = p.vx; p.vx = pl.dx; this.moveX(p); p.vx = vx0; p.y += pl.dy; }
    if (p.inv > 0) p.inv--;
    if (p.safe > 0) p.safe--;
    if (p.drop > 0) p.drop--;
    if (p.hurt > 0) p.hurt--;
    else {
      const acc = p.onGround ? 0.32 : 0.22;
      const RUN = this.mod.run;
      if (p.dash > 0) { /* Geister-Sprint */ }
      else if (i.left && !i.right) { p.vx = Math.max(-RUN, p.vx - acc); p.face = -1; }
      else if (i.right && !i.left) { p.vx = Math.min(RUN, p.vx + acc); p.face = 1; }
      else { p.vx *= p.onGround ? 0.68 : 0.93; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
    }
    p.coyote = p.onGround ? 6 : Math.max(0, p.coyote - 1);
    if (p.onGround) p.airLeft = this.airJumps;
    if (p.onGround && Math.abs(p.vx) > 1 && this.frame % 13 === 0) this.ev('step', p.x, p.y, p.groundC);
    if (p.onGround && !p.plat && p.groundC !== 'c' && this.frame % 10 === 0) this.lastSafe = { x: p.x, y: p.y };
    if (this.relic.schild && this.shieldT > 0) this.shieldT--;
    p.jbuf = i.jumpP ? 7 : Math.max(0, p.jbuf - 1);
    if (p.jbuf && p.onGround && i.down && (p.groundC === '=' || p.plat)) { p.drop = 10; p.y += 2; p.jbuf = 0; p.onGround = false; p.plat = null; }
    else if (p.jbuf && (p.coyote || this.cheat.wolken || (p.airLeft > 0 && !p.onGround)) && p.hurt <= 0) {
      if (!p.coyote && !this.cheat.wolken) { p.airLeft--; this.burst(cx(p), p.y + p.h, 8, 'spark', 1.2, 0, 14); }
      p.vy = -this.mod.jump; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.jumping = true; this.ev('jump');
      this.burst(cx(p), p.y + p.h, 4, 'dust', 0.8, 0, 14);
    } else if (i.jumpP && this.mod.dash && !p.onGround && !p.dashUsed && p.hurt <= 0) {
      p.dash = 12; p.dashUsed = true; p.jbuf = 0; p.vx = p.face * 5; p.vy = 0; p.inv = Math.max(p.inv, 14); p.jumping = false;
      this.ev('dash'); this.burst(cx(p), p.y + 7, 10, 'ghost', 1.5, 0, 18);
    }
    if (p.dash > 0) { p.dash--; p.vx = p.face * 5; p.vy = 0; if (p.dash % 2) this.parts.push({ x: p.x + 5, y: p.y + 7, vx: 0, vy: 0, life: 14, col: 'ghost', grav: 0 }); }
    if (!i.jump && p.jumping && p.vy < -2.2) p.vy = -2.2;

    if (p.atkCd > 0) p.atkCd--;
    const L = this.mod.atkLen;
    if ((i.attackP || this.pendAtk) && p.atk === 0 && p.atkCd === 0) { this.pendAtk = false; p.atk = L; p.atkLen = L; p.hits = new Set(); this.ev('swing'); }
    if (p.atk > 0) {
      p.atk--; if (p.atk === 0) p.atkCd = L < 16 ? 0 : 3;
      if (p.atk <= L * 0.75 && p.atk >= L * 0.3) this.swing();
    }
    p.pogo = !p.onGround && i.down && p.atk === 0 && p.hurt <= 0;

    if (p.dash <= 0) p.vy = Math.min(MAXFALL, p.vy + this.pgrav);
    if (p.pogo && p.vy > 0) this.pogoCheck();
    // Dampfstösse heben den Helden
    for (const v of this.vents) {
      if (!this.ventOn(v)) continue;
      const vx = v.tx * T, top = (v.ty - 6) * T;
      if (p.x + p.w > vx + 2 && p.x < vx + 14 && p.y + p.h > top && p.y < v.ty * T) {
        p.vy = Math.max(p.vy - 0.85, -4.8); p.jumping = false; p.onGround = false; p.plat = null;
      }
    }
    const fallV = p.vy, wasGround = p.onGround, prevBot = p.y + p.h;
    this.moveX(p);
    this.moveY(p);
    p.plat = null;
    if (!p.onGround && p.vy >= 0 && !p.drop) {
      for (const pl of this.plats) {
        if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && prevBot <= pl.y + 2 + Math.abs(pl.dy) && p.y + p.h >= pl.y) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.plat = pl; p.ground = { c: '=' }; break;
        }
      }
    }
    if (p.onGround) {
      if (!wasGround && fallV > 3) { p.land = 6; this.burst(cx(p), p.y + p.h, 5, 'dust', 1, 0, 14); }
      p.dashUsed = false;
      for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (this.tile(tx, Math.floor((p.y + p.h + 1) / T)) === 'c') this.touchCrumble(tx, Math.floor((p.y + p.h + 1) / T));
      if (this.chain >= 3) this.ev('chainEnd', p.x, p.y, this.chain);
      this.chain = 0;
      p.jumping = false; p.groundC = p.ground && p.ground.c;
      if (p.ground && p.ground.c === 'B') {
        p.vy = -(p.pogo ? 8.6 : 7); p.onGround = false;
        this.ev('boing', p.x, p.y); this.burst(cx(p), p.y + p.h, 8, 'spore', 1.5);
      } else if (p.spike) {
        if (this.ar.spike > 0) this.hurtPlayer(this.ar.spike, 0, true);
        else { p.vy = -4; p.onGround = false; }
      }
    }
    if (p.land > 0) p.land--;
    if (p.y > this.h * T + 40) this.kill(true);
  }

  pogoCheck() {
    const p = this.p, sh = this.sh;
    const box = { x: p.x + 1, y: p.y + p.h, w: p.w - 2, h: p.vy + 3 };
    let killed = false;
    let hit = false;
    for (const e of this.ents) {
      if (e.dead || !overlap(box, e)) continue;
      if (e.type === 'saw' || (e.type === 'icicle' && e.state !== 'gone')) { this.hurtPlayer(2, sign(cx(p) - cx(e)) || 1, true); hit = true; }
      else if (e.foe && !e.hidden && e.spiky) { this.hurtPlayer(e.dmg, sign(cx(p) - cx(e)) || 1, true); this.ev('clink'); hit = true; }
      else if (e.foe && !e.hidden) { e.hurtBy(this, e, this.dmg * (sh.pogoDmg || 1), 0, 'pogo'); hit = true; }
      else if (e.type === 'chest' && !e.open) { this.openChest(e); hit = true; }
      else if (e.type === 'rock') { e.dead = true; this.burst(cx(e), e.y, 8, 'stone'); hit = true; }
      else if (e.type === 'cog') { hit = true; this.burst(cx(p), p.y + p.h, 6, 'spark', 2, 0.05, 12); this.ev('clink'); }
      else if (e.type === 'eproj' && e.kind === 'gear') { e.dead = true; hit = true; this.burst(cx(e), e.y + 6, 8, 'spark', 2); }
    }
    const ty = Math.floor((box.y + box.h) / T);
    for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - 0.01) / T); tx++) {
      const c = this.tile(tx, ty);
      if (c === 'D' || (c === 'S' && sh.stone) || (c === 'R' && sh.ore) || (c === '#' && this.cheat.maulwurf && ty < this.h - 1)) { this.dig(tx, ty); hit = true; }
      if (c === 'F') { this.breakFake(tx, ty); hit = true; }
    }
    if (hit && this.mod.quake) {
      // Pendelhammer: Druckwelle trifft alles in der Nähe
      for (const e of this.ents) if (e.foe && !e.hidden && !e.dead && Math.abs(cx(e) - cx(p)) < 40 && Math.abs(e.y + e.h - (p.y + p.h)) < 30) e.hurtBy(this, e, Math.max(1, Math.ceil(this.dmg / 2)), sign(cx(e) - cx(p)), 'pogo');
      this.burst(cx(p), p.y + p.h, 16, 'dust', 2.5, 0.05, 18); this.shake = Math.max(this.shake, 4);
    }
    if (hit) {
      p.vy = -BOUNCE * sh.pogo * this.pogoMul; p.jumping = false; p.airLeft = this.airJumps; p.safe = 10; p.dashUsed = false;
      this.chain++; this.maxChain = Math.max(this.maxChain, this.chain); this.addRush(5);
      this.freeze = Math.max(this.freeze, 3);
      this.ev('bounce', p.x, p.y, this.chain);
      this.burst(cx(p), p.y + p.h, 6, 'spark', 1.6, 0.05, 14);
      // Pogo-Kette: ab 3 in Folge gibt es Bonus-Edelsteine, die mit der Kette wachsen
      if (this.chain >= 3) {
        const bonus = Math.min(20, (this.chain - 2) * 2) * ((this.relic.kette || 0) + 1);
        this.num(cx(p), p.y - 6, `KETTE ×${this.chain}`, this.chain >= 8 ? '#ff7ae0' : '#ffd84a');
        this.dropGems(cx(p), p.y + p.h, bonus);
      }
      if (this.chain === 12) this.ev('unlock', p.x, p.y, 'sternenspaten');
      if (this.mod.stars) for (const d of [-1, 1]) this.add(proj(cx(p) - 3, p.y + p.h - 4, d * 2.6, 1.2, this.dmg, 'star'));
    }
  }

  swing() {
    const p = this.p, sh = this.sh;
    const R = this.reach;
    const box = { x: p.face > 0 ? p.x + p.w : p.x - R, y: p.y + 2, w: R, h: 10 };
    if (!p.hits.has('fx')) {
      p.hits.add('fx');
      if (this.mod.fire) this.burst(p.face > 0 ? p.x + p.w + R / 2 : p.x - R / 2, p.y + 7, 10, 'fire', 1.4, -0.05, 20);
      if (this.mod.wave && p.onGround) { this.add(proj(p.face > 0 ? p.x + p.w : p.x - 10, p.y + p.h - 10, p.face * 3, 0, this.dmg, 'wave')); this.ev('wave'); }
    }
    for (const e of this.ents) {
      if (e.dead || p.hits.has(e) || !overlap(box, e)) continue;
      if (e.foe && !e.hidden) { p.hits.add(e); e.hurtBy(this, e, this.dmg, p.face); }
      else if (e.type === 'chest' && !e.open) { p.hits.add(e); this.openChest(e); }
      else if (e.type === 'rock') { e.dead = true; this.burst(cx(e), e.y + 5, 8, 'stone'); this.ev('crack'); }
      else if (e.type === 'eproj' && e.kind !== 'shock') { e.dead = true; this.burst(cx(e), e.y + 4, 8, 'spark', 2); this.ev('clink'); }
    }
    for (let ty = Math.floor(box.y / T); ty <= Math.floor((box.y + box.h - 0.01) / T); ty++)
      for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - 0.01) / T); tx++) {
        const c = this.tile(tx, ty);
        if (c === 'D' || (c === 'S' && sh.stone) || (c === 'R' && sh.ore) || (c === '#' && this.cheat.maulwurf && ty < this.h - 1)) this.dig(tx, ty);
        else if (c === 'F') this.breakFake(tx, ty);
        else if ((c === 'S' || c === 'R') && !p.hits.has('clink')) {
          p.hits.add('clink'); this.ev('clink'); this.burst(tx * T + (p.face > 0 ? 0 : 16), p.y + 7, 6, 'spark', 2, 0.05, 12);
        }
      }
  }

  openChest(e) {
    e.open = true; this.ev('chest', e.x, e.y, e.key); this.shake = 4; this.freeze = 10;
    // Seltenheit wird beim Öffnen ausgewürfelt; Tresor-Truhen in Geheimlevels sind immer legendär
    const r = this.level.bigChest ? 0.99 : this.rand();
    const R = r < 0.6 ? ['GEWÖHNLICH', '#e8d6f0', 80] : r < 0.88 ? ['SELTEN', '#4fd2ff', 160] : r < 0.98 ? ['EPISCH', '#c58bff', 320] : ['LEGENDÄR', '#ffd84a', 700];
    this.banner = { text: 'TRUHE: ' + R[0], sub: '+' + R[2], col: R[1], t: 80 };
    this.ev('chestRare', e.x, e.y, r);
    this.burst(cx(e), e.y, 16 + Math.round(r * 30), r >= 0.88 ? 'gold' : 'spark', 2.5, 0.05, 30);
    this.dropGems(cx(e), e.y, R[2]);
  }

  hurtPlayer(dmg, dir, spike) {
    const p = this.p;
    if (p.inv > 0 || p.dead || this.done || this.cheat.gott) { if (spike) { p.vy = -6; p.onGround = false; } return; }
    if (this.ward || (this.relic.schild && this.shieldT <= 0)) {
      if (this.ward) this.ward = false; else this.shieldT = [0, 40, 30, 20][this.relic.schild] * 60;
      p.inv = 60; this.freeze = Math.max(this.freeze, 6); this.ev('shield', p.x, p.y);
      this.burst(cx(p), p.y + 7, 20, 'spark', 2.2, 0, 22); this.num(cx(p), p.y - 6, 'GEBLOCKT', '#7ad0ff');
      if (spike) { p.vy = -6; p.onGround = false; }
      return;
    }
    p.hp -= dmg; this.hurtCount++; this.bossHurt++; if (!this.rushT) this.rush = Math.max(0, this.rush - 45);
    p.inv = this.ar.inv || 70; this.freeze = Math.max(this.freeze, 4); this.chain = 0; p.hurt = Math.round(14 * this.ar.kb) + 4;
    p.vx = (dir || -p.face) * 2.2 * this.ar.kb; p.vy = spike ? -6 : -3; p.onGround = false; p.jumping = false;
    this.shake = 5; this.ev('hurt');
    if (p.hp <= 0) this.kill();
  }
  kill(fell) {
    const p = this.p;
    if (p.dead) return;
    if (fell === true && this.ar.rewind && p.hp > 1 && this.lastSafe) {
      p.x = this.lastSafe.x; p.y = this.lastSafe.y; p.vx = p.vy = 0; p.hp--; p.inv = 90; this.ev('revive'); this.freeze = 12;
      this.num(cx(p), p.y - 6, 'ZURÜCKGESPULT', '#ffd84a'); this.burst(cx(p), p.y + 7, 18, 'gold', 2, 0, 24); return;
    }
    if (this.phoenix && !this.phoenixUsed && !this.cheat.gott) {
      this.phoenixUsed = true;
      if (fell) { p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; }
      p.hp = Math.min(p.maxhp, this.phoenix * 2); p.inv = 120; p.hurt = 0;
      this.burst(cx(p), p.y + 7, 36, 'fire', 2.8, -0.06, 44); this.ev('revive'); this.freeze = 20; this.shake = 6;
      this.banner = { text: 'AUS DER ASCHE', col: '#ff8a2a', t: 90 }; return;
    }
    if (this.mod.soul && !this.soulUsed) {
      // Seelenschaufel: einmal auferstehen
      this.soulUsed = true;
      if (fell) { p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; }
      p.hp = p.maxhp; p.inv = 120; p.hurt = 0;
      this.burst(cx(p), p.y + 7, 30, 'soul', 2.5, -0.05, 40);
      this.ev('revive'); this.freeze = 20; this.shake = 6;
      this.banner = { text: 'SEELE ENTFESSELT', col: '#b07aff', t: 90 };
      return;
    }
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
    if (this.chase) this.chase.pos = this.chase.vert ? this.check.y + 150 : this.check.x - 130, this.chase.t = 0;
    for (const e of this.ents) if (e.type === 'icicle') { e.state = 'hang'; e.x = e.ox; e.y = e.oy; e.vy = 0; }
    for (const [k, f] of this.flips) { this.tiles[f.ty][f.tx] = 'K'; this.flips.delete(k); }
    this.ents = this.ents.filter(e => e.type !== 'eproj');
  }
  // Fallen: Pfeilwerfer, Kippböden, Trollblöcke, Verfolger
  stepTraps() {
    const p = this.p;
    for (const tr of this.traps) {
      const near = Math.abs(cx(p) - tr.tx * T) < 210 && Math.abs(p.y + 7 - tr.ty * T - 8) < 56;
      if (!near) continue;
      tr.t++;
      if (tr.t % 110 === 84) { tr.warn = 26; this.ev('click', tr.tx * T, tr.ty * T); }
      if (tr.warn > 0) tr.warn--;
      if (tr.t % 110 === 0) { this.add(eproj(tr.tx * T + (tr.face < 0 ? -10 : 16), tr.ty * T + 7, tr.face * 3.4, 0, 'arrow')); this.ev('twang', tr.tx * T, tr.ty * T); }
    }
    // Kippböden: kippen kurz nach dem Betreten weg und klappen später zurück
    if (p.onGround && !p.dead) for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) {
      const ty = Math.floor((p.y + p.h + 1) / T), k = tx + ',' + ty;
      if (this.tile(tx, ty) === 'K' && !this.flips.has(k)) { this.flips.set(k, { tx, ty, t: 22, state: 'warn' }); this.ev('creak', tx * T, ty * T); }
    }
    for (const [k, f] of this.flips) {
      if (--f.t > 0) continue;
      if (f.state === 'warn') { f.state = 'open'; f.t = 100; this.tiles[f.ty][f.tx] = '.'; this.burst(f.tx * T + 8, f.ty * T + 4, 6, 'dust', 1.2); this.ev('flip'); }
      else { const ov = p.x + p.w > f.tx * T && p.x < f.tx * T + T && p.y + p.h > f.ty * T && p.y < f.ty * T + T; if (ov) { f.t = 10; continue; } this.tiles[f.ty][f.tx] = 'K'; this.flips.delete(k); }
    }
    // Trollblöcke: unsichtbar und fest, werden beim Anstossen sichtbar
    for (let ty = Math.floor((p.y - 1) / T); ty <= Math.floor((p.y + p.h + 1) / T); ty++) for (let tx = Math.floor((p.x - 1) / T); tx <= Math.floor((p.x + p.w + 1) / T); tx++)
      if (this.tile(tx, ty) === 'I') { this.tiles[ty][tx] = 'J'; this.ev('troll', tx * T, ty * T); this.num(tx * T + 8, ty * T - 2, 'HA!', '#ff7a8a'); this.burst(tx * T + 8, ty * T + 8, 10, 'spark', 1.5); }
    // Verfolger: Flut/Lava von unten, Wurm/Einsturz von links
    const ch = this.chase;
    if (ch && !this.done && !p.dead) {
      ch.t++;
      if (ch.t > (ch.delay || 90)) {
        if (ch.vert) { const gap = ch.pos - (p.y + p.h); ch.pos -= ch.speed * (gap > 200 ? 2.2 : 1); if (p.y + p.h > ch.pos + 4) { this.ev('drown'); this.kill('chase'); } }
        else { const gap = p.x - ch.pos; ch.pos += ch.speed * (gap > 260 ? 2 : 1); if (p.x < ch.pos + 8) { this.ev('chomp'); this.kill('chase'); } if (this.frame % 20 === 0) this.shake = Math.max(this.shake, 1.5); }
      }
    }
    if (this.timeLimit && !this.done && this.frame === this.timeLimit) this.ev('timeout');
  }

  contacts() {
    const p = this.p;
    this.sign = null;
    if (p.dead) return;
    for (const e of this.ents) {
      if (e.dead || !overlap(p, e)) continue;
      switch (e.type) {
        case 'gem': if (e.age > 10) {
          e.dead = true; const v = e.val * this.mod.gemMul * (this.rushT > 0 ? 2 : 1); this.gems += v; this.addRush(e.val >= 5 ? 2 : 0.6);
          this.streak++; this.streakT = 45;
          this.ev('gem', e.x, e.y, this.streak);
          if (this.cheat.konfetti) this.burst(e.x + 3, e.y, 6, 'confetti', 2, 0.08, 40);
          if (v >= 5) this.num(e.x + 3, e.y - 2, '+' + v, '#a8d4ff');
          this.burst(e.x + 3, e.y + 3, 4, 'spark', 1, 0, 10);
        } break;
        case 'coin': e.dead = true; this.coins.push(e.idx); this.ev('coin', e.x, e.y, e.idx); this.freeze = Math.max(this.freeze, 10);
          this.banner = { text: 'SCHAUFELMÜNZE!', sub: `${this.coins.length} / ${this.coinTotal}`, col: '#ffd84a', t: 70 }; this.burst(e.x + 6, e.y + 6, 30, 'gold', 3, 0.03, 40); this.addRush(20); break;
        case 'door': if (!this.done) { this.done = true; this.exit = 'secret'; this.ev('win'); this.burst(e.x + 8, e.y + 12, 30, 'spark', 3, 0.05, 40); } break;
        case 'altar': if (!e.taken) { e.taken = true; this.ev('unlock', e.x, e.y, this.level.altar || 'urfunke'); this.burst(cx(e), e.y + 4, 40, 'fire', 3, -0.05, 50); this.shake = 8; } break;
        case 'apple': if (p.hp < p.maxhp) { e.dead = true; p.hp = Math.min(p.maxhp, p.hp + 2); this.ev('heal'); } break;
        case 'lantern': if (!e.lit) { for (const o of this.ents) if (o.type === 'lantern') o.lit = false; e.lit = true; if (!this.noCheck) this.check = { x: e.x - 1, y: e.y }; this.ev('check'); this.burst(e.x + 4, e.y + 4, 14, 'spark', 1.5, 0, 24); } break;
        case 'goal':
          // Easter Egg: auf der Fahnenspitze landen
          if (!this.flagBonus && p.vy > 0 && p.y + p.h <= e.y + 12 && !this.done) { this.flagBonus = true; this.gems += 100; this.ev('flag'); this.banner = { text: 'FAHNENSPITZE!', sub: '+100', col: '#7dffcf', t: 70 }; this.burst(e.x + 6, e.y, 30, 'gold', 3, 0.05, 40); }
          if (!this.done && !(this.boss && !this.boss.dead)) { this.done = true; this.ev('win'); this.burst(cx(e), e.y + 6, 30, 'spark', 3, 0.05, 40); } break;
        case 'sign': this.sign = e.text; break;
        case 'rock': if (!e.landed) { e.dead = true; this.hurtPlayer(1, sign(cx(p) - cx(e))); } break;
        case 'cog': if (p.safe <= 0) this.hurtPlayer(1, sign(cx(p) - cx(e))); break;
        case 'saw': this.hurtPlayer(2, sign(cx(p) - cx(e)) || 1); break;
        case 'icicle': if (e.state !== 'gone') { this.hurtPlayer(e.state === 'fall' ? 2 : 1, sign(cx(p) - cx(e)) || 1); if (e.state === 'fall') { e.state = 'gone'; e.t = 240; this.burst(cx(e), e.y + 10, 10, 'stone', 2); } } break;
        case 'eproj': if (p.safe <= 0 || e.kind === 'shock') { if (e.kind !== 'shock') e.dead = true; this.hurtPlayer(e.dmg, sign(cx(p) - cx(e))); } break;
        default:
          if (e.foe && !e.hidden && p.safe <= 0 && e.dmg) this.hurtPlayer(e.dmg, sign(cx(p) - cx(e)));
      }
    }
    if (this.boss && this.boss.state === 'idle' && this.level.gate != null && p.x > (this.level.gate + 2) * T) this.startBoss();
  }

  /* ---------- Boss ---------- */
  setGate(c) { for (let y = 2; y <= 10; y++) this.tiles[y][this.level.gate] = c; }
  startBoss() { this.bossHurt = 0; this.setGate('X'); this.boss.state = 'roar'; this.boss.t = 70; this.shake = 6; this.ev('bossStart'); }
  resetBoss() {
    const b = this.boss;
    Object.assign(b, { x: b.home.x, y: b.home.y, hp: b.maxhp, state: 'idle', t: 0, hidden: false, vx: 0, vy: 0 });
    this.ents = this.ents.filter(e => e.type !== 'rock' && e.type !== 'eproj');
    b.nonPogo = false; b.cyc = 0;
    this.setGate('.');
  }
  bossDefeated(b) {
    b.state = 'dying'; b.t = 100; b.foe = false; this.ev('bossDie'); this.shake = 10; this.freeze = 30;
    this.bossClean = this.bossHurt === 0;
    if (b.type === 'mole' && this.bossClean) this.ev('unlock', b.x, b.y, 'maulwurfkralle');
    if (b.type === 'golem' && !b.nonPogo) this.ev('unlock', b.x, b.y, 'pendelhammer');
    if (this.bossClean) this.ev('bossClean');
  }
}

/* ---------- Objekte & Gegner ---------- */
function gem(x, y, val, fixed) {
  return { type: 'gem', x, y, w: 7, h: 7, val, vx: 0, vy: 0, fixed, age: fixed ? 99 : 0,
    update(g, e) {
      e.age++;
      const p = g.p;
      if (e.age > 12 && !p.dead && Math.abs(cx(p) - e.x) < 22 && Math.abs(p.y + 7 - e.y) < 22) {
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
  if (dir && e !== g.boss) e.vx = dir * 1.8;
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
    update(g, e) { const t = g.frame * 0.03 + ph; if (axis === 'x') e.x = e.ox + Math.sin(t) * 48; else e.y = e.oy + Math.sin(t) * 48; e.rot += 0.3; if (g.frame % 4 === 0) g.parts.push({ x: e.x + 7, y: e.y + 13, vx: (Math.random() - 0.5) * 2, vy: -1, life: 10, col: 'spark', grav: 0.15 }); } };
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
        if (--e.t <= 0 && Math.abs(dx) < 120) {
          // nicht in Abgründe springen
          const land = Math.floor((cx(e) + e.face * 34) / T);
          let safe = false; for (let k = 0; k < 4; k++) if (g.solid(land, Math.floor((e.y + e.h) / T) + k)) safe = true;
          if (safe) { e.vx = e.face * 1.6; e.vy = -4.6; g.ev('boing', e.x, e.y); }
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
      const p = g.p, d = Math.hypot(cx(p) - e.ax, p.y - e.ay);
      if (d < 90 && !p.dead) { e.ax += Math.sign(cx(p) - e.ax) * 0.18; e.ay += Math.sign(p.y - 4 - e.ay) * 0.12; }
      e.ph += 0.045;
      e.x = e.ax + Math.cos(e.ph) * 14 + e.vx * 4; e.y = e.ay + Math.sin(e.ph * 2) * 6; e.vx *= 0.9;
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

// Projektile der Waffen (Sterne, Erdwelle)
function proj(x, y, vx, vy, dmg, kind) {
  return { type: 'proj', kind, x, y, w: kind === 'wave' ? 10 : 6, h: kind === 'wave' ? 10 : 6, vx, vy, dmg, life: kind === 'wave' ? 40 : 50, hit: new Set(),
    update(g, e) {
      e.x += e.vx; e.y += e.vy; e.vy += kind === 'star' ? 0.08 : 0;
      if (--e.life <= 0 || g.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h / 2) / T))) {
        e.dead = true; g.burst(e.x + 3, e.y + 3, 6, kind === 'wave' ? 'dirt' : 'spark', 1.5); return;
      }
      if (kind === 'wave' && !g.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h + 2) / T))) { e.dead = true; return; }
      if (g.frame % 3 === 0) g.parts.push({ x: e.x + 3, y: e.y + 3, vx: 0, vy: kind === 'wave' ? -1 : 0, life: 12, col: kind === 'wave' ? 'dirt' : 'star', grav: 0.05 });
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
      const t = g.frame * 0.022 + ph, nx = axis === 'x' ? e.ox + Math.sin(t) * 48 : e.ox, ny = axis === 'y' ? e.oy + Math.sin(t) * 48 : e.oy;
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
      if (++e.t % 80 === 0 && Math.abs(dx) < 130) e.dir = sign(dx);
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
      e.y = e.oy + Math.sin(e.t / 20) * 3;
      if (e.t % 110 === 0 && Math.abs(cx(g.p) - cx(e)) < 120 && g.p.y > e.y) { g.add(eproj(cx(e) - 2, e.y + e.h, 0, 2.4, 'bolt')); g.ev('screech'); }
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
      const dx = cx(g.p) - cx(e); e.face = sign(dx);
      if (++e.t % 110 === 0 && Math.abs(dx) < 150) {
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

// Zusammenhängende falsche Wände zählen als ein Geheimnis
export function countFakeGroups(tiles) {
  const seen = new Set(); let n = 0;
  for (let y = 0; y < tiles.length; y++) for (let x = 0; x < tiles[y].length; x++) {
    if (tiles[y][x] !== 'F' || seen.has(x + ',' + y)) continue;
    n++; const st = [[x, y]];
    while (st.length) { const [a, b] = st.pop(), k = a + ',' + b; if (seen.has(k) || !tiles[b] || tiles[b][a] !== 'F') continue; seen.add(k); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  }
  return n;
}

const MAKERS = { beetle, blorb, toad, snail, bat, knight, kuckuck, spitter, wisp };
