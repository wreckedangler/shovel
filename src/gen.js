// Level-Generator: aus einem Seed entsteht immer dasselbe Level (wie eine Minecraft-Welt).
// Biom (Optik, Gegner, Mechaniken) × Bauart (Lauf, Höhle, Abgrund, Schacht) × Bausteine sorgen für Abwechslung.
// Alle Bausteine halten die Sprungregeln ein: Lücke ≤ 3 Kacheln, Stufe ≤ 2 Kacheln, Pilz = 4 Kacheln.

// Erhöhen, sobald sich erzeugte Levels ändern: Blutflecken älterer Versionen werden dann ausgeblendet.
export const GEN_VERSION = 3;  // 3: schneller ansteigend, mehr Gegner und Fallen, früher Verfolger und Elitegegner

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hashSeed(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }

// Biome: Thema aus themes.js, Gegner (Zeichen: Gewicht), Bausteine (Name: Gewicht), bevorzugte Bauarten
export const BIOMES = [
  { id: 'wald', name: 'Wurzelwald', foes: { b: 4, o: 2, f: 2, w: 1 }, air: { v: 1, w: 2 }, chunks: { flat: 4, gap: 4, step: 3, spikes: 2, bridge: 2, dirt: 3, shroom: 2, pocket: 1, arc: 2 }, styles: { lauf: 5, abgrund: 1, hoehle: 1 } },
  { id: 'hoehle', name: 'Tiefhöhle', foes: { b: 3, o: 3, q: 2 }, air: { v: 3 }, chunks: { flat: 3, gap: 3, step: 3, dirt: 5, bridge: 2, spikes: 1, pocket: 2, shroom: 1 }, styles: { hoehle: 5, lauf: 1, schacht: 1 } },
  { id: 'dornen', name: 'Dornenhang', foes: { b: 2, f: 3, q: 3 }, air: { w: 2, v: 1 }, chunks: { flat: 2, gap: 3, step: 3, spikes: 6, bridge: 3, shroom: 3, pocket: 1 }, styles: { lauf: 4, abgrund: 2, schacht: 1 } },
  { id: 'bau', name: 'Maulwurfsbau', foes: { o: 3, b: 3, q: 1 }, air: { v: 2 }, chunks: { flat: 3, gap: 2, step: 3, dirt: 7, vent: 2, pocket: 2, spikes: 1 }, styles: { hoehle: 4, lauf: 2 } },
  { id: 'uhrturm', name: 'Zahnradwerk', foes: { k: 3, b: 2 }, air: { u: 3 }, chunks: { flat: 3, gap: 3, step: 2, mover: 4, vent: 3, cog: 2, bridge: 2, pocket: 1 }, styles: { lauf: 3, abgrund: 2, schacht: 2 } },
  { id: 'glocke', name: 'Glockenhallen', foes: { k: 3, o: 2 }, air: { u: 2, v: 2 }, chunks: { flat: 3, gap: 3, step: 3, mover: 3, bridge: 3, spikes: 2, pocket: 1 }, styles: { lauf: 3, abgrund: 3, schacht: 1 } },
  { id: 'pilz', name: 'Pilzdickicht', foes: { s: 2, o: 2, f: 3 }, air: { w: 2 }, chunks: { flat: 3, gap: 3, step: 2, crumble: 4, shroom: 5, bridge: 2, pocket: 1 }, styles: { lauf: 4, abgrund: 2, schacht: 1 } },
  { id: 'grotte', name: 'Leuchtgrotte', foes: { q: 3, s: 2, f: 1 }, air: { w: 3, v: 2 }, chunks: { flat: 3, gap: 3, step: 3, crumble: 3, bridge: 3, spikes: 2, pocket: 2 }, styles: { hoehle: 3, abgrund: 2, lauf: 1 } },
  { id: 'moder', name: 'Modersumpf', foes: { s: 3, o: 2, q: 2, f: 2 }, air: { w: 3 }, chunks: { flat: 2, gap: 3, step: 2, crumble: 4, spikes: 3, bridge: 2, shroom: 2, pocket: 1 }, styles: { lauf: 3, abgrund: 3 } },
];
const ADJ = ['Flüsternde', 'Verlorene', 'Glühende', 'Vergessene', 'Gebrochene', 'Stille', 'Tiefe', 'Ewige', 'Rostige', 'Gezackte', 'Brüllende', 'Versunkene', 'Goldene', 'Schwarze', 'Kalte', 'Wilde'];
const NOUN = { lauf: ['Pfad', 'Weg', 'Grat', 'Steig', 'Hang'], hoehle: ['Stollen', 'Gänge', 'Tiefe', 'Kammern', 'Adern'], abgrund: ['Kluft', 'Schlucht', 'Brücken', 'Inseln', 'Leere'], schacht: ['Schacht', 'Turm', 'Aufstieg', 'Kamin', 'Spirale'] };
const masc = { Pfad: 0, Weg: 0, Grat: 0, Steig: 0, Hang: 0, Stollen: 0, Schacht: 0, Turm: 0, Aufstieg: 0, Kamin: 0 };

