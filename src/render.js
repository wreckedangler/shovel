// Zeichnet einen Game-Zustand in eine kleine Pixel-Leinwand (z. B. 320×180).
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

    if (g.level.theme === 'hoehle' || g.level.theme === 'bau') this.dark(g, cx, cy, g.level.theme === 'bau' ? 0.35 : 0.55);
    this.hud(g, ghosts);
  }

  steam(g) {
    const x = this.x;
    for (const v of g.vents) {
      const on = g.ventOn(v), bx = v.tx * T, by = v.ty * T;
      if (!on) { if ((this.t >> 3) & 1) { x.fillStyle = '#ffffff30'; x.fillRect(bx + 6, by - 3, 4, 2); } continue; }
      for (let k = 0; k < 14; k++) {
        const ph = (this.t * 2.2 + k * 7 + v.tx * 13) % 96, sx = bx + 3 + ((k * 5 + this.t) % 10), sy = by - ph;
        x.fillStyle = ph > 70 ? '#ffffff30' : ph > 40 ? '#ffffff60' : '#ffffffa0';
        x.fillRect(Math.round(sx), Math.round(sy), ph > 50 ? 3 : 2, ph > 50 ? 3 : 2);
      }
    }
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
      else if (c === 'V') img = ts.vent; else if (c === 'R') img = ts.ore;
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
      case 'cog': x.drawImage(S.cogSprite((f >> 2) % 4), Math.round(e.x) - 1, Math.round(e.y) - 1); return;
      case 'knight': x.drawImage(S.knightSprite()[(e.dir > 0 ? 1 : 0) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y)); return;
      case 'kuckuck': x.drawImage(S.cuckooSprite()[(e.dir > 0 ? 0 : 1) + (e.flash ? 2 : 0)], Math.round(e.x), Math.round(e.y) - 1 + ((f >> 3) & 1)); return;
      case 'eproj': {
        const ex = Math.round(e.x), ey = Math.round(e.y);
        if (e.kind === 'gear') x.drawImage(S.cogSprite((f >> 1) % 4, 4, 6), ex - 1, ey - 1);
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

  player(g) {
    const p = g.p; if (p.dead) return;
    if (p.inv > 0 && (this.t >> 2) & 1 && p.hurt <= 0) return;
    const hs = S.hero(g.gear.armor, g.gear.shovel, g.gear.weapon);
    if (p.dash > 0) { this.x.globalAlpha = 0.6; }
    this.figure(hs, p.x, p.y, p.face, g.pose(), p.anim, p.atk, p.hurt > 0 ? hs.white : null, p.land, p.atkLen || 16);
    this.x.globalAlpha = 1;
    const wp = g.gear.weapon && weaponById(g.gear.weapon);
    if (wp && (this.t + p.anim) % 24 < 3) {
      // Glitzern an der Klinge
      this.x.fillStyle = wp.rar === 'mythisch' ? '#ff9af0' : '#fff6b0';
      const bx = p.atk > 0 ? (p.face > 0 ? p.x + 22 : p.x - 12) : (p.face > 0 ? p.x - 2 : p.x + 11);
      this.x.fillRect(Math.round(bx), Math.round(p.atk > 0 ? p.y + 5 : p.y - 8), 1, 1);
    }
  }
  figure(hs, px, py, face, pose, anim, atk = 8, white = null, land = 0, atkLen = 16) {
    const x = this.x, i = face > 0 ? 0 : 1, X = Math.round(px), Y = Math.round(py);
    const wind = atk > atkLen * 0.78;
    const legs = pose === 1 ? ((anim >> 3) & 1 ? 'run1' : 'run2') : pose === 2 || pose === 4 ? 'air' : 'stand';
    const U = hs.shU[i], H = hs.shH[i], Dn = hs.shD[i];
    if (hs.fx && !white) this.fx(hs.fx, X, Y, face, false);
    if (pose <= 2) x.drawImage(U, face > 0 ? X - 5 : X + 8, Y + 7 - U.height);
    const body = (white || hs)[legs][i];
    if (land > 0) { const q = Math.min(3, land); x.drawImage(body, X - 5 - q, Y - 10 + q, 20 + q * 2, 24 - q); }
    else x.drawImage(body, X - 5, Y - 10);
    if (pose === 3) {
      if (wind) x.drawImage(U, face > 0 ? X + 7 : X - 4, Y + 4 - U.height);
      else x.drawImage(H, face > 0 ? X + 8 : X + 2 - H.width, Y + 2);
    }
    if (pose === 4) x.drawImage(Dn, X + 2, Y + 9);
    if (hs.fx && !white) this.fx(hs.fx, X, Y, face, true);
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
    if (g.chain >= 2) {
      const c = g.chain >= 8 ? '#ff7ae0' : g.chain >= 4 ? '#ffd84a' : '#ffffff';
      S.drawText(x, 'KETTE', W - 30, 30, '#c4abd8', 1, 'center');
      S.drawText(x, '×' + g.chain, W - 30, 38, c, 2, 'center');
    }
    if (g.banner) {
      const b = g.banner, a = Math.min(1, b.t / 20), y0 = this.H / 2 - 30;
      x.globalAlpha = a;
      x.fillStyle = 'rgba(20,12,28,0.78)'; x.fillRect(0, y0, W, 40);
      x.fillStyle = b.col; x.fillRect(0, y0, W, 1); x.fillRect(0, y0 + 39, W, 1);
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
    if (g.frame < 150 && !g.done && !g.banner) {
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
    default: return '#fff';
  }
}
