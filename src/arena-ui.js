// Schatten-Arena: Halle, Gegnerwahl, Kampfanzeige und Ergebnis.
import { ARENAS, arenaById, WARDENS, RANKS, rankOf, eloDelta, skillOf, pickOpponent, cleanGear, cleanStyle, START_RATING, ROUND } from './arena.js';
import { arenaUpsert, arenaReport, arenaShades, arenaShade, online } from './online.js';
import { uniqueById, slotName, SLOT_IDS } from './armor.js';
import { TIERS } from './gear.js';
import { weaponById } from './weapons.js';
import { RAR } from './loot.js';
import * as S from './sprites.js';

let C; // Kontext aus main.js
export function initArena(ctx) { C = ctx; }

const A0 = () => {
  const D = C.D;
  if (!D.arena || typeof D.arena !== 'object') D.arena = {};
  const a = D.arena;
  a.rating = Number.isFinite(a.rating) ? Math.max(0, Math.min(4000, Math.round(a.rating))) : START_RATING;
  for (const k of ['wins', 'losses', 'draws', 'games', 'streak', 'bestStreak', 'best', 'seenW', 'seenL']) a[k] = Number.isFinite(a[k]) ? a[k] : 0;
  if (!a.best) a.best = a.rating;
  a.style = cleanStyle(a.style || { aggr: 0.55, pogo: Math.min(1, (D.stats.bestChain || 0) / 10), air: 0.4 });
  if (!ARENAS.some(x => x.id === a.pick)) a.pick = 'zufall';
  if (typeof a.token !== 'string' || a.token.length < 24) { const b = new Uint8Array(18); crypto.getRandomValues(b); a.token = [...b].map(v => v.toString(16).padStart(2, '0')).join(''); }
  return a;
};
const myName = () => (C.D.name || 'Namenlos').slice(0, 16);
const myGear = () => cleanGear(C.gear());

/* ---------- Schatten hochladen und Bericht holen ---------- */
let lastUp = 0;
async function upload(force) {
  const a = A0();
  if (!online() || (!force && Date.now() - lastUp < 60000)) return;
  lastUp = Date.now();
  const id = await arenaUpsert(a.token, { name: myName(), gear: myGear(), style: a.style, rating: a.rating, wins: a.wins, losses: a.losses });
  if (id) { a.shadeId = id; C.save.write(); }
}
async function shadeNews() {
  const a = A0(); if (!a.shadeId) return null;
  const s = await arenaShade(a.shadeId); if (!s) return null;
  const nw = s.shade_wins - a.seenW, nl = s.shade_losses - a.seenL;
  a.shadeW = s.shade_wins; a.shadeL = s.shade_losses;
  if (nw + nl > 0) { a.seenW = s.shade_wins; a.seenL = s.shade_losses; C.save.write(); return { nw, nl }; }
  return null;
}

