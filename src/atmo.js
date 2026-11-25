// Atmosphäre: Licht und Dunkelheit, Vordergrund-Silhouetten, Wetter und Schwebeteilchen.
// Alles prozedural, pro Thema ein Charakter. Wird von render.js nach der Spielwelt gezeichnet.
import { T } from './game.js';

const memo = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hashStr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// Wie dunkel ist es? (0 = Tageslicht). Höhlen in den Tiefen sind besonders finster.
export function darkness(level) {
  const base = { hoehle: 0.82, bau: 0.62, grotte: 0.9, moder: 0.55, pilz: 0.35, glocke: 0.3, uhrturm: 0.25, pendel: 0.35 }[level.theme] || 0;
  return level.gen && level.style === 'hoehle' ? Math.max(base, 0.85) : level.gen && level.style === 'schacht' ? Math.max(base, 0.5) : base;
}

// Welches Wetter? Aus dem Level-Namen gewürfelt, damit es pro Level fest bleibt
const WEATHER = {
  wald: ['blaetter', 'gluehwuermchen', 'regen', 'blaetter'], hoehle: ['tropfen', 'staub'], dornen: ['wind', 'bluete', 'regen'],
  bau: ['staub', 'glut'], uhrturm: ['funken', 'staub'], glocke: ['staub', 'schnee'], pendel: ['staub'], pilz: ['sporen', 'gluehwuermchen'],
  grotte: ['leuchten', 'tropfen'], moder: ['sporen', 'nebel'], karte: ['staub'],
};
export const weatherOf = level => { const opts = WEATHER[level.theme] || ['staub']; return opts[hashStr(level.id) % opts.length]; };

export class Atmo {
  constructor() { this.parts = []; this.level = null; this.lc = null; this.drops = []; }
  reset(level, W, H) { this.level = level; this.kind = weatherOf(level); this.parts = []; this.drops = []; this.dark = darkness(level); this.W = W; this.H = H; this.flash = 0; }

