// Pixel-Grafik: Sprites aus Textzeilen, Tiles und Kulissen prozedural pro Welt-Thema.
import { TIERS } from './gear.js';
import { weaponById } from './weapons.js';
import { ARMOR_ART, LEGS, SHOVEL_ART, WEAPON_ART } from './heroart.js';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function fromRows(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = mk(w, h), x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  return c;
}
export function flipX(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
function rotCW(rows) { const h = rows.length, w = rows[0].length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); } return out; }
function rotCCW(rows) { return rotCW(rotCW(rotCW(rows))); }
// Silhouette einfärben (für Treffer-Blitz und Geister)
export function tint(c, col, alpha = 1) {
  const o = mk(c.width, c.height), x = o.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.globalAlpha = alpha; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return o;
}
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

/* ---------- Held ---------- */
// Grafik-Daten in heroart.js. Rahmen 20×24, Körper ab (4, 8).
function paint(x, segs, pal) {
  for (const [y, x0, str] of segs) for (let i = 0; i < str.length; i++) {
    const col = pal[str[i]]; if (col) { x.fillStyle = col; x.fillRect(x0 + i, y, 1, 1); }
  }
}
function heroFrame(art, legs) {
  const c = mk(20, 24), x = c.getContext('2d'), pal = { k: K, ...art.pal };
  paint(x, art.cape, pal);
  paint(x, legs.map((r, i) => [20 + i, 4, r]), pal);
  paint(x, art.torso, pal);
  paint(x, art.helm, pal);
  return c;
}
function bladeSet(rows, pal) {
  const p = { k: K, W: '#ffffff', r: '#e0304f', ...pal };
  const h = fromRows(rows, p), d = fromRows(rotCW(rows), p), u = fromRows(rotCCW(rows), p);
  return { shH: [h, flipX(h)], shD: [d, flipX(d)], shU: [u, flipX(u)] };
}
function weaponPal(w) { return { h: w.handle, H: w.light, s: w.dark, S: w.light, w: '#ffffff', x: w.light, W: '#ffffff' }; }
export function hero(armor, shovel, weapon = null) {
  return memo(`hero${armor}.${shovel}.${weapon}`, () => {
    const art = ARMOR_ART[armor], out = { fx: art.fx || null, tier: armor };
    for (const k in LEGS) { const r = heroFrame(art, LEGS[k]); out[k] = [r, flipX(r)]; }
    const wp = weapon && weaponById(weapon);
    Object.assign(out, wp ? bladeSet(WEAPON_ART[wp.id], weaponPal(wp)) : bladeSet(SHOVEL_ART[shovel].rows, SHOVEL_ART[shovel].pal));
    out.white = {}; for (const k in LEGS) out.white[k] = [tint(out[k][0], '#ffffff'), tint(out[k][1], '#ffffff')];
    return out;
  });
}
export function ghostHero() {
  return memo('ghost', () => {
    const h = hero(0, 0), o = {};
    for (const k of ['stand', 'run1', 'run2', 'air', 'shH', 'shD', 'shU']) o[k] = [tint(h[k][0], '#8fe8ff'), tint(h[k][1], '#8fe8ff')];
    return o;
  });
}
// Icons (Klinge nach oben) für Menüs
export function weaponIcon(id) { return memo('wicon' + id, () => fromRows(rotCCW(WEAPON_ART[id]), { k: K, W: '#ffffff', r: '#e0304f', ...weaponPal(weaponById(id)) })); }
export function shovelIcon(t) { return memo('sicon' + t, () => fromRows(rotCCW(SHOVEL_ART[t].rows), { k: K, ...SHOVEL_ART[t].pal })); }
export function armorIcon(t) { return memo('aicon' + t, () => heroFrame(ARMOR_ART[t], LEGS.stand)); }

