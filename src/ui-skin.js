// Pixel-Oberfläche: Texturen, Rahmen (9-Slice), Symbole und Logo werden beim Start
// als echte Pixel-Grafik gezeichnet und als CSS-Variablen bereitgestellt.
const K = '#140c1c';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const url = c => `url(${c.toDataURL()})`;
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const PAL = {
  iron: ['#2a2634', '#4a4458', '#7a7488', '#b4aec4', '#e6e2f2'],
  gold: ['#5a3008', '#8a5a10', '#c8901c', '#ffd84a', '#fff6b8'],
  wood: ['#2a160c', '#4a2a16', '#6a3e20', '#8a5630', '#b07a48'],
  crim: ['#3a0812', '#6a1224', '#a8203a', '#e0405a', '#ff9aac'],
  moss: ['#0c2414', '#14402a', '#26703e', '#4fa860', '#9ae8a8'],
  jade: ['#06201a', '#0e4234', '#1a7a60', '#3fc896', '#a8ffe0'],
  stone: ['#14101a', '#1e1a26', '#2a2434', '#363042', '#4a4456'],
};

/* ---------- Texturen ---------- */
function texStone() {
  const c = mk(32, 32), x = c.getContext('2d'), r = rnd(11), p = PAL.stone;
  x.fillStyle = p[2]; x.fillRect(0, 0, 32, 32);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 8 : 0;
    for (let b = -1; b < 3; b++) {
      const bx = b * 16 + off, by = row * 8;
      x.fillStyle = [p[1], p[2], p[3]][Math.floor(r() * 3)]; x.fillRect(bx + 1, by + 1, 15, 7);
      x.fillStyle = p[4] + '55'; x.fillRect(bx + 1, by + 1, 15, 1);
      for (let k = 0; k < 4; k++) { x.fillStyle = r() < 0.5 ? p[0] : p[4] + '40'; x.fillRect(bx + 2 + Math.floor(r() * 13), by + 2 + Math.floor(r() * 5), 1, 1); }
    }
    x.fillStyle = p[0]; x.fillRect(0, row * 8, 32, 1);
    for (let b = -1; b < 3; b++) x.fillRect(b * 16 + (row % 2 ? 8 : 0), row * 8, 1, 8);
  }
  return c;
}
function texWood(pal = PAL.wood, seed = 5) {
  const c = mk(32, 32), x = c.getContext('2d'), r = rnd(seed), p = pal;
  for (let row = 0; row < 4; row++) {
    const y0 = row * 8;
    x.fillStyle = p[2]; x.fillRect(0, y0, 32, 8);
    x.fillStyle = p[3]; x.fillRect(0, y0 + 1, 32, 1);
    for (let k = 0; k < 6; k++) { x.fillStyle = r() < 0.5 ? p[1] : p[3]; const gx = Math.floor(r() * 30), gy = y0 + 2 + Math.floor(r() * 5); x.fillRect(gx, gy, 3 + Math.floor(r() * 8), 1); }
    x.fillStyle = p[0]; x.fillRect(0, y0 + 7, 32, 1);
    if (r() < 0.6) { const kx = Math.floor(r() * 28); x.fillStyle = p[1]; x.fillRect(kx, y0 + 3, 3, 2); x.fillStyle = p[0]; x.fillRect(kx + 1, y0 + 3, 1, 1); }
  }
  return c;
}
function texParch() {
  const c = mk(32, 32), x = c.getContext('2d'), r = rnd(3);
  x.fillStyle = '#e6d2a4'; x.fillRect(0, 0, 32, 32);
  for (let k = 0; k < 60; k++) { x.fillStyle = r() < 0.5 ? '#d8c08e' : '#f0e0b8'; x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 2), 1); }
  return c;
}

