// Spiellogik ohne DOM: läuft im Browser und in Node-Tests gleich.
// Fester Zeitschritt: ein step() = 1/60 Sekunde.
import { populateHunt } from './hunters.js';
import { SHOVEL } from './gear.js';
import { armorStats, loadout, pvpNormalize } from './armor.js';
import { weaponMods } from './weapons.js';

import { T, SOLID, GRAV, MAXFALL, BOUNCE, overlap, cx, sign, fsin, fcos, fdist, compact, rng } from './core.js';
import { MAKERS, gem, hurtFoe, foeBase, beetle, icicle, saw, toad, wisp, snail, blorb, bat, mole, rock, proj, plat, knight, kuckuck, eproj, golem, spitter, morchel, blorbAt } from './foes.js';
export { T, fsin, fcos } from './core.js';


export class Game {
  constructor(level, gear, opt = {}) {
    this.level = level;
    this.sh = SHOVEL[gear.shovel];
    // Rüstung aus vier Teilen (altes Format { armor: n } = alle Teile Stufe n, ergibt exakt die alten Werte)
    this.look = loadout(gear);
    // Duell (Schatten-Arena): Rüstungswerte mit PvP-Obergrenzen
    const A = this.ar = opt.pvp ? pvpNormalize(armorStats(this.look)) : armorStats(this.look), F = this.af = A.fx;
    this.armorTier = A.tiers.brust;
    this.gear = gear;
    this.mod = weaponMods(gear.weapon);
    // Schmiede-Perks der hohen Stufen (kumulativ) und Relikte
    const m = this.mod, R = this.relic = opt.relics || {};
    for (let k = 0; k <= gear.shovel; k++) { const s = SHOVEL[k]; if (s.fast) m.atkLen = Math.min(m.atkLen, 9); if (s.stars) m.stars = true; if (s.fire) m.fire = true; if (s.area) m.area = true; if (s.seer) m.seer = true; }
    if (m.heavy) m.atkLen = m.heavy;
    if (this.sh.gem) m.gemMul *= this.sh.gem;
    if (R.gier) m.gemMul *= [1, 1.15, 1.3, 1.5][R.gier];
    if (R.sprint) m.run *= 1 + [0, 0.1, 0.18, 0.25][R.sprint];
    // Rüstungseffekte mit Obergrenzen: nur angewendet, wenn vorhanden (alte Läufe bleiben bitgenau gleich)
    if (A.run !== 1) { const r = m.run * A.run; m.run = A.run > 1 ? Math.max(m.run, Math.min(r, 2.0 * 1.35)) : r; }
    if (A.jump !== 1) { const j = m.jump * A.jump; m.jump = A.jump > 1 ? Math.max(m.jump, Math.min(j, 5.6 * 1.15)) : j; }
    if (A.gems !== 1) m.gemMul = Math.min(m.gemMul * A.gems, Math.max(m.gemMul, 4));
    if (F.stars) m.stars = true;
    if (F.seer) m.seer = true;
    if (F.shadow) m.dash = true;
    this.magnet = Math.max(gear.weapon === 'goldschaufel' ? 96 : 22, [0, 36, 52, 72][R.magnet || 0], this.ar.magnet ? 60 : 0);
    this.gemPull = F.magnet ? 72 : 0;
    this.stealth = F.stealth ? 0.45 : 0;
    this.rushMul = [1, 1.3, 1.6, 2][R.rausch || 0];
    if (A.rush !== 1) this.rushMul *= A.rush;
    this.pogoMul = 1 + (R.feder || 0) * 0.1;
    if (A.pogo !== 1) this.pogoMul = Math.max(this.pogoMul, Math.min(this.pogoMul * A.pogo, 1.35));
    this.airJumps = Number(gear.weapon === 'federklinge') + (this.ar.air || 0) + (R.sprint >= 3 ? 1 : 0);
    if (F.wall) this.airJumps = Math.min(this.airJumps, 1);
    this.wardN = this.ar.ward || 0; this.shieldT = 0; this.phoenix = R.phoenix || 0;
    this.dmg = Math.round(this.sh.dmg * this.mod.dmgMul);
    if (m.dmgAdd || A.dmgMul !== 1 || m.dmgMul < 1) {
      // Schaden aus Rüstung und Truhen-Waffen: höchstens ×2,5 der Schaufel (alte Waffen bleiben unberührt)
      let d = this.dmg; if (A.dmgMul !== 1) d = Math.max(d, Math.floor(d * A.dmgMul)); d += m.dmgAdd;
      this.dmg = Math.max(1, Math.min(d, Math.max(this.dmg, Math.ceil(this.sh.dmg * 2.5))));
    }
    this.reach = this.sh.reach + this.mod.reach;
    if (opt.pvp) {
      // Duell: keine Wiederbelebung, Reichweite, Tempo und Luftsprünge gedeckelt
      this.pvp = true; m.soul = false; m.vamp = false; this.healLeft = 2; this.rushMul = 1;
      this.reach = Math.max(15, Math.min(this.reach, 22)); this.airJumps = Math.min(this.airJumps, 2);
      m.run = Math.min(m.run, 2.25); m.jump = Math.min(m.jump, 5.9);
    }
    // Zähler der Effekte: Heilung (Regeneration und Lebensraub teilen sich 4 Herzen pro Level), Schildladungen, Echo, Spiegel
    this.regenT = 0; this.healLeft = 4; this.vampAt = 5; this.gemAcc = 0; this.gemCharges = 0; this.mirrorCd = 0; this.echoT = 0; this.revived = false; this.slowmo = false;
    // Statistiken für Sterne und Waffen-Bedingungen
    this.kills = 0; this.hurtCount = 0; this.bossHurt = 0; this.bossClean = false;
    this.emberSwings = 0; this.carryingEmber = false; this.altarWarned = false;
    this.chain = 0; this.maxChain = 0; this.soulUsed = false; this.streak = 0; this.streakT = 0;
    this.freeze = 0; this.nums = []; this.banner = null;
    this.tiles = level.map.map(r => r.split(''));
    this.h = this.tiles.length;
    this.w = this.tiles[0].length;
    this.rand = rng(opt.seed || 7);
    this.inputs = []; this.simOpt = { ...opt, marks: undefined }; this.autoPogo = opt.autoPogo !== false; this.dirty = new Set(); this.hiddenVer = 0;
    this.cheat = opt.cheats || {};
    this.pgrav = GRAV * (this.cheat.mond ? 0.5 : 1);
    if (A.grav !== 1) this.pgrav *= A.grav;
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
        case 'j': this.add({ type: 'brazier', x: px, y: py, w: 16, h: 16, lit: false }); break;
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
    if (level.hunt != null) populateHunt(this, level.hunt);
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
    const coins = this.ents.filter(e => e.type === 'coin');
    coins.sort((a, b) => a.x - b.x || a.y - b.y).forEach((c, i) => { c.idx = i; });
    // Seltene goldene Gegner (deterministisch pro Level)
    for (const e of this.ents) if (e.foe && e !== this.boss && ['beetle', 'blorb', 'knight', 'bat', 'spitter', 'kuckuck', 'toad', 'wisp', 'snail'].includes(e.type) && (this.rand() < this.goldChance() || this.cheat.midas)) {
      e.golden = true; e.hp += 2; e.loot = 60;
    }
    this.highCoin = coins.reduce((top, coin) => !top || coin.y < top.y ? coin : top, null)?.idx;
    this.coinTotal = coins.length;
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
    if (this.boss && this.bossTier) { this.boss.hp = this.boss.maxhp = Math.round(this.boss.maxhp * (1 + 0.3 * Math.min(4, this.bossTier))); }
    this.noCheck = !!opt.noCheck;
    if (level.chase) {
      const ch = level.chase, vert = ch.kind === 'flut' || ch.kind === 'lava';
      this.chase = { ...ch, vert, pos: vert ? this.h * T + 60 : -90, t: 0 };
    }
    if (opt.timeLimit) this.timeLimit = opt.timeLimit;
    this.hudLabel = opt.hudLabel || '';
    // Spuren anderer Spieler: Blutflecken mit Seelen und Botschaften
    this.carried = [];
    for (const m of opt.marks || []) {
      if (m.type === 'stain') this.add({ type: 'soul', x: m.x, y: m.y, w: 10, h: 14, name: m.name, tail: m.tail || null, taken: false, ph: Math.random() * 6 });
      else if (m.type === 'msg') this.add({ type: 'rune', x: m.x, y: m.y + 6, w: 14, h: 10, text: m.text, name: m.name });
    }
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
  goldChance() { const b = [0.07, 0.14, 0.2, 0.28][this.relic.glueck || 0], x = this.mod.luck + this.ar.luck; return x ? Math.min(0.45, b + x) : b; }
  heal(n = 1) {
    const p = this.p; if (p.dead || p.hp >= p.maxhp || this.healLeft <= 0) return false;
    p.hp = Math.min(p.maxhp, p.hp + n); this.healLeft--; this.ev('heal'); this.num(cx(p), p.y - 6, '+' + n, '#7dffa0'); this.burst(cx(p), p.y + 7, 10, 'spark', 1.2, -0.03, 18); return true;
  }
  // Treffer des Helden auf einen Gegner, inklusive Waffen-Effekten (Gift, Frost, Wind, Kettenblitz, Splitter)
  hitFoe(e, dmg, dir, src) {
    const hp0 = e.hp; e.hurtBy(this, e, dmg, dir, src);
    if (e.hp === hp0) return;
    const m = this.mod, p = this.p, alive = !e.dead && e.hp > 0 && e.foe;
    if (m.poison && alive) e.poison = 181;
    if (m.frost && alive && e !== this.boss) { e.frozen = 180; this.burst(cx(e), e.y + e.h / 2, 8, 'ice', 1.4, 0, 16); }
    if (m.push && alive && e !== this.boss) { e.vx = (dir || sign(cx(e) - cx(p))) * 5; if (!e.float) e.vy = -2.5; }
    if (m.chain && src !== 'chain' && src !== 'shard') {
      let best = null, bd = 90;
      for (const o of this.ents) if (o !== e && o.foe && !o.dead && !o.hidden) { const d = fdist(cx(o) - cx(e), o.y - e.y); if (d < bd) { bd = d; best = o; } }
      if (best) {
        for (let k = 0; k <= 8; k++) this.parts.push({ x: cx(e) + (cx(best) - cx(e)) * k / 8 + (k % 2 ? 2 : -2), y: e.y + 4 + (best.y - e.y) * k / 8, vx: 0, vy: 0, life: 10, col: 'spark', grav: 0 });
        this.ev('zap', best.x, best.y); this.hitFoe(best, Math.max(1, Math.ceil(dmg / 2)), sign(cx(best) - cx(e)), 'chain');
      }
    }
    if (m.shards && src !== 'shard' && src !== 'chain') for (const d of [-1, 1]) { const s = this.add(proj(cx(e) - 2, e.y, d * 1.8, -2.6, Math.max(1, Math.ceil(dmg / 2)), 'shard')); s.hit.add(e); }
  }
  // Bodenstoss: trifft Gegner rund um (x, y)
  quakeAt(x, y, r, dmg) {
    for (const e of this.ents) if (e.foe && !e.hidden && !e.dead && Math.abs(cx(e) - x) < r && Math.abs(e.y + e.h - y) < 26) e.hurtBy(this, e, dmg, sign(cx(e) - x), 'pogo');
    this.burst(x, y, 12, 'dust', 2.2, 0.05, 16); this.shake = Math.max(this.shake, 4);
  }
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
    this.setT(tx, ty, 'J'); this.shake = 4;
    this.dropGems(tx * T + 8, ty * T - 2, 25);
    this.secret(tx * T + 8, ty * T + 8, 'VERSTECKTER BLOCK!');
  }
  // Bröckelplattformen: zerfallen kurz nach dem Betreten, wachsen nach 3 Sekunden nach
  stepCrumbles() {
    for (const [k, c] of this.crumbles) {
      c.t++;
      if (c.state === 'shake' && c.t > 22) { this.setT(c.tx, c.ty, '.'); c.state = 'gone'; c.t = 0; this.burst(c.tx * T + 8, c.ty * T + 6, 8, 'crumble', 1.5); this.ev('crumble'); }
      else if (c.state === 'gone' && c.t > 180) {
        const p = this.p, box = { x: c.tx * T, y: c.ty * T, w: T, h: T };
        if (!overlap(p, box)) { this.setT(c.tx, c.ty, 'c'); this.crumbles.delete(k); }
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
  // Kachel ändern und den betroffenen Zeichen-Block (16×16) als veraltet markieren
  setT(tx, ty, c) { this.tiles[ty][tx] = c; this.dirty.add((tx >> 4) + ',' + (ty >> 4)); this.dirty.add((tx >> 4) + ',' + ((ty + 1) >> 4)); }

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
      // Hörner: Kopfstoss zerschlägt Erde und Stein
      if (b === this.p && this.af.horns) for (let tx = l; tx <= r; tx++) { const c = this.tile(tx, ty); if (c === 'D' || c === 'S') { this.breakTile(tx, ty); b.vy *= 0.7; } }
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
      this.setT(x, y, '.'); n++;
      this.revealAround(x, y);
      this.burst(x * T + 8, y * T + 8, 10, 'dirt', 2);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (n) { this.shake = 5; this.ev('crack'); this.secret(tx * T + 8, ty * T + 8, 'GEHEIMER GANG!'); }
  }
  revealAround(x, y) {
    const st = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    while (st.length) { const [a, b] = st.pop(), k = a + ',' + b; if (!this.hidden.has(k)) continue; this.hidden.delete(k); this.hiddenVer++; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  }
  isHidden(px, py) { return this.hidden.size > 0 && this.hidden.has(Math.floor(px / T) + ',' + Math.floor(py / T)); }
  breakTile(tx, ty) {
    const c = this.tile(tx, ty);
    if (c !== 'D' && c !== 'S' && c !== 'R' && !(c === '#' && this.cheat.maulwurf)) return;
    this.setT(tx, ty, '.');
    this.burst(tx * T + 8, ty * T + 8, 12, c === 'S' ? 'stone' : c === 'R' ? 'ore' : 'dirt', 2.2);
    this.shake = Math.max(this.shake, 3);
    this.ev(c === 'S' ? 'crack' : 'dig', tx * T, ty * T);
    this.dropGems(tx * T + 8, ty * T + 8, (c === 'R' ? 45 : c === 'S' ? 12 : (2 + Math.floor(this.rand() * 5)) * this.mod.dirtMul) + (this.relic.spaten || 0) * 2);
  }

  step(inp) {
    this.p.ox = this.p.x; this.p.oy = this.p.y;
    // Eingaben aufzeichnen (für Wiederholungen, Prüfung auf dem Server und Probeläufe)
    this.inputs.push((inp.left ? 1 : 0) | (inp.right ? 2 : 0) | (inp.down ? 4 : 0) | (inp.jump ? 8 : 0) | (inp.attack ? 16 : 0) | (inp.jumpP ? 32 : 0) | (inp.attackP ? 64 : 0));
    this.events.length = 0;
    for (const n of this.nums) { n.y -= 0.5; n.life--; }
    compact(this.nums, n => n.life > 0);
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
    this.stepGearFx();
    for (const e of this.ents) if (!e.dead && e.update) {
      if (e.frozen > 0) { if (--e.frozen === 0) this.burst(cx(e), e.y + e.h / 2, 10, 'ice', 1.6, 0.1, 18); if (e.iframe) e.iframe--; if (e.flash) e.flash--; continue; }
      if (this.slowmo && (e.foe || e.type === 'eproj') && this.frame % 2) continue;
      e.update(this, e);
      if (!e.dead && (e.elite === 'schnell' || (e === this.boss && this.bossTier && this.frame % Math.max(3, 7 - this.bossTier) === 0))) e.update(this, e);
    }
    this.stepTraps();
    this.contacts();
    compact(this.ents, e => !e.dead);
    for (const q of this.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vx *= 0.97; q.life--; }
    compact(this.parts, q => q.life > 0);
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
    if (this.shake > 0) this.shake *= 0.85, this.shake < 0.3 && (this.shake = 0);
    // Geist aufzeichnen (jeder 2. Frame)
    if (!this.done && this.frame % 2 === 0) this.rec.push([Math.round(this.p.x), Math.round(this.p.y), this.poseFlags()]);
  }

  // Laufende Effekte von Rüstung und Waffe (Regeneration, Lebensraub, Echo, Gift, Zeitlupe)
  stepGearFx() {
    const p = this.p, F = this.af, m = this.mod;
    if (this.mirrorCd > 0) this.mirrorCd--;
    this.slowmo = !!(F.calm && p.hp === 1 && p.maxhp > 1 && !p.dead && !this.done);
    if (F.regen && !p.dead && !this.done) { if (p.hp < p.maxhp) { if (++this.regenT >= F.regen * 60) { this.regenT = 0; this.heal(1); } } else this.regenT = 0; }
    if (m.vamp && this.kills >= this.vampAt) { this.vampAt += 5; this.heal(1); }
    if (this.echoT > 0 && --this.echoT === 0 && !p.dead) { const h = new Set(['fx']); this.swing(h); this.burst(p.face > 0 ? p.x + p.w + 8 : p.x - 8, p.y + 7, 8, 'ghost', 1.2, 0, 16); this.ev('swing'); }
    if (m.poison) for (const e of this.ents) if (e.poison > 0 && !e.dead) { if (--e.poison % 60 === 0 && e.foe && !e.hidden) e.hurtBy(this, e, 1, 0, 'gift'); }
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
      const F = this.af, acc = p.onGround ? (F.ice ? 0.42 : 0.32) : (F.gust ? 0.3 : 0.22);
      const RUN = F.gust && !p.onGround ? this.mod.run * 1.2 : this.mod.run;
      if (p.wallLock > 0) p.wallLock--;
      else if (p.dash > 0) { /* Geister-Sprint */ }
      else if (i.left && !i.right) { if (p.onGround && p.vx > 1.2) this.parts.push({ x: p.x + 8, y: p.y + 13, vx: 0.6, vy: -0.4, life: 12, col: 'dust', grav: 0 }); p.vx = Math.max(-RUN, p.vx - acc); p.face = -1; }
      else if (i.right && !i.left) { if (p.onGround && p.vx < -1.2) this.parts.push({ x: p.x + 2, y: p.y + 13, vx: -0.6, vy: -0.4, life: 12, col: 'dust', grav: 0 }); p.vx = Math.min(RUN, p.vx + acc); p.face = 1; }
      else { p.vx *= p.onGround ? (F.ice ? 0.93 : 0.68) : 0.93; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
    }
    p.coyote = p.onGround ? 6 : Math.max(0, p.coyote - 1);
    if (p.onGround) p.airLeft = this.airJumps;
    if (p.onGround && Math.abs(p.vx) > 1 && this.frame % 13 === 0) this.ev('step', p.x, p.y, p.groundC);
    if (p.onGround && !p.plat && p.groundC !== 'c' && this.frame % 10 === 0) this.lastSafe = { x: p.x, y: p.y };
    if (this.relic.schild && this.shieldT > 0) this.shieldT--;
    p.jbuf = i.jumpP ? 7 : Math.max(0, p.jbuf - 1);
    if (p.jbuf && p.onGround && i.down && (p.groundC === '=' || p.plat)) { p.drop = 10; p.y += 2; p.jbuf = 0; p.onGround = false; p.plat = null; }
    else if (p.jbuf && this.af.wall && p.wallT > 0 && !p.onGround && !p.coyote && p.hurt <= 0) {
      // Wandsprung: von der Wand abstossen
      p.vy = -this.mod.jump * 0.92; p.vx = -p.wallDir * 3.2; p.face = -p.wallDir; p.wallT = 0; p.wallLock = 8; p.jbuf = 0; p.jumping = true; this.ev('jump');
      this.burst(p.wallDir > 0 ? p.x + p.w : p.x, p.y + 8, 6, 'dust', 1, 0, 12);
    }
    else if (p.jbuf && (p.coyote || this.cheat.wolken || (p.airLeft > 0 && !p.onGround)) && p.hurt <= 0) {
      if (!p.coyote && !this.cheat.wolken) { p.airLeft--; this.burst(cx(p), p.y + p.h, 8, 'spark', 1.2, 0, 14); }
      p.vy = -this.mod.jump; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.jumping = true; this.ev('jump');
      this.burst(cx(p), p.y + p.h, 4, 'dust', 0.8, 0, 14);
    } else if (i.jumpP && this.mod.dash && !p.onGround && !p.dashUsed && p.hurt <= 0) {
      p.dash = 18; p.dashUsed = true; p.jbuf = 0; p.vx = p.face * 5; p.vy = 0; p.inv = Math.max(p.inv, 20); p.jumping = false;
      this.ev('dash'); this.burst(cx(p), p.y + 7, 10, 'ghost', 1.5, 0, 18);
    }
    if (p.dash > 0) { p.dash--; p.vx = p.face * 5; p.vy = 0; if (p.dash % 2) this.parts.push({ x: p.x + 5, y: p.y + 7, vx: 0, vy: 0, life: 14, col: 'ghost', grav: 0 }); }
    // Mindestsprung: erst nach 4 Bildern darf ein kurzes Antippen den Sprung abbrechen
    if (p.jumping) p.jt = (p.jt || 0) + 1; else p.jt = 0;
    if (!i.jump && p.jumping && p.jt >= 4 && p.vy < -2.2) p.vy = -2.2;

    if (p.atkCd > 0) p.atkCd--;
    const L = this.mod.atkLen;
    // Handy: B im Fallen = Schaufel-Sprung (bleibt bis zur Landung), B im Steigen = normaler Hieb
    if (this.autoPogo && (i.attackP || this.pendAtk) && !p.onGround && !p.pogoLatch && p.vy > 0.3 && p.hurt <= 0 && !i.down) { this.pendAtk = false; p.pogoLatch = true; this.ev('swing'); }
    else if (this.autoPogo && i.attackP && p.pogoLatch) { p.pogoLatch = false; }
    if ((i.attackP || this.pendAtk) && p.atk === 0 && p.atkCd === 0 && !p.pogoLatch) {
      this.pendAtk = false; p.atk = L; p.atkLen = L; p.hits = new Set(); this.ev('swing');
      if (this.mod.echo) this.echoT = 18;
      if (this.mod.boomerang && !this.ents.some(e => e.kind === 'boomerang')) { const b = this.add(proj(p.face > 0 ? p.x + p.w : p.x - 8, p.y + 3, p.face * 4.2, 0, this.dmg, 'boomerang')); b.dir = p.face; }
    }
    if (p.atk > 0) {
      p.atk--; if (p.atk === 0) p.atkCd = L < 11 ? 0 : 2;
      if (p.atk <= L * 0.75 && p.atk >= L * 0.3) this.swing();
    }
    if (p.onGround || p.hurt > 0) p.pogoLatch = false;
    p.pogo = !p.onGround && (i.down || p.pogoLatch) && p.atk === 0 && p.hurt <= 0;

    if (p.dash <= 0) p.vy = Math.min(MAXFALL, p.vy + this.pgrav);
    if (this.af.glide && i.jump && !p.pogo && p.dash <= 0 && p.hurt <= 0) { const gv = this.af.wall ? 1.6 : this.airJumps >= 2 ? 1.5 : 1.1; if (p.vy > gv) { p.vy = gv; if (this.frame % 4 === 0) this.parts.push({ x: cx(p) - p.face * 4, y: p.y + 4, vx: -p.face * 0.4, vy: 0.3, life: 14, col: 'ghost', grav: 0 }); } }
    if (this.af.wall && p.wallT > 0 && p.vy > 1.5 && (p.wallDir > 0 ? i.right : i.left)) p.vy = 1.5;
    if (this.af.sparks && p.onGround && Math.abs(p.vx) > 1.2 && this.frame % 7 === 0) this.add(proj(cx(p) - 2, p.y + p.h - 5, 0, 0, 1, 'spark'));
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
    if (this.af.wall) { const d = i.right && !i.left ? 1 : i.left && !i.right ? -1 : 0; if (p.hitWall && !p.onGround && d) { p.wallT = 6; p.wallDir = d; } else if (p.wallT > 0) p.wallT--; }
    this.moveY(p);
    p.plat = null;
    if (!p.onGround && p.vy >= 0 && !p.drop) {
      for (const pl of this.plats) {
        if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && prevBot <= pl.y + 2 + Math.abs(pl.dy) && p.y + p.h >= pl.y) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.plat = pl; p.ground = { c: '=' }; break;
        }
      }
      // Frostspaten: eingefrorene Gegner tragen den Helden
      if (!p.onGround && this.mod.frost) for (const e of this.ents) {
        if (e.frozen > 0 && !e.dead && p.x + p.w > e.x + 1 && p.x < e.x + e.w - 1 && prevBot <= e.y + 2 && p.y + p.h >= e.y) { p.y = e.y - p.h; p.vy = 0; p.onGround = true; p.ground = { c: '=' }; break; }
      }
    }
    if (p.onGround) {
      if (!wasGround && fallV > 3) { p.land = this.af.ice ? 0 : 6; this.burst(cx(p), p.y + p.h, 5, 'dust', 1, 0, 14); }
      if (!wasGround && fallV > 5 && this.af.stomp) this.quakeAt(cx(p), p.y + p.h, 30, 1);
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
      else if (e.foe && !e.hidden && e.spiky && !(e.frozen > 0)) { this.hurtPlayer(e.dmg, sign(cx(p) - cx(e)) || 1, true); this.ev('clink'); hit = true; }
      else if (e.foe && !e.hidden) { this.hitFoe(e, this.dmg * (sh.pogoDmg || 1), 0, 'pogo'); hit = true; }
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
      for (const e of this.ents) if (e.foe && !e.hidden && !e.dead && Math.abs(cx(e) - cx(p)) < 64 && Math.abs(e.y + e.h - (p.y + p.h)) < 40) e.hurtBy(this, e, Math.max(1, Math.ceil(this.dmg / 2)), sign(cx(e) - cx(p)), 'pogo');
      this.burst(cx(p), p.y + p.h, 16, 'dust', 2.5, 0.05, 18); this.shake = Math.max(this.shake, 4);
    }
    if (hit && this.af.stomp) this.quakeAt(cx(p), p.y + p.h, 34, 1);
    if (hit && this.mod.thunder) for (const d of [-1, 1]) this.add(proj(cx(p) - 5 + d * 6, p.y + p.h - 6, d * 3.2, 0, Math.max(1, Math.ceil(this.dmg / 2)), 'thunder'));
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
      if (this.chain === 18) this.ev('unlock', p.x, p.y, 'sternenspaten');
      if (this.gear.weapon === 'sternenspaten' && this.chain >= 3) for (const d of [-1, 1]) this.add(proj(cx(p) - 3, p.y, d * 2.3, -1.8, this.dmg, 'star'));
      if (this.mod.stars) for (const d of [-1, 1]) this.add(proj(cx(p) - 3, p.y + p.h - 4, d * 2.6, 1.2, this.dmg, 'star'));
    }
  }

