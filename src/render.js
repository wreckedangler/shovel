// Zeichnet einen Game-Zustand in eine kleine Pixel-Leinwand (z. B. 320×180).
import { COSMETICS } from './loot.js';
const COSMETIC_COL = Object.fromEntries(COSMETICS.filter(c => c.col).map(c => [c.id, c.col]));
const COSMETIC_FILTER = Object.fromEntries(COSMETICS.filter(c => c.filter).map(c => [c.id, c.filter]));
const COSMETIC_TINT = Object.fromEntries(COSMETICS.filter(c => c.tint).map(c => [c.id, c.tint]));
// Ältere Browser (z. B. Safari vor iOS 18) kennen ctx.filter nicht: dann färben wir über einen Zwischenpuffer
const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(1px)'; return c.filter === 'blur(1px)'; } catch { return false; } })();
import { T } from './game.js';
import { Atmo } from './atmo.js';
import { THEMES } from './themes.js';
import { TIERS } from './gear.js';
import { weaponById, RARITY } from './weapons.js';
import { ghostAt, fmtTime } from './ghost.js';
import { drawLegend } from './legend-art.js';
import { drawHunter } from './hunt-art.js';
import * as S from './sprites.js';

const K = '#140c1c';

export class Renderer {
  constructor(ctx) { this.x = ctx; this.cam = { x: 0, y: 0 }; this.t = 0; }
  resize(w, h) { this.W = w; this.H = h; }

  snapCamera(g) { this.cam = this.target(g); }
  target(g) {
    const p = g.camFocus || g.p;
    // Vorausblick: in Blickrichtung und mit dem Tempo, weich nachgeführt
    const want = p.face * (this.W < 260 ? 40 : 52) + p.vx * 10;
    this.lead = (this.lead ?? want) + (want - (this.lead ?? want)) * 0.05;
    let x = p.x + p.w / 2 + this.lead - this.W / 2;
    let y0 = p.y - this.H * 0.55;
    // Duell: Mitte zwischen beiden, aber der eigene Held bleibt mit Rand im Bild
    if (g.camFocus) { const q = g.p, m = Math.min(48, this.W * 0.22); x = Math.max(q.x + q.w + m - this.W, Math.min(q.x - m, x)); y0 = Math.max(q.y + 40 - this.H, Math.min(q.y - 30, y0)); }
    x = Math.max(0, Math.min(g.w * T - this.W, x));
    const maxY = g.h * T - this.H;
    // Ist die Ansicht höher als das Level (Hochformat), sitzt der Boden unten und oben ist Himmel
    const y = maxY < 0 ? maxY : Math.max(0, Math.min(maxY, y0));
    return { x, y };
  }

  draw(g, ghosts = []) {
    // Zwischenwert zwischen zwei Logikschritten: flüssig auf 90/120-Hz-Bildschirmen
    const p0 = g.p, al = this.alpha ?? 1, rx = p0.x, ry = p0.y;
    if (p0.ox !== undefined && Math.abs(p0.x - p0.ox) < 24 && Math.abs(p0.y - p0.oy) < 24) { p0.x = p0.ox + (p0.x - p0.ox) * al; p0.y = p0.oy + (p0.y - p0.oy) * al; }
    try { this.drawFrame(g, ghosts); } finally { p0.x = rx; p0.y = ry; }
  }
  drawFrame(g, ghosts = []) {
    const x = this.x, W = this.W, H = this.H, th = THEMES[g.level.theme];
    this.t++;
    const tg = this.target(g);
    this.cam.x += (tg.x - this.cam.x) * 0.14; this.cam.y += (tg.y - this.cam.y) * 0.1;
    const sk = g.shake * (this.shakeMul ?? 1), sh = sk ? (Math.random() - 0.5) * sk : 0;
    const cx = Math.round(this.cam.x + sh), cy = Math.round(this.cam.y + (sk ? (Math.random() - 0.5) * sk : 0));

    // Kulisse
    const bg = S.backdrop(th, H);
    x.drawImage(bg.sky, 0, 0, W, H);
    x.fillStyle = th.stars;
    for (const s of bg.stars) if ((this.t / 20 + s.p) % 6 > 1) x.fillRect(((s.x - cx * 0.05) % W + W) % W, s.y, 1, 1);
    for (const [img, f] of [[bg.far, 0.2], [bg.near, 0.45]]) {
      const ox = -Math.round(cx * f) % img.width;
      for (let k = ox - img.width; k < W; k += img.width) x.drawImage(img, k, Math.round(-cy * f * 0.3));
    }

    const A = this.atmo || (this.atmo = new Atmo());
    if (A.level !== g.level) A.reset(g.level, W, H); A.W = W; A.H = H;
    A.weather(x, g, cx, cy, this.t, false);
    A.rays(x, cx, this.t, g.level.theme);
    x.save(); x.translate(-cx, -cy);
    this.tiles(g, th, cx, cy);
    this.steam(g);
    const ps = S.platSprite();
    for (const pl of g.plats) x.drawImage(ps, Math.round(pl.x), Math.round(pl.y));
    if (g.boss?.legend && !g.boss.dead) drawLegend(x,g.boss,this.t);
    for (const e of g.ents) this.ent(g, e, th);
    for (const gh of ghosts) this.ghost(gh, g.frame);
    this.player(g);
    if (g.drawExtra) g.drawExtra(this, th);
    if (g.chase) this.chaseFx(g, cx, cy);
    for (const q of g.parts) {
      if (q.z) { x.globalAlpha = Math.min(1, q.life / 20); S.drawText(x, 'Z', Math.round(q.x), Math.round(q.y), '#ffffff'); x.globalAlpha = 1; continue; }
      x.fillStyle = partCol(q.col, th, g, q);
      const s = q.life > 12 ? 2 : 1;
      x.fillRect(Math.round(q.x), Math.round(q.y), s, s);
    }
    for (const n of g.nums) {
      x.globalAlpha = Math.min(1, n.life / 15);
      S.drawText(x, n.txt, Math.round(n.x) + 1, Math.round(n.y) + 1, K, 1, 'center');
      S.drawText(x, n.txt, Math.round(n.x), Math.round(n.y), n.col, 1, 'center');
    }
    x.globalAlpha = 1;
    x.restore();

    A.light(x, g, cx, cy, this.t);
    A.fore(x, g.level.theme, cx, cy, H);
    A.weather(x, g, cx, cy, this.t, true);
    this.hud(g, ghosts);
  }

  // Verfolger zeichnen: steigende Flut/Lava oder Wurm/Einsturz von links
  chaseFx(g, cx, cy) {
    const x = this.x, ch = g.chase, t = this.t;
    if (ch.vert) {
      const lava = ch.kind === 'lava', top = ch.pos;
      for (let sx = Math.floor(cx / 2) * 2; sx < cx + this.W; sx += 2) {
        const wy = top + Math.round(Math.sin(sx / 9 + t / 8) * 2 + Math.sin(sx / 23 - t / 13) * 1.5);
        x.fillStyle = lava ? '#ffb030' : '#9ad8ff'; x.fillRect(sx, wy, 2, 2);
        x.fillStyle = lava ? '#e04010' : '#2a6ab0'; x.fillRect(sx, wy + 2, 2, cy + this.H - wy + 4);
      }
      x.fillStyle = lava ? 'rgba(255,90,20,0.25)' : 'rgba(40,120,220,0.25)'; x.fillRect(cx, top - 12, this.W, 12);
      if (t % 3 === 0) g.parts.push({ x: cx + Math.random() * this.W, y: top, vx: 0, vy: -0.6 - Math.random(), life: 20, col: lava ? 'fire' : 'ice', grav: 0.04 });
    } else {
      const fx = ch.pos;
      if (ch.kind === 'decke') {
        for (let sy = Math.floor(cy / 8) * 8; sy < cy + this.H; sy += 8) { x.fillStyle = (sy >> 3) & 1 ? '#3a3040' : '#2a2030'; x.fillRect(cx, sy, fx - cx + Math.round(Math.sin(sy + t / 3) * 4), 8); }
        if (t % 2 === 0) g.parts.push({ x: fx + Math.random() * 30, y: cy - 4, vx: 0, vy: 2 + Math.random() * 2, life: 50, col: 'stone', grav: 0.2 });
      } else {
        // Riesenwurm: Maul mit Zähnen
        for (let sy = Math.floor(cy / 4) * 4; sy < cy + this.H; sy += 4) { const w = 10 + Math.sin(sy / 14 + t / 6) * 4; x.fillStyle = '#5a2a3a'; x.fillRect(cx, sy, fx - cx + w, 4); x.fillStyle = '#8a3a4a'; x.fillRect(fx + w - 3, sy, 3, 4); }
        for (let sy = Math.floor(cy / 10) * 10; sy < cy + this.H; sy += 10) { x.fillStyle = '#f0e8d0'; x.fillRect(fx + 12 + Math.sin(sy + t / 4) * 3, sy + 2, 5, 3); x.fillStyle = K; x.fillRect(fx + 16 + Math.sin(sy + t / 4) * 3, sy + 3, 2, 1); }
        const ey = g.p.y - 10; x.fillStyle = '#ffd84a'; x.fillRect(fx - 4, ey, 5, 5); x.fillStyle = K; x.fillRect(fx - 2, ey + 1, 2, 3);
      }
    }
  }
  steam(g) {
    const x = this.x;
    for (const v of g.vents) {
      const on = g.ventOn(v), bx = v.tx * T, by = v.ty * T;
      if (!on) { if ((this.t >> 3) & 1) { x.fillStyle = '#ffffff30'; x.fillRect(bx + 6, by - 3, 4, 2); } continue; }
      for (let k = 0; k < 14; k++) {
        const ph = (this.t * 2.2 + k * 7 + v.tx * 13) % 96, sx = bx + 3 + ((k * 5 + this.t) % 10), sy = by - ph;
        x.fillStyle = g.level.theme === 'pilz' || g.level.theme === 'grotte' ? (ph > 50 ? '#9affc860' : '#c8ffe0b0') : ph > 70 ? '#ffffff30' : ph > 40 ? '#ffffff60' : '#ffffffa0';
        x.fillRect(Math.round(sx), Math.round(sy), ph > 50 ? 3 : 2, ph > 50 ? 3 : 2);
      }
    }
  }