/* ---------- 9-Slice-Rahmen ---------- */
// Eisenrahmen mit Nieten (Panels): Quelle 18×18, Slice 7
function frameIron(p = PAL.iron, rivet = PAL.gold) {
  const S = 18, c = mk(S, S), x = c.getContext('2d');
  const px = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  px(K, 1, 0, S - 2, 1); px(K, 1, S - 1, S - 2, 1); px(K, 0, 1, 1, S - 2); px(K, S - 1, 1, 1, S - 2);
  px(p[3], 1, 1, S - 2, 1); px(p[3], 1, 1, 1, S - 2); px(p[1], 1, S - 2, S - 2, 1); px(p[1], S - 2, 1, 1, S - 2);
  px(p[2], 2, 2, S - 4, 3); px(p[2], 2, 2, 3, S - 4); px(p[2], 2, S - 5, S - 4, 3); px(p[2], S - 5, 2, 3, S - 4);
  px(p[4], 2, 2, S - 4, 1); px(p[4], 2, 2, 1, S - 4);
  px(K, 5, 5, S - 10, 1); px(K, 5, 5, 1, S - 10); px(K, 5, S - 6, S - 10, 1); px(K, S - 6, 5, 1, S - 10);
  for (const [a, b] of [[2, 2], [S - 5, 2], [2, S - 5], [S - 5, S - 5]]) { px(K, a, b, 3, 3); px(rivet[3], a, b, 2, 2); px(rivet[4], a, b, 1, 1); }
  return c;
}
// Abgeschrägte Knopfkante: Quelle 12×12, Slice 4, Mitte gefüllt
function frameBevel(p, pressed) {
  const S = 12, c = mk(S, S), x = c.getContext('2d');
  const px = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  px(K, 1, 0, S - 2, 1); px(K, 1, S - 1, S - 2, 1); px(K, 0, 1, 1, S - 2); px(K, S - 1, 1, 1, S - 2);
  px(p[2], 1, 1, S - 2, S - 2);
  const [hi, lo] = pressed ? [p[1], p[3]] : [p[4], p[1]];
  px(hi, 1, 1, S - 2, 1); px(hi, 1, 1, 1, S - 2); px(pressed ? p[2] : p[3], 2, 2, S - 4, 1);
  px(lo, 1, S - 2, S - 2, 1); px(lo, S - 2, 1, 1, S - 2); px(pressed ? p[2] : p[0], 1, S - 3, S - 2, 1);
  return c;
}
// Goldrahmen für Auswahl
function frameGold() { return frameBevel(PAL.gold, false); }

/* ---------- Pixel-Symbole ---------- */
const ICONS = {
  gem: ['..kkk..', '.kLWDk.', 'kLLDDDk', 'kDDDDDk', '.kDDDk.', '..kDk..', '...k...'],
  star: ['...k...', '..kYk..', 'kkkYkkk', 'kYYYYYk', '.kYYYk.', 'kYk.kYk', 'kk...kk'],
  starOff: ['...k...', '..kGk..', 'kkkGkkk', 'kGGGGGk', '.kGGGk.', 'kGk.kGk', 'kk...kk'],
  coin: ['..kkk..', '.kYYYk.', 'kYWYYOk', 'kYYkYOk', 'kYYYYOk', '.kOOOk.', '..kkk..'],
  lock: ['..kkk..', '.kGkGk.', '.kGkGk.', 'kkkkkkk', 'kYYYYYk', 'kYYkYYk', 'kYYYYYk', 'kkkkkkk'],
  check: ['......k', '.....kG', 'k...kGk', 'Gk.kGk.', '.kGGk..', '..kk...'],
  skull: ['.kkkkk.', 'kWWWWWk', 'kWkWkWk', 'kWWWWWk', '.kWkWk.', '..kkk..'],
  trophy: ['kkkkkkk', 'YkYYYkY', 'YkYYYkY', '.kYYYk.', '..kYk..', '..kYk..', '.kkkkk.'],
  shield: ['kkkkkkk', 'kSSkRRk', 'kSSkRRk', 'kkkkkkk', '.kRkSk.', '..kkk..'],
  scroll: ['.kkkkk.', 'kPPPPPk', '.kPkkPk', '.kPPPPk', '.kPkkPk', 'kPPPPPk', '.kkkkk.'],
  gear: ['..k.k..', '.kGkGk.', 'kGGkGGk', '.kkWkk.', 'kGGkGGk', '.kGkGk.', '..k.k..'],
  anvil: ['kkkkkkk.', 'kGGGGGkk', '.kGGGGGk', '..kGGk..', '..kGGk..', '.kkkkkk.'],
  sword: ['.....kk', '....kWk', '...kWk.', 'k.kWk..', 'kkWk...', '.kYk...', 'kYkk...'],
  cape: ['.kkkkk.', 'kRRRRRk', 'kRRRRRk', 'kRRrRRk', 'kRrRrRk', 'kRRRRRk', 'kk.k.kk'],
  sun: ['k.k.k..', '.kYk...', 'kYYYk..', '.kYk...', 'k.k.k..'],
  door: ['.kkkkk.', 'kWWWWWk', 'kWdddWk', 'kWdddWk', 'kWddYWk', 'kWdddWk', 'kkkkkkk'],
};
const ICPAL = { k: K, L: '#a8d4ff', W: '#ffffff', D: '#2f7fff', Y: '#ffd84a', O: '#c08a20', G: '#8a8298', S: '#c8d0d8', R: '#d8303a', r: '#8a1a22', P: '#e6d2a4', d: '#6b4426' };
function icon(rows, scale = 1) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = mk(w, h), x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = ICPAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  return c;
}
export const IC = {};
export function ic(name, cls = '') { return `<i class="px ${cls}" style="--w:${IC[name]?.w || 7};--h:${IC[name]?.h || 7};background-image:${IC[name]?.u || 'none'}"></i>`; }