/* ---------- Gegner & Objekte ---------- */
const BEETLE = ['....kkkkkk....', '..kkGGGGggkk..', '.kGGGgggggggk.', '.kGggggggggggk', 'kykggggggggggk', 'kkkggggggggggk', '.kkkkkkkkkkkk.'];
const BLEGS = [['.l..l...l..l..', 'l..l...l..l...'], ['..l..l...l..l.', '...l..l...l..l']];
const BLORB = ['....kkkk....', '..kkPPPPkk..', '.kPPPPpppppk', 'kPPwkpppwkpk', 'kPpwkpppwkpk', 'kppppppppppk', 'kpppkkkppppk', 'kppppppppppk', '.kkkkkkkkkk.'];
const BAT = ['kk..........kk', 'kBk...kk...kBk', 'kBBk.kbbk.kBBk', '.kBBkbebekBBk.', '..kkkbbbbkkk..', '.....kbbk.....', '......kk......'];
const GEM = ['..kkk..', '.kLWDk.', 'kLLDDDk', 'kDDDDDk', '.kDDDk.', '..kDk..', '...k...'];
const HEART = ['.kk.kk.', 'kRWkRRk', 'kRRRRRk', '.kRRRk.', '..kRk..', '...k...'];
const CHEST = ['.kkkkkkkkkkkk.', 'kwWWWWWWWWWWwk', 'kwWWWWWWWWWWwk', 'kyyyyyyyyyyyyk', 'kwwwwwkkwwwwwk', 'kwwwwkyykwwwwk', 'kWWWWkyykWWWWk', 'kWWWWWkkWWWWWk', 'kwWWWWWWWWWWwk', 'kwwwwwwwwwwwwk', 'kyyyyyyyyyyyyk', '.kkkkkkkkkkkk.'];
const LANTERN = ['...kk...', '..kyyk..', '.kkkkkk.', '.kLLLLk.', '.kLWLLk.', '.kLLLLk.', '.kkkkkk.', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '..kkkk..', '.kkkkkk.'];
const APPLE = ['....k...', '...kgk..', '.kkkkkk.', 'kRRWRRRk', 'kRWRRRRk', 'kRRRRRRk', '.kRRRRk.', '..kkkk..'];
const K = '#140c1c';
export function altarSprite(lit) {
  return memo('altar' + lit, () => fromRows([
    '....kkkkkkkk....', '...kWWWWWWWWk...', '...kkkkkkkkkk...', '.....kSSSSk.....', '.....kSssSk.....', '.....kSssSk.....',
    '.....kSssSk.....', '.....kSssSk.....', '....kkSSSSkk....', '..kkSSSSSSSSkk..', '.kSSSSSSSSSSSSk.', 'kkkkkkkkkkkkkkkk'],
    { k: K, W: lit ? '#ffe070' : '#5a4a6a', S: '#b0a0c8', s: '#6a5a88' }));
}

const KNIGHT = ['....kkkk....', '...kSSSSk...', '..kSvvvvSk..', '..kSveevSk..', '...kSSSSk...', 'kkk.kaak....', 'kYYkkaaakk..',
  'kYyYkaaaaak.', 'kYyYkaaaaak.', 'kYYkkaaaak..', 'kkk.kaaak...', '....kaka....', '....kakak...', '...kkk.kkk..'];