function pickW(r, obj) { const e = Object.entries(obj); let t = r() * e.reduce((a, [, w]) => a + w, 0); for (const [k, w] of e) { t -= w; if (t <= 0) return k; } return e[0][0]; }
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));

/* ---------- Gitter ---------- */
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.c = Array.from({ length: h }, () => Array(w).fill('.')); }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? '#' : this.c[y][x]; }
  set(x, y, ch) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y][x] = ch; }
  ground(x, gy, ch = '#') { for (let y = gy; y < this.h; y++) this.set(x, y, ch); }
  rows() { return this.c.map(r => r.join('')); }
}

// Schwierigkeit 0..1 aus der Tiefe (ab Tiefe 40 volle Härte)
const diffOf = depth => Math.min(1, depth / 30);

/* ---------- Waagrechte Bauarten ---------- */
function horizontal(r, bio, style, depth, chased = false, opt = {}) {
  const cave = style === 'hoehle', abyss = style === 'abgrund';
  // Zweistöckig (nur Pfad/Abgrund, nie bei Verfolgung): unterer Weg wie gewohnt, 6 Kacheln tiefer,
  // darüber ein schwieriger oberer Weg mit mehr Beute
  const two = !opt.qual && !chased && (style === 'lauf' || abyss) && r() < 0.4, O = two ? 6 : 0;
  const d = diffOf(depth), H = 14 + O, W = opt.width || ri(r, 90, 110) + Math.round(d * 50);
  const g = new Grid(W + 60, H);
  let x = 0, gy = 10 + O, last = '', coins = opt.qual ? 3 : 0, sinceCheck = 0; const TOP = (cave ? 7 : 4) + O + (two ? 2 : 0);
  const checks = [];
  const foeP = opt.qual ? 0.8 : 0.27 + d * 0.4;
  const groundFoe = () => pickW(r, bio.foes), airFoe = () => pickW(r, bio.air);
  const putGround = (a, b, y = gy) => { for (let k = a; k < b; k++) g.ground(k, y); };
  const gems = (a, b, y) => { if (two && r() < 0.4) return; for (let k = a; k < b; k++) if (g.get(k, y) === '.') g.set(k, y, 'G'); };
  const arc = (x0, w, y0, hgt) => { for (let k = 0; k < w; k++) { const yy = y0 - Math.round(Math.sin((k + 0.5) / w * Math.PI) * hgt); if (g.get(x0 + k, yy) === '.') g.set(x0 + k, yy, 'G'); } };
  const maybeFoe = (a, b) => { if (b - a >= 3 && r() < foeP) g.set(ri(r, a + 1, b - 2), gy - 1, groundFoe()); if (r() < foeP * 0.5 && Object.keys(bio.air).length) g.set(ri(r, a, b - 1), gy - ri(r, 3, 4), airFoe()); };
  const coin = (cx, cy) => { if (coins < 3 && g.get(cx, cy) === '.') { g.set(cx, cy, 'O'); coins++; return true; } return false; };

  // Start
  putGround(0, 7); g.set(2, gy - 1, 'P'); x = 7;
  const CH = {
    flat() { const w = ri(r, 4, 8); putGround(x, x + w); maybeFoe(x, x + w); if (r() < 0.5) gems(x + 1, x + w - 1, gy - 3); if (r() < 0.12) g.set(x + w - 2, gy - 1, 'T'); else if (r() < 0.06) g.set(x + 1, gy - 1, 'h'); x += w; },
    gap() {
      const w = ri(r, 2, d > 0.3 ? 3 : 2); arc(x - 1, w + 2, gy - 2, 2);
      if (Object.keys(bio.air).includes('w') && r() < 0.25 + d * 0.3) g.set(x + Math.floor(w / 2), gy - 3, 'w');
      x += w; let ny = Math.max(TOP, Math.min(11 + O, gy + ri(r, w > 2 ? 0 : -1, 1))); ny = Math.max(ny, gy - (w > 2 ? 0 : 1)); gy = ny; const lw = ri(r, 3, 5); putGround(x, x + lw); x += lw;
    },
    step() {
      const up = (r() < 0.55 || gy >= 11 + O) && gy > TOP, room = up ? Math.min(2, gy - TOP) : Math.min(3, 11 + O - gy);
      if (room < 1) return CH.flat(); const k = ri(r, 1, room);
      gy += up ? -k : k; const w = ri(r, 4, 7); putGround(x, x + w); maybeFoe(x, x + w); if (up) gems(x, x + 2, gy - 2); x += w;
    },
    spikes() {
      const pre = 2, w = ri(r, 2, d > 0.35 ? 3 : 2); putGround(x, x + pre + w + 3);
      for (let k = 0; k < w; k++) g.set(x + pre + k, gy, '^');
      arc(x + pre - 1, w + 2, gy - 2, 2);
      if (r() < 0.4 && gy > 8 + O) { for (let k = 0; k < 3; k++) g.set(x + pre + k - 1 + Math.floor(w / 2), gy - 3, '='); }
      x += pre + w + 3;
    },
    bridge() {
      const w = ri(r, 6, 9 + Math.round(d * 3)); let px = x;
      // Plattformen über einer Grube, Abstände ≤ 2, Höhenunterschied ≤ 2
      let py = gy;
      while (px < x + w - 2) { const pw = ri(r, 2, 3); const ny = Math.max(5 + O + (two ? 2 : 0), Math.min(gy + 1, py + ri(r, -2, 2))); py = ny; for (let k = 0; k < pw; k++) g.set(px + k, py, '='); if (r() < 0.5) g.set(px + 1, py - 2, 'G'); if (r() < 0.2 && bio.air.w) g.set(px + pw, py - 2, 'w'); px += pw + ri(r, 1, 2); }
      x = px; const lw = ri(r, 3, 5); gy = Math.max(Math.max(TOP, py - 2), Math.min(11 + O, py + 1)); putGround(x, x + lw); x += lw;
    },
    dirt() {
      const w = ri(r, 6, 9); putGround(x, x + w);
      const kind = r();
      if (kind < 0.5) { const hh = ri(r, 3, 4); for (let yy = gy - hh; yy < gy; yy++) for (let k = 2; k < 4; k++) g.set(x + k, yy, 'D'); g.set(x + 5, gy - 1, r() < 0.3 ? 'T' : 'G'); }
      else { for (let k = 1; k < w - 1; k++) for (let yy = gy - 2; yy < gy; yy++) g.set(x + k, yy, 'D'); g.set(x + Math.floor(w / 2), gy - 4, 'G'); g.set(x + Math.floor(w / 2) + 1, gy - 4, 'G'); }
      x += w;
    },
    shroom() {
      if (gy < 9 + O || cave) return CH.step();
      putGround(x, x + 3); g.set(x + 1, gy, 'B'); const ny = gy - 3; x += 3; const lw = ri(r, 4, 6);
      for (let k = x; k < x + lw; k++) g.ground(k, ny); gy = ny; gems(x, x + lw, gy - 2);
      if (r() < 0.6) coin(x + lw - 1, gy - 1); else maybeFoe(x, x + lw); x += lw;
    },
    crumble() {
      const w = ri(r, 3, 5); arc(x, w, gy - 2, 1); for (let k = 0; k < w; k++) g.set(x + k, gy, 'c'); x += w; const lw = ri(r, 3, 5); putGround(x, x + lw); x += lw;
    },
    mover() {
      const w = 8; g.set(x + 2, gy, 'm'); g.set(x + 3, gy - 3, 'G'); g.set(x + 4, gy - 3, 'G');
      x += w; const lw = ri(r, 3, 5); putGround(x, x + lw); x += lw;
    },
    vent() {
      if (gy < 10 + O || cave) return CH.step();
      putGround(x, x + 3); g.set(x + 1, gy, 'V'); x += 3; const ny = gy - 5, lw = ri(r, 4, 6);
      for (let k = x; k < x + lw; k++) g.ground(k, ny); gy = ny; gems(x - 2, x, gy - 3); x += lw;
    },
    cog() { const w = 7; putGround(x, x + w); g.set(x + 3, gy - 3, 'z'); gems(x + 1, x + 2, gy - 1); x += w; },
    pocket() {
      // Falsche Wand im Boden, darunter eine abgedeckte Kammer mit Münze oder Truhe
      if (gy > 9 + O) return CH.flat();
      const w = 7; putGround(x, x + w); g.set(x + 2, gy, 'F'); g.set(x + 3, gy, 'F');
      for (let k = 1; k < 6; k++) g.set(x + k, gy + 1, '.');
      if (!coin(x + 5, gy + 1)) g.set(x + 5, gy + 1, 'T'); g.set(x + 1, gy + 1, 'G');
      x += w;
    },
    // Fallen (ab Tiefe 6)
    icicles() { const w = 8; putGround(x, x + w); if (gy >= 6 + O) { for (let k = 1; k < w - 1; k++) g.set(x + k, gy - 5, '#'); g.set(x + 2, gy - 4, 'L'); g.set(x + 5, gy - 4, 'L'); } x += w; },
    saws() { const w = 9; putGround(x, x + w); g.set(x + 4, gy - 1, 'Z'); gems(x + 3, x + 6, gy - 3); x += w; },
    arrows() { const w = 10; putGround(x, x + w); g.set(x + w - 1, gy - 1, 'A'); if (r() < 0.5) gems(x + 2, x + 6, gy - 2); x += w; },
    flips() { const w = ri(r, 3, 5); for (let k = 0; k < w; k++) g.set(x + k, gy, 'K'); arc(x, w, gy - 2, 1); x += w; const lw = ri(r, 3, 5); putGround(x, x + lw); x += lw; },
    troll() { const w = 2; g.set(x + 1, gy - 4, 'I'); arc(x - 1, w + 2, gy - 2, 2); x += w; const lw = ri(r, 3, 5); putGround(x, x + lw); x += lw; },
    arc() { const w = 6; putGround(x, x + w); g.set(x + 2, gy - 2, 'H'); if (!coin(x + 2, gy - 4)) g.set(x + 2, gy - 4, 'G'); x += w; },
  };
  const pool = { ...bio.chunks };
  if (abyss) { pool.gap = (pool.gap || 1) * 2; pool.bridge = (pool.bridge || 1) * 2.5; pool.flat = 1; pool.dirt = 0; }
  if (cave) { pool.shroom = 0; pool.vent = 0; pool.dirt = (pool.dirt || 1) + 2; }
  if (chased) { pool.mover = 0; pool.vent = 0; pool.pocket = 0; pool.dirt = 0; pool.cog = 0; }
  const tw = Math.max(0, Math.min(3.5, (depth - 3) / 5));
  if (tw > 0) {
    const caveB = ['hoehle', 'grotte', 'bau'].includes(bio.id), mech = ['uhrturm', 'glocke', 'bau'].includes(bio.id);
    pool.icicles = tw * (caveB || cave ? 1.5 : 0.5); pool.saws = tw * (mech ? 1.6 : 0.7); pool.arrows = tw * (bio.id === 'dornen' ? 1.8 : 0.8); pool.flips = tw * (mech || bio.id === 'wald' ? 1.2 : 0.6);
    if (depth >= 18) pool.troll = 0.6;
  }
  if (opt.qual) {
    // Qualpfad: Fallen und Gegner überall, kaum Verschnaufpausen, keine Verstecke
    Object.assign(pool, { flat: 0.8, pocket: 0, arc: 0, dirt: (pool.dirt || 0) * 0.3, spikes: 3, gap: 3, bridge: 2.5, crumble: 2.2, saws: 3, arrows: 3, flips: 2.5, troll: 1.2, icicles: cave ? 3 : 1 });
    if (chased) Object.assign(pool, { mover: 0, vent: 0 });
  }
  while (x < W - 10) {
    if (sinceCheck > (opt.qual ? 64 : 38) && last !== 'gap') { putGround(x, x + 4); g.set(x + 1, gy - 1, 'C'); checks.push(x + 1); x += 4; sinceCheck = 0; continue; }
    let name = pickW(r, pool); if (name === last && r() < 0.7) name = pickW(r, pool);
    const x0 = x, gy0 = gy; CH[name](); last = name; sinceCheck += x - x0; 
  }
  // Fehlende Münzen: Geheimkammer oder versteckter Block nachrüsten
  while (coins < 3) { coins < 2 && gy <= 9 + O ? CH.pocket() : CH.arc(); }
  putGround(x, x + 12); g.set(x + 5, gy - 1, 'E'); for (let k = 0; k < 3; k++) g.set(x + 1 + k, gy - 3, 'G');
  // Ohne Platz für einen oberen Weg: die leeren oberen Zeilen wieder abschneiden (normales Level)
  let cut = 0;
  if (two && !upperRoute(g, r, bio, d, checks, x)) while (cut < O && g.c[cut].every(c => c === '.')) cut++;
  // Höhlendecke folgt dem Boden mit 5 Kacheln Luft
  if (cave) {
    const topOf = k => { for (let y = 0; y < H; y++) if ('#^cBVF=DSm'.includes(g.get(k, y)) && k >= 0 && k < g.w) return y; return 99; };
    const tops = Array.from({ length: g.w }, (_, k) => topOf(k));
    for (let k = 0; k < g.w; k++) {
      let m = 99; for (let j = k - 2; j <= k + 2; j++) if (j >= 0 && j < g.w) m = Math.min(m, tops[j]);
      const ceil = m === 99 ? 3 : Math.max(0, m - 5);
      for (let y = 0; y < ceil; y++) g.set(k, y, '#');
      if (ceil > 0 && r() < 0.04 && bio.air.v && g.get(k, ceil) === '.') g.set(k, ceil, 'v');
    }
  }
  return g.rows().slice(cut).map(row => row.slice(0, x + 12));
}

