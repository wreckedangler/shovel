// Zeichnet einen Game-Zustand in eine kleine Pixel-Leinwand (z. B. 320×180).
import { T } from './game.js';
import { THEMES } from './themes.js';
import { TIERS } from './gear.js';
import { ghostAt, fmtTime } from './ghost.js';
import * as S from './sprites.js';

const K = '#140c1c';

export class Renderer {
  constructor(ctx) { this.x = ctx; this.cam = { x: 0, y: 0 }; this.t = 0; }
  resize(w, h) { this.W = w; this.H = h; }

  snapCamera(g) { this.cam = this.target(g); }
  target(g) {
    const p = g.p;
    const x = Math.max(0, Math.min(g.w * T - this.W, p.x + p.w / 2 + p.face * 28 - this.W / 2));
    const y = Math.max(0, Math.min(g.h * T - this.H, p.y - this.H * 0.55));
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
    for (const e of g.ents) this.ent(g, e, th);
    for (const gh of ghosts) this.ghost(gh, g.frame);
    this.player(g);
    for (const q of g.parts) {
      x.fillStyle = partCol(q.col, th, g, q);
      const s = q.life > 12 ? 2 : 1;
      x.fillRect(Math.round(q.x), Math.round(q.y), s, s);
    }
    x.restore();

    if (g.level.theme === 'hoehle' || g.level.theme === 'bau') this.dark(g, cx, cy, g.level.theme === 'bau' ? 0.35 : 0.55);
    this.hud(g, ghosts);
  }

  tiles(g, th, cx, cy) {
    const x = this.x, ts = S.tileset(th);
    const x0 = Math.floor(cx / T), x1 = Math.ceil((cx + this.W) / T), y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(g.h - 1, Math.ceil((cy + this.H) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = g.tile(tx, ty); if (c === '.') continue;
      const v = (tx * 7 + ty * 13) % 3, px = tx * T, py = ty * T;
      let img;
      if (c === '#') { if (tx < 0 || tx >= g.w) continue; img = g.tile(tx, ty - 1) === '#' && ty > 0 ? ts.fill[v] : ts.top[v]; }
      else if (c === 'D') img = ts.dirt; else if (c === 'S') img = ts.stone; else if (c === '^') img = ts.spike;
      else if (c === '=') img = ts.plank; else if (c === 'B') img = ts.mush; else if (c === 'X') img = ts.gate;
      if (img) x.drawImage(img, px, py);
    }
  }

  ent(g, e, th) {
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

  player(g) {
    const p = g.p; if (p.dead) return;
    if (p.inv > 0 && (this.t >> 2) & 1 && p.hurt <= 0) return;
    const hs = S.hero(g.gear.armor, g.gear.shovel);
    this.figure(hs, p.x, p.y, p.face, g.pose(), p.anim, p.atk, p.hurt > 0 ? hs.white : null);
  }
  figure(hs, px, py, face, pose, anim, atk = 8, white = null) {
    const x = this.x, i = face > 0 ? 0 : 1, X = Math.round(px), Y = Math.round(py);
    const legs = pose === 1 ? ((anim >> 3) & 1 ? 'run1' : 'run2') : pose === 2 || pose === 4 || pose === 3 && atk < 0 ? 'air' : 'stand';
    if (pose <= 2) x.drawImage(hs.shU[i], face > 0 ? X - 4 : X + 9, Y - 5);
    x.drawImage((white || hs)[legs][i], X - 1, Y - 2);
    if (pose === 3) {
      if (atk > 12) x.drawImage(hs.shU[i], face > 0 ? X + 8 : X - 3, Y - 8);
      else x.drawImage(hs.shH[i], face > 0 ? X + 8 : X - 10, Y + 3);
    }
    if (pose === 4) x.drawImage(hs.shD[i], X + 3, Y + 9);
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
    for (let i = 0; i < p.maxhp; i++) x.drawImage(S.heart(i < p.hp), 6 + i * 8, 6);
    x.drawImage(S.gemSprite(5), 6, 16);
    S.drawText(x, g.gems, 16, 17, '#fff');
    S.drawText(x, fmtTime(g.frame), W / 2, 6, '#fff', 1, 'center');
    let gy = 14;
    for (const gh of ghosts) {
      const d = g.frame - gh.frames;
      S.drawText(x, `${gh.name} ${fmtTime(gh.frames)}`, W / 2, gy, '#8fe8ff', 1, 'center'); gy += 7;
      if (g.done) { S.drawText(x, (d <= 0 ? '-' : '+') + (Math.abs(d) / 60).toFixed(2), W / 2, gy, d <= 0 ? '#7dffa0' : '#ff7a8a', 1, 'center'); gy += 7; }
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
      S.drawText(x, 'ROSTMAULWURF', W / 2, by - 8, '#ffb070', 1, 'center');
      x.fillStyle = K; x.fillRect(bx - 1, by - 1, bw + 2, 6); x.fillStyle = '#3a1010'; x.fillRect(bx, by, bw, 4);
      x.fillStyle = '#ff5a3a'; x.fillRect(bx, by, Math.round(bw * Math.max(0, b.hp) / b.maxhp), 4);
    }
    if (g.frame < 150 && !g.done) {
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
    default: return '#fff';
  }
}