const CUCKOO = ['....kkkk......', '...kBBBBk.....', '..kBBBkeBk....', '..kBBBBBBkook.', 'kkkBBBBBBBkk..', 'kWWkBBBBBBk...', '.kWWkBBBBk....', '..kkkbbbk.....', '......k.k.....'];
export function knightSprite() { return memo('knight', () => { const r = fromRows(KNIGHT, { k: K, S: '#c8d0d8', v: '#241a3a', e: '#ff5040', a: '#b08030', Y: '#e0b040', y: '#c02a2a' }); return [r, flipX(r), tint(r, '#fff'), tint(flipX(r), '#fff')]; }); }
export function cuckooSprite() { return memo('cuckoo', () => { const r = fromRows(CUCKOO, { k: K, B: '#8a5a30', b: '#5a3a20', W: '#e0c080', e: '#ffe066', o: '#ff9a30' }); return [r, flipX(r), tint(r, '#fff'), tint(flipX(r), '#fff')]; }); }
export function cogSprite(i, R = 8, teeth = 8) {
  return memo(`cog${i}.${R}`, () => {
    const S2 = R * 2 + 6, c = mk(S2, S2), x = c.getContext('2d'), m = (S2 - 1) / 2;
    for (let y = 0; y < S2; y++) for (let dx = 0; dx < S2; dx++) {
      const a = Math.atan2(y - m, dx - m) + i * (Math.PI / teeth / 2), d = Math.hypot(y - m, dx - m);
      const tooth = Math.cos(a * teeth) > 0.2 ? 2.5 : 0;
      if (d < R + tooth) { x.fillStyle = d < R * 0.3 ? K : d > R + tooth - 1.2 ? K : d < R * 0.55 ? '#e0b040' : '#a8a8b8'; x.fillRect(dx, y, 1, 1); }
    }
    return c;
  });
}
export function platSprite() {
  return memo('plat', () => {
    const c = mk(48, 8), x = c.getContext('2d');
    x.fillStyle = K; x.fillRect(0, 0, 48, 8); x.fillStyle = '#c8963a'; x.fillRect(1, 1, 46, 5); x.fillStyle = '#ffe0a0'; x.fillRect(1, 1, 46, 1);
    x.fillStyle = '#7a5a20'; x.fillRect(1, 5, 46, 1); x.fillStyle = K; for (const i of [4, 23, 43]) x.fillRect(i, 3, 1, 1);
    return c;
  });
}
export function golemSprite(flash) {
  return memo('golem' + flash, () => {
    const W = 30, H = 32, c = mk(W, H), x = c.getContext('2d'), m = [];
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      let col = null;
      if (i >= 9 && i <= 20 && y <= 9) col = y === 4 && (i === 12 || i === 17) ? '#ff5040' : '#4a5058';
      if (i >= 4 && i <= 25 && y >= 9 && y <= 26) col = (i === 4 || i === 25 || y === 26) ? '#7a5a20' : '#b08030';
      if (Math.hypot(i - 14.5, y - 17) < 6) col = Math.hypot(i - 14.5, y - 17) > 5 ? '#7a5a20' : '#f0e8d0';
      if ((i <= 3 || i >= 26) && y >= 10 && y <= 22) col = '#4a5058';
      if (((i >= 6 && i <= 11) || (i >= 18 && i <= 23)) && y >= 27) col = '#4a5058';
      if ((i === 8 || i === 21) && y >= 12 && y <= 24 && y % 3 === 0) col = '#e0b040';
      m.push(col);
    }
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const col = m[y * W + i];
      if (col) { x.fillStyle = flash ? '#ffffff' : col; x.fillRect(i, y, 1, 1); }
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => i + a >= 0 && i + a < W && y + b >= 0 && y + b < H && m[(y + b) * W + i + a])) { x.fillStyle = K; x.fillRect(i, y, 1, 1); }
    }
    return [c, flipX(c)];
  });
}

export const GEMCOL = { 1: ['#2fbf4f', '#9fffaf'], 5: ['#2f7fff', '#a8d4ff'], 20: ['#e0304f', '#ffa0b4'], 50: ['#e0a020', '#fff08f'] };
export function gemSprite(v) { return memo('gem' + v, () => { const [d, l] = GEMCOL[v] || GEMCOL[1]; return fromRows(GEM, { k: K, D: d, L: l, W: '#ffffff' }); }); }
export function heart(full) { return memo('heart' + full, () => fromRows(HEART, { k: K, R: full ? '#ff3f5f' : '#3a2040', W: full ? '#ffffff' : '#4a2a50' })); }
export function beetleSprite(i) {
  return memo('beetle' + i, () => { const r = fromRows([...BEETLE, ...BLEGS[i]], { k: K, g: '#2f9a4a', G: '#8ff07a', y: '#ffe066', l: '#2a1a10' }); return [r, flipX(r), tint(r, '#fff'), tint(flipX(r), '#fff')]; });
}
export function blorbSprite() { return memo('blorb', () => { const r = fromRows(BLORB, { k: K, p: '#a04cf0', P: '#e2a8ff', w: '#ffffff' }); return [r, tint(r, '#fff')]; }); }
export function batSprite() { return memo('bat', () => { const r = fromRows(BAT, { k: K, b: '#5a3a7a', B: '#9a6ac0', e: '#ff5a5a' }); return [r, tint(r, '#fff')]; }); }
export function chestSprite(open) {
  return memo('chest' + open, () => {
    const rows = open ? ['..............', '..............', '.kkkkkkkkkkkk.', 'kvvvvvvvvvvvvk', ...CHEST.slice(4)] : CHEST;
    return fromRows(rows, { k: K, w: '#8a5a2a', W: '#c08040', y: '#ffd040', v: '#2a1408' });
  });
}
export function lanternSprite(lit) { return memo('lan' + lit, () => fromRows(LANTERN, { k: K, y: '#ffd040', L: lit ? '#ffd84a' : '#3a3050', W: lit ? '#ffffff' : '#4a4060' })); }
export function appleSprite() { return memo('apple', () => fromRows(APPLE, { k: K, g: '#4fc95a', R: '#e8304a', W: '#ffb0b0' })); }

