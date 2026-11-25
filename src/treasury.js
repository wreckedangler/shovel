// Schatzkammer: Truhen kaufen und öffnen, Sammlung (Relikte und Aussehen).
import { CHESTS, RAR, PITY, RELICS, COSMETICS, ITEMS, itemById, openChest, RELIC_ART, RELIC_PAL } from './loot.js';

let C; // Kontext aus main.js: { D, save, sfx, haptic, show, ic, serifImg, S, R, esc, back, checkAch }
export function initTreasury(ctx) { C = ctx; }

/* ---------- Pixel-Truhe ---------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = v => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
// Zeichnet eine 28×22-Truhe mit der Unterkante bei (cx, by). lid: Deckelöffnung 0..1, light: Farbe des Lichts aus den Ritzen
export function drawChest(x, cx, by, ch, lid = 0, light = null, crack = 0) {
  const K = '#0b0907', L = Math.round(cx - 14), B = Math.round(by);
  const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(L + a, B + b, w, h); };
  // Körper
  px(0, -13, 28, 13, K); px(1, -12, 26, 11, ch.dark); px(1, -12, 26, 3, ch.col); px(1, -9, 26, 1, shade(ch.dark, 0.7));
  for (let i = 3; i < 26; i += 5) px(i, -8, 1, 6, shade(ch.dark, 0.8));
  px(4, -13, 3, 13, K); px(5, -12, 1, 11, ch.band); px(21, -13, 3, 13, K); px(22, -12, 1, 11, ch.band);
  // Ritzen leuchten
  if (light && crack > 0) {
    x.globalAlpha = Math.min(1, crack);
    px(1, -13, 26, 1, light); if (crack > 0.5) { px(8, -11, 1, 4, light); px(17, -10, 1, 5, light); } if (crack > 0.8) { px(12, -8, 1, 6, light); px(25, -11, 1, 3, light); }
    x.globalAlpha = 1;
  }
  // Deckel
  const lo = Math.round(lid * 5), lx = 0;
  x.save(); x.translate(L + 14 + lx, B - 13 - lo); x.rotate(-lid * 0.42); x.translate(-14, 0);
  const q = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  q(0, -9, 28, 10, K); q(2, -10, 24, 1, K); q(1, -8, 26, 8, ch.col); q(2, -9, 24, 2, shade(ch.col, 1.35)); q(1, -2, 26, 2, ch.dark);
  q(4, -10, 3, 11, K); q(5, -9, 1, 9, ch.band); q(21, -10, 3, 11, K); q(22, -9, 1, 9, ch.band);
  q(11, -3, 6, 6, K); q(12, -2, 4, 4, '#ffd84a'); q(13, 0, 2, 2, K);
  x.restore();
}
function chestCanvas(ch, scale = 3) {
  const c = document.createElement('canvas'); c.width = 32 * scale; c.height = 28 * scale;
  const t = document.createElement('canvas'); t.width = 32; t.height = 28; drawChest(t.getContext('2d'), 16, 26, ch);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, c.width, c.height); return c;
}

/* ---------- Symbole der Gegenstände ---------- */
const iconCache = new Map();
export function itemIcon(id, scale = 3, sil = false) {
  const key = id + scale + sil; if (iconCache.has(key)) return iconCache.get(key);
  const it = itemById(id), t = document.createElement('canvas'); t.width = 20; t.height = 20;
  const x = t.getContext('2d');
  if (it.kind === 'relikt') {
    const art = RELIC_ART[id];
    art.forEach((row, y) => [...row].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = RELIC_PAL[ch]; x.fillRect(1 + i * 2, 2 + y * 2, 2, 2); } }));
  } else {
    const old = C.R.x, oldT = C.R.t; C.R.x = x; C.R.t = 8;
    if (it.kind === 'aura') { const g = x.createRadialGradient(10, 11, 1, 10, 11, 10); g.addColorStop(0, `rgba(${it.col},.9)`); g.addColorStop(1, `rgba(${it.col},0)`); x.fillStyle = g; x.fillRect(0, 0, 20, 20); }
    if (it.kind === 'spur') {
      const cols = { 'spur-blaetter': ['#d0702a', '#e8a838'], 'spur-funken': ['#fff2a0', '#ff8a2a'], 'spur-sterne': ['#ffffff', '#9ad8ff'], 'spur-flammen': ['#ff9a2a', '#c03010'], 'spur-schatten': ['#3a2458', '#1a0e28'], 'spur-regenbogen': ['#ff4f7a', '#ffd84a', '#4fd2ff', '#7dffa0', '#c58bff'] }[id];
      // geschwungener Pfad aus Partikeln, nach rechts dichter und grösser
      for (let i = 0; i < 26; i++) { const t = i / 25, px = 1 + t * 17, py = 15 - t * 9 + Math.sin(t * 7) * 2.5, sz = t > 0.6 ? 2 : 1; x.globalAlpha = 0.35 + t * 0.65; x.fillStyle = cols[i % cols.length]; x.fillRect(Math.round(px), Math.round(py), sz, sz); }
      x.globalAlpha = 1;
    } else {
    if (it.filter) x.filter = it.filter;
    C.R.figure(C.S.hero(Math.max(C.D.armor, 2), Math.max(C.D.shovel, 2), null), 6, 3, 1, 0, 0, 8);
    x.filter = 'none'; }
    C.R.x = old; C.R.t = oldT;
  }
  if (sil) { x.globalCompositeOperation = 'source-in'; x.fillStyle = '#3a3020'; x.fillRect(0, 0, 20, 20); }
  const c = document.createElement('canvas'); c.width = 20 * scale; c.height = 20 * scale;
  const o = c.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(t, 0, 0, c.width, c.height);
  iconCache.set(key, c); return c;
}
const canvasImg = (cv, cls = '') => `<img class="pxim ${cls}" src="${cv.toDataURL()}" width="${cv.width}" height="${cv.height}" alt="">`;