/* ---------- Oberer Weg (zweistöckige Levels) ----------
   Schwebende Plattformen ('=') hoch über dem unteren Weg. Aufstieg über eine Treppe aus Plattformen
   (Stufe 2) oder einen Pilz im Boden (Stufe 3). Lücken ≤ 3 nur gleich hoch oder abwärts, ≤ 2 auch 1 hoch.
   Endet vor Kontrollpunkten und dem Ziel über sicherem Boden: man lässt sich einfach fallen. */
function upperRoute(g, r, bio, d, checks, goalX) {
  const H = g.h, W = goalX;
  const free = c => c === '.' || c === 'G';
  const gtop = [], occ = [];
  for (let k = 0; k < g.w; k++) {
    let a = H, b = H;
    for (let y = 0; y < H; y++) { const c = g.c[y][k]; if (b === H && !free(c)) b = y; if (a === H && (SOLIDS.has(c) || c === '=' || c === 'm')) a = y; }
    gtop.push(a); occ.push(b);
  }
  // höchste erlaubte Zeile (kleinster y-Wert ist am höchsten): genug Luft zum unteren Weg
  const lim = (k, gapG, gapO) => k < 0 || k >= g.w ? -1 : Math.min(gtop[k] - gapG, occ[k] - gapO);
  const cellsFree = (k, y) => y >= 2 && free(g.get(k, y)) && free(g.get(k, y - 1)) && free(g.get(k, y - 2));
  const safeDrop = k => gtop[k] < H && occ[k] === gtop[k] && g.get(k, gtop[k]) !== '^' && gtop[k + 1] < H && g.get(k + 1, gtop[k + 1]) !== '^';
  // gesperrte Bereiche: Start, um Kontrollpunkte, vor dem Ziel
  const blocked = new Uint8Array(g.w); for (let k = 0; k < 14; k++) blocked[k] = 1;
  for (const c of checks) for (let k = c - 4; k <= c + 2; k++) if (k >= 0) blocked[k] = 1;
  for (let k = Math.max(0, W - 6); k < g.w; k++) blocked[k] = 1;
  const foeP = 0.15 + d * 0.3, airKeys = Object.keys(bio.air);
  const segs = [];
  let k = 14;
  while (k < W - 20) {
    if (blocked[k]) { k++; continue; }
    // Einstieg: zwei (mit Pilz drei) flache, leere Bodenkacheln auf festem Grund
    const fy = gtop[k];
    const flat = n => fy < H && [...Array(n).keys()].every(j => gtop[k + j] === fy && occ[k + j] === fy && g.get(k + j, fy) === '#' && g.get(k + j, fy + 1) === '#' && !blocked[k + j]);
    if (!flat(2)) { k++; continue; }
    const plan = [];  // {x, y, w, kind}
    let py, px;
    if (flat(3) && r() < 0.5) {
      // Pilz im Boden (unterer Weg läuft einfach darüber)
      plan.push({ shroom: k + 1, fy }); py = fy - 3; px = k + 3;
    } else { py = fy - 2; px = k + 1; }
    // Treppe nach oben bis in die obere Etage
    const goalY = ri(r, 4, 6);
    let okStairs = true;
    while (true) {
      const sw = ri(r, 2, 3);
      let fits = true; for (let j = 0; j < sw; j++) if (blocked[px + j] || !cellsFree(px + j, py) || py > lim(px + j, 2, 2)) fits = false;
      if (!fits) { okStairs = false; break; }
      plan.push({ x: px, y: py, w: sw, kind: 'stair' });
      const sg = ri(r, 1, d > 0.3 ? 2 : 1);
      px += sw + sg;
      if (py <= goalY + 1) break;
      py -= 2;
    }
    if (!okStairs) { k++; continue; }
    // oben entlang: nach Lücke ≤ 2 höchstens 1 Kachel hoch, nach Lücke 3 nur gleich hoch oder tiefer
    let y = py, minY = py - 2, cx = px, commit = -1, upper = 0;
    const segEnd = Math.min(W - 8, px + ri(r, 18, 40));
    while (cx < segEnd) {
      const pw = ri(r, 2, 5);
      let m = 99; for (let j = 0; j < pw; j++) m = Math.min(m, lim(cx + j, 5, 4));
      const ny = Math.max(minY, 3, Math.min(m, y + ri(r, -1, 1), 7));
      if (ny > m) break;
      let fits = true; for (let j = 0; j < pw; j++) if (blocked[cx + j] || !cellsFree(cx + j, ny)) fits = false;
      if (!fits) break;
      plan.push({ x: cx, y: ny, w: pw, kind: 'top' }); upper++; y = ny;
      if (upper >= 2 && safeDrop(cx + pw)) commit = plan.length;
      const gap = ri(r, 1, d > 0.3 ? 3 : 2);
      cx += pw + gap; minY = gap === 3 ? y : y - 1;
    }
    if (commit < 0) { k++; continue; }
    const used = plan.slice(0, commit);
    segs.push(used);
    const last = used[used.length - 1]; k = last.x + last.w + 6;
  }
  // Bauen + Beute: Edelsteine oben, eine Truhe pro Abschnitt, gelegentlich Luftgegner
  let chest = 0; const tops = [];
  for (const seg of segs) {
    let segChest = false;
    const topPl = seg.filter(p => p.kind === 'top');
    const chestAt = topPl.length ? topPl[Math.min(topPl.length - 1, 1 + Math.floor(r() * (topPl.length - 1)))] : null;
    for (const p of seg) {
      if (p.shroom) { g.set(p.shroom, p.fy, 'B'); continue; }
      for (let j = 0; j < p.w; j++) g.set(p.x + j, p.y, '=');
      if (p.kind !== 'top') continue;
      tops.push(p);
      if (p === chestAt && p.w >= 2 && (!segChest && (chest === 0 || r() < 0.6))) { g.set(p.x + p.w - 1, p.y - 1, 'T'); segChest = true; chest++; for (let j = 0; j < p.w - 1; j++) g.set(p.x + j, p.y - 1, 'G'); }
      else if (r() < 0.75) for (let j = 0; j < p.w; j++) g.set(p.x + j, p.y - (r() < 0.3 ? 2 : 1), 'G');
      if (airKeys.length && r() < foeP * 0.5 && g.get(p.x + p.w + 1, p.y - 2) === '.') g.set(p.x + p.w + 1, p.y - 2, pickW(r, bio.air));
    }
  }
  // Gelegentlich wandert eine Münze vom unteren auf den oberen Weg
  if (tops.length >= 3 && r() < 0.4) {
    const lowCoins = []; for (let y = 0; y < H; y++) for (let x = 0; x < g.w; x++) if (g.c[y][x] === 'O') lowCoins.push([x, y]);
    const cand = tops.filter(p => g.get(p.x + Math.floor(p.w / 2), p.y - 2) === '.' || g.get(p.x + Math.floor(p.w / 2), p.y - 2) === 'G');
    if (lowCoins.length && cand.length) {
      const [lx, ly] = lowCoins[Math.floor(r() * lowCoins.length)], p = cand[Math.floor(r() * cand.length)];
      g.set(lx, ly, 'G'); g.set(p.x + Math.floor(p.w / 2), p.y - 2, 'O');
    }
  }
  return segs.length;
}