  /* ---------- Wetter (Bildschirmraum, mit leichter Parallaxe) ---------- */
  weather(x, g, cx, cy, t, front) {
    const W = this.W, H = this.H, k = this.kind, P = this.parts;
    const want = { regen: 90, blaetter: 22, gluehwuermchen: 26, tropfen: 6, staub: 40, wind: 14, bluete: 18, glut: 30, funken: 10, schnee: 60, sporen: 40, leuchten: 34, nebel: 0 }[k] || 0;
    if (!front) {
      while (P.length < want) P.push(this.spawn(k, true));
      if (k === 'nebel') this.fog(x, cx, t);
      if (k === 'regen' && Math.random() < 0.002) this.flash = 10;
    }
    if (this.flash > 0 && front) { x.fillStyle = `rgba(220,230,255,${this.flash / 30})`; x.fillRect(0, 0, W, H); this.flash--; }
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; if (!!q.front !== !!front) continue;
      if (!front) { q.x += q.vx; q.y += q.vy; q.life--; q.ph += 0.05; }
      const sx = ((q.x - cx * q.z) % (W + 20) + W + 20) % (W + 20) - 10, sy = ((q.y - cy * q.z * 0.5) % (H + 20) + H + 20) % (H + 20) - 10;
      if (!front && (q.life <= 0)) { P.splice(i, 1); continue; }
      const a = Math.min(1, q.life / 40);
      switch (k) {
        case 'regen': x.globalAlpha = 0.5 * a; x.fillStyle = '#9ab0e0'; x.fillRect(Math.round(sx), Math.round(sy), 1, q.front ? 5 : 3); break;
        case 'blaetter': case 'bluete': { q.vx = -0.3 + Math.sin(q.ph) * 0.4; x.globalAlpha = a; x.fillStyle = k === 'bluete' ? (q.c ? '#ff9ac0' : '#ffd0e0') : (q.c ? '#d0702a' : '#e8a838'); const w = Math.sin(q.ph * 2) > 0 ? 2 : 1; x.fillRect(Math.round(sx), Math.round(sy), w, 1); break; }
        case 'gluehwuermchen': case 'leuchten': { q.vx = Math.sin(q.ph * 0.7) * 0.2; q.vy = Math.cos(q.ph * 0.9) * 0.15; const on = Math.sin(q.ph * 1.6 + q.c * 3) > 0.2; if (!on) break; x.globalAlpha = a; x.fillStyle = k === 'leuchten' ? '#7dffe0' : '#e8ff80'; x.fillRect(Math.round(sx), Math.round(sy), 1, 1); x.globalAlpha = a * 0.3; x.fillRect(Math.round(sx) - 1, Math.round(sy), 3, 1); x.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 3); break; }
        case 'staub': x.globalAlpha = a * 0.35; x.fillStyle = '#e8dcc0'; x.fillRect(Math.round(sx), Math.round(sy), 1, 1); q.vx = Math.sin(q.ph * 0.5) * 0.08; break;
        case 'wind': x.globalAlpha = a * 0.25; x.fillStyle = '#ffffff'; x.fillRect(Math.round(sx), Math.round(sy), 10 + q.c * 8, 1); break;
        case 'glut': case 'funken': x.globalAlpha = a; x.fillStyle = q.life > 60 ? '#fff2a0' : '#ff8a2a'; x.fillRect(Math.round(sx), Math.round(sy), 1, 1); break;
        case 'schnee': q.vx = Math.sin(q.ph) * 0.25; x.globalAlpha = a * 0.8; x.fillStyle = '#ffffff'; x.fillRect(Math.round(sx), Math.round(sy), q.front ? 2 : 1, q.front ? 2 : 1); break;
        case 'sporen': q.vx = Math.sin(q.ph) * 0.15; x.globalAlpha = a * 0.6; x.fillStyle = q.c ? '#c0ffb0' : '#ff9ad8'; x.fillRect(Math.round(sx), Math.round(sy), 1, 1); break;
        case 'tropfen': {
          x.globalAlpha = 0.7; x.fillStyle = '#9ad8ff'; x.fillRect(Math.round(sx), Math.round(sy), 1, 2);
          if (q.y > q.floor) { q.life = 0; this.drops.push({ x: sx, y: sy, t: 10 }); }
          break;
        }
      }
    }
    for (let i = this.drops.length - 1; i >= 0 && front; i--) { const d = this.drops[i]; x.globalAlpha = d.t / 10; x.fillStyle = '#9ad8ff'; x.fillRect(Math.round(d.x - (10 - d.t) / 2), Math.round(d.y), 1, 1); x.fillRect(Math.round(d.x + (10 - d.t) / 2), Math.round(d.y), 1, 1); if (--d.t <= 0) this.drops.splice(i, 1); }
    x.globalAlpha = 1;
  }
  spawn(k, init) {
    const W = this.W, H = this.H, r = Math.random;
    const q = { x: r() * (W + 20), y: init ? r() * H : -8, vx: 0, vy: 0, life: 200 + r() * 300, ph: r() * 6, c: r() < 0.5 ? 1 : 0, z: 0.2 + r() * 0.8, front: r() < 0.25 };
    switch (k) {
      case 'regen': q.vx = -1.2; q.vy = 5 + r() * 2; q.life = 60; break;
      case 'blaetter': case 'bluete': q.vy = 0.3 + r() * 0.3; break;
      case 'schnee': q.vy = 0.25 + r() * 0.4; break;
      case 'staub': q.vy = -0.02; q.life = 300 + r() * 400; break;
      case 'wind': q.vx = 3 + r() * 2; q.y = r() * H; q.x = -20; q.life = 80; break;
      case 'glut': case 'funken': q.y = init ? r() * H : H + 6; q.vy = -0.4 - r() * 0.5; q.vx = (r() - 0.5) * 0.3; q.life = 100 + r() * 60; break;
      case 'sporen': q.y = init ? r() * H : H + 6; q.vy = -0.12 - r() * 0.2; break;
      case 'tropfen': q.vy = 2.5; q.x = r() * W; q.y = -4; q.floor = H * (0.6 + r() * 0.35); q.life = 200; q.front = false; q.z = 0; break;
    }
    return q;
  }
  fog(x, cx, t) {
    const W = this.W, H = this.H;
    for (let k = 0; k < 3; k++) {
      const off = ((t * (0.2 + k * 0.12) - cx * (0.3 + k * 0.2)) % (W * 2) + W * 2) % (W * 2) - W;
      const fg = x.createLinearGradient(off, 0, off + W * 1.4, 0);
      fg.addColorStop(0, 'rgba(200,190,220,0)'); fg.addColorStop(0.5, `rgba(200,190,220,${0.06 + k * 0.025})`); fg.addColorStop(1, 'rgba(200,190,220,0)');
      x.fillStyle = fg; x.fillRect(0, H * (0.45 + k * 0.15), W, H * 0.3);
    }
  }

  /* ---------- Licht ---------- */
  light(x, g, cx, cy, t) {
    const fin = g.curse && g.curse.finsternis, a = fin ? 0.97 : this.dark; if (!a) return;
    const W = this.W, H = this.H;
    if (!this.lc || this.lc.width !== W || this.lc.height !== H) this.lc = mk(W, H);
    const L = this.lc.getContext('2d');
    L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, W, H);
    L.fillStyle = `rgba(6,4,12,${a})`; L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = 'destination-out';
    const glows = [];
    const hole = (px, py, r, s = 1, col = null) => {
      const sx = px - cx, sy = py - cy; if (sx < -r || sy < -r || sx > W + r || sy > H + r) return;
      const gr = L.createRadialGradient(sx, sy, r * 0.15, sx, sy, r); gr.addColorStop(0, `rgba(0,0,0,${s})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gr; L.fillRect(sx - r, sy - r, r * 2, r * 2);
      if (col) glows.push([sx, sy, r, col]);
    };
    const p = g.p, fl = 1 + Math.sin(t / 5) * 0.03 + Math.sin(t / 13) * 0.04;
    if (!p.dead) hole(p.x + 5, p.y + 6, (fin ? 44 : 74) * fl, 1, '255,190,110');
    for (const e of g.ents) {
      if (e.dead) continue;
      switch (e.type) {
        case 'lantern': hole(e.x + 4, e.y + 6, e.lit ? 90 * fl : 34, 1, e.lit ? '255,170,70' : null); break;
        case 'gem': hole(e.x + 3, e.y + 3, 16, 0.6); break;
        case 'coin': hole(e.x + 6, e.y + 6, 30, 0.9, '255,216,74'); break;
        case 'goal': hole(e.x + 6, e.y + 10, 60, 1, '255,240,200'); break;
        case 'wisp': hole(e.x + 4, e.y + 4, 40, 0.9, '79,210,255'); break;
        case 'chest': if (!e.open) hole(e.x + 7, e.y + 6, 22, 0.6, '255,200,80'); break;
        case 'door': hole(e.x + 8, e.y + 12, 40, 0.8, '125,255,207'); break;
        case 'altar': hole(e.x + 12, e.y + 8, 60, 1, '255,120,60'); break;
        default: if (e.golden) hole(e.x + e.w / 2, e.y + e.h / 2, 30, 0.8, '255,216,74'); else if (e.foe && e.type === 'spitter') hole(e.x + 6, e.y + 4, 18, 0.5, '160,255,120');
      }
    }
    for (const q of g.parts) if (q.col === 'fire' || q.col === 'gold' || q.col === 'spark') hole(q.x, q.y, 10, 0.5);
    // leuchtende Kacheln im Sichtfeld (Pilze, Erz, Dampf)
    const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T);
    for (let ty = y0; ty <= y0 + Math.ceil(H / T); ty++) for (let tx = x0; tx <= x0 + Math.ceil(W / T); tx++) {
      const c = g.tiles[ty] && g.tiles[ty][tx];
      if (c === 'B') hole(tx * T + 8, ty * T + 4, 34, 0.8, '255,106,208');
      else if (c === 'R') hole(tx * T + 8, ty * T + 8, 20, 0.6, '180,90,255');
      else if (c === 'V') hole(tx * T + 8, ty * T, 26, 0.5);
      else if (c === '^') hole(tx * T + 8, ty * T + 8, 12, 0.3);
    }
    x.drawImage(this.lc, 0, 0);
    // warmes Farblicht obendrauf
    x.globalCompositeOperation = 'lighter';
    for (const [sx, sy, r, col] of glows) {
      const gr = x.createRadialGradient(sx, sy, 0, sx, sy, r * 0.7); gr.addColorStop(0, `rgba(${col},${0.16 * a + 0.04})`); gr.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = gr; x.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    x.globalCompositeOperation = 'source-over';
  }
  // Lichtstrahlen von oben in offenen, hellen Gebieten
  rays(x, cx, t, theme) {
    if (!['wald', 'glocke', 'dornen', 'pilz'].includes(theme) || this.kind === 'regen') return;
    const W = this.W, H = this.H;
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const bx = ((k * 157 - cx * 0.3) % (W + 160) + W + 160) % (W + 160) - 80, a = 0.035 + Math.sin(t / 90 + k * 2) * 0.02;
      x.fillStyle = `rgba(255,230,170,${Math.max(0, a)})`;
      x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 22, 0); x.lineTo(bx + 82, H); x.lineTo(bx + 44, H); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
  }

  /* ---------- Vordergrund: dunkle Silhouetten, die schneller vorbeiziehen ---------- */
  fore(x, theme, cx, cy, H) {
    const strip = foreStrip(theme, H); if (!strip) return;
    const ox = -Math.round(cx * 1.35) % strip.width;
    for (let k = ox - strip.width; k < this.W; k += strip.width) x.drawImage(strip, k, -20);
  }
}

function foreStrip(theme, H) {
  const key = theme + H; if (memo.has(key)) return memo.get(key);
  const W = 900, c = mk(W, H + 40), x = c.getContext('2d'), r = rnd(hashStr(theme) + 3);
  const col = { wald: '#0a0612', hoehle: '#05030a', dornen: '#0d0408', bau: '#0a0503', uhrturm: '#04080a', glocke: '#08060c', pendel: '#0a0803', pilz: '#03090a', grotte: '#020608', moder: '#0a040a' }[theme];
  if (!col) { memo.set(key, null); return null; }
  x.fillStyle = col;
  const n = 5;
  for (let k = 0; k < n; k++) {
    const bx = Math.floor((k + r() * 0.6) * W / n), top = r() < 0.55;
    switch (theme) {
      case 'wald': case 'dornen':
        if (top) { // hängende Ranken
          for (let v = 0; v < 4; v++) { const vx = bx + v * 7, len = 20 + r() * 50; for (let y = 0; y < len; y++) { x.fillRect(vx + Math.round(Math.sin(y / 6 + v) * 2), y, 2, 1); if (y % 7 === 3) x.fillRect(vx - 2 + Math.round(Math.sin(y / 6 + v) * 2), y, 6, 2); } }
        } else { for (let i = 0; i < 26; i++) { const h = 8 + r() * (theme === 'dornen' ? 34 : 24); x.fillRect(bx + i * 2, H + 40 - h, 1 + (i % 3 === 0), h); if (theme === 'dornen' && i % 5 === 0) x.fillRect(bx + i * 2 - 2, H + 40 - h * 0.6, 5, 1); } }
        break;
      case 'hoehle': case 'grotte': case 'bau':
        if (top) { for (let i = 0; i < 4; i++) { const w = 6 + r() * 10, h = 20 + r() * 40, sx = bx + i * 14; for (let y = 0; y < h; y++) { const ww = w * (1 - y / h); x.fillRect(Math.round(sx - ww / 2), y, Math.max(1, Math.round(ww)), 1); } } }
        else { for (let i = 0; i < 3; i++) { const w = 18 + r() * 26, h = 10 + r() * 18, sx = bx + i * 22; x.beginPath(); x.ellipse(sx, H + 40, w, h, 0, Math.PI, 0); x.fill(); } }
        break;
      case 'uhrturm': case 'glocke': case 'pendel':
        if (top) { const len = 40 + r() * 70; for (let y = 0; y < len; y += 4) { x.fillRect(bx, y, 3, 3); x.fillRect(bx + 1, y + 3, 1, 1); } x.beginPath(); x.arc(bx + 1, len + 4, 5, 0, 7); x.fill(); }
        else { const R = 26 + r() * 20, gx = bx, gy = H + 30; x.beginPath(); for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2, rr = a % 2 ? R : R * 0.82; x.lineTo(gx + Math.cos(ang) * rr, gy + Math.sin(ang) * rr); } x.fill(); }
        break;
      case 'pilz': case 'moder':
        if (top) { for (let v = 0; v < 3; v++) { const len = 20 + r() * 40; for (let y = 0; y < len; y++) x.fillRect(bx + v * 9 + Math.round(Math.sin(y / 8) * 1.5), y, 1, 1); x.beginPath(); x.arc(bx + v * 9, len, 3, 0, 7); x.fill(); } }
        else { const sh = 30 + r() * 40, cw = 18 + r() * 16; x.fillRect(bx - 3, H + 40 - sh, 6, sh); x.beginPath(); x.ellipse(bx, H + 40 - sh, cw, cw * 0.45, 0, Math.PI, 0); x.fill(); }
        break;
    }
  }
  memo.set(key, c); return c;
}