/* ---------- Kleine Zeichenhelfer ---------- */
function drawMap(cv, ar) {
  const m = ar.map, s = 4, w = m[0].length, h = m.length;
  cv.width = w * s; cv.height = h * s;
  const x = cv.getContext('2d');
  const col = { '#': '#2a2218', '=': '#b98a52', '^': '#ff5a4a', B: '#c58bff', V: '#7ad0ff' };
  x.fillStyle = '#0b0907'; x.fillRect(0, 0, cv.width, cv.height);
  m.forEach((r, j) => [...r].forEach((c, i) => {
    if (c === '=') { x.fillStyle = col[c]; x.fillRect(i * s, j * s, s, 1); }
    else if (col[c]) { x.fillStyle = col[c]; x.fillRect(i * s, j * s, s, s); }
  }));
  for (const hz of ar.hazards) {
    const list = hz.mirror ? [hz.x, 21 * 16 - hz.x - (hz.kind === 'plat' ? 48 : 14)] : [hz.x];
    for (const hx of list) { x.fillStyle = hz.kind === 'saw' ? '#e8ecf4' : '#d4b46a'; x.fillRect(Math.round(hx / 4), Math.round(hz.y / 4), hz.kind === 'saw' ? 3 : 12, hz.kind === 'saw' ? 3 : 2); }
  }
  x.fillStyle = '#ffd84a'; x.fillRect(2 * s, (h - 3) * s, s, s * 2); x.fillStyle = '#ff5a4a'; x.fillRect((w - 3) * s, (h - 3) * s, s, s * 2);
}
let anim = 0;
function heroLoop(sel) {
  const id = ++anim;
  const tick = () => {
    if (id !== anim) return;
    let any = false;
    for (const cv of document.querySelectorAll(sel)) {
      any = true;
      const g = JSON.parse(cv.dataset.g), face = +cv.dataset.face || 1, t = C.menuT();
      C.stage(cv, 42, 42, () => {
        const hs = S.hero(g, g.shovel, g.weapon), ph = Math.floor((t + (face < 0 ? 45 : 0)) / 90) % 3;
        C.R.figure(hs, 16, 20, face, [0, 1, 3][ph], t, ph === 2 ? 8 - (t % 12) * 0.6 : 8, null, 0, 16, ph === 1 ? 2 * face : 0, 0);
      });
    }
    if (any) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const pieceLine = (s, v) => {
  if (typeof v === 'string') { const it = uniqueById(v.split('@')[0]); if (it) return `<li style="color:${RAR[it.rar].col}">${C.esc(it.name)}</li>`; }
  const t = TIERS[+v || 0]; return `<li><span style="color:${t.light}">${C.esc(t.name)}</span>-${C.esc(slotName(s))}</li>`;
};
const gearList = g => {
  const w = g.weapon && weaponById(g.weapon);
  return `<ul class="agear">${w ? `<li class="wpn">${C.esc(w.name)}</li>` : `<li><span style="color:${TIERS[g.shovel].light}">${C.esc(TIERS[g.shovel].name)}</span>-Schaufel</li>`}${SLOT_IDS.map(s => pieceLine(s, g[s])).join('')}</ul>`;
};
const rankTag = r => { const k = rankOf(r); return `<span class="arank" style="--c:${k.col}">${C.esc(k.name)}</span>`; };

/* ---------- Halle ---------- */
export async function arenaHub(msg = '') {
  const a = A0(), D = C.D, k = rankOf(a.rating), next = RANKS.find(x => x.min > a.rating);
  C.setMenu('arena');
  const cards = [...ARENAS.map(ar => `<button class="acard ${a.pick === ar.id ? 'on' : ''}" data-ar="pick" data-id="${ar.id}"><canvas data-map="${ar.id}"></canvas><span><b>${C.esc(ar.name)}</b><small>${C.esc(ar.sub)}</small><em>${C.esc(ar.desc)}</em></span></button>`),
    `<button class="acard rnd ${a.pick === 'zufall' ? 'on' : ''}" data-ar="pick" data-id="zufall"><span><b>Zufall</b><small>Das Los wählt den Ort</small></span></button>`].join('');
  C.show(`<div class="panel arena">
    <div class="top"><button class="back" data-a="title">‹</button><h2>Schatten-Arena</h2><span class="gems">${C.ic('gem')} ${D.gems.toLocaleString('de-CH')}</span></div>
    <div class="ahead">
      <canvas class="ahero" data-g='${JSON.stringify(myGear())}' data-face="1"></canvas>
      <div class="arankbox" style="--c:${k.col}">
        <small>Dein Rang</small><b>${C.esc(k.name)}</b>
        <span class="arating">${a.rating}</span>
        <div class="abar"><i style="width:${next ? Math.round((a.rating - k.min) / (next.min - k.min) * 100) : 100}%"></i></div>
        <small>${next ? `${next.min - a.rating} bis ${C.esc(next.name)}` : 'Höchster Rang'}</small>
      </div>
    </div>
    <div class="arow3"><span><b>${a.wins}</b><small>Siege</small></span><span><b>${a.losses}</b><small>Niederlagen</small></span><span><b>${a.streak}</b><small>Serie</small></span></div>
    <div class="ashade"><b>Dein Schatten</b><p id="shadeinfo">${online() ? (a.shadeId ? `Er kämpft für dich, während du fort bist${a.shadeW != null ? ` · ${a.shadeW} Siege, ${a.shadeL} Niederlagen` : ''}.` : 'Wird nach dem ersten Kampf in die Arena gerufen.') : 'Ohne Netz kämpfst du gegen die Wächter der Arena.'} Er trägt deine Ausrüstung und kämpft, wie du kämpfst.</p></div>
    <h3 class="ah3">Kampfplatz</h3>
    <div class="acards">${cards}</div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <button class="big play" data-ar="seek">Gegner suchen<small>Regeln: zwei Siegrunden · ab 45 s rückt die Schattenwand vor</small></button>
  </div>`);
  for (const cv of document.querySelectorAll('[data-map]')) drawMap(cv, arenaById(cv.dataset.map));
  heroLoop('.ahero');
  upload();
  const news = await shadeNews();
  if (news && C.inMenu('arena')) {
    const n = news.nw + news.nl;
    C.toast('Dein Schatten hat gekämpft', `${news.nw} von ${n} ${n === 1 ? 'Kampf' : 'Kämpfen'} gewonnen, während du fort warst.`, 'ach');
    const el = document.getElementById('shadeinfo'); if (el) el.textContent = `Er kämpft für dich, während du fort bist · ${a.shadeW} Siege, ${a.shadeL} Niederlagen. Er trägt deine Ausrüstung und kämpft, wie du kämpfst.`;
  }
}

/* ---------- Gegnerwahl ---------- */
let foe = null, skipped = new Set(), pool = null, poolAt = 0;
async function seek() {
  const a = A0();
  C.show('<div class="panel arena small"><h2>Die Arena ruft …</h2><p class="msg">Ein Schatten tritt aus dem Nebel.</p></div>');
  if (!pool || Date.now() - poolAt > 120000) {
    const real = (await arenaShades(a.rating)).filter(s => s.id !== a.shadeId).map(s => ({ id: 's' + s.id, sid: s.id, name: s.name, rating: s.rating, wins: s.wins, losses: s.losses, gear: cleanGear(s.gear), style: cleanStyle(s.style) }));
    pool = [...real, ...WARDENS]; poolAt = Date.now();
  }
  foe = pickOpponent(pool, a.rating, Math.random, skipped);
  if (!foe) { skipped.clear(); foe = pickOpponent(pool, a.rating, Math.random, skipped); }
  versus();
}
function versus() {
  const a = A0(), f = foe, me = myGear();
  const win = eloDelta(a.rating, f.rating, 1, a.games), lose = eloDelta(a.rating, f.rating, 0, a.games);
  C.show(`<div class="panel arena vs">
    <div class="top"><button class="back" data-ar="hub">‹</button><h2>Duell</h2><span></span></div>
    <div class="vsrow">
      <div class="vside me"><canvas class="vhero" data-g='${JSON.stringify(me)}' data-face="1"></canvas><b>${C.esc(myName())}</b>${rankTag(a.rating)}<small>${a.rating}</small></div>
      <div class="vsx">VS</div>
      <div class="vside foe"><canvas class="vhero" data-g='${JSON.stringify(f.gear)}' data-face="-1"></canvas><b>${C.esc(f.name)}</b>${rankTag(f.rating)}<small>${f.rating}${f.warden ? ' · Wächter' : ' · Schatten'}</small></div>
    </div>
    <div class="vgear">${gearList(me)}${gearList(f.gear)}</div>
    <p class="vstake">Sieg <b class="up">+${win}</b> · Niederlage <b class="down">${lose}</b></p>
    <button class="big play" data-ar="fight">Kämpfen</button>
    <button data-ar="reroll">Anderer Gegner</button>
  </div>`);
  heroLoop('.vhero');
}
function fight() {
  const a = A0();
  const ar = a.pick === 'zufall' ? ARENAS[Math.floor(Math.random() * ARENAS.length)] : arenaById(a.pick);
  C.startMatch({ arena: ar.id, meGear: myGear(), foe: { ...foe }, seed: 1 + Math.floor(Math.random() * 1e9), skill: skillOf(foe.rating), autoPogo: C.D.autoPogo !== false });
}

/* ---------- Ergebnis ---------- */
export function arenaResult(res) {
  const a = A0(), D = C.D, f = foe, before = a.rating, kBefore = rankOf(before);
  const score = res.draw ? 0.5 : res.won ? 1 : 0, d = eloDelta(a.rating, f.rating, score, a.games);
  a.rating = Math.max(0, a.rating + d); a.games++; a.best = Math.max(a.best, a.rating);
  if (res.won) { a.wins++; a.streak++; a.bestStreak = Math.max(a.bestStreak, a.streak); } else if (res.draw) { a.draws++; } else { a.losses++; a.streak = 0; }
  // Stil lernen: der eigene Schatten kämpft künftig ähnlich
  const st = cleanStyle(res.style); for (const k of ['aggr', 'pogo', 'air']) a.style[k] = Math.round((a.style[k] * 0.7 + st[k] * 0.3) * 1000) / 1000;
  let gems = res.won ? 60 + 15 * Math.min(5, a.streak - 1) : res.draw ? 30 : 15, bonus = '';
  if (res.won && a.dayWin !== C.today()) { a.dayWin = C.today(); bonus = C.grantKey('eisen', 1, 'Erster Arenasieg des Tages'); }
  D.gems += gems; D.earned = (D.earned || 0) + gems;
  C.save.write();
  if (f.sid) arenaReport(a.token, f.sid, !res.won && !res.draw);
  upload(true);
  const k = rankOf(a.rating), up = k.min > kBefore.min, down = k.min < kBefore.min;
  C.setMenu('arena');
  C.show(`<div class="panel arena result ${res.won ? 'won' : res.draw ? 'draw' : 'lost'}">
    <div class="rhead">${res.won ? 'SIEG' : res.draw ? 'GLEICHSTAND' : 'NIEDERLAGE'}</div>
    <p class="rsub">gegen ${C.esc(f.name)} · ${res.score[0]} : ${res.score[1]}</p>
    <div class="rrating"><span class="arating" id="rnum">${before}</span><b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</b></div>
    ${up ? `<p class="rrank" style="--c:${k.col}">Neuer Rang: <b>${C.esc(k.name)}</b></p>` : down ? `<p class="rrank" style="--c:${k.col}">Abgestiegen: ${C.esc(k.name)}</p>` : rankTag(a.rating)}
    <p class="rgems">${C.ic('gem')} +${gems}${res.won && a.streak > 1 ? ` · Serie ${a.streak}` : ''}</p>
    ${bonus}
    <p class="rstat">${res.stats.dealt} Schaden ausgeteilt · ${res.stats.taken} eingesteckt${res.stats.pogoHits ? ` · ${res.stats.pogoHits}× Schaufel-Sprung getroffen` : ''}</p>
    <button class="big play" data-ar="rematch">Revanche</button>
    <button data-ar="seek">Neuer Gegner</button>
    <button data-ar="hub">Zur Arena</button>
  </div>`);
  C.sfx(res.won ? 'legend' : 'poof');
  if (up) setTimeout(() => { C.sfx('achieve'); C.moment('NEUER RANG', k.name.toUpperCase(), 'gold', 3.4); }, 900);
  // Wertung zählt hoch
  const el = document.getElementById('rnum'), t0 = performance.now();
  const run = now => { if (!el.isConnected) return; const q = Math.min(1, (now - t0) / 1100); el.textContent = Math.round(before + d * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(run); };
  setTimeout(() => requestAnimationFrame(run), 500);
}

export function arenaClick(b) {
  const a = A0();
  switch (b.dataset.ar) {
    case 'hub': C.sfx('click'); arenaHub(); return true;
    case 'pick': a.pick = b.dataset.id; C.save.write(); C.sfx('click'); for (const c of document.querySelectorAll('.acard')) c.classList.toggle('on', c === b); return true;
    case 'seek': C.sfx('click'); seek(); return true;
    case 'reroll': C.sfx('click'); if (foe) skipped.add(foe.id); if (skipped.size > 6) skipped.clear(); seek(); return true;
    case 'fight': C.sfx('charge'); fight(); return true;
    case 'rematch': if (foe) { C.sfx('charge'); fight(); } return true;
  }
  return false;
}

/* ---------- Anzeige im Kampf (über dem Spielbild) ---------- */
export function arenaHud(x, m, R, W, H) {
  const A = m.A, B = m.B, cam = R.cam, t = R.t;
  // Schattenwand
  const z = m.zone();
  if (z) {
    for (const [from, to, dir] of [[0, z.l, 1], [z.r, 21 * 16, -1]]) {
      const a = from - cam.x, b = to - cam.x;
      if (b < 0 && dir > 0 || a > W && dir < 0) continue;
      x.fillStyle = 'rgba(12,0,18,0.72)'; x.fillRect(Math.max(0, a), 0, Math.min(W, b) - Math.max(0, a), H);
      const edge = dir > 0 ? b : a;
      for (let k = 0; k < H; k += 3) { x.fillStyle = (k + t) % 9 < 3 ? '#9a2ad8' : '#3a0a50'; x.fillRect(Math.round(edge - (dir > 0 ? 2 : 0) + Math.sin((k + t) / 5) * 1.5), k, 2, 2); }
    }
  }
  // Gegner ausserhalb des Bildes: Pfeil am Rand
  const fx = B.p.x + 5 - cam.x, fy = B.p.y + 7 - cam.y;
  if (!B.p.dead && (fx < 0 || fx > W)) {
    const ex = fx < 0 ? 4 : W - 4, ey = Math.max(30, Math.min(H - 20, fy)), s = fx < 0 ? 1 : -1;
    x.fillStyle = '#ff5a4a'; x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + s * 7, ey - 5); x.lineTo(ex + s * 7, ey + 5); x.fill();
  }
  // Gegner: Name und Herzen oben rechts
  // Platz für den Pausenknopf oben rechts lassen
  const sc = (x.canvas.clientWidth || W) / W, RX = W - Math.ceil(56 / sc);
  const per = W < 220 ? 6 : 10, n = B.p.maxhp, cols = Math.min(per, n), bw = cols * 8 + 6;
  const bx = RX - bw - 4;
  const pg = x.createLinearGradient(RX, 0, bx - 10, 0); pg.addColorStop(0, 'rgba(30,4,6,0.85)'); pg.addColorStop(1, 'rgba(30,4,6,0.15)');
  x.fillStyle = pg; x.fillRect(bx - 6, 2, bw + 8, 22 + Math.floor((n - 1) / per) * 7);
  S.drawText(x, (m.o.foe.name || 'Schatten').toUpperCase(), RX - 6, 5, '#ff8a8a', 1, 'right');
  for (let i = 0; i < n; i++) x.drawImage(S.heart(i < B.p.hp), RX - 6 - (cols - (i % per)) * 8 + 1, 14 + Math.floor(i / per) * 7);
  // Runden und Zeit (Mitte oben)
  const cxm = Math.round(W / 2), py = W < 300 ? 36 : 4;
  for (let i = 0; i < 2; i++) {
    const on1 = m.score[0] > i, on2 = m.score[1] > i;
    x.fillStyle = '#140c1c'; x.fillRect(cxm - 14 - i * 7, py, 6, 6); x.fillRect(cxm + 8 + i * 7, py, 6, 6);
    x.fillStyle = on1 ? '#ffd84a' : '#3a3020'; x.fillRect(cxm - 13 - i * 7, py + 1, 4, 4);
    x.fillStyle = on2 ? '#ff5a4a' : '#3a2020'; x.fillRect(cxm + 9 + i * 7, py + 1, 4, 4);
  }
  if (m.state === 'fight') {
    const left = Math.max(0, Math.ceil((ROUND.sudden - m.fightT) / 60));
    S.drawText(x, left > 0 ? String(left) : 'WAND', cxm, py + 9, left > 0 && left <= 5 ? '#ff8a8a' : left > 0 ? '#e8d6b0' : '#c58bff', 1, 'center');
  }
  // Ansagen
  const big = (txt, sub, col) => {
    const y = Math.round(H * 0.36);
    x.fillStyle = 'rgba(5,4,3,0.55)'; x.fillRect(0, y - 8, W, 34);
    x.fillStyle = col; x.fillRect(0, y - 8, W, 1); x.fillRect(0, y + 25, W, 1);
    S.drawText(x, txt, cxm + 1, y + 1, '#140c1c', 2, 'center'); S.drawText(x, txt, cxm, y, col, 2, 'center');
    if (sub) S.drawText(x, sub, cxm, y + 16, '#e8d6b0', 1, 'center');
  };
  if (m.state === 'intro') {
    const ar = m.o.arena;
    if (m.t < 70) big(`RUNDE ${m.round + 1}`, m.round === 0 ? ar.name.toUpperCase() : `${m.score[0]} : ${m.score[1]}`, '#d4b46a');
    else big('KAMPF!', '', '#ffe6a0');
  } else if (m.state === 'outro') {
    const w = m.roundWinner;
    if (m.over || m.t > 20) big(w === 1 ? 'RUNDE GEWONNEN' : w === 2 ? 'RUNDE VERLOREN' : 'UNENTSCHIEDEN', `${m.score[0]} : ${m.score[1]}`, w === 1 ? '#ffd84a' : w === 2 ? '#ff5a4a' : '#c8beb0');
  } else if (m.fightT >= ROUND.sudden && m.fightT < ROUND.sudden + 90) big('SCHATTENWAND', 'Die Mauern nahen', '#c58bff');
}
