// Zeichnet einen Game-Zustand in eine kleine Pixel-Leinwand (z. B. 320×180).
import { COSMETICS } from './loot.js';
const COSMETIC_COL = Object.fromEntries(COSMETICS.filter(c => c.col).map(c => [c.id, c.col]));
const COSMETIC_FILTER = Object.fromEntries(COSMETICS.filter(c => c.filter).map(c => [c.id, c.filter]));
import { T } from './game.js';
import { THEMES } from './themes.js';
import { TIERS } from './gear.js';
import { weaponById, RARITY } from './weapons.js';
import { ghostAt, fmtTime } from './ghost.js';
import * as S from './sprites.js';

const K = '#140c1c';

export class Renderer {
  constructor(ctx) { this.x = ctx; this.cam = { x: 0, y: 0 }; this.t = 0; }
  resize(w, h) { this.W = w; this.H = h; }

  snapCamera(g) { this.cam = this.target(g); }
  target(g) {
    const p = g.p;
    const lead = this.W < 220 ? 18 : 28;
    const x = Math.max(0, Math.min(g.w * T - this.W, p.x + p.w / 2 + p.face * lead - this.W / 2));
    const maxY = g.h * T - this.H;
    // Ist die Ansicht höher als das Level (Hochformat), sitzt der Boden unten und oben ist Himmel
    const y = maxY < 0 ? maxY : Math.max(0, Math.min(maxY, p.y - this.H * 0.55));
    return { x, y };
  }

