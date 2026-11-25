// Dunkle Pixel-Oberfläche: feine Goldlinien, Filigran-Ecken, Pixel-Serifenschrift.
// Alles wird beim Start als echte Pixel-Grafik gezeichnet und als CSS-Variable bereitgestellt.
const K = '#0b0907';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const url = c => `url(${c.toDataURL()})`;
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const G = { hi: '#fff1c8', lt: '#f0dca0', md: '#d4b46a', dk: '#9a7a3c', dd: '#5a4626', bg: '#14110c' };

/* ---------- Texturen ---------- */
function texNoise(base, spread, seed) {
  const c = mk(48, 48), x = c.getContext('2d'), r = rnd(seed);
  x.fillStyle = base; x.fillRect(0, 0, 48, 48);
  for (let k = 0; k < 260; k++) { x.fillStyle = r() < 0.5 ? spread[0] : spread[1]; x.fillRect(Math.floor(r() * 48), Math.floor(r() * 48), 1, 1); }
  return c;
}

/* ---------- Rahmen ---------- */
// Filigran-Rahmen: Quelle 26×26, Slice 10. Feine Doppellinie, Raute mit Ranken in jeder Ecke.
function frameFiligree(col = G, S = 26) {
  const c = mk(S, S), x = c.getContext('2d');
  const px = (cl, a, b, w = 1, h = 1) => { x.fillStyle = cl; x.fillRect(a, b, w, h); };
  // äussere Linie
  px(col.dk, 3, 1, S - 6, 1); px(col.dk, 3, S - 2, S - 6, 1); px(col.dk, 1, 3, 1, S - 6); px(col.dk, S - 2, 3, 1, S - 6);
  // innere feine Linie
  px(col.dd, 9, 4, S - 18, 1); px(col.dd, 9, S - 5, S - 18, 1); px(col.dd, 4, 9, 1, S - 18); px(col.dd, S - 5, 9, 1, S - 18);
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const ox = fx ? S - 1 : 0, oy = fy ? S - 1 : 0, sx = fx ? -1 : 1, sy = fy ? -1 : 1;
    const P = (a, b, cl) => px(cl, ox + sx * a, oy + sy * b);
    // Raute
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (Math.abs(a) + Math.abs(b) <= 2) P(3 + a, 3 + b, Math.abs(a) + Math.abs(b) === 2 ? col.dk : col.md);
    P(3, 3, col.hi); P(2, 3, col.lt); P(3, 2, col.lt);
    // Ranken entlang der Kanten
    P(6, 2, col.md); P(7, 3, col.dk); P(8, 3, col.dk); P(9, 2, col.md); P(10, 1, col.dk);
    P(2, 6, col.md); P(3, 7, col.dk); P(3, 8, col.dk); P(2, 9, col.md); P(1, 10, col.dk);
    P(5, 5, col.dk); P(6, 6, col.dd);
  }
  return c;
}
// Schlichter Linienrahmen mit kleinen Eckpunkten: Quelle 12×12, Slice 4
function frameLine(col = G) {
  const S = 12, c = mk(S, S), x = c.getContext('2d');
  const px = (cl, a, b, w = 1, h = 1) => { x.fillStyle = cl; x.fillRect(a, b, w, h); };
  px(col.dk, 2, 0, S - 4, 1); px(col.dk, 2, S - 1, S - 4, 1); px(col.dk, 0, 2, 1, S - 4); px(col.dk, S - 1, 2, 1, S - 4);
  for (const [a, b] of [[1, 1], [S - 2, 1], [1, S - 2], [S - 2, S - 2]]) px(col.lt, a, b);
  return c;
}

/* ---------- Pixel-Serifenschrift ---------- */
const PALS = {
  gold: ['#fff4d0', '#f3e3b3', '#e6cf90', '#d4b46a', '#b8944e', '#8a6a30'],
  pale: ['#ffffff', '#efe6d0', '#e0d4b8', '#cbbd9c', '#ada080', '#8a7e64'],
  red: ['#ffc0b0', '#ff7a64', '#e0402c', '#b82418', '#8a1410', '#5a0a08'],
  jade: ['#e8fff6', '#b8ffe6', '#7dffcf', '#3fc896', '#1f9a70', '#0e6a4a'],
  dim: ['#a89a80', '#988a70', '#8a7c62', '#7a6c54', '#6a5c46', '#5a4c38'],
};
const serifCache = new Map();
export function serif(text, px = 13, pal = 'gold', spacing = 1) {
  const key = `${text}|${px}|${pal}|${spacing}`;
  if (serifCache.has(key)) return serifCache.get(key);
  const t = mk(Math.max(64, text.length * px * 1.2 + 20), Math.ceil(px * 1.8)), x = t.getContext('2d');
  x.font = `700 ${px}px Georgia,"Times New Roman","Noto Serif","DejaVu Serif",serif`; x.textBaseline = 'top';
  let cx = 2;
  for (const ch of text) { x.fillStyle = '#fff'; x.fillText(ch, cx, 2); cx += x.measureText(ch).width + spacing; }
  const w = Math.ceil(cx) + 2, h = Math.ceil(px * 1.75);
  const d = x.getImageData(0, 0, w, h).data;
  const on = (a, b) => a >= 0 && b >= 0 && a < w && b < h && d[(b * w + a) * 4 + 3] > 118;
  let top = h, bot = 0;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (on(i, y)) { top = Math.min(top, y); bot = Math.max(bot, y); }
  const c = mk(w + 4, bot - top + 6), o = c.getContext('2d'), grad = PALS[pal];
  for (let y = top; y <= bot; y++) for (let i = 0; i < w; i++) {
    if (on(i, y)) continue;
    let e = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (on(i + a, y + b)) e = true;
    if (e) { o.fillStyle = K; o.fillRect(i + 2, y - top + 2, 1, 1); }
  }
  for (let y = top; y <= bot; y++) for (let i = 0; i < w; i++) {
    if (!on(i, y)) continue;
    o.fillStyle = grad[Math.min(grad.length - 1, Math.floor((y - top) / (bot - top + 1) * grad.length))];
    o.fillRect(i + 2, y - top + 2, 1, 1);
  }
  // Schatten nach unten
  o.globalCompositeOperation = 'destination-over'; o.globalAlpha = 0.6; o.drawImage(c, 0, 1); o.globalAlpha = 1;
  const r = { u: c.toDataURL(), w: c.width, h: c.height };
  serifCache.set(key, r);
  return r;
}
export function serifImg(text, px = 13, pal = 'gold', scale = 2, cls = '') {
  const s = serif(text, px, pal);
  return `<img class="serif ${cls}" src="${s.u}" width="${s.w * scale}" height="${s.h * scale}" alt="${text.replace(/"/g, '&quot;')}">`;
}