/* ---------- Senkrechter Schacht ---------- */
function shaft(r, bio, depth) {
  const d = diffOf(depth), W = 20, H = ri(r, 42, 56) + Math.round(d * 16);
  const g = new Grid(W, H);
  for (let y = 0; y < H; y++) { g.set(0, y, '#'); g.set(W - 1, y, '#'); }
  for (let x = 0; x < W; x++) { g.set(x, H - 1, '#'); g.set(x, H - 2, '#'); }
  g.set(3, H - 3, 'P');
  let y = H - 2, px = 2, coins = 0, sinceCheck = 0;
  const coin = (cx, cy) => { if (coins < 3 && g.get(cx, cy) === '.') { g.set(cx, cy, 'O'); coins++; } };
  let opw = 3;
  while (y > 6) {
    const pw = ri(r, 3, 5);
    const big = r() < 0.12 && bio.chunks.shroom && y < H - 4;
    const rise = big ? 4 : 2, ny = y - rise;
    // neue Plattform höchstens 3 Kacheln seitlich vom Rand der alten
    let nx = Math.max(1, Math.min(W - 1 - pw, px + ri(r, -pw - 2, opw + 2)));
    if (big) { g.set(Math.max(1, Math.min(W - 2, px + 1)), y - 1, 'B'); nx = Math.max(1, Math.min(W - 1 - pw, px + ri(r, -2, 2))); }
    // feste oder bröckelnde Plattformen nur, wenn sie nicht direkt über der alten liegen (sonst Kopfstoss)
    const overlap = nx < px + opw && nx + pw > px;
    const solid = '=';
    for (let k = 0; k < pw; k++) g.set(nx + k, ny, solid);
    if (r() < 0.25 + d * 0.3) { if (pw >= 4 && r() < 0.5) g.set(nx + 1, ny - 1, pickW(r, bio.foes)); else if (Object.keys(bio.air).length) g.set(Math.max(2, Math.min(W - 3, nx + ri(r, -3, pw + 2))), ny - 2, pickW(r, bio.air)); }
    if (r() < 0.45) g.set(nx + Math.floor(pw / 2), ny - 2, 'G');
    sinceCheck += rise;
    if (sinceCheck > 14) { g.set(nx + pw - 1, ny - 1, 'C'); sinceCheck = 0; }
    px = nx; y = ny; opw = pw;
  }
  // Gipfel: Ziel auf der letzten Plattform
  g.set(px + 1, y - 1, 'E'); g.set(3, H - 3, 'P');
  // Drei Münzen: je eine im unteren, mittleren und oberen Drittel, gern knapp über einer Plattform
  for (let band = 0; band < 3; band++) {
    const y0 = 6 + Math.floor((H - 10) * band / 3), y1 = 6 + Math.floor((H - 10) * (band + 1) / 3), cand = [];
    for (let yy = y0; yy < y1; yy++) for (let x = 1; x < W - 1; x++) if ('=#c'.includes(g.get(x, yy)) && g.get(x, yy - 1) === '.') cand.push([x, yy - 1]);
    if (!cand.length) continue;
    const [cx, cy] = cand[Math.floor(r() * cand.length)];
    if (g.get(cx, cy - 2) === '.' && g.get(cx, cy - 1) === '.' && r() < 0.6) coin(cx, cy - 2); else coin(cx, cy);
  }
  return g.rows();
}