  // Kacheln: feste Kacheln werden in 16×16-Blöcken vorgezeichnet und nur bei Änderungen neu erstellt.
  // Bewegte oder blinkende Kacheln (Bröckel, Kippböden, Pfeilwerfer, Trollblöcke, Seher-Schimmer) kommen jedes Bild dazu.
  tiles(g, th, cx, cy) {
    const x = this.x, ts = S.tileset(th), CH = 16, CS = CH * T;
    if (this.tcGame !== g) { this.tc = new Map(); this.tcGame = g; this.tcHid = g.hiddenVer; }
    if (g.hiddenVer !== this.tcHid) { this.tc.clear(); this.tcHid = g.hiddenVer; }
    if (g.dirty.size) { for (const k of g.dirty) this.tc.delete(k); g.dirty.clear(); }
    const bx0 = Math.floor(cx / CS), bx1 = Math.floor((cx + this.W) / CS), by0 = Math.max(0, Math.floor(cy / CS)), by1 = Math.floor((cy + this.H) / CS);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
      if (bx < 0 || bx * CH >= g.w || by * CH >= g.h) continue;
      const k = bx + ',' + by; let c = this.tc.get(k);
      if (!c) {
        c = document.createElement('canvas'); c.width = CS; c.height = CS; const cxx = c.getContext('2d');
        cxx.translate(-bx * CS, -by * CS);
        for (let ty = by * CH; ty < Math.min(g.h, by * CH + CH); ty++) for (let tx = bx * CH; tx < Math.min(g.w, bx * CH + CH); tx++) this.tileAt(cxx, g, ts, tx, ty, false);
        this.tc.set(k, c);
      }
      x.drawImage(c, bx * CS, by * CS);
    }
    const x0 = Math.floor(cx / T), x1 = Math.ceil((cx + this.W) / T), y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(g.h - 1, Math.ceil((cy + this.H) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) this.tileAt(x, g, ts, tx, ty, true);
  }
  tileAt(x, g, ts, tx, ty, dyn) {
    const c0 = g.tile(tx, ty), hid = g.hidden.size > 0 && g.hidden.has(tx + ',' + ty), dynTile = 'cKAIH'.includes(c0) && !hid;
    if (!dyn && dynTile) return;
    if (dyn && !dynTile) {
      // nur den Seher-Schimmer über die vorgezeichnete Kachel legen
      if (g.mod.seer && (c0 === 'F' || hid) && (this.t >> 3) & 1) { x.fillStyle = c0 === 'F' ? 'rgba(125,255,207,0.3)' : 'rgba(125,255,207,0.18)'; x.fillRect(tx * T, ty * T, T, T); }
      return;
    }
    const seer = dyn && g.mod.seer;
    const c = c0;
    if (g.hidden.size && g.hidden.has(tx + ',' + ty)) { x.drawImage(ts.fill[(tx * 7 + ty * 13) % 3], tx * T, ty * T); if (seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.18)'; x.fillRect(tx * T, ty * T, T, T); } return; }
    if (c === '.') return;
    const v = (tx * 7 + ty * 13) % 3, px = tx * T, py = ty * T;
    let img;
    if (c === '#' || c === 'F') { if (tx < 0 || tx >= g.w) return; const up = g.tile(tx, ty - 1); img = (up === '#' || up === 'F') && ty > 0 ? ts.fill[v] : ts.top[v]; }
    else if (c === 'H') { if (seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.35)'; x.fillRect(px + 2, py + 2, 12, 12); } return; }
    else if (c === 'J') img = ts.used;
    else if (c === 'c') { const cr = g.crumbles.get(tx + ',' + ty); x.drawImage(ts.crumble, px + (cr && cr.state === 'shake' ? ((this.t >> 1) & 1) * 2 - 1 : 0), py); return; }
    else if (c === 'D') img = ts.dirt; else if (c === 'S') img = ts.stone; else if (c === '^') img = ts.spike;
    else if (c === '=') img = ts.plank; else if (c === 'B') img = ts.mush; else if (c === 'X') img = ts.gate;
    else if (c === 'V') img = ts.vent; else if (c === 'R') img = ts.ore;
    else if (c === 'A') { // Pfeilwerfer: Steinblock mit Schlitz, glüht vor dem Schuss
      x.drawImage(ts.stone, px, py); const tr = g.traps.find(t => t.tx === tx && t.ty === ty), fx = tr && tr.face > 0 ? px + 12 : px;
      x.fillStyle = K; x.fillRect(fx, py + 6, 4, 4); x.fillStyle = tr && tr.warn > 0 && (this.t >> 1) & 1 ? '#ff5030' : '#3a1010'; x.fillRect(fx + 1, py + 7, 2, 2);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px + 3, py + 3, 10, 1);
      if (g.ar.fx.light && (this.t >> 4) & 1) { x.fillStyle = 'rgba(255,80,50,0.28)'; x.fillRect(px, py, 16, 16); } return;
    }
    else if (c === 'K') { // Kippboden: Bretter mit Scharnier, wackeln vor dem Kippen
      const fl = g.flips.get(tx + ',' + ty), wob = fl && fl.state === 'warn' ? ((this.t >> 1) & 1) * 2 - 1 : 0;
      x.save(); x.translate(px + 8, py + 2); x.rotate(wob * 0.06); x.drawImage(ts.plank, -8, -2); x.restore();
      x.fillStyle = K; x.fillRect(px, py + 5, 16, 1); x.fillStyle = '#8a8a9a'; x.fillRect(px + 1, py + 4, 2, 2); x.fillRect(px + 13, py + 4, 2, 2);
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px + 7, py, 2, 5);
      if (g.ar.fx.light && (this.t >> 4) & 1) { x.fillStyle = 'rgba(255,80,50,0.28)'; x.fillRect(px, py, 16, 6); } return;
    }
    else if (c === 'I') { // Trollblock: unsichtbar, nur ein seltenes Glitzern verrät ihn
      if ((this.t + tx * 31 + ty * 17) % 240 < 6) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(px + 7, py + 7, 1, 1); x.fillRect(px + 6, py + 8, 3, 1); }
      if (seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(255,90,90,0.35)'; x.fillRect(px + 2, py + 2, 12, 12); }
      return;
    }
    if (img) x.drawImage(img, px, py);
    if (c === 'F') {
      // Feiner Riss als Hinweis; mit der Spürschaufel leuchtet die Wand
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px + 7, py + 6, 1, 4); x.fillRect(px + 8, py + 9, 2, 1);
      if (seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.3)'; x.fillRect(px, py, 16, 16); }
    }

  }


  ent(g, e, th) {
    if (e.elite && !e.dead && this.symbols) S.drawText(this.x, { schnell: '>>', zaeh: '+', teilt: '%' }[e.elite], Math.round(e.x + e.w / 2), Math.round(e.y) - 8, '#ffffff', 1, 'center');
    if (e.elite && !e.dead) { const r = 12 + Math.sin(this.t / 6) * 2, ec = { schnell: '255,220,80', zaeh: '255,70,60', teilt: '190,110,255' }[e.elite]; const gr = this.x.createRadialGradient(e.x + e.w / 2, e.y + e.h / 2, 2, e.x + e.w / 2, e.y + e.h / 2, r); gr.addColorStop(0, `rgba(${ec},0.55)`); gr.addColorStop(1, `rgba(${ec},0)`); this.x.fillStyle = gr; this.x.fillRect(e.x + e.w / 2 - r, e.y + e.h / 2 - r, r * 2, r * 2); }
    if (g.isHidden(e.x + e.w / 2, e.y + e.h / 2)) { if (e.type === 'coin' && g.mod.seer && (this.t >> 4) & 1) { this.x.globalAlpha = 0.5; this.ent0(g, e, th); this.x.globalAlpha = 1; } return; }
    this.ent0(g, e, th);
    if (e.frozen > 0 && !e.dead) { const x = this.x; x.globalAlpha = e.frozen < 40 && (this.t >> 2) & 1 ? 0.3 : 0.6; x.fillStyle = '#bff0ff'; x.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, e.w + 2, e.h + 2); x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.fillRect(Math.round(e.x) + 1, Math.round(e.y), e.w - 2, 1); }
    if (e.poison > 0 && !e.dead && (this.t + e.x) % 9 === 0) g.parts.push({ x: e.x + Math.random() * e.w, y: e.y, vx: 0, vy: -0.4, life: 16, col: g.mod.fire ? 'fire' : 'spore', grav: 0 });
    if (e.golden && !e.dead) {
      const x = this.x;
      if ((this.t + e.x) % 12 < 2) { x.fillStyle = '#fff6b0'; x.fillRect(Math.round(e.x + Math.random() * e.w), Math.round(e.y + Math.random() * e.h), 1, 1); }
      x.globalAlpha = 0.45; x.fillStyle = '#ffd84a'; x.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h); x.globalAlpha = 1;
    }
  }
  ent0(g, e, th) {
    if (e.type === 'hunter' || e.type === 'roamer' || e.type === 'duelist') return drawHunter(this.x, e, this.t);
    const x = this.x, f = this.t;
    switch (e.type) {
      case 'gem': {
        const bob = e.fixed ? Math.round(Math.sin(f / 12 + e.x) * 1.5) : 0;
        if (!e.fixed && e.age > 780 && (f >> 2) & 1) return;
        x.drawImage(S.gemSprite(e.val), Math.round(e.x), Math.round(e.y) + bob);
        if ((f + e.x) % 90 < 6) { x.fillStyle = '#fff'; x.fillRect(Math.round(e.x) + 1, Math.round(e.y) + bob + 1, 1, 1); }
        return;
      }
      case 'soul': {
        // Blutfleck am Boden (solange die Seele dort ist) und eine violette Flamme
        if (!e.taken) { x.fillStyle = 'rgba(160,20,40,0.7)'; x.fillRect(Math.round(e.x) - 3, Math.round(e.y) + 13, 16, 2); x.fillRect(Math.round(e.x) - 1, Math.round(e.y) + 12, 12, 1); }
        const fy = Math.round(e.y + Math.sin(e.ph) * 2), fx = Math.round(e.x);
        for (let k = 0; k < 6; k++) { const w = 6 - k, h = 2; x.fillStyle = k < 2 ? '#7a3ad0' : k < 4 ? '#c58bff' : '#f0e0ff'; x.fillRect(fx + 5 - Math.ceil(w / 2) + Math.round(Math.sin(e.ph * 2 + k) * (k > 2 ? 1 : 0)), fy + 12 - k * 2, w, h); }
        if (!e.taken && Math.abs(g.p.x - e.x) < 60) { x.globalAlpha = 0.85; S.drawText(x, e.name, fx + 5, fy - 6, '#c58bff', 1, 'center'); x.globalAlpha = 1; }
        return;
      }
      case 'echo': {
        const s2 = e.tail[Math.min(e.i, e.tail.length - 1)]; if (!s2) return;
        x.globalAlpha = 0.55; this.figure(S.ghostHero(), s2[0], s2[1], s2[2] & 8 ? -1 : 1, s2[2] & 7, (s2[2] & 16) ? 8 : 0, 8); x.globalAlpha = 1;
        S.drawText(x, e.name, Math.round(s2[0] + 5), Math.round(s2[1]) - 12, '#c58bff', 1, 'center');
        return;
      }
      case 'rune': {
        const gl = 0.5 + Math.sin(f / 15 + e.x) * 0.3; x.globalAlpha = gl; x.fillStyle = '#ffcf6a';
        const rx = Math.round(e.x), ry = Math.round(e.y);
        x.fillRect(rx + 2, ry + 6, 10, 1); x.fillRect(rx + 6, ry, 1, 7); x.fillRect(rx + 3, ry + 2, 7, 1); x.fillRect(rx + 4, ry + 4, 1, 2); x.fillRect(rx + 9, ry + 4, 1, 2);
        x.globalAlpha = 1; return;
      }
      case 'icicle': {
        if (e.state === 'gone') return;
        const sx = Math.round(e.x) + (e.state === 'shake' ? ((f >> 1) & 1) * 2 - 1 : 0), sy = Math.round(e.y);
        for (let k = 0; k < 14; k++) { const w = Math.max(1, Math.round(10 * (1 - k / 14))); x.fillStyle = K; x.fillRect(sx + 5 - Math.ceil(w / 2) - 1, sy + k, w + 2, 1); x.fillStyle = k < 3 ? '#8a8f9e' : '#c8ccd8'; x.fillRect(sx + 5 - Math.ceil(w / 2), sy + k, w, 1); }
        x.fillStyle = '#ffffff'; x.fillRect(sx + 3, sy + 2, 1, 5);
        return;
      }
      case 'saw': {
        const scx = e.x + 7, scy = e.y + 7;
        // Schiene
        x.fillStyle = 'rgba(0,0,0,0.5)'; if (e.axis === 'x') x.fillRect(Math.round(e.ox - 41), Math.round(e.oy + 6), 96, 2); else x.fillRect(Math.round(e.ox + 6), Math.round(e.oy - 41), 2, 96);
        x.save(); x.translate(Math.round(scx), Math.round(scy)); x.rotate(e.rot);
        x.fillStyle = K; x.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 8 : 6; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill();
        x.fillStyle = '#c8ccd8'; x.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 7 : 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill();
        x.fillStyle = '#6a6f7e'; x.fillRect(-2, -2, 4, 4); x.fillStyle = '#ff5030'; x.fillRect(-1, -1, 2, 2);
        x.restore(); return;
      }
      case 'toad': { const sp = S.toadSprite(e.onGround ? 0 : 1); x.drawImage(sp[(e.face > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return; }
      case 'wisp': { const sp = S.wispSprite()[e.flash ? 1 : 0]; x.globalAlpha = 0.75 + Math.sin(f / 6) * 0.25; x.drawImage(sp, Math.round(e.x), Math.round(e.y)); x.globalAlpha = 1; return; }
      case 'snail': { const sp = S.snailSprite(); x.drawImage(sp[(e.dir > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return; }
      case 'beetle': { const sp = S.beetleSprite((f >> 3) & 1); x.drawImage(sp[(e.dir > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return; }
      case 'blorb': {
        const sp = S.blorbSprite()[e.flash ? 1 : 0], sq = e.onGround ? (e.t < 12 ? 2 : 0) : -2;
        x.drawImage(sp, Math.round(e.x) - sq / 2, Math.round(e.y) + sq + 1, 12 + sq, 9 - sq); return;
      }
      case 'bat': {
        const sp = S.batSprite()[e.flash ? 1 : 0], fl = e.state === 'hang' ? 7 : ((f >> 2) & 1 ? 7 : 4);
        x.drawImage(sp, Math.round(e.x) - 1, Math.round(e.y) + (7 - fl) / 2, 14, fl); return;
      }
      case 'mole': {
        if (e.hidden) return;
        const sp = S.moleSprite(e.flash > 0 || (e.state === 'dying' && (f >> 2) & 1));
        const jig = e.state === 'wind' ? ((f >> 1) & 1) * 2 - 1 : 0;
        x.drawImage(sp[e.face > 0 ? 1 : 0], Math.round(e.x) - 2 + jig, Math.round(e.y) - 2);
        if (e.state === 'stun') for (let k = 0; k < 3; k++) { const a = f / 8 + k * 2.1; x.fillStyle = '#ffe066'; x.fillRect(Math.round(e.x + 15 + Math.cos(a) * 10), Math.round(e.y - 4 + Math.sin(a) * 3), 2, 2); }
        return;
      }
      case 'rock': {
        const rx = Math.round(e.x), ry = Math.round(e.y);
        if (e.delay > 0 && (f >> 1) & 1) return;
        x.fillStyle = K; x.fillRect(rx + 1, ry, 8, 10); x.fillRect(rx, ry + 1, 10, 8);
        x.fillStyle = th.stone; x.fillRect(rx + 1, ry + 1, 8, 8); x.fillStyle = th.stoneL; x.fillRect(rx + 2, ry + 2, 3, 2);
        return;
      }
      case 'chest': x.drawImage(S.chestSprite(e.open), e.x, e.y); return;
      case 'coin': {
        const fr = Math.floor(f / 6 + e.idx) % 6, bob = Math.round(Math.sin(f / 15 + e.idx) * 1.5);
        x.fillStyle = 'rgba(255,216,74,0.15)'; x.beginPath(); x.arc(e.x + 6, e.y + 6 + bob, 9 + Math.sin(f / 8), 0, 7); x.fill();
        x.drawImage(S.coinSprite(fr), Math.round(e.x), Math.round(e.y) + bob);
        if (f % 20 === 0) g.parts.push({ x: e.x + Math.random() * 12, y: e.y + Math.random() * 12, vx: 0, vy: -0.3, life: 16, col: 'gold', grav: 0 });
        return;
      }
      case 'door': x.drawImage(S.doorSprite(), e.x, e.y); if ((f >> 4) & 1) { x.fillStyle = '#ffd84a'; x.fillRect(e.x + 7, e.y - 4, 2, 2); } return;
      case 'spitter': x.drawImage(S.spitterSprite(e.puff > 0)[(e.face > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return;
      case 'morchel': {
        const sp = S.morchelSprite(e.flash > 0 || (e.state === 'dying' && (f >> 2) & 1)), sq = e.state === 'tired' ? 2 : 0;
        x.drawImage(sp[e.face > 0 ? 1 : 0], Math.round(e.x) - 1, Math.round(e.y) - 2 + sq, 32, 32 - sq);
        if (e.state === 'tired') for (let k = 0; k < 3; k++) { const a = f / 8 + k * 2.1; x.fillStyle = '#ffe066'; x.fillRect(Math.round(e.x + 15 + Math.cos(a) * 12), Math.round(e.y - 5 + Math.sin(a) * 3), 2, 2); }
        return;
      }
      case 'cog': x.drawImage(S.cogSprite((f >> 2) % 4), Math.round(e.x) - 1, Math.round(e.y) - 1); return;
      case 'knight': x.drawImage(S.knightSprite()[(e.dir > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return;
      case 'kuckuck': x.drawImage(S.cuckooSprite()[(e.dir > 0 ? 0 : 1) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y) - 1 + ((f >> 3) & 1)); return;
      case 'eproj': {
        const ex = Math.round(e.x), ey = Math.round(e.y);
        if (e.kind === 'mote') {
          x.fillStyle = e.color;
          switch (e.motif) {
            case 'falter': case 'stern':
              x.fillRect(ex, ey + 1, 6, 3); x.fillRect(ex + 2, ey, 2, 5);
              x.fillStyle = K; x.fillRect(ex + 1, ey + 2, 3, 1); break;
            case 'tinte': case 'docht':
              x.globalAlpha *= 0.8; x.fillRect(ex - 1, ey + 1, 7, 4);
              x.fillRect(ex + 1, ey - 1, 4, 7); x.globalAlpha = 1; break;
            case 'regen': case 'kreide': x.fillRect(ex + 2, ey - 2, 2, 7); break;
            case 'anker': x.fillRect(ex - 2, ey + 2, 8, 2); x.fillRect(ex + 1, ey, 2, 3); break;
            case 'seide': x.fillRect(ex, ey, 5, 1); x.fillRect(ex, ey + 4, 5, 1);
              x.fillRect(ex + 2, ey + 1, 1, 3); break;
            default: x.fillRect(ex, ey + 2, 5, 1); x.fillRect(ex + 2, ey, 1, 5); break;
          }
        } else if (e.kind === 'gear') x.drawImage(S.cogSprite((f >> 1) % 4, 4, 6), ex - 1, ey - 1);
        else if (e.kind === 'spore') { x.fillStyle = K; x.fillRect(ex, ey + 1, 7, 5); x.fillRect(ex + 1, ey, 5, 7); x.fillStyle = (f >> 2) & 1 ? '#c86aff' : '#e0a0ff'; x.fillRect(ex + 1, ey + 1, 5, 5); x.fillStyle = '#fff'; x.fillRect(ex + 2, ey + 2, 1, 1); }
        else if (e.kind === 'arrow') { x.fillStyle = K; x.fillRect(ex, ey, 10, 3); x.fillStyle = '#c8b090'; x.fillRect(ex + 1, ey + 1, 8, 1); x.fillStyle = '#e8e8f0'; x.fillRect(e.vx > 0 ? ex + 8 : ex, ey, 2, 3); x.fillStyle = '#c04030'; x.fillRect(e.vx > 0 ? ex : ex + 8, ey, 2, 3); }
        else if (e.kind === 'bolt') { x.fillStyle = K; x.fillRect(ex, ey, 4, 8); x.fillStyle = '#e0b040'; x.fillRect(ex + 1, ey + 1, 2, 6); x.fillStyle = '#fff'; x.fillRect(ex + 1, ey + 6, 2, 1); }
        else { for (let k = 0; k < 3; k++) { const hh = 4 + ((f + k * 3) % 6); x.fillStyle = k === 1 ? '#ffffff' : '#ffd84a'; x.fillRect(ex + k * 4, ey + 10 - hh, 3, hh); } }
        return;
      }
      case 'golem': {
        if (e.hidden) return;
        const sp = S.golemSprite(e.flash > 0 || (e.state === 'dying' && (f >> 2) & 1));
        const sq = e.state === 'crouch' ? 3 : e.state === 'tired' ? 1 : 0, jig = e.state === 'crouch' ? ((f >> 1) & 1) : 0;
        x.drawImage(sp[e.face > 0 ? 1 : 0], Math.round(e.x) - 1 + jig, Math.round(e.y) - 2 + sq, 30, 32 - sq);
        // Uhrzeiger auf der Brust
        const ccx = Math.round(e.x) + 13.5, ccy = Math.round(e.y) + 15 + sq;
        x.fillStyle = K;
        for (const [len, sp2] of [[4, 0.05], [3, 0.004]]) { const a = f * sp2 * (e.state === 'tired' ? 0.2 : 1); for (let k = 0; k <= len; k++) x.fillRect(Math.round(ccx + Math.cos(a) * k), Math.round(ccy + Math.sin(a) * k), 1, 1); }
        if (e.state === 'tired') for (let k = 0; k < 3; k++) { const a = f / 8 + k * 2.1; x.fillStyle = '#ffe066'; x.fillRect(Math.round(e.x + 14 + Math.cos(a) * 11), Math.round(e.y - 5 + Math.sin(a) * 3), 2, 2); }
        return;
      }
      case 'proj':
        if (e.kind === 'ember') {
          const tail = e.vx > 0 ? -6 : 2;
          x.fillStyle = '#f34820'; x.fillRect(e.x + tail, e.y + 2, 10, 3);
          x.fillStyle = '#fff394'; x.fillRect(e.x, e.y + 1, 6, 4);
          return;
        }
        else if (e.kind === 'boomerang') {
          const sx = Math.round(e.x), sy = Math.round(e.y), ph = (f >> 1) & 3;
          x.fillStyle = K; x.fillRect(sx, sy + 2, 8, 4); x.fillRect(sx + 2, sy, 4, 8);
          x.fillStyle = '#d09050'; if (ph & 1) x.fillRect(sx + 1, sy + 3, 6, 2); else x.fillRect(sx + 3, sy + 1, 2, 6); x.fillStyle = '#fff2cf'; x.fillRect(sx + 3, sy + 3, 2, 2);
        } else if (e.kind === 'spark') {
          // Funkenspur: kleine flackernde Flamme
          const sx = Math.round(e.x), sy = Math.round(e.y), fl = (f + sx) >> 2 & 1, a = Math.min(1, e.life / 20);
          x.globalAlpha = a; x.fillStyle = '#c02a00'; x.fillRect(sx, sy + 2, 4, 2); x.fillStyle = '#ff8a2a'; x.fillRect(sx + 1, sy + 1 - fl, 2, 2); x.fillStyle = '#ffe070'; x.fillRect(sx + 1 + fl, sy - fl, 1, 1); x.globalAlpha = 1;
        } else if (e.kind === 'shard' || e.kind === 'mirror' || e.kind === 'thunder') {
          const sx = Math.round(e.x), sy = Math.round(e.y), c = { shard: ['#bff6ff', '#ffffff'], mirror: ['#9ad8ff', '#ffffff'], thunder: ['#ffe070', '#ffffff'], spark: ['#ff8a2a', '#ffe070'] }[e.kind];
          x.fillStyle = K; x.fillRect(sx - 1, sy - 1, e.w + 2, e.h + 2);
          x.fillStyle = (f >> 1) & 1 ? c[0] : c[1]; x.fillRect(sx, sy, e.w, e.h);
        } else if (e.kind === 'star') {
          const sx = Math.round(e.x), sy = Math.round(e.y), c = (f >> 1) & 1 ? '#ffffff' : '#d8c8ff';
          x.fillStyle = K; x.fillRect(sx + 1, sy, 4, 6); x.fillRect(sx, sy + 1, 6, 4);
          x.fillStyle = c; x.fillRect(sx + 2, sy, 2, 6); x.fillRect(sx, sy + 2, 6, 2);
        } else {
          const sx = Math.round(e.x), sy = Math.round(e.y), hgt = 6 + ((f >> 1) & 3);
          x.fillStyle = K; x.fillRect(sx, sy + 10 - hgt - 1, 10, hgt + 1);
          x.fillStyle = '#ff9a50'; x.fillRect(sx + 1, sy + 10 - hgt, 8, hgt - 1); x.fillStyle = '#ffe070'; x.fillRect(sx + 3, sy + 10 - hgt, 4, 2);
        }
        return;
      case 'brazier': {
        const px = e.x, py = e.y;
        x.fillStyle = '#625572'; x.fillRect(px + 6, py + 9, 4, 6);
        x.fillRect(px + 3, py + 14, 10, 2);
        x.fillStyle = '#aa7848'; x.fillRect(px + 2, py + 7, 12, 3);
        x.fillStyle = '#ffd46e'; x.fillRect(px + 1, py + 6, 14, 1);
        if (e.lit || g.carryingEmber) {
          x.globalAlpha = e.lit ? 1 : 0.45;
          x.fillStyle = '#ff7028'; x.fillRect(px + 5, py + 2, 6, 4);
          x.fillStyle = '#ffe585'; x.fillRect(px + 7, py + ((f >> 2) & 1), 3, 5);
          x.globalAlpha = 1;
        }
        return;
      }
      case 'altar': {
        if (!e.taken) { x.fillStyle = 'rgba(255,170,60,0.16)'; x.beginPath(); x.arc(e.x + 12, e.y + 2, 22 + Math.sin(f / 8) * 3, 0, 7); x.fill(); }
        x.drawImage(S.altarSprite(!e.taken), e.x + 4, e.y + 12);
        if (!e.taken) {
          const ic = S.weaponIcon(g.level.altar || 'urfunke');
          x.drawImage(ic, e.x + 12 - ic.width / 2, e.y - 6 + Math.round(Math.sin(f / 14) * 2));
          if (f % 4 === 0) g.parts.push({ x: e.x + 8 + Math.random() * 8, y: e.y + 4, vx: (Math.random() - 0.5) * 0.4, vy: -0.6, life: 26, col: 'fire', grav: -0.01 });
        }
        return;
      }
      case 'apple': x.drawImage(S.appleSprite(), e.x, e.y + Math.round(Math.sin(f / 15) * 1)); return;
      case 'lantern':
        if (e.lit) { x.fillStyle = 'rgba(255,216,74,0.12)'; x.beginPath(); x.arc(e.x + 4, e.y + 5, 16 + Math.sin(f / 9) * 2, 0, 7); x.fill(); }
        x.drawImage(S.lanternSprite(e.lit), e.x, e.y); return;
      case 'sign':
        x.fillStyle = K; x.fillRect(e.x + 6, e.y + 6, 3, 8); x.fillRect(e.x, e.y, 14, 8);
        x.fillStyle = '#c08040'; x.fillRect(e.x + 1, e.y + 1, 12, 6); x.fillStyle = '#8a5a2a'; x.fillRect(e.x + 7, e.y + 7, 1, 7);
        x.fillStyle = K; x.fillRect(e.x + 3, e.y + 3, 8, 1);
        if ((f >> 4) & 1) S.drawText(x, '!', e.x + 6, e.y - 8, '#ffe066');
        return;
      case 'goal': {
        const gx = e.x + 5, top = e.y + 4, bot = e.y + e.h;
        x.fillStyle = K; x.fillRect(gx - 1, top - 1, 4, bot - top + 1); x.fillStyle = '#e8e8f0'; x.fillRect(gx, top, 2, bot - top);
        x.fillStyle = '#ffd84a'; x.fillRect(gx - 1, top - 4, 4, 4);
        for (let i = 0; i < 14; i++) { const wy = Math.round(Math.sin(f / 7 + i / 2.5) * 1.5); x.fillStyle = K; x.fillRect(gx + 2 + i, top + 1 + wy, 1, 10); x.fillStyle = i < 7 ? '#ff4f7a' : '#ffd84a'; x.fillRect(gx + 2 + i, top + 2 + wy, 1, 8); }
        return;
      }
    }
  }

  // Aussehen aus Truhen: Spur, Aura, Färbung (this.look = { spur, farbe, aura } aus main)
  lookFx(g, p) {
    const L = this.look || {}, x = this.x, t = this.t;
    if (!this.trail || this.trailG !== g) { this.trail = []; this.trailG = g; }
    if (L.spur && (Math.abs(p.vx) > 0.4 || Math.abs(p.vy) > 1) && t % 2 === 0)
      this.trail.push({ x: p.x + 5 + (Math.random() - 0.5) * 6, y: p.y + 10 + (Math.random() - 0.5) * 6, life: 28, vy: L.spur === 'spur-flammen' ? -0.4 : L.spur === 'spur-blaetter' ? 0.3 : 0, ph: Math.random() * 6 });
    for (let k = this.trail.length - 1; k >= 0; k--) {
      const q = this.trail[k]; q.life--; q.y += q.vy; if (L.spur === 'spur-blaetter') q.x += Math.sin((t + q.ph * 20) / 6) * 0.4;
      if (q.life <= 0) { this.trail.splice(k, 1); continue; }
      const a = q.life / 28; x.globalAlpha = a;
      switch (L.spur) {
        case 'spur-blaetter': x.fillStyle = ['#d0702a', '#e8a838', '#a8401c'][Math.floor(q.ph) % 3]; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 1); break;
        case 'spur-funken': x.fillStyle = q.life > 18 ? '#fff2a0' : '#ff8a2a'; x.fillRect(Math.round(q.x), Math.round(q.y + (28 - q.life) * 0.3), 1, 1); break;
        case 'spur-sterne': x.fillStyle = (t + q.ph * 9) % 8 < 4 ? '#ffffff' : '#9ad8ff'; x.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); if (q.life > 20) { x.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1); x.fillRect(Math.round(q.x), Math.round(q.y) - 1, 1, 3); } break;
        case 'spur-flammen': x.fillStyle = q.life > 20 ? '#fff2a0' : q.life > 10 ? '#ff9a2a' : '#c03010'; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); break;
        case 'spur-schatten': x.globalAlpha = a * 0.6; x.fillStyle = '#1a0e28'; x.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3); break;
        case 'spur-regenbogen': x.fillStyle = `hsl(${(t * 6 + q.life * 12) % 360},90%,62%)`; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); break;
      }
    }
    x.globalAlpha = 1;
    const au = L.aura && COSMETIC_COL[L.aura];
    if (au) {
      const r = 14 + Math.sin(t / 12) * 2, gr = x.createRadialGradient(p.x + 5, p.y + 8, 2, p.x + 5, p.y + 8, r);
      gr.addColorStop(0, `rgba(${au},0.45)`); gr.addColorStop(1, `rgba(${au},0)`);
      x.fillStyle = gr; x.fillRect(p.x + 5 - r, p.y + 8 - r, r * 2, r * 2);
      if (t % 6 === 0) g.parts.push({ x: p.x + Math.random() * 10, y: p.y + 14, vx: 0, vy: -0.5, life: 26, col: L.aura === 'aura-urlicht' ? 'gold' : L.aura === 'aura-frost' ? 'ice' : 'fire', grav: 0 });
    }
  }
  player(g) {
    const p = g.p; if (p.dead) return;
    this.lookFx(g, p);
    if (g.carryingEmber) {
      const x = Math.round(p.x + 4 - p.face * 10), y = Math.round(p.y - 4 + Math.sin(this.t / 8) * 2);
      this.x.fillStyle = '#fc6525'; this.x.fillRect(x, y, 5, 6);
      this.x.fillStyle = '#fff394'; this.x.fillRect(x + 1, y + 2, 3, 3);
    }
    if (p.inv > 0 && (this.t >> 2) & 1 && p.hurt <= 0) return;
    const hs = S.hero(g.look || g.gear.armor, g.gear.shovel, g.gear.weapon);
    const tint = this.look && this.look.farbe && COSMETIC_FILTER[this.look.farbe];
    if (tint && FILTER_OK) { this.x.filter = tint; try { this.playerBody(g, p, hs); } finally { this.x.filter = 'none'; } return; }
    if (!tint) return this.playerBody(g, p, hs);
    // Ersatzweg: Held in einen Puffer zeichnen, Farbe darüberlegen
    const B = this.tintBuf || (this.tintBuf = document.createElement('canvas')); const bw = 96, bh = 80; B.width = bw; B.height = bh;
    const bx = B.getContext('2d'), old = this.x, ox = Math.round(p.x) - bw / 2, oy = Math.round(p.y) - bh / 2;
    bx.save(); bx.translate(-ox, -oy); this.x = bx; try { this.playerBody(g, p, hs); } finally { this.x = old; bx.restore(); }
    bx.globalCompositeOperation = 'source-atop'; bx.globalAlpha = 0.45; bx.fillStyle = COSMETIC_TINT[this.look.farbe] || '#ffffff'; bx.fillRect(0, 0, bw, bh); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
    old.drawImage(B, ox, oy);
  }
  playerBody(g, p, hs) {
    if (g.idle > 900 && !p.dead) {
      // Easter Egg: der Held schläft ein
      if (this.t % 40 === 0) g.parts.push({ x: p.x + (p.face > 0 ? 8 : 0), y: p.y - 6, vx: 0.15 * p.face, vy: -0.35, life: 60, col: 'zzz', grav: 0, z: 1 });
      this.figure(hs, p.x, p.y + 2, p.face, 0, 0, 8, null, 3, 16, 0, 0);
      return;
    }
    if (p.dash > 0) { this.x.globalAlpha = 0.6; }
    const hsc = g.cheat.riese ? 2 : g.cheat.winzling ? 0.5 : 1;
    if (hsc !== 1) { this.x.save(); this.x.translate(p.x + 5, p.y + 14); this.x.scale(hsc, hsc); this.x.translate(-(p.x + 5), -(p.y + 14)); }
    this.figure(hs, p.x, p.y, p.face, g.pose(), p.anim, p.atk, p.hurt > 0 ? hs.white : null, p.land, p.atkLen || 16, p.vx, p.vy);
    if (hsc !== 1) this.x.restore();
    this.x.globalAlpha = 1;
    const wp = g.gear.weapon && weaponById(g.gear.weapon);
    if (wp && (this.t + p.anim) % 24 < 3) {
      // Glitzern an der Klinge
      this.x.fillStyle = wp.rar === 'mythisch' ? '#ff9af0' : '#fff6b0';
      const bx = p.atk > 0 ? (p.face > 0 ? p.x + 22 : p.x - 12) : (p.face > 0 ? p.x - 2 : p.x + 11);
      this.x.fillRect(Math.round(bx), Math.round(p.atk > 0 ? p.y + 5 : p.y - 8), 1, 1);
    }
  }
  heroOf(g) { return S.hero(g.look || g.gear.armor, g.gear.shovel, g.gear.weapon); }
  label(txt, x0, y0, col) { S.drawText(this.x, txt, x0 + 1, y0 + 1, K, 1, 'center'); S.drawText(this.x, txt, x0, y0, col, 1, 'center'); }
  figure(hs, px, py, face, pose, anim, atk = 8, white = null, land = 0, atkLen = 16, vx = 0, vy = 0) {
    const x = this.x, i = face > 0 ? 0 : 1, X = Math.round(px), Y0 = Math.round(py);
    const wind = atk > atkLen * 0.78;
    // Lauf-Zyklus mit 4 Phasen (Wippen), Atmen im Stand, Fallen mit gestreckten Beinen
    let legs = 'stand', bob = 0;
    if (pose === 1) { const ph = (anim >> 2) & 3; legs = ['run1', 'pass', 'run2', 'pass'][ph]; bob = ph & 1 ? -1 : 0; }
    else if (pose === 2 || pose === 4) legs = vy > 1.5 ? 'fall' : 'air';
    else if (pose === 0) bob = ((this.t + px) >> 5) & 1 ? 0 : 1;
    const Y = Y0;
    const U = hs.shU[i], H = hs.shH[i], Dn = hs.shD[i];
    if (hs.scarf && !white) this.scarf(hs, X, Y + bob, face, pose, vx, vy);
    if (hs.fxs && !white) for (const f of hs.fxs) this.fx(f[0], X, Y, face, false, f[1]); else if (hs.fx && !white) this.fx(hs.fx, X, Y, face, false);
    if (pose <= 2) x.drawImage(U, face > 0 ? X - 5 : X + 8, Y + 7 - U.height + bob);
    const body = (white || hs)[legs][i];
    if (land > 0) { const q = Math.min(3, land); x.drawImage(body, X - 5 - q, Y - 10 + q, 20 + q * 2, 24 - q); }
    else if (bob) {
      // Oberkörper wippt, Füsse bleiben am Boden
      x.drawImage(body, 0, 20, 20, 4, X - 5, Y + 10, 20, 4);
      x.drawImage(body, 0, 0, 20, 21, X - 5, Y - 10 + bob, 20, 21);
    } else x.drawImage(body, X - 5, Y - 10);
    if (pose === 3) {
      if (wind) x.drawImage(U, face > 0 ? X + 7 : X - 4, Y + 4 - U.height);
      else {
        x.drawImage(H, face > 0 ? X + 8 : X + 2 - H.width, Y + 2);
        // Wischspur des Hiebs
        const k = 1 - atk / atkLen;
        if (!white && k > 0.2 && k < 0.75) {
          x.globalAlpha = 0.85 - k * 0.7;
          const cxp = face > 0 ? X + 6 : X + 4, r = H.width + 1;
          for (let a = -1.5; a <= 0.7; a += 0.09) {
            const ax = cxp + Math.cos(a) * r * face, ay = Y + 5 + Math.sin(a) * r * 0.85;
            x.fillStyle = a > -0.2 && a < 0.4 ? '#ffffff' : '#ffe9a8'; x.fillRect(Math.round(ax), Math.round(ay), 2, a > -0.6 ? 2 : 1);
          }
          x.globalAlpha = 1;
        }
      }
    }
    if (pose === 4) {
      x.drawImage(Dn, X + 2, Y + 9);
      if (!white && vy > 2) { x.globalAlpha = 0.5; x.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) x.fillRect(X + 1 + k * 4, Y - 6 - ((this.t * 3 + k * 5) % 8), 1, 4); x.globalAlpha = 1; }
    }
    if (hs.fxs && !white) for (const f of hs.fxs) this.fx(f[0], X, Y, face, true, f[1]); else if (hs.fx && !white) this.fx(hs.fx, X, Y, face, true);
    // Easter Egg: wer „Raphi“ heisst, trägt eine Krone
    if (this.crown && !white && hs.scarf) {
      const cx0 = face > 0 ? X - 1 : X + 1, cy0 = Y - 13 + (pose === 0 ? 0 : 0);
      x.fillStyle = K; x.fillRect(cx0 + 1, cy0, 9, 5);
      x.fillStyle = '#ffd84a'; x.fillRect(cx0 + 2, cy0 + 2, 7, 2); x.fillRect(cx0 + 2, cy0 + 1, 1, 1); x.fillRect(cx0 + 5, cy0, 1, 2); x.fillRect(cx0 + 8, cy0 + 1, 1, 1);
      x.fillStyle = '#e0304f'; x.fillRect(cx0 + 5, cy0 + 2, 1, 1);
    }
  }
  // Langer Schal, der im Fahrtwind flattert (Erkennungszeichen des Helden)
  scarf(hs, X, Y, face, pose, vx, vy) {
    const x = this.x, n = hs.scarfLen, t = this.t;
    const speed = Math.min(1, Math.abs(vx) / 2.2);
    const ax = face > 0 ? X + 1 : X + 8, ay = Y + 3;
    const pts = [];
    for (let k = 1; k <= n; k++) {
      const droop = (1.2 - speed * 0.9) * k * 0.9 - Math.max(-3, Math.min(3, vy)) * k * 0.28;
      const wave = Math.sin(t / (4 - speed * 1.5) - k * 0.75) * (0.4 + speed * 0.9 + (pose === 2 || pose === 4 ? 0.6 : 0)) * Math.min(k, 4) * 0.45;
      pts.push([ax - face * k * (1.1 + speed * 0.9), ay + droop + wave]);
    }
    let [c1, c2] = hs.scarf;
    const st = this.scarfStyle || 'auto';
    const fixed = { gold: ['#ffd84a', '#c08a20'], nacht: ['#1e2a6a', '#ffffff'], geist: ['#9af0ff', '#e8ffff'], retro: ['#8bac0f', '#306230'] }[st];
    if (fixed) [c1, c2] = fixed;
    const colAt = k => {
      if (st === 'regen') return `hsl(${(k * 40 + t * 4) % 360},90%,62%)`;
      if (st === 'feuer') return ['#fff2a0', '#ffd84a', '#ff9a30', '#ff5a20', '#c02a00'][Math.min(4, Math.floor(k / n * 5 + (Math.sin(t / 3 + k) > 0.6 ? 1 : 0)))];
      if (st === 'nacht') return (k * 7 + Math.floor(t / 10)) % 5 === 0 ? c2 : c1;
      return k % 3 === 2 ? c2 : c1;
    };
    if (st === 'geist') x.globalAlpha = 0.75;
    for (const pass of [0, 1]) {
      pts.forEach(([px, py], k) => {
        const th = k < n * 0.6 ? 2 : 1;
        x.fillStyle = pass === 0 ? K : colAt(k);
        if (pass === 0) x.fillRect(Math.round(px) - 1, Math.round(py) - 1, th + 2, th + 2);
        else x.fillRect(Math.round(px), Math.round(py), th, th);
      });
    }
    // Schalende: zwei Zipfel
    const [ex, ey] = pts[n - 1];
    if (st === 'feuer' && t % 4 === 0 && this.x === this.gx) { /* Funken nur im Spiel */ }
    x.fillStyle = colAt(n - 1); x.fillRect(Math.round(ex - face), Math.round(ey + 1), 1, 2); x.fillRect(Math.round(ex - face * 2), Math.round(ey), 1, 1);
  }
  // Effekte der hohen Rüstungsstufen. front=false: hinter dem Helden, true: davor.
  fx(kind, X, Y, face, front, col0 = null) {
    const x = this.x, t = this.t;
    const P = (col, row) => [face > 0 ? X - 5 + col : X + 14 - col, Y - 10 + row];
    const dot = (c, r, col, s = 1) => { const [a, b] = P(c, r); x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), s, s); };
    const C = col0 || '#ffd84a';
    switch (kind) {
      // Effekte der einzigartigen Rüstungsteile
      case 'aura': if (!front) { const [a, b] = P(9.5, 13), r = 13 + Math.sin(t / 14) * 1.5, gr = x.createRadialGradient(a, b, 2, a, b, r); gr.addColorStop(0, C + '66'); gr.addColorStop(1, C + '00'); x.fillStyle = gr; x.fillRect(a - r, b - r, r * 2, r * 2); if (t % 7 === 0) dot(3 + (t * 5) % 14, 22 - (t % 20), C); } return;
      case 'eyes': if (front) { x.globalAlpha = 0.55 + 0.45 * Math.sin(t / 9); dot(12, 10, C); dot(10, 10, C); x.globalAlpha = 0.25; dot(13, 10, C); x.globalAlpha = 1; } return;
      case 'halo': if (!front) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; dot(9.5 + Math.cos(a) * 4.5, -1 + Math.sin(a) * 1.3, k % 3 === Math.floor(t / 7) % 3 ? '#ffffff' : C); } return;
      case 'flames': if (front) for (let k = 0; k < 3; k++) { const ph = (t + k * 7) % 14; dot(8 + k * 2, 3 - ph * 0.35, ph < 5 ? '#ffffff' : ph < 10 ? C : '#c02a00'); } return;
      case 'rune': if (front) { x.globalAlpha = 0.3 + 0.3 * Math.sin(t / 11); dot(9, 15, C, 2); x.globalAlpha = 1; } return;
      case 'drip': if (front) { const ph = t % 50; if (ph < 30) dot(8 + (Math.floor(t / 50) % 3) * 2, 18 + ph * 0.2, C); } return;
      case 'feet': if (!front && t % 3 === 0) { x.globalAlpha = 0.7; dot(4 + (t * 7) % 10, 23 - (t % 4), C); x.globalAlpha = 1; } return;
      case 'ash': if (!front) for (let k = 0; k < 2; k++) { const ph = (t * 0.5 + k * 31) % 40; dot(1 + k * 2 + Math.sin((t + k * 11) / 7), 14 + ph * 0.25, C); } return;
      case 'visor': if (front) { x.globalAlpha = 0.35 + 0.35 * Math.sin(t / 8); for (let c = 6; c <= 13; c++) dot(c, 9, '#bff6ff'); x.globalAlpha = 1; } return;
      case 'shine': if (front && t % 120 < 12) { const k = t % 120; for (let d = 0; d < 3; d++) dot(4 + k + d, 2 + k - d, '#ffffff'); } return;
      case 'sparkle': if (front) for (let k = 0; k < 2; k++) { const ph = (t + k * 37) % 70; if (ph < 8) dot(2 + ((k * 7 + Math.floor(t / 70) * 5) % 16), 4 + ((k * 11 + Math.floor(t / 70) * 3) % 18), ph < 4 ? '#ffffff' : '#bfe8ff'); } return;
      case 'stars':
        if (!front) { for (let k = 0; k < 3; k++) if ((t + k * 20) % 60 < 30) dot(2 + k, 16 + k * 2, '#ffffff'); }
        else { const a = t / 20; dot(9.5 + Math.cos(a) * 9, 12 + Math.sin(a) * 4, Math.sin(a) > 0 ? '#ffd84a' : '#fff6b0'); }
        return;
      case 'embers': if (!front) for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k * 23) % 40; dot(3 + k * 2 + Math.sin((t + k * 9) / 6), 20 - ph * 0.5, ph < 20 ? '#ff8a2a' : '#c02a00'); } return;
      case 'void':
        for (let k = 0; k < 3; k++) {
          const a = t / 24 + k * 2.09, z = Math.sin(a);
          if ((z > 0) !== front) continue;
          const [a1, b1] = P(9.5 + Math.cos(a) * 11, 13 + z * 3);
          x.fillStyle = '#140c1c'; x.fillRect(Math.round(a1) - 1, Math.round(b1) - 2, 3, 5);
          x.fillStyle = (t >> 2) & 1 ? '#ff4fd8' : '#ffb0f0'; x.fillRect(Math.round(a1), Math.round(b1) - 1, 1, 3);
        }
        if (!front && t % 3 === 0) { x.globalAlpha = 0.5; dot(4 + (t % 5), 22 - (t % 7), '#ff4fd8'); x.globalAlpha = 1; }
        return;
      case 'gear':
        if (!front) { const g = S.cogSprite((t >> 3) % 4, 7, 10), [a, b] = P(9.5, 10); x.globalAlpha = 0.85; x.drawImage(g, Math.round(a - g.width / 2), Math.round(b - g.height / 2) - 1); x.globalAlpha = 1; }
        return;
      case 'divine':
        if (!front) {
          // Lichtflügel
          const flap = Math.sin(t / 10) * 2;
          x.globalAlpha = 0.55;
          for (let r = 0; r < 9; r++) { const w = 9 - r; const [a, b] = P(face > 0 ? 6 - w : 13, 11 + r - Math.round(flap * (1 - r / 9))); x.fillStyle = r % 3 === 0 ? '#ffffff' : '#ffe9a8'; x.fillRect(Math.round(face > 0 ? a : a - w + 1), Math.round(b), w, 1); }
          x.globalAlpha = 1;
          // Heiligenschein
          for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; dot(9.5 + Math.cos(a) * 5, -2 + Math.sin(a) * 1.5, k % 4 === Math.floor(t / 6) % 4 ? '#ffffff' : '#ffd84a'); }
        } else if (t % 9 === 0) dot(2 + (t * 7) % 16, 4 + (t * 3) % 18, '#fff6b0');
        return;
    }
  }
  ghost(gh, frame) {
    const s = ghostAt(gh, frame); if (!s) return;
    const x = this.x;
    x.globalAlpha = s.finished ? 0.25 : 0.5;
    const pose = s.f & 7;
    if (pose !== 5) this.figure(S.ghostHero(), s.x, s.y, s.f & 8 ? -1 : 1, pose, (s.f & 16) ? 8 : 0, 8);
    x.globalAlpha = 0.8;
    S.drawText(x, gh.name, Math.round(s.x + 5), Math.round(s.y) - 12, '#8fe8ff', 1, 'center');
    x.globalAlpha = 1;
  }

  dark(g, cx, cy, a) {
    const x = this.x, px = g.p.x - cx + 5, py = g.p.y - cy + 7;
    const gr = x.createRadialGradient(px, py, 30, px, py, 150);
    gr.addColorStop(0, 'rgba(8,4,16,0)'); gr.addColorStop(1, `rgba(8,4,16,${a})`);
    x.fillStyle = gr; x.fillRect(0, 0, this.W, this.H);
  }

  hud(g, ghosts) {
    const x = this.x, W = this.W, p = g.p;
    if (g.slowmo) { x.fillStyle = 'rgba(110,150,255,0.13)'; x.fillRect(0, 0, W, this.H); }
    // Eiserne Plakette hinter der Anzeige oben links
    {
      const per0 = W < 220 ? 6 : 10, rows = Math.ceil(p.maxhp / per0), pw = Math.max(58, Math.min(per0, p.maxhp) * 8 + 8), ph = 40 + (rows - 1) * 7;
      const pg = x.createLinearGradient(2, 0, pw + 2, 0); pg.addColorStop(0, 'rgba(5,4,3,0.78)'); pg.addColorStop(1, 'rgba(5,4,3,0.2)');
      x.fillStyle = pg; x.fillRect(2, 2, pw, ph);
      x.fillStyle = '#9a7a3c'; x.fillRect(2, ph + 2, pw - 10, 1); x.fillStyle = '#d4b46a'; x.fillRect(2, ph + 2, 3, 1); x.fillRect(3, ph + 1, 1, 3);
    }
    const per = W < 220 ? 6 : 10;
    for (let i = 0; i < p.maxhp; i++) x.drawImage(S.heart(i < p.hp), 6 + (i % per) * 8, 6 + Math.floor(i / per) * 7);
    // Schildladungen (Rüstungseffekte) als blaue Rauten hinter den Herzen
    const shields = (g.wardN || 0) + (g.gemCharges || 0);
    for (let k = 0; k < shields; k++) { const sx = 6 + Math.min(per, p.maxhp) * 8 + 2 + k * 6, sy = 7; x.fillStyle = K; x.fillRect(sx, sy, 5, 5); x.fillStyle = '#7ad0ff'; x.fillRect(sx + 1, sy + 1, 3, 3); x.fillStyle = '#ffffff'; x.fillRect(sx + 1, sy + 1, 1, 1); }
    const gy0 = Math.floor((p.maxhp - 1) / per) * 7;
    x.translate(0, gy0);
    x.drawImage(S.gemSprite(5), 6, 16);
    if (g.gems > (this.lastGems ?? g.gems)) this.bump = 10;
    this.lastGems = g.gems;
    if (this.bump > 0) this.bump--;
    S.drawText(x, g.gems, 16, 17 - (this.bump > 6 ? 1 : 0), this.bump > 0 ? '#ffd84a' : '#fff');
    x.translate(0, -gy0);
    // Schaufelmünzen des Levels
    for (let k = 0; k < g.coinTotal; k++) { const got = g.coins.includes(k); x.fillStyle = K; x.fillRect(6 + k * 8, 26 + gy0, 7, 7); x.fillStyle = got ? '#ffd84a' : '#3a2a40'; x.fillRect(7 + k * 8, 27 + gy0, 5, 5); if (got) { x.fillStyle = '#fff6b0'; x.fillRect(7 + k * 8, 27 + gy0, 2, 2); } }
    // Rausch-Leiste
    const rw = 40, rx = 6, ry = 35 + gy0;
    x.fillStyle = K; x.fillRect(rx - 1, ry - 1, rw + 2, 5); x.fillStyle = '#2a1a3a'; x.fillRect(rx, ry, rw, 3);
    x.fillStyle = g.rushT > 0 ? ((this.t >> 2) & 1 ? '#ffd84a' : '#ff7ae0') : '#ff9a30'; x.fillRect(rx, ry, Math.round(rw * g.rush / 100), 3);
    if (g.rushT > 0) S.drawText(x, 'RAUSCH ×2', rx + rw + 4, ry - 1, '#ffd84a');
    if (g.chain >= 2) {
      const c = g.chain >= 8 ? '#ff7ae0' : g.chain >= 4 ? '#ffd84a' : '#ffffff';
      S.drawText(x, 'KETTE', W - 30, 30, '#c4abd8', 1, 'center');
      S.drawText(x, '×' + g.chain, W - 30, 38, c, 2, 'center');
    }
    if (g.banner) {
      const b = g.banner, a = Math.min(1, b.t / 20), y0 = this.H / 2 - 30;
      x.globalAlpha = a;
      const bg = x.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, 'rgba(5,4,3,0)'); bg.addColorStop(0.2, 'rgba(5,4,3,0.85)'); bg.addColorStop(0.8, 'rgba(5,4,3,0.85)'); bg.addColorStop(1, 'rgba(5,4,3,0)');
      x.fillStyle = bg; x.fillRect(0, y0, W, 40);
      const ln = x.createLinearGradient(0, 0, W, 0); ln.addColorStop(0, 'rgba(212,180,106,0)'); ln.addColorStop(0.5, '#d4b46a'); ln.addColorStop(1, 'rgba(212,180,106,0)');
      x.fillStyle = ln; x.fillRect(0, y0, W, 1); x.fillRect(0, y0 + 39, W, 1);
      if (b.sub) S.drawText(x, b.sub, W / 2, y0 + 6, b.col, 1, 'center');
      S.drawText(x, b.text, W / 2, y0 + (b.sub ? 16 : 13), (this.t >> 2) & 1 ? '#ffffff' : b.col, 2, 'center');
      x.globalAlpha = 1;
      if (b.t > 70 && b.t % 6 < 3) { x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, 0, W, this.H); }
    }
    const tx = W < 220 ? Math.max(W / 2, 6 + per * 8 + 26) : W / 2;
    if (!g.level.arena) S.drawText(x, fmtTime(g.frame), tx, 6, '#fff', 1, 'center');
    let gy = 14;
    if (g.level.gen) { S.drawText(x, g.hudLabel || 'TIEFE ' + g.level.depth, tx, gy, '#c58bff', 1, 'center'); gy += 8; }
    if (g.timeLimit && !g.done) { const left = Math.max(0, g.timeLimit - g.frame); S.drawText(x, 'NOCH ' + fmtTime(left), tx, gy, left < 600 && (this.t >> 3) & 1 ? '#ff5050' : '#ffb0a0', 1, 'center'); gy += 8; }
    if (g.chase && !g.done) { const d = g.chase.vert ? (g.chase.pos - g.p.y - g.p.h) : (g.p.x - g.chase.pos); if (d < 90 && (this.t >> 2) & 1) { x.fillStyle = 'rgba(255,40,40,0.18)'; g.chase.vert ? x.fillRect(0, this.H - 18, W, 18) : x.fillRect(0, 0, 14, this.H); } }
    for (const gh of ghosts) {
      const d = g.frame - gh.frames;
      S.drawText(x, `${gh.name} ${fmtTime(gh.frames)}`, tx, gy, '#8fe8ff', 1, 'center'); gy += 7;
      if (g.done) { S.drawText(x, (d <= 0 ? '-' : '+') + (Math.abs(d) / 60).toFixed(2), tx, gy, d <= 0 ? '#7dffa0' : '#ff7a8a', 1, 'center'); gy += 7; }
    }
    if (g.sign) {
      const lines = S.wrapText(g.sign, Math.floor((W - 40) / 4));
      const bw = Math.max(...lines.map(S.textWidth)) + 12, bh = lines.length * 7 + 8, bx = Math.round(W / 2 - bw / 2), by = 34;
      x.fillStyle = K; x.fillRect(bx - 1, by - 1, bw + 2, bh + 2); x.fillStyle = '#f4e6c8'; x.fillRect(bx, by, bw, bh);
      x.fillStyle = '#c8a878'; x.fillRect(bx, by + bh - 2, bw, 2);
      lines.forEach((l, i) => S.drawText(x, l, W / 2, by + 5 + i * 7, '#3a2418', 1, 'center'));
    }
    const b = g.boss;
    if (b && !b.dead && b.state !== 'idle') {
      const bw = Math.min(160, W - 60), bx = Math.round(W / 2 - bw / 2), by = this.H - 14;
      S.drawText(x, b.title || 'ROSTMAULWURF', W / 2, by - 8, '#ffb070', 1, 'center');
      x.fillStyle = K; x.fillRect(bx - 1, by - 1, bw + 2, 6); x.fillStyle = '#3a1010'; x.fillRect(bx, by, bw, 4);
      x.fillStyle = '#ff5a3a'; x.fillRect(bx, by, Math.round(bw * Math.max(0, b.hp) / b.maxhp), 4);
    }
    if (!this.noIntro && g.frame < 150 && !g.done && !g.banner) {
      const a = g.frame < 120 ? 1 : (150 - g.frame) / 30;
      x.globalAlpha = a;
      x.fillStyle = 'rgba(20,12,28,0.7)'; x.fillRect(0, this.H / 2 - 22, W, 34);
      S.drawText(x, g.level.id, W / 2, this.H / 2 - 16, '#ffd84a', 1, 'center');
      S.drawText(x, g.level.name, W / 2, this.H / 2 - 7, '#fff', 2, 'center');
      x.globalAlpha = 1;
    }
  }
}