/* ---------- Schatzkammer ---------- */
export function treasury(msg = '') {
  const { D, ic, esc } = C;
  const card = ch => {
    const keys = D.keys[ch.id] || 0, can1 = keys > 0 || (!ch.keyOnly && D.gems >= ch.price), price10 = ch.price * 9;
    return `<div class="chestcard rar-${ch.id}" style="--cc:${ch.col}">
      <div class="chimg">${canvasImg(chestCanvas(ch, 3))}</div>
      <div class="chinfo"><b>${C.serifImg(ch.name, 11, ch.id === 'urlicht' ? 'pale' : 'gold', 2)}</b>
        <div class="odds">${ch.odds.map((o, k) => o ? `<span style="color:${RAR[k].col}">${RAR[k].name} ${o}%</span>` : '').join('')}</div>
        ${ch.up ? `<small class="upn">${Math.round(ch.up * 100)}% Chance auf Aufwertung beim Öffnen</small>` : '<small class="upn">Nur mit Schlüssel. Bosse und Rekorde bringen ihn.</small>'}
        <div class="chbtns">
          ${keys ? `<button class="big" data-t="open" data-c="${ch.id}" data-key="1">${ic('lock')} Schlüssel · ${keys}</button>` : ''}
          ${!ch.keyOnly ? `<button class="${!keys && D.gems >= ch.price ? 'big' : D.gems >= ch.price ? '' : 'off'}" data-t="open" data-c="${ch.id}">${ic('gem')} ${ch.price}</button>` : ''}
          ${ch.multi ? `<button class="${D.gems >= price10 ? '' : 'off'}" data-t="open10" data-c="${ch.id}">10× ${ic('gem')} ${price10}</button>` : ''}
          ${!can1 && ch.keyOnly ? '<span class="lockt">Kein Schlüssel</span>' : ''}
        </div></div></div>`;
  };
  C.show(`<div class="panel">
    <div class="top"><button class="back" data-a="${C.back()}">‹</button><h2>Schatzkammer</h2><span class="gems">${ic('gem')} ${D.gems} · ${ic('dia')} ${D.shards}</span></div>
    <div class="pity"><span>Legendär garantiert in <b>${PITY - D.loot.pity}</b> Öffnungen</span><div class="bar"><i style="width:${D.loot.pity / PITY * 100}%"></i></div></div>
    <div class="chests">${CHESTS.map(card).join('')}</div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <p class="note">Doppelte Gegenstände und volle Relikte werden zu Splittern ${ic('dia')}. Mit Splittern schmiedest du die Stufen 7 bis 12. Fehlende Gegenstände fallen doppelt so oft wie Duplikate. 10 Truhen kosten so viel wie 9.</p>
    <div class="row"><button data-a="collection">${ic('rune')} Sammlung</button></div>
  </div>`);
}