/* ---------- Öffentliche Schnittstelle ---------- */
export function generateLevel(seed, depth = 1) {
  // Sicherheitsnetz: falls die Prüfung je scheitert, wird mit einer Variante neu gewürfelt
  let L;
  for (let tryN = 0; tryN < 8; tryN++) { L = generateOnce(seed, depth, tryN); const r = reachable(L.map); if (r.ok && r.coins === 3) break; }
  return L;
}
function generateOnce(seed, depth, tryN) {
  const r = rng(hashSeed('sh' + seed + ':' + depth + (tryN ? '#' + tryN : '')));
  const bio = BIOMES[Math.floor(r() * BIOMES.length)];
  let style = pickW(r, bio.styles);
  if (depth < 3 && style === 'schacht') style = 'lauf';
  // Verfolgung wird vorab gewürfelt, damit das Level dazu passt (keine Warte-Bausteine)
  let chase = null;
  if (style === 'schacht' && depth >= 6 && r() < 0.35) chase = { kind: ['bau', 'moder', 'uhrturm'].includes(bio.id) ? 'lava' : 'flut', speed: Math.min(0.55, 0.3 + depth * 0.005), delay: 150 };
  else if (style !== 'schacht' && depth >= 10 && r() < 0.25) chase = { kind: style === 'hoehle' ? 'decke' : 'wurm', speed: Math.min(1.55, 1.05 + depth * 0.008), delay: 120 };
  const map = style === 'schacht' ? shaft(r, bio, depth) : horizontal(r, bio, style, depth, !!chase);
  const noun = NOUN[style][Math.floor(r() * NOUN[style].length)];
  let adj = ADJ[Math.floor(r() * ADJ.length)]; if (noun in masc) adj = adj.replace(/e$/, 'er');
  const width = map[0].length, par = Math.round(style === 'schacht' ? 30 + map.length * 0.9 : 20 + width * 0.42);
  const elite = depth >= 12 ? Math.min(0.4, (depth - 11) * 0.018) : 0;
  return { id: `∞${depth}-${seed}`, name: `${adj} ${noun}`, theme: bio.id, biome: bio.name, style, par: chase ? Math.round(par * 0.8) : par, map, signs: [], gen: true, seed, depth, chase, elite };
}
// Seeds der endlosen Tiefen: aus dem Welt-Seed und der Tiefe
export const STYLE_NAME = { lauf: 'Pfad', hoehle: 'Höhle', abgrund: 'Abgrund', schacht: 'Schacht' };