/* ---------- Pixel-Symbole (gedämpftes Gold) ---------- */
const ICONS = {
  gem: ['..kkk..', '.kLWDk.', 'kLLDDDk', 'kDDDDDk', '.kDDDk.', '..kDk..', '...k...'],
  star: ['...k...', '..kYk..', 'kkkYkkk', 'kYYHYYk', '.kYYYk.', 'kYk.kYk', 'kk...kk'],
  starOff: ['...k...', '..kGk..', 'kkkGkkk', 'kGGGGGk', '.kGGGk.', 'kGk.kGk', 'kk...kk'],
  coin: ['..kkk..', '.kYYYk.', 'kYHYYOk', 'kYYkYOk', 'kYYYYOk', '.kOOOk.', '..kkk..'],
  lock: ['..kkk..', '.kGkGk.', '.kGkGk.', 'kkkkkkk', 'kYYYYYk', 'kYYkYYk', 'kYYYYYk', 'kkkkkkk'],
  check: ['......k', '.....kY', 'k...kYk', 'Yk.kYk.', '.kYYk..', '..kk...'],
  trophy: ['kkkkkkk', 'YkYYYkY', 'YkYHYkY', '.kYYYk.', '..kYk..', '..kYk..', '.kkkkk.'],
  scroll: ['.kkkkk.', 'kPPPPPk', '.kPkkPk', '.kPPPPk', '.kPkkPk', 'kPPPPPk', '.kkkkk.'],
  gear: ['..k.k..', '.kGkGk.', 'kGGkGGk', '.kkYkk.', 'kGGkGGk', '.kGkGk.', '..k.k..'],
  anvil: ['kkkkkkk.', 'kGGGGGkk', '.kGGGGGk', '..kGGk..', '..kGGk..', '.kkkkkk.'],
  sword: ['.....kk', '....kWk', '...kWk.', 'k.kWk..', 'kkWk...', '.kYk...', 'kYkk...'],
  dia: ['..k..', '.kYk.', 'kYHYk', '.kYk.', '..k..'],
  flame: ['...k...', '..kYk..', '..kYk.k', '.kYHYkY', 'kYHHHYk', 'kYHWHYk', '.kYYYk.'],
  rune: ['kkkkk', 'kY.Yk', 'k.Y.k', 'kY.Yk', 'kkkkk'],
};
const ICPAL = { k: K, L: '#a8d4ff', W: '#ffffff', D: '#3a6ad0', Y: '#d4b46a', H: '#fff1c8', O: '#8a6a30', G: '#6a6050', P: '#cbbd9c' };
function icon(rows) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = mk(w, h), x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = ICPAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  return c;
}
export const IC = {};
export function ic(name, cls = '') { return `<i class="px ${cls}" style="--w:${IC[name]?.w || 7};--h:${IC[name]?.h || 7};background-image:${IC[name]?.u || 'none'}"></i>`; }

export function initSkin() {
  const root = document.documentElement.style;
  root.setProperty('--tex-dark', url(texNoise('#0f0c09', ['#17130e', '#0a0806'], 3)));
  root.setProperty('--tex-inset', url(texNoise('#16120d', ['#1e1912', '#100d09'], 5)));
  root.setProperty('--fr-fili', url(frameFiligree()));
  root.setProperty('--fr-fili-red', url(frameFiligree({ hi: '#ffd0c0', lt: '#ff9a80', md: '#c84030', dk: '#8a2418', dd: '#4a140c' })));
  root.setProperty('--fr-fili-jade', url(frameFiligree({ hi: '#e8fff6', lt: '#a8ffe0', md: '#3fc896', dk: '#1f7a5a', dd: '#0e3a2c' })));
  root.setProperty('--fr-line', url(frameLine()));
  root.setProperty('--fr-line-hi', url(frameLine({ dk: '#d4b46a', lt: '#fff1c8' })));
  root.setProperty('--fr-line-dim', url(frameLine({ dk: '#3a3020', lt: '#5a4c38' })));
  for (const [k, rows] of Object.entries(ICONS)) { const c = icon(rows); IC[k] = { u: url(c), w: c.width, h: c.height }; }
  root.setProperty('--dia', IC.dia.u); root.setProperty('--lock', IC.lock.u); root.setProperty('--coin', IC.coin.u);
}
export function logoImg() {
  const s = serif('SCHAUFELHELD', 24, 'gold', 3);
  return `<img class="logo" src="${s.u}" width="${s.w}" height="${s.h}" alt="Schaufelheld">`;
}
// Serifenschrift kann von Systemschriften abhängen; nach dem Laden einmal neu zeichnen
export function refreshLogo(cb) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { serifCache.clear(); cb && cb(); }); }