  draw(g, ghosts = []) {
    const x = this.x, W = this.W, H = this.H, th = THEMES[g.level.theme];
    this.t++;
    const tg = this.target(g);
    this.cam.x += (tg.x - this.cam.x) * 0.14; this.cam.y += (tg.y - this.cam.y) * 0.1;
    const sh = g.shake ? (Math.random() - 0.5) * g.shake : 0;
    const cx = Math.round(this.cam.x + sh), cy = Math.round(this.cam.y + (g.shake ? (Math.random() - 0.5) * g.shake : 0));

    // Kulisse
    const bg = S.backdrop(th, H);
    x.drawImage(bg.sky, 0, 0, W, H);
    x.fillStyle = th.stars;
    for (const s of bg.stars) if ((this.t / 20 + s.p) % 6 > 1) x.fillRect(((s.x - cx * 0.05) % W + W) % W, s.y, 1, 1);
    for (const [img, f] of [[bg.far, 0.2], [bg.near, 0.45]]) {
      const ox = -Math.round(cx * f) % img.width;
      for (let k = ox - img.width; k < W; k += img.width) x.drawImage(img, k, Math.round(-cy * f * 0.3));
    }

    x.save(); x.translate(-cx, -cy);
    this.tiles(g, th, cx, cy);
    this.steam(g);
    const ps = S.platSprite();
    for (const pl of g.plats) x.drawImage(ps, Math.round(pl.x), Math.round(pl.y));
    for (const e of g.ents) this.ent(g, e, th);
    for (const gh of ghosts) this.ghost(gh, g.frame);
    this.player(g);
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

    const darkA = { hoehle: 0.55, bau: 0.35, grotte: 0.78, moder: 0.35 }[g.level.theme];
    if (darkA) this.dark(g, cx, cy, darkA);
    this.hud(g, ghosts);
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

  tiles(g, th, cx, cy) {
    const x = this.x, ts = S.tileset(th);
    const x0 = Math.floor(cx / T), x1 = Math.ceil((cx + this.W) / T), y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(g.h - 1, Math.ceil((cy + this.H) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = g.tile(tx, ty);
      if (g.hidden.size && g.hidden.has(tx + ',' + ty)) { x.drawImage(ts.fill[(tx * 7 + ty * 13) % 3], tx * T, ty * T); if (g.mod.seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.18)'; x.fillRect(tx * T, ty * T, T, T); } continue; }
      if (c === '.') continue;
      const v = (tx * 7 + ty * 13) % 3, px = tx * T, py = ty * T;
      let img;
      if (c === '#' || c === 'F') { if (tx < 0 || tx >= g.w) continue; const up = g.tile(tx, ty - 1); img = (up === '#' || up === 'F') && ty > 0 ? ts.fill[v] : ts.top[v]; }
      else if (c === 'H') { if (g.mod.seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.35)'; x.fillRect(px + 2, py + 2, 12, 12); } continue; }
      else if (c === 'J') img = ts.used;
      else if (c === 'c') { const cr = g.crumbles.get(tx + ',' + ty); x.drawImage(ts.crumble, px + (cr && cr.state === 'shake' ? ((this.t >> 1) & 1) * 2 - 1 : 0), py); continue; }
      else if (c === 'D') img = ts.dirt; else if (c === 'S') img = ts.stone; else if (c === '^') img = ts.spike;
      else if (c === '=') img = ts.plank; else if (c === 'B') img = ts.mush; else if (c === 'X') img = ts.gate;
      else if (c === 'V') img = ts.vent; else if (c === 'R') img = ts.ore;
      if (img) x.drawImage(img, px, py);
      if (c === 'F') {
        // Feiner Riss als Hinweis; mit der Spürschaufel leuchtet die Wand
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px + 7, py + 6, 1, 4); x.fillRect(px + 8, py + 9, 2, 1);
        if (g.mod.seer && (this.t >> 3) & 1) { x.fillStyle = 'rgba(125,255,207,0.3)'; x.fillRect(px, py, 16, 16); }
      }
    }
  }

  ent(g, e, th) {
    if (g.isHidden(e.x + e.w / 2, e.y + e.h / 2)) { if (e.type === 'coin' && g.mod.seer && (this.t >> 4) & 1) { this.x.globalAlpha = 0.5; this.ent0(g, e, th); this.x.globalAlpha = 1; } return; }
    this.ent0(g, e, th);
    if (e.golden && !e.dead) {
      const x = this.x;
      if ((this.t + e.x) % 12 < 2) { x.fillStyle = '#fff6b0'; x.fillRect(Math.round(e.x + Math.random() * e.w), Math.round(e.y + Math.random() * e.h), 1, 1); }
      x.globalAlpha = 0.45; x.fillStyle = '#ffd84a'; x.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h); x.globalAlpha = 1;
    }
  }
  ent0(g, e, th) {
    const x = this.x, f = this.t;
    switch (e.type) {
      case 'gem': {
        const bob = e.fixed ? Math.round(Math.sin(f / 12 + e.x) * 1.5) : 0;
        if (!e.fixed && e.age > 780 && (f >> 2) & 1) return;
        x.drawImage(S.gemSprite(e.val), Math.round(e.x), Math.round(e.y) + bob);
        if ((f + e.x) % 90 < 6) { x.fillStyle = '#fff'; x.fillRect(Math.round(e.x) + 1, Math.round(e.y) + bob + 1, 1, 1); }
        return;
      }
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
        if (e.kind === 'gear') x.drawImage(S.cogSprite((f >> 1) % 4, 4, 6), ex - 1, ey - 1);
        else if (e.kind === 'spore') { x.fillStyle = K; x.fillRect(ex, ey + 1, 7, 5); x.fillRect(ex + 1, ey, 5, 7); x.fillStyle = (f >> 2) & 1 ? '#c86aff' : '#e0a0ff'; x.fillRect(ex + 1, ey + 1, 5, 5); x.fillStyle = '#fff'; x.fillRect(ex + 2, ey + 2, 1, 1); }
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
        if (e.kind === 'star') {
          const sx = Math.round(e.x), sy = Math.round(e.y), c = (f >> 1) & 1 ? '#ffffff' : '#d8c8ff';
          x.fillStyle = K; x.fillRect(sx + 1, sy, 4, 6); x.fillRect(sx, sy + 1, 6, 4);
          x.fillStyle = c; x.fillRect(sx + 2, sy, 2, 6); x.fillRect(sx, sy + 2, 6, 2);
        } else {
          const sx = Math.round(e.x), sy = Math.round(e.y), hgt = 6 + ((f >> 1) & 3);
          x.fillStyle = K; x.fillRect(sx, sy + 10 - hgt - 1, 10, hgt + 1);
          x.fillStyle = '#ff9a50'; x.fillRect(sx + 1, sy + 10 - hgt, 8, hgt - 1); x.fillStyle = '#ffe070'; x.fillRect(sx + 3, sy + 10 - hgt, 4, 2);
        }
        return;
      case 'altar': {
        if (!e.taken) { x.fillStyle = 'rgba(255,170,60,0.16)'; x.beginPath(); x.arc(e.x + 12, e.y + 2, 22 + Math.sin(f / 8) * 3, 0, 7); x.fill(); }
        x.drawImage(S.altarSprite(!e.taken), e.x + 4, e.y + 12);
        if (!e.taken) {
          const ic = S.weaponIcon('urfunke');
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
    if (p.inv > 0 && (this.t >> 2) & 1 && p.hurt <= 0) return;
    const hs = S.hero(g.gear.armor, g.gear.shovel, g.gear.weapon);
    const tint = this.look && this.look.farbe && COSMETIC_FILTER[this.look.farbe];
    if (tint) this.x.filter = tint;
    try { this.playerBody(g, p, hs); } finally { this.x.filter = 'none'; }
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
    if (hs.fx && !white) this.fx(hs.fx, X, Y, face, false);
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
    if (hs.fx && !white) this.fx(hs.fx, X, Y, face, true);
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
  fx(kind, X, Y, face, front) {
    const x = this.x, t = this.t;
    const P = (col, row) => [face > 0 ? X - 5 + col : X + 14 - col, Y - 10 + row];
    const dot = (c, r, col, s = 1) => { const [a, b] = P(c, r); x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), s, s); };
    switch (kind) {
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
    // Eiserne Plakette hinter der Anzeige oben links
    {
      const per0 = W < 220 ? 6 : 10, rows = Math.ceil(p.maxhp / per0), pw = Math.max(58, Math.min(per0, p.maxhp) * 8 + 8), ph = 40 + (rows - 1) * 7;
      const pg = x.createLinearGradient(2, 0, pw + 2, 0); pg.addColorStop(0, 'rgba(5,4,3,0.78)'); pg.addColorStop(1, 'rgba(5,4,3,0.2)');
      x.fillStyle = pg; x.fillRect(2, 2, pw, ph);
      x.fillStyle = '#9a7a3c'; x.fillRect(2, ph + 2, pw - 10, 1); x.fillStyle = '#d4b46a'; x.fillRect(2, ph + 2, 3, 1); x.fillRect(3, ph + 1, 1, 3);
    }
    const per = W < 220 ? 6 : 10;
    for (let i = 0; i < p.maxhp; i++) x.drawImage(S.heart(i < p.hp), 6 + (i % per) * 8, 6 + Math.floor(i / per) * 7);
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
    S.drawText(x, fmtTime(g.frame), tx, 6, '#fff', 1, 'center');
    let gy = 14;
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
    case 'hero': return alt ? TIERS[g.gear.armor].light : '#c23a5a';
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