/* ---------- Öffnen ---------- */
let busy = false;
export function treasuryClick(b) {
  if (busy) return true;
  const t = b.dataset.t; if (t !== 'open' && t !== 'open10') return false;
  const { D } = C, ch = CHESTS.find(c => c.id === b.dataset.c);
  if (t === 'open') {
    if (b.dataset.key && D.keys[ch.id] > 0) D.keys[ch.id]--;
    else if (!ch.keyOnly && D.gems >= ch.price) D.gems -= ch.price;
    else { C.sfx('nope'); return true; }
    const r = openChest(D, ch.id); C.save.write(); revealOne(r, ch.id);
  } else if (t === 'open10') {
    if (D.gems < ch.price * 9) { C.sfx('nope'); return true; }
    D.gems -= ch.price * 9;
    const rs = Array.from({ length: 10 }, () => openChest(D, ch.id)); C.save.write(); revealMany(rs, ch.id);
  }
  return true;
}

function statusLine(r) {
  const it = itemById(r.item);
  if (r.isNew) return `<span class="new">NEU</span>`;
  if (r.levelUp) return `<span class="lvl">Stufe ${r.levelUp}</span> · ${C.esc(it.desc(r.levelUp))}`;
  return `Doppelt · <span class="shd">+${r.shards} Splitter</span>`;
}
function itemDesc(it, r) {
  if (it.kind === 'relikt') return C.esc(it.desc(C.D.relics[it.id] || 1));
  return { spur: 'Spur hinter dem Helden', farbe: 'Färbung des Helden', aura: 'Leuchtende Aura' }[it.kind];
}