// Boss: per Pixel-Mathematik gezeichneter Rostmaulwurf mit Helm, danach Umrisslinie
export function moleSprite(flash) {
  return memo('mole' + flash, () => {
    const W = 34, H = 28, c = mk(W, H), x = c.getContext('2d'), m = [];
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const ex = (i - 18) / 15, ey = (y - 16) / 11.5; let col = null;
      if (ex * ex + ey * ey < 1) {
        col = y > 19 ? '#4a3026' : '#6b4a3a';
        if (y < 10) col = (i + y) % 7 === 0 ? '#d8803a' : '#b0602a';
        if (y === 10) col = '#7a3a18';
        if (y > 15 && y < 23 && i > 12 && i < 26) col = '#8a6a52';
      }
      if ((i - 4) ** 2 + (y - 15) ** 2 < 10) col = '#ff9ab0';
      if (i === 2 && y === 14) col = '#ffffff';
      if ((i === 9 || i === 13) && y >= 12 && y <= 13) col = '#ff4040';
      if (y >= 22 && y <= 27 && ((i >= 4 && i <= 9 && i - 4 <= 27 - y + 1) || (i >= 26 && i <= 31 && 31 - i <= 27 - y + 1))) col = (i + y) % 2 ? '#e8e8f0' : '#a8a8b8';
      if (y < 4 && i >= 16 && i <= 20) col = y === 0 ? null : '#d8803a';
      m.push(col);
    }
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const col = m[y * W + i];
      if (col) { x.fillStyle = flash ? '#ffffff' : col; x.fillRect(i, y, 1, 1); }
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => m[(y + b) * W + i + a] && i + a >= 0 && i + a < W)) { x.fillStyle = K; x.fillRect(i, y, 1, 1); }
    }
    return [c, flipX(c)];
  });
}