/* ---------- Erreichbarkeit (statisch, ohne Gegner) ----------
   Prüft auf dem Kachelraster, ob Start → Ziel und alle Münzen erreichbar sind.
   Konservativ: Sprung ≤ 3 Kacheln weit und ≤ 2 hoch, Pilz 3 hoch, Dampf 5 hoch. */
const SOLIDS = new Set(['#', 'D', 'S', 'B', '^', 'V', 'R', 'F', 'c', 'J', 'A', 'K', 'I']);
export function reachable(map) {
  const H = map.length, W = map[0].length;
  const at = (x, y) => (x < 0 || x >= W ? '#' : y < 0 ? '.' : y >= H ? '.' : map[y][x]);
  // Erde und falsche Wände gelten als durchlässig (graben/zerschlagen), H als Luft
  const blocks = (x, y) => { const c = at(x, y); return SOLIDS.has(c) && c !== 'D' && c !== 'F'; };
  const floor = (x, y) => { const c = at(x, y + 1); return (SOLIDS.has(c) && c !== 'I') || c === '=' || c === 'm'; };
  const standable = (x, y) => y >= 0 && y < H && !blocks(x, y) && at(x, y) !== '^' && floor(x, y) && at(x, y + 1) !== '^';
  let start, goal; const coins = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = map[y][x]; if (c === 'P') start = [x, y]; if (c === 'E') goal = [x, y]; if (c === 'O') coins.push([x, y]); }
  if (!start || !goal) return { ok: false, why: 'Start/Ziel fehlt' };
  // Fallen bis zum nächsten Stand
  const fall = (x, y) => { for (let yy = y; yy < H; yy++) { if (blocks(x, yy)) return null; if (at(x, yy) === '^') return null; if (standable(x, yy)) return [x, yy]; } return null; };
  const clearCol = (x, y0, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (blocks(x, y)) return false; return true; };
  const seen = new Set(), st = [], key = (x, y) => x + ',' + y;
  const s0 = fall(start[0], start[1]) || start; st.push(s0); seen.add(key(...s0));
  const visitedAir = new Set();
  const push = p => { if (p && !seen.has(key(...p))) { seen.add(key(...p)); st.push(p); } };
  while (st.length) {
    const [x, y] = st.pop();
    visitedAir.add(key(x, y)); for (let k = 1; k <= 3; k++) visitedAir.add(key(x, y - k));
    const under = at(x, y + 1);
    let lift = 2; if (under === 'B') lift = 3; if (under === 'V') lift = 5;
    for (let dx = -4; dx <= 4; dx++) for (let dy = -lift; dy <= 6; dy++) {
      const nx = x + dx, ny = y + dy;
      if (Math.abs(dx) === 4 && dy < 0) continue;
      if (!standable(nx, ny)) continue;
      // Flugbahn: entweder in der Startspalte hoch und dann hinüber, oder früh hinüber und in der Zielspalte hoch
      const peak = Math.min(y, ny) - (dy <= 0 ? 1 : 0), step = Math.sign(dx);
      const rowClear = (yy, a, b) => { for (let cx = a; cx !== b + step; cx += step) if (blocks(cx, yy)) return false; return true; };
      let ok;
      if (dx === 0) ok = clearCol(x, y, ny) && clearCol(x, y, peak);
      else if (dy >= 0 && Math.abs(dx) === 1) ok = !blocks(nx, y) && clearCol(nx, y, ny);
      else ok = (clearCol(x, y, peak) && rowClear(peak, x + step, nx) && clearCol(nx, peak, ny))
        || (clearCol(x, y, y - 1) && rowClear(Math.min(y, ny) - 1 < peak ? y - 1 : y - 1, x + step, nx) && clearCol(nx, peak, y - 1) && clearCol(nx, peak, ny))
        || (dy > 0 && rowClear(y, x + step, x + step) && clearCol(x + step, y, ny) && rowClear(ny, x + step, nx));
      if (ok) {
        push([nx, ny]); for (let k = 0; k <= 3; k++) visitedAir.add(key(nx, ny - k));
        // Flugbahn markieren: Münzen in der Luft über Lücken sind erreichbar
        for (let cx = x; cx !== nx + (step || 1); cx += step || 1) for (let yy = Math.min(y, ny) - 2; yy <= Math.max(y, ny); yy++) if (!blocks(cx, yy)) visitedAir.add(key(cx, yy));
      }
    }
    // Schwebeplattform: trägt bis zu 3 Kacheln seitlich
    if (under === 'm') for (let dx = -6; dx <= 6; dx++) push(fall(x + dx, y));
  }
  if (globalThis.__DBG) globalThis.__SEEN = [...seen];
  const reach = p => seen.has(key(...p)) || visitedAir.has(key(...p));
  const ok = reach(goal), coinsOk = coins.filter(reach).length;
  return { ok, coins: coinsOk, coinTotal: coins.length, why: ok ? '' : 'Ziel unerreichbar' };
}