/* ---------- Logo ---------- */
function logoCanvas() {
  // Schrift klein rendern, auf Pixel schwellen, dann Goldverlauf, Kontur und Schlagschatten
  const text = 'SCHAUFELHELD', H = 26;
  const t = mk(220, 40), tx = t.getContext('2d');
  tx.font = `700 ${H}px "Pixelify Sans", monospace`; tx.textBaseline = 'top';
  const w = Math.ceil(tx.measureText(text).width) + 2;
  tx.fillStyle = '#fff'; tx.fillText(text, 1, 2);
  const src = tx.getImageData(0, 0, w, 36).data;
  const on = (a, b) => a >= 0 && b >= 0 && a < w && b < 36 && src[(b * w + a) * 4 + 3] > 110;
  const W = w + 6, Hh = 42, c = mk(W, Hh), x = c.getContext('2d');
  const grad = ['#fff6b8', '#ffe680', '#ffd84a', '#f0b830', '#d89020', '#b06a10', '#8a4a08'];
  for (let y = 0; y < 36; y++) for (let i = 0; i < w; i++) {
    if (!on(i, y)) {
      // Kontur und Schatten
      let edge = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (on(i + a, y + b)) edge = true;
      if (edge) { x.fillStyle = K; x.fillRect(i + 3, y + 3, 1, 1); }
      continue;
    }
    x.fillStyle = '#3a1a08'; x.fillRect(i + 3, y + 6, 1, 1);
  }
  for (let y = 0; y < 36; y++) for (let i = 0; i < w; i++) {
    if (!on(i, y)) continue;
    const g = grad[Math.max(0, Math.min(grad.length - 1, Math.floor((y - 4) / 3.2)))];
    x.fillStyle = !on(i, y - 1) ? '#ffffff' : !on(i, y + 1) ? '#6a3a08' : g;
    x.fillRect(i + 3, y + 3, 1, 1);
  }
  return c;
}

export function initSkin() {
  const root = document.documentElement.style;
  root.setProperty('--tex-stone', url(texStone()));
  root.setProperty('--tex-wood', url(texWood()));
  root.setProperty('--tex-wood-d', url(texWood(['#1a0e08', '#2a180e', '#3a2214', '#4a2c1a', '#5a3a22'], 9)));
  root.setProperty('--tex-parch', url(texParch()));
  root.setProperty('--fr-iron', url(frameIron()));
  root.setProperty('--fr-goldpanel', url(frameIron(PAL.gold, PAL.iron)));
  root.setProperty('--fr-jadepanel', url(frameIron(PAL.jade, PAL.gold)));
  for (const k of ['wood', 'crim', 'moss', 'iron', 'gold', 'jade', 'stone']) {
    root.setProperty(`--bv-${k}`, url(frameBevel(PAL[k], false)));
    root.setProperty(`--bv-${k}-p`, url(frameBevel(PAL[k], true)));
  }
  root.setProperty('--fr-gold', url(frameGold()));
  for (const [k, rows] of Object.entries(ICONS)) { const c = icon(rows); IC[k] = { u: url(c), w: c.width, h: c.height }; }
  root.setProperty('--lock', IC.lock.u); root.setProperty('--coin', IC.coin.u);
  const logo = logoCanvas();
  IC.logo = { u: logo.toDataURL(), w: logo.width, h: logo.height };
}
export function logoImg() { return `<img class="logo" src="${IC.logo.u}" width="${IC.logo.w}" height="${IC.logo.h}" alt="Schaufelheld">`; }
// Logo erst neu zeichnen, wenn die Schrift geladen ist
export function refreshLogo(cb) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const l = logoCanvas(); IC.logo = { u: l.toDataURL(), w: l.width, h: l.height }; cb && cb(); }); }