  swing(hits) {
    const p = this.p, sh = this.sh, H = hits || p.hits;
    const R = this.reach;
    const box = { x: p.face > 0 ? p.x + p.w : p.x - R, y: p.y + 2, w: R, h: 10 };
    if (!H.has('fx')) {
      H.add('fx');
      if (this.boss?.type === 'golem' && this.boss.state !== 'idle') this.boss.sideSwing = true;
      if (this.gear.weapon === 'urfunke' && ++this.emberSwings % 3 === 0)
        this.add(proj(cx(p), p.y + 5, p.face * 4, 0, this.dmg, 'ember'));
      if (this.gear.weapon === 'spuerschaufel') {
        const ty = Math.floor((p.y + 7) / T);
        for (let i = 1; i <= 4; i++) {
          const tx = Math.floor(cx(p) / T) + p.face * i;
          if (this.tile(tx, ty) === 'F') this.breakFake(tx, ty);
          if (this.solid(tx, ty)) break;
        }
      }
      if (this.mod.fire) this.burst(p.face > 0 ? p.x + p.w + R / 2 : p.x - R / 2, p.y + 7, 10, 'fire', 1.4, -0.05, 20);
      if (this.mod.wave && p.onGround) { this.add(proj(p.face > 0 ? p.x - 10 : p.x + p.w, p.y + p.h - 10, -p.face * 3, 0, this.dmg, 'wave')); this.add(proj(p.face > 0 ? p.x + p.w : p.x - 10, p.y + p.h - 10, p.face * 3, 0, this.dmg, 'wave')); this.ev('wave'); }
    }
    for (const e of this.ents) {
      if (e.dead || H.has(e) || !overlap(box, e)) continue;
      if (e.foe && !e.hidden) { H.add(e); this.hitFoe(e, this.dmg, p.face); }
      else if (e.type === 'chest' && !e.open) { H.add(e); this.openChest(e); }
      else if (e.type === 'rock') { e.dead = true; this.burst(cx(e), e.y + 5, 8, 'stone'); this.ev('crack'); }
      else if (e.type === 'eproj' && e.kind !== 'shock') { e.dead = true; this.burst(cx(e), e.y + 4, 8, 'spark', 2); this.ev('clink'); }
    }
    for (let ty = Math.floor(box.y / T); ty <= Math.floor((box.y + box.h - 0.01) / T); ty++)
      for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - 0.01) / T); tx++) {
        const c = this.tile(tx, ty);
        if (c === 'D' || (c === 'S' && sh.stone) || (c === 'R' && sh.ore) || (c === '#' && this.cheat.maulwurf && ty < this.h - 1)) this.dig(tx, ty);
        else if (c === 'F') this.breakFake(tx, ty);
        else if ((c === 'S' || c === 'R') && !H.has('clink')) {
          H.add('clink'); this.ev('clink'); this.burst(tx * T + (p.face > 0 ? 0 : 16), p.y + 7, 6, 'spark', 2, 0.05, 12);
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
    if (this.wardN > 0 || (this.relic.schild && this.shieldT <= 0) || this.gemCharges > 0) {
      if (this.wardN > 0) this.wardN--; else if (this.relic.schild && this.shieldT <= 0) this.shieldT = [0, 40, 30, 20][this.relic.schild] * 60; else this.gemCharges--;
      p.inv = 60; this.freeze = Math.max(this.freeze, 6); this.ev('shield', p.x, p.y);
      this.burst(cx(p), p.y + 7, 20, 'spark', 2.2, 0, 22); this.num(cx(p), p.y - 6, 'GEBLOCKT', '#7ad0ff');
      if (spike) { p.vy = -6; p.onGround = false; }
      return;
    }
    if (dmg <= 0) return;
    this.quenchEmber();
    p.hp -= dmg + (this.af.glass ? 1 : 0); this.hurtCount++; this.bossHurt++; if (!this.rushT) this.rush = Math.max(0, this.rush - 45);
    p.inv = this.ar.inv || 50; this.freeze = Math.max(this.freeze, 4); this.chain = 0; p.hurt = Math.round(14 * this.ar.kb) + 4;
    p.vx = (dir || -p.face) * 2.2 * this.ar.kb; p.vy = spike ? -6 : -3; p.onGround = false; p.jumping = false;
    this.shake = 5; this.ev('hurt');
    if (this.af.ember) {
      // Glutkern: Feuerstoss rundum
      for (const e of this.ents) if (e.foe && !e.hidden && !e.dead && fdist(cx(e) - cx(p), e.y - p.y) < 44) e.hurtBy(this, e, this.dmg, sign(cx(e) - cx(p)), 'fire');
      this.burst(cx(p), p.y + 7, 26, 'fire', 2.6, -0.04, 26);
    }
    if (p.hp <= 0) this.kill();
  }
  quenchEmber() {
    if (!this.carryingEmber) return;
    this.carryingEmber = false;
    const altar = this.ents.find(e => e.type === 'altar');
    if (altar) altar.taken = false;
    this.banner = { text: 'GLUT ERLOSCHEN', sub: 'Kehre zum Himmelsaltar zurück', col: '#ffa060', t: 100 };
  }
  kill(fell) {
    this.quenchEmber();
    const p = this.p;
    if (p.dead) return;
    if (fell === true && this.ar.rewind && (p.hp > 1 || this.af.rewind) && this.lastSafe) {
      p.x = this.lastSafe.x; p.y = this.lastSafe.y; p.vx = p.vy = 0; if (!this.af.rewind) p.hp--; p.inv = 90; this.ev('revive'); this.freeze = 12;
      this.num(cx(p), p.y - 6, 'ZURÜCKGESPULT', '#ffd84a'); this.burst(cx(p), p.y + 7, 18, 'gold', 2, 0, 24); return;
    }
    // Wiederbelebung: höchstens einmal pro Level, egal aus wie vielen Quellen
    if (this.phoenix && !this.phoenixUsed && !this.revived && !this.cheat.gott) {
      this.phoenixUsed = true; this.revived = true;
      if (fell) { p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; }
      p.hp = Math.min(p.maxhp, this.phoenix * 2); p.inv = 120; p.hurt = 0;
      this.burst(cx(p), p.y + 7, 36, 'fire', 2.8, -0.06, 44); this.ev('revive'); this.freeze = 20; this.shake = 6;
      this.banner = { text: 'AUS DER ASCHE', col: '#ff8a2a', t: 90 }; return;
    }
    if (this.af.phoenix && !this.revived && !this.cheat.gott) {
      this.revived = true;
      if (fell) { p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; }
      p.hp = Math.min(p.maxhp, Math.round(this.af.phoenix)); p.inv = 120; p.hurt = 0;
      this.burst(cx(p), p.y + 7, 40, 'fire', 3, -0.07, 46); this.ev('revive'); this.freeze = 20; this.shake = 6;
      this.banner = { text: 'PHÖNIXFLAMME', col: '#ff8a2a', t: 90 }; return;
    }
    if (this.mod.soul && !this.soulUsed && !this.revived) {
      // Seelenschaufel: einmal auferstehen
      this.soulUsed = true; this.revived = true; this.addRush(100);
      if (fell) { p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; }
      p.hp = p.maxhp; p.inv = 120; p.hurt = 0;
      this.burst(cx(p), p.y + 7, 30, 'soul', 2.5, -0.05, 40);
      this.ev('revive'); this.freeze = 20; this.shake = 6;
      this.banner = { text: 'SEELE ENTFESSELT', col: '#b07aff', t: 90 };
      return;
    }
    p.dead = 70; p.hp = 0; this.chain = 0; this.deaths++;
    const lost = 0; // kein Edelstein-Verlust mehr beim Tod: schwere Stellen sollen nicht doppelt bestrafen
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
    for (const [k, f] of this.flips) { this.setT(f.tx, f.ty, 'K'); this.flips.delete(k); }
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
      if (f.state === 'warn') { f.state = 'open'; f.t = 100; this.setT(f.tx, f.ty, '.'); this.burst(f.tx * T + 8, f.ty * T + 4, 6, 'dust', 1.2); this.ev('flip'); }
      else { const ov = p.x + p.w > f.tx * T && p.x < f.tx * T + T && p.y + p.h > f.ty * T && p.y < f.ty * T + T; if (ov) { f.t = 10; continue; } this.setT(f.tx, f.ty, 'K'); this.flips.delete(k); }
    }
    // Trollblöcke: unsichtbar und fest, werden beim Anstossen sichtbar
    for (let ty = Math.floor((p.y - 1) / T); ty <= Math.floor((p.y + p.h + 1) / T); ty++) for (let tx = Math.floor((p.x - 1) / T); tx <= Math.floor((p.x + p.w + 1) / T); tx++)
      if (this.tile(tx, ty) === 'I') { this.setT(tx, ty, 'J'); this.ev('troll', tx * T, ty * T); this.num(tx * T + 8, ty * T - 2, 'HA!', '#ff7a8a'); this.burst(tx * T + 8, ty * T + 8, 10, 'spark', 1.5); }
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
    let k = 0;
    for (const e of this.ents) if (e.type === 'soul') {
      e.ph += 0.06;
      if (e.taken) { k++; const tx = p.x - p.face * (10 + k * 9), ty = p.y - 6 - k * 3 + Math.sin(e.ph) * 3; e.x += (tx - e.x) * 0.08; e.y += (ty - e.y) * 0.08; }
    }
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
          if (this.af.gemShield) { this.gemAcc += e.val; while (this.gemAcc >= 50) { this.gemAcc -= 50; if (this.gemCharges < 2) { this.gemCharges++; this.num(cx(p), p.y - 10, 'SCHILD', '#7ad0ff'); } } }
          this.streak++; this.streakT = 45;
          this.ev('gem', e.x, e.y, this.streak);
          if (this.cheat.konfetti) this.burst(e.x + 3, e.y, 6, 'confetti', 2, 0.08, 40);
          if (v >= 5) this.num(e.x + 3, e.y - 2, '+' + v, '#a8d4ff');
          this.burst(e.x + 3, e.y + 3, 4, 'spark', 1, 0, 10);
        } break;
        case 'coin': e.dead = true; this.coins.push(e.idx); this.ev('coin', e.x, e.y, e.idx); this.freeze = Math.max(this.freeze, 10);
          this.banner = { text: 'SCHAUFELMÜNZE!', sub: `${this.coins.length} / ${this.coinTotal}`, col: '#ffd84a', t: 70 }; this.burst(e.x + 6, e.y + 6, 30, 'gold', 3, 0.03, 40); this.addRush(20); break;
        case 'door': if (!this.done) { this.done = true; this.exit = 'secret'; this.ev('win'); this.burst(e.x + 8, e.y + 12, 30, 'spark', 3, 0.05, 40); } break;
        case 'brazier':
          if (this.carryingEmber && !e.lit) {
            this.carryingEmber = false; e.lit = true;
            this.ev('unlock', e.x, e.y, 'urfunke');
            this.burst(cx(e), e.y, 32, 'fire', 2.5, -0.04, 40);
          }
          break;
        case 'altar':
          if (e.taken) break;
          if (this.level.altar === 'spuerschaufel') {
            if (this.deaths || this.coins.length < this.coinTotal) {
              if (!this.altarWarned) this.banner = { text: 'GRUFTSIEGEL', sub: this.deaths ? 'Beginne die Gruft ohne Tod erneut' : 'Finde alle drei Gruftmünzen', col: '#9affd8', t: 100 };
              this.altarWarned = true;
              break;
            }
            this.ev('unlock', e.x, e.y, 'spuerschaufel');
          } else {
            this.carryingEmber = true;
            this.banner = { text: 'HIMMELSGLUT', sub: 'Zurück zur Feuerschale am Pilzplateau', col: '#ffe070', t: 120 };
          }
          e.taken = true; this.burst(cx(e), e.y + 4, 40, this.carryingEmber ? 'fire' : 'spark', 3, -0.05, 50); this.shake = 8;
          break;
        case 'apple': if (p.hp < p.maxhp) { e.dead = true; p.hp = Math.min(p.maxhp, p.hp + 2); this.ev('heal'); } break;
        case 'lantern': if (!e.lit) { for (const o of this.ents) if (o.type === 'lantern') o.lit = false; e.lit = true; if (!this.noCheck) this.check = { x: e.x - 1, y: e.y }; this.ev('check'); this.burst(e.x + 4, e.y + 4, 14, 'spark', 1.5, 0, 24); } break;
        case 'goal':
          // Easter Egg: auf der Fahnenspitze landen
          if (!this.flagBonus && p.vy > 0 && p.y + p.h <= e.y + 12 && !this.done) { this.flagBonus = true; this.gems += 100; this.ev('flag'); this.banner = { text: 'FAHNENSPITZE!', sub: '+100', col: '#7dffcf', t: 70 }; this.burst(e.x + 6, e.y, 30, 'gold', 3, 0.05, 40); }
          if (!this.done && !(this.boss && !this.boss.dead)) { this.done = true; this.ev('win'); this.burst(cx(e), e.y + 6, 30, 'spark', 3, 0.05, 40); } break;
        case 'sign': this.sign = e.text; break;
        case 'rock': if (!e.landed) { e.dead = true; this.hurtPlayer(1, sign(cx(p) - cx(e))); } break;
        case 'cog': if (p.safe <= 0) this.hurtPlayer(1, sign(cx(p) - cx(e))); break;
        case 'soul': if (!e.taken) { e.taken = true; this.carried.push(e.name); this.ev('soul', e.x, e.y, e.name); this.freeze = Math.max(this.freeze, 8); this.burst(e.x + 5, e.y + 7, 24, 'soul', 2, -0.04, 34);
          this.banner = { text: 'SEELE GEBORGEN', sub: e.name.toUpperCase(), col: '#c58bff', t: 80 };
          if (e.tail && e.tail.length) this.add({ type: 'echo', tail: e.tail, i: 0, name: e.name, x: 0, y: 0, w: 0, h: 0, update(g, o) { if (g.frame % 2 === 0 && ++o.i >= o.tail.length) { o.dead = true; g.burst(o.tail[o.tail.length - 1][0] + 5, o.tail[o.tail.length - 1][1] + 7, 16, 'soul', 2, 0, 24); } } }); } break;
        case 'rune': this.sign = '»' + e.text + '« – ' + e.name; break;
        case 'saw': this.hurtPlayer(2, sign(cx(p) - cx(e)) || 1); break;
        case 'icicle': if (e.state !== 'gone') { this.hurtPlayer(e.state === 'fall' ? 2 : 1, sign(cx(p) - cx(e)) || 1); if (e.state === 'fall') { e.state = 'gone'; e.t = 240; this.burst(cx(e), e.y + 10, 10, 'stone', 2); } } break;
        case 'eproj':
          if (this.af.mirror && e.kind !== 'shock' && this.mirrorCd <= 0 && !p.dead) {
            // Spiegelplatte: Geschoss kehrt um und trifft Gegner
            e.dead = true; this.mirrorCd = 45;
            let vx = -e.vx * 1.3, vy = -e.vy; if (Math.abs(vx) < 1 && Math.abs(vy) < 1) vx = p.face * 3;
            this.add(proj(e.x, e.y, vx, vy, Math.max(2, this.dmg), 'mirror')); this.ev('clink'); this.num(cx(p), p.y - 6, 'GESPIEGELT', '#9ad8ff'); this.burst(e.x + 2, e.y + 2, 8, 'spark', 2);
            break;
          }
          if (p.safe <= 0 || e.kind === 'shock') { if (e.kind !== 'shock') e.dead = true; this.hurtPlayer(e.dmg, sign(cx(p) - cx(e))); } break;
        default:
          if (e.frozen > 0) break;
          if (e.foe && !e.hidden && p.dash > 0 && this.af.shadow) { e.hurtBy(this, e, this.dmg, p.face, 'dash'); break; }
          if (e.foe && !e.hidden && p.safe <= 0 && e.dmg) this.hurtPlayer(e.dmg, sign(cx(p) - cx(e)));
          if (this.af.thorns && e.foe && !e.hidden && !e.dead && e.dmg && !(e.iframe > 0)) e.hurtBy(this, e, Math.round(this.af.thorns), 0, 'thorn');
      }
    }
    if (this.boss && this.boss.state === 'idle' && this.level.gate != null && p.x > (this.level.gate + 2) * T) this.startBoss();
  }

  /* ---------- Boss ---------- */
  setGate(c) { for (let y = 2; y <= 10; y++) this.setT(this.level.gate, y, c); }
  startBoss() { this.bossHurt = 0; this.setGate('X'); this.boss.state = 'roar'; this.boss.t = 70; this.shake = 6; this.ev('bossStart'); }
  resetBoss() {
    const b = this.boss;
    Object.assign(b, { x: b.home.x, y: b.home.y, hp: b.maxhp, state: 'idle', t: 0, hidden: false, vx: 0, vy: 0 });
    this.ents = this.ents.filter(e => e.type !== 'rock' && e.type !== 'eproj');
    b.sideSwing = false; b.nonPogo = false; b.cyc = 0;
    if (b.isChief) { b.foe = true; b.flash = 0; b.iframe = 0; }
    this.setGate('.');
  }
  bossDefeated(b) {
    b.state = 'dying'; b.t = 100; b.foe = false; this.ev('bossDie'); this.shake = 10; this.freeze = 30;
    this.bossClean = this.bossHurt === 0;
    if (b.type === 'mole' && this.bossClean && this.gear.shovel === 0 && !this.gear.weapon) this.ev('unlock', b.x, b.y, 'maulwurfkralle');
    if (b.type === 'golem' && !b.nonPogo && !b.sideSwing) this.ev('unlock', b.x, b.y, 'pendelhammer');
    if (this.bossClean) this.ev('bossClean');
  }
}


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