/* ---------- Tiles ---------- */
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export function tileset(th) {
  return memo('tiles' + th.dirt + th.grass, () => {
    const t = {}, r = rnd(42);
    const tile = (fn) => { const c = mk(16, 16), x = c.getContext('2d'); fn(x); return c; };
    const px = (x, col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const ground = (top, v) => tile(x => {
      px(x, th.dirt, 0, 0, 16, 16);
      for (let k = 0; k < 14; k++) px(x, r() < 0.5 ? th.dirtD : th.dirtL, Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.3 ? 2 : 1, 1);
      if (v === 1) { px(x, th.dirtD, 3, 9, 4, 3); px(x, th.dirtL, 4, 9, 2, 1); }
      if (top) {
        px(x, th.grass, 0, 0, 16, 4); px(x, th.grassD, 0, 4, 16, 1);
        for (let i = 0; i < 16; i += 2) if (r() < 0.6) px(x, th.grassD, i, 4 + Math.floor(r() * 2), 1, 1 + Math.floor(r() * 2));
        for (let i = 0; i < 4; i++) px(x, th.grassD, Math.floor(r() * 16), Math.floor(r() * 2) + 1, 1, 1);
        px(x, '#ffffff22', 0, 0, 16, 1);
      }
    });
    t.top = [0, 1, 2].map(v => ground(true, v));
    t.fill = [0, 1, 2].map(v => ground(false, v));
    t.dirt = tile(x => {
      px(x, K, 1, 1, 14, 14); px(x, th.dirtL, 2, 2, 12, 12); px(x, th.dirt, 2, 8, 12, 6);
      for (let k = 0; k < 9; k++) px(x, th.dirtD, 3 + Math.floor(r() * 10), 3 + Math.floor(r() * 10), 2, 1);
      px(x, '#ffffff40', 3, 3, 4, 1); px(x, '#ffd84a', 9, 5, 1, 1); px(x, '#7fd0ff', 5, 10, 1, 1);
    });
    t.stone = tile(x => {
      px(x, K, 0, 0, 16, 16); px(x, th.stone, 1, 1, 14, 6); px(x, th.stone, 1, 9, 6, 6); px(x, th.stone, 9, 9, 6, 6);
      px(x, th.stoneL, 1, 1, 14, 1); px(x, th.stoneL, 1, 9, 6, 1); px(x, th.stoneL, 9, 9, 6, 1);
      px(x, K, 6, 3, 1, 2); px(x, K, 7, 4, 2, 1); px(x, K, 11, 11, 1, 2);
    });
    t.spike = tile(x => {
      px(x, th.dirtD, 0, 13, 16, 3);
      for (let s = 0; s < 4; s++) for (let y = 0; y < 10; y++) { const w = Math.max(1, Math.floor(y * 0.35)); px(x, y < 2 ? '#ffffff' : y < 6 ? '#c8c8d8' : '#8888a0', s * 4 + 2 - w + 1, 3 + y, w * 2 - 1 || 1, 1); }
    });
    t.plank = tile(x => {
      px(x, K, 0, 0, 16, 6); px(x, th.plank, 0, 1, 16, 4); px(x, '#ffffff30', 0, 1, 16, 1);
      px(x, K, 5, 1, 1, 4); px(x, K, 11, 1, 1, 4); px(x, K, 2, 6, 2, 4); px(x, K, 12, 6, 2, 4);
    });
    t.mush = tile(x => {
      px(x, '#e8dcc8', 6, 9, 4, 7); px(x, K, 5, 9, 1, 7); px(x, K, 10, 9, 1, 7);
      px(x, K, 0, 3, 16, 7); px(x, K, 2, 1, 12, 2); px(x, '#e8304a', 1, 3, 14, 5); px(x, '#e8304a', 3, 2, 10, 1);
      px(x, '#ffffff', 4, 4, 2, 2); px(x, '#ffffff', 10, 3, 2, 2); px(x, '#ffffff', 7, 6, 2, 1); px(x, '#a01830', 1, 8, 14, 1);
    });
    t.vent = tile(x => {
      px(x, K, 0, 0, 16, 16); px(x, '#5a6670', 1, 1, 14, 14); px(x, '#8aa0aa', 1, 1, 14, 2);
      for (let i = 3; i < 14; i += 3) px(x, K, i, 4, 1, 9); px(x, '#3a444c', 2, 13, 12, 2);
    });
    t.ore = tile(x => {
      px(x, K, 0, 0, 16, 16); px(x, '#2a2034', 1, 1, 14, 14);
      for (const [a, b] of [[3, 3], [9, 5], [5, 10], [11, 11]]) { px(x, '#b04cff', a, b, 3, 3); px(x, '#f0c0ff', a, b, 1, 1); }
      px(x, '#4a3a5a', 1, 1, 14, 1);
    });
    t.gate = tile(x => { for (let i = 1; i < 16; i += 5) { px(x, K, i, 0, 3, 16); px(x, '#8a8aa0', i + 1, 0, 1, 16); } px(x, K, 0, 6, 16, 3); px(x, '#b0b0c8', 0, 7, 16, 1); });
    return t;
  });
}

/* ---------- Kulisse ---------- */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
export function backdrop(th, vh) {
  return memo('bg' + th.sky.join() + vh, () => {
    const sky = mk(1, vh), sx = sky.getContext('2d'), c = th.sky.map(hex);
    for (let y = 0; y < vh; y++) {
      let t = y / vh; t = Math.floor(t * 10) / 10;
      sx.fillStyle = t < 0.5 ? mix(c[0], c[1], t * 2) : mix(c[1], c[2], (t - 0.5) * 2);
      sx.fillRect(0, y, 1, 1);
    }
    const W = 512, r = rnd(7);
    const far = mk(W, vh), fx = far.getContext('2d'); fx.fillStyle = th.far;
    for (let x = 0; x < W; x++) {
      const a = x / W * Math.PI * 2;
      const h = vh * 0.42 + Math.sin(a * 2) * 18 + Math.sin(a * 5 + 1) * 8 + Math.sin(a * 11) * 3;
      fx.fillRect(x, Math.round(vh - h), 1, Math.round(h));
    }
    const near = mk(W, vh), nx = near.getContext('2d'); nx.fillStyle = th.near;
    const base = Array.from({ length: W }, (_, x) => vh * 0.2 + Math.sin(x / W * Math.PI * 6) * 6);
    const tops = base.slice();
    const shapes = [];
    for (let k = 0; k < 14; k++) shapes.push({ x: Math.floor(r() * W), w: 10 + r() * 18, h: 30 + r() * 50 });
    for (const s of shapes) for (let dx = -s.w; dx <= s.w; dx++) {
      const x = (s.x + dx + W) % W, d = Math.abs(dx) / s.w;
      let h = 0;
      if (th.deco === 'baum') h = s.h * (1 - d) * (0.8 + 0.2 * ((Math.floor((1 - d) * 6)) % 2));
      else if (th.deco === 'kristall') h = s.h * 0.8 * (1 - d * d);
      else if (th.deco === 'dorn') h = s.h * Math.max(0, 1 - d * 2.2) + (Math.abs(dx) % 6 === 0 ? 6 : 0);
      else h = s.h * 0.5 * (1 - d) + 4;
      tops[x] = Math.max(tops[x], base[x] + h);
    }
    for (let x = 0; x < W; x++) nx.fillRect(x, Math.round(vh - tops[x]), 1, Math.round(tops[x]));
    if (th.deco === 'zahnrad') {
      // Zahnräder im Hintergrund
      for (let k = 0; k < 7; k++) {
        const gx = Math.floor(r() * W), gy = Math.floor(vh * (0.15 + r() * 0.5)), R0 = 10 + r() * 22, teeth = 8 + Math.floor(r() * 6);
        for (let y = -R0 - 4; y <= R0 + 4; y++) for (let dx = -R0 - 4; dx <= R0 + 4; dx++) {
          const d = Math.hypot(dx, y), a = Math.atan2(y, dx), tooth = Math.cos(a * teeth) > 0.3 ? 3.5 : 0;
          if (d < R0 + tooth && (d > R0 * 0.68 || d < R0 * 0.28 || Math.abs(Math.sin(a * 2)) < 0.14 || Math.abs(Math.cos(a * 2)) < 0.14)) fx.fillRect((gx + dx + W) % W, gy + y, 1, 1);
        }
      }
    }
    if (th.deco === 'kristall' || th.deco === 'lava') {
      // Tropfsteine von oben
      for (let k = 0; k < 18; k++) { const x0 = Math.floor(r() * W), h = 10 + r() * 34; for (let dx = -4; dx <= 4; dx++) { const hh = h * (1 - Math.abs(dx) / 4.5); fx.fillRect((x0 + dx + W) % W, 0, 1, Math.round(hh)); } }
    }
    const stars = Array.from({ length: 40 }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * vh * 0.55), p: r() * 6 }));
    return { sky, far, near, stars };
  });
}