// Einzelöffnung mit voller Inszenierung
function revealOne(r, fromId) {
  busy = true;
  const { sfx, haptic } = C, rar = RAR[r.rar], it = itemById(r.item);
  let ch = CHESTS.find(c => c.id === fromId);
  const el = document.createElement('div'); el.className = 'reveal loot';
  el.innerHTML = `<canvas width="120" height="96"></canvas><div class="rcard lootcard" hidden></div><div class="skip">Tippen zum Überspringen</div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('canvas'), x = cv.getContext('2d'), card = el.querySelector('.lootcard');
  const fit = () => { const s = Math.max(2, Math.floor(Math.min(innerWidth * 0.95 / 120, innerHeight * 0.5 / 96))); cv.style.width = 120 * s + 'px'; cv.style.height = 96 * s + 'px'; };
  fit();
  // Ablauf (Frames): Fall 0–24 · Aufwertung 40–80 · Klopfer · Aufbruch · Gegenstand
  const knocks = r.rar === 3 ? 4 : 3, up = r.upgraded ? 50 : 0, kStart = 40 + up, kGap = 30;
  const burstAt = kStart + knocks * kGap + (r.rar === 3 ? 34 : 10);
  let f = 0, parts = [], shown = false, done = false, step = 0;
  const lightAt = k => RAR[Math.min(k, r.rar)].col;
  const finish = () => {
    if (shown) return; shown = true; f = Math.max(f, burstAt + 1);
    card.hidden = false;
    card.style.setProperty('--rc', rar.col); card.style.setProperty('--rg', rar.glow);
    card.innerHTML = `<p class="rar">${r.pity ? 'Garantie eingelöst · ' : ''}${rar.name}${it.kind === 'relikt' ? 'es Relikt' : ''}</p>
      <div class="lic">${canvasImg(itemIcon(it.id, 4))}</div>
      ${C.serifImg(it.name, it.name.length > 14 ? 12 : 14, ['pale', 'pale', 'pale', 'gold'][r.rar], 2, 'rname')}
      <p class="ldesc">${itemDesc(it, r)}</p><p class="lstat">${statusLine(r)}</p>
      <div class="row"><button class="big" data-l="again">Noch eine</button><button data-l="close">Zur Schatzkammer</button></div>`;
    el.querySelector('.skip').hidden = true;
  };
  const loop = () => {
    if (!el.isConnected) return;
    f++;
    x.imageSmoothingEnabled = false; x.clearRect(0, 0, 120, 96);
    // Lichtkegel von oben
    const lg = x.createRadialGradient(60, 0, 4, 60, 30, 90); lg.addColorStop(0, 'rgba(212,180,106,0.25)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = lg; x.fillRect(0, 0, 120, 96);
    let cy = 86, sx = 0, crack = 0, lidOpen = 0;
    if (f < 24) { const t = f / 24; cy = -20 + (86 + 20) * t * t; }
    else if (f < 32) cy = 86 - Math.sin((f - 24) / 8 * Math.PI) * 4;
    if (f === 24) { sfx('thud'); haptic('thud'); }
    // Aufwertung
    if (r.upgraded) {
      if (f > 40 && f < 40 + up) { sx = Math.sin(f * 1.3) * 2; crack = (f - 40) / up; }
      if (f === 40 + up - 4) { ch = CHESTS[CHESTS.findIndex(c => c.id === fromId) + 1]; sfx('upgrade'); haptic('unlock'); for (let i = 0; i < 40; i++) parts.push(spark(60, 76, '#ffffff', 3)); }
    }
    // Klopfer mit Farbsteigerung
    for (let k = 0; k < knocks; k++) {
      const t0 = kStart + k * kGap + (k === knocks - 1 && r.rar === 3 ? 24 : 0);
      if (f === t0) { step = k; sfx('knock', k); haptic('hit'); if (k > 0 && k <= r.rar) sfx('rarStep', Math.min(k, r.rar)); for (let i = 0; i < 6 + k * 4; i++) parts.push(spark(60 + (Math.random() - 0.5) * 24, 76, lightAt(k), 1.4)); }
      if (f >= t0 && f < t0 + 10) sx = Math.sin((f - t0) * 2.2) * (2 + k) * (1 - (f - t0) / 10);
    }
    if (f >= kStart) crack = Math.max(crack, Math.min(1, (step + 1) / knocks + (f - kStart) / 400));
    // Legendär: Spannungspause, alles wird dunkel und golden
    if (r.rar === 3 && f > kStart + (knocks - 1) * kGap && f < burstAt) { x.fillStyle = `rgba(255,200,80,${0.08 + Math.sin(f / 3) * 0.04})`; x.fillRect(0, 0, 120, 96); sx = Math.sin(f * 2.7) * 1.2; }
    if (f === burstAt) { sfx('burst', r.rar); sfx(r.rar >= 2 ? 'legend' : 'chestRare', 1); haptic(r.rar === 3 ? 'bossDie' : r.rar === 2 ? 'unlock' : 'chest'); for (let i = 0; i < 40 + r.rar * 40; i++) parts.push(spark(60, 70, Math.random() < 0.7 ? rar.col : '#fff2cf', 2 + r.rar)); }
    if (f >= burstAt) lidOpen = Math.min(1, (f - burstAt) / 8);
    // Strahlen nach dem Aufbruch
    if (f >= burstAt) {
      x.save(); x.translate(60, 68); const n = 8 + r.rar * 2;
      for (let i = 0; i < n; i++) { x.rotate(Math.PI * 2 / n); x.fillStyle = rar.col; x.globalAlpha = 0.12 + 0.06 * Math.sin(f / 9 + i); x.beginPath(); x.moveTo(0, 0); x.lineTo(80, -7); x.lineTo(80, 7); x.fill(); }
      x.restore(); x.globalAlpha = 1;
    }
    drawChest(x, 60 + sx, cy, ch, lidOpen, lightAt(step), crack);
    // Gegenstand steigt auf
    if (f >= burstAt) { const ic = itemIcon(it.id, 1), t = Math.min(1, (f - burstAt) / 30), y = 62 - t * 38 + Math.sin(f / 14) * 1.5; x.save(); x.shadowColor = rar.col; x.shadowBlur = 8; x.drawImage(ic, 50, Math.round(y) - 10); x.restore(); }
    for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.06; q.life--; x.globalAlpha = Math.max(0, q.life / q.max); x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
    x.globalAlpha = 1; parts = parts.filter(q => q.life > 0);
    if (f === burstAt + 34) finish();
    if (!done) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-l]');
    if (!shown) { finish(); return; }
    if (!a) return;
    done = true; el.remove(); busy = false;
    if (a.dataset.l === 'again') {
      const D = C.D, src = CHESTS.find(c => c.id === fromId);
      if (D.keys[src.id] > 0) { D.keys[src.id]--; } else if (!src.keyOnly && D.gems >= src.price) D.gems -= src.price;
      else { C.sfx('nope'); return treasury('Nicht genug Edelsteine für eine weitere Truhe.'); }
      const nr = openChest(D, src.id); C.save.write(); treasury(); return revealOne(nr, src.id);
    }
    C.checkAch(); treasury();
  });
  treasury();
}
function spark(x, y, c, spd) { const a = Math.random() * Math.PI * 2, v = Math.random() * spd; const life = 30 + Math.random() * 30; return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.6, c, life, max: life, s: Math.random() < 0.3 ? 2 : 1 }; }

// Zehnerpack: Karten decken sich nacheinander auf, die beste kommt zuletzt
function revealMany(rs, fromId) {
  busy = true;
  const order = rs.map((r, i) => ({ r, i })).sort((a, b) => a.r.rar - b.r.rar).map(o => o.r);
  const el = document.createElement('div'); el.className = 'reveal loot many';
  const ch = CHESTS.find(c => c.id === fromId), chImg = canvasImg(chestCanvas(ch, 2));
  el.innerHTML = `<div class="manyin"><p class="rar">10 × ${C.esc(ch.name)}</p><div class="lgrid">${order.map((r, k) => `<div class="lc" data-k="${k}" style="--rc:${RAR[r.rar].col};--rg:${RAR[r.rar].glow}"><div class="back">${chImg}</div></div>`).join('')}</div>
    <div class="rcard lsum" hidden></div><div class="skip">Tippen zum Überspringen</div></div>`;
  document.body.appendChild(el);
  const cards = [...el.querySelectorAll('.lc')];
  let k = 0, timer = 0, finished = false;
  const flip = () => {
    if (k >= order.length) return end();
    const r = order[k], it = itemById(r.item), c = cards[k];
    c.classList.add('open', 'r' + r.rar);
    c.innerHTML = `${canvasImg(itemIcon(it.id, 2))}<b>${C.esc(it.name)}</b><small>${r.isNew ? '<span class="new">NEU</span>' : r.levelUp ? `Stufe ${r.levelUp}` : `+${r.shards} ${C.ic('dia')}`}</small>`;
    C.sfx(r.rar >= 2 ? 'burst' : 'rarStep', r.rar); if (r.rar >= 2) C.haptic(r.rar === 3 ? 'bossDie' : 'unlock'); else C.haptic('hit');
    if (r.upgraded) c.classList.add('upg');
    k++;
    const next = order[k];
    timer = setTimeout(flip, next ? (next.rar === 3 ? 1300 : next.rar === 2 ? 800 : 320) : 500);
  };
  const end = () => {
    if (finished) return; finished = true; clearTimeout(timer);
    while (k < order.length) { const r = order[k], it = itemById(r.item); cards[k].classList.add('open', 'r' + r.rar); cards[k].innerHTML = `${canvasImg(itemIcon(it.id, 2))}<b>${C.esc(it.name)}</b><small>${r.isNew ? '<span class="new">NEU</span>' : r.levelUp ? `Stufe ${r.levelUp}` : `+${r.shards} ${C.ic('dia')}`}</small>`; k++; }
    const nNew = rs.filter(r => r.isNew).length, sh = rs.reduce((a, r) => a + (r.shards || 0), 0), best = Math.max(...rs.map(r => r.rar));
    const s = el.querySelector('.lsum'); s.hidden = false;
    s.innerHTML = `<p>${nNew} neu · ${rs.filter(r => r.levelUp).length} aufgestuft · +${sh} Splitter · beste: <b style="color:${RAR[best].col}">${RAR[best].name}</b></p><div class="row"><button class="big" data-l="close">Weiter</button></div>`;
    el.querySelector('.skip').hidden = true;
  };
  C.sfx('thud'); timer = setTimeout(flip, 600);
  el.addEventListener('click', e => {
    if (!finished) { end(); return; }
    if (e.target.closest('[data-l]')) { el.remove(); busy = false; C.checkAch(); treasury(); }
  });
  treasury();
}

/* ---------- Sammlung ---------- */
export function collection(msg = '') {
  const { D, ic, esc } = C;
  const slots = D.relicSlots.map((id, i) => id
    ? `<button class="slot on" data-t="unslot" data-i="${i}">${canvasImg(itemIcon(id, 3))}<small>${esc(itemById(id).name)}</small><em>Stufe ${D.relics[id]}</em></button>`
    : `<div class="slot"><small>leerer Platz</small></div>`).join('');
  const relic = r => {
    const l = D.relics[r.id] || 0, on = D.relicSlots.includes(r.id);
    return l ? `<button class="icard r${r.rar} ${on ? 'on' : ''}" data-t="slot" data-id="${r.id}">${canvasImg(itemIcon(r.id, 2))}<div><b>${esc(r.name)}</b><small>${esc(r.desc(l))}</small><span class="pips">${[1, 2, 3].map(k => `<i class="${k <= l ? 'on' : ''}"></i>`).join('')}</span></div></button>`
      : `<div class="icard r${r.rar} unk">${canvasImg(itemIcon(r.id, 2, true))}<div><b>???</b><small style="color:${RAR[r.rar].col}">${RAR[r.rar].name}</small></div></div>`;
  };
  const cos = kind => COSMETICS.filter(c => c.kind === kind).map(c => D.cosmetics[c.id]
    ? `<button class="icard r${c.rar} ${D.look[kind] === c.id ? 'on' : ''}" data-t="look" data-k="${kind}" data-id="${c.id}">${canvasImg(itemIcon(c.id, 2))}<div><b>${esc(c.name)}</b><small style="color:${RAR[c.rar].col}">${RAR[c.rar].name}</small></div></button>`
    : `<div class="icard r${c.rar} unk">${canvasImg(itemIcon(c.id, 2, true))}<div><b>???</b><small style="color:${RAR[c.rar].col}">${RAR[c.rar].name}</small></div></div>`).join('');
  const have = ITEMS.filter(i => i.kind === 'relikt' ? D.relics[i.id] : D.cosmetics[i.id]).length;
  C.show(`<div class="panel">
    <div class="top"><button class="back" data-a="treasury">‹</button><h2>Sammlung</h2><span class="gems">${have} / ${ITEMS.length} · ${ic('dia')} ${D.shards}</span></div>
    <h3 class="sub">Relikt-Plätze</h3><div class="slots">${slots}</div>
    <p class="note">Tippe ein Relikt an, um es anzulegen. Drei passen gleichzeitig. Doppelte Funde heben es bis Stufe 3.</p>
    <div class="igrid">${RELICS.map(relic).join('')}</div>
    <h3 class="sub">Spur</h3><div class="igrid">${cos('spur')}</div>
    <h3 class="sub">Färbung</h3><div class="igrid">${cos('farbe')}</div>
    <h3 class="sub">Aura</h3><div class="igrid">${cos('aura')}</div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
}
export function collectionClick(b) {
  const t = b.dataset.t, { D } = C; if (!t) return false;
  if (t === 'unslot') { D.relicSlots[+b.dataset.i] = null; }
  else if (t === 'slot') {
    const id = b.dataset.id, at = D.relicSlots.indexOf(id);
    if (at >= 0) D.relicSlots[at] = null;
    else { const free = D.relicSlots.indexOf(null); if (free < 0) { C.sfx('nope'); collection('Alle drei Plätze sind belegt. Lege zuerst ein Relikt ab.'); return true; } D.relicSlots[free] = id; }
  } else if (t === 'look') { const k = b.dataset.k; D.look[k] = D.look[k] === b.dataset.id ? null : b.dataset.id; }
  C.save.write(); C.sfx('click'); collection(); return true;
}