function partCol(c, th, g, q) {
  const alt = (q.x * 7 + q.y) % 2 < 1;
  switch (c) {
    case 'dirt': return alt ? th.dirtL : th.dirt;
    case 'stone': return alt ? th.stoneL : th.stone;
    case 'spark': return alt ? '#ffe066' : '#ffffff';
    case 'poof': return alt ? '#ffffff' : '#c8b8e8';
    case 'hero': return alt ? TIERS[g.armorTier || 0].light : '#c23a5a';
    case 'spore': return alt ? '#ffb0c0' : '#ffffff';
    case 'dust': return alt ? '#e8dcc8' : '#b8a890';
    case 'ghost': return alt ? '#8fe8ff' : '#e8ffff';
    case 'fire': return q.life > 18 ? '#ffe070' : q.life > 9 ? '#ff8a2a' : '#c02a00';
    case 'soul': return alt ? '#b07aff' : '#ffffff';
    case 'star': return alt ? '#d8c8ff' : '#ffffff';
    case 'ore': return alt ? '#b04cff' : '#f0c0ff';
    case 'gold': return alt ? '#ffd84a' : '#fff6b0';
    case 'ice': return alt ? '#9ad8ff' : '#e8f8ff';
    case 'crumble': return alt ? '#c86a8a' : '#ffb0c8';
    case 'zzz': return '#ffffff';
    case 'confetti': return ['#ff4f7a', '#ffd84a', '#4fd2ff', '#7dffa0', '#c58bff'][(Math.floor(q.x * 3 + q.y * 7) % 5 + 5) % 5];
    default: return '#fff';
  }
}