/* ---------- Qualpfade: angehängte Abschnitte in voller Härte ---------- */
// Waagrecht: ein Abschnitt in Tiefe-40-Härte ohne Verstecke, Startplattform ohne 'P' (Anschluss an das handgebaute Level)
export function qualSection(seed, themeId, width, style = 'lauf', chased = false) {
  const r = rng(hashSeed('qual' + seed + ':' + themeId));
  const bio = BIOMES.find(b => b.id === themeId) || BIOMES[0];
  return horizontal(r, bio, style, 40, chased, { qual: true, width });
}
// Senkrecht: Qual-Schacht mit Bröckel- und Kippplattformen, Pfeilwerfern in den Wänden und Sägen über den Absätzen
export function qualShaft(seed, themeId, height) {
  const r = rng(hashSeed('qualschacht' + seed + ':' + themeId));
  const bio = BIOMES.find(b => b.id === themeId) || BIOMES[0];
  const W = 20, H = height, g = new Grid(W, H);
  for (let y = 0; y < H; y++) { g.set(0, y, '#'); g.set(W - 1, y, '#'); }
  let y = H + 1, px = 3, opw = 4, sinceCheck = 0, k = 0;
  while (y > 7) {
    const pw = ri(r, 3, 4), ny = y - 2;
    const nx = Math.max(1, Math.min(W - 1 - pw, px + ri(r, -pw - 2, opw + 2)));
    const overlap = nx < px + opw && nx + pw > px;
    const kind = overlap ? '=' : pickW(r, { '=': 2, c: 2, K: 1.5 });
    for (let j = 0; j < pw; j++) g.set(nx + j, ny, kind);
    // Gegner auf breiten festen Absätzen, Flieger in der Luft
    if (kind === '=' && pw >= 4 && r() < 0.6) g.set(nx + 1, ny - 1, pickW(r, bio.foes));
    else if (Object.keys(bio.air).length && r() < 0.55) g.set(Math.max(2, Math.min(W - 3, nx + ri(r, -3, pw + 2))), ny - 2, pickW(r, bio.air));
    // Pfeilwerfer in der Wand auf Laufhöhe, gegenüber vom Absatz
    if (++k % 3 === 0) g.set(nx < W / 2 ? W - 1 : 0, ny - 1, 'A');
    // Säge über manchen festen Absätzen (zwingt zum Timing)
    if (kind === '=' && r() < 0.3 && ny - 3 > 1) g.set(nx + 1, ny - 3, 'Z');
    if (r() < 0.35) g.set(nx + Math.floor(pw / 2), ny - 2 < 0 ? ny : ny - 2, g.get(nx + Math.floor(pw / 2), ny - 2) === '.' ? 'G' : g.get(nx + Math.floor(pw / 2), ny - 2));
    sinceCheck += 2;
    if (sinceCheck > 22 && kind === '=') { g.set(nx + pw - 1, ny - 1, 'C'); sinceCheck = 0; }
    px = nx; y = ny; opw = pw;
  }
  for (let j = 0; j < 4; j++) g.set(Math.max(1, Math.min(W - 5, px)) + j, y - 3, '=');
  g.set(Math.max(1, Math.min(W - 5, px)) + 1, y - 4, 'E');
  // Laternen sind sichere Orte: keine Gegner direkt daneben
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (g.get(xx, yy) === 'C')
    for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) if ('bokfsqvwuk'.includes(g.get(xx + dx, yy + dy))) g.set(xx + dx, yy + dy, '.');
  return g.rows();
}