/* ---------- Bitmap-Schrift 3×5 ---------- */
const GL = {
  '0': '75557', '1': '26227', '2': '71747', '3': '71317', '4': '55711', '5': '74717', '6': '74757', '7': '71122', '8': '75757', '9': '75717',
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152', K: '55655', L: '44447', M: '57755',
  N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  'Ä': '52575', 'Ö': '52552', 'Ü': '50557', '.': '00002', ',': '00024', ':': '02020', '!': '22202', '?': '71302', '-': '00700', '+': '02720', '/': '11244',
  '=': '07070', "'": '22000', '(': '24442', ')': '21112', '>': '42124', '<': '12421', '%': '51245', ' ': '00000', '◀': '13731', '▶': '46764', '▼': '07720', '♥': '05772', '·': '00200', '×': '05250',
};
export function textWidth(s) { return s.length * 4 - 1; }
export function drawText(x, str, px0, py0, col, scale = 1, align = 'left') {
  str = String(str).toUpperCase().replace(/ß/g, 'SS');
  let px = px0 - (align === 'center' ? textWidth(str) * scale / 2 : align === 'right' ? textWidth(str) * scale : 0);
  px = Math.round(px);
  x.fillStyle = col;
  for (const ch of str) {
    const g = GL[ch] || GL['?'];
    for (let row = 0; row < 5; row++) { const bits = +g[row]; for (let b = 0; b < 3; b++) if (bits & (4 >> b)) x.fillRect(px + b * scale, py0 + row * scale, scale, scale); }
    px += 4 * scale;
  }
}
export function wrapText(str, maxChars) {
  const words = String(str).split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
