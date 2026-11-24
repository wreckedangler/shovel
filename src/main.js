// Start, Hauptschleife und Menüs.
import { Game } from './game.js';
import { LEVELS, WORLDS, levelById } from './levels.js';
import { THEMES } from './themes.js';
import { TIERS, SHOVEL, ARMOR, PRICE, AVAILABLE } from './gear.js';
import { Renderer } from './render.js';
import { initInput, pollInput, clearInput, setStickMode } from './input.js';
import { unlockAudio, sfx, playMusic, stopMusic, setAudio } from './audio.js';
import { encodeGhost, decodeGhost, fmtTime } from './ghost.js';
import { save } from './save.js';
import { online, uploadGhost, topGhosts } from './online.js';
import * as S from './sprites.js';
import { WEAPONS, RARITY, weaponById } from './weapons.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canvas = $('#screen'), ctx = canvas.getContext('2d');
const ui = $('#ui'), touchEl = $('#touch'), pauseBtn = $('#pauseBtn');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const R = new Renderer(ctx);
let VH = 180, VW = 320;
const D = save.d;
setAudio(D.sfx, D.music);

let curCodes = [], mode = 'menu', game = null, ghosts = [], level = null, doneT = 0, menuT = 0;

// Auflösung je nach Gerät:
// Handy hochkant: Spielfeld oben (11 Kacheln breit), Steuerung darunter, nichts verdeckt.
// Handy quer: stärker gezoomt (9 Kacheln hoch), damit Figuren gross genug sind.
// Computer: 180 px hoch wie gehabt.
function resize() {
  const portrait = isTouch && innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  document.body.classList.toggle('touchdev', isTouch);
  let sc;
  if (portrait) {
    const ctrl = Math.round(Math.max(210, innerHeight * 0.3));
    const cssH = innerHeight - ctrl;
    VW = 160; VH = Math.max(150, Math.min(248, Math.round(VW * cssH / innerWidth)));
    sc = Math.min(innerWidth / VW, cssH / VH);
    document.documentElement.style.setProperty('--ch', Math.round(VH * sc) + 'px');
  } else {
    VH = isTouch ? 144 : 180;
    VW = Math.max(240, Math.min(isTouch ? 360 : 400, Math.round(VH * innerWidth / innerHeight)));
    sc = Math.min(innerWidth / VW, innerHeight / VH);
  }
  canvas.width = VW; canvas.height = VH; ctx.imageSmoothingEnabled = false;
  canvas.style.width = VW * sc + 'px'; canvas.style.height = VH * sc + 'px';
  R.resize(VW, VH);
}
addEventListener('resize', resize); resize();

initInput(touchEl, () => unlockAudio());
const applyControls = () => { setStickMode(!!D.stick); document.body.classList.toggle('stickmode', !!D.stick); };
applyControls();
addEventListener('pointerdown', () => unlockAudio(), { capture: true });
addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'play') pause(); else if (mode === 'pause') resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pause(); });
pauseBtn.addEventListener('click', () => mode === 'play' && pause());

/* ---------- Hauptschleife ---------- */
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { acc -= 1000 / 60; tick(); }
  draw();
  requestAnimationFrame(loop);
}
function tick() {
  if (mode !== 'play' && mode !== 'won') { menuT++; return; }
  const inp = mode === 'play' ? pollInput() : { };
  game.step(inp);
  for (const e of game.events) {
    sfx(e.name, e.v);
    haptic(e.name);
    if (e.name === 'unlock') unlockWeapon(e.v, true);
    if (e.name === 'chest' && e.v) { D.chests[e.v] = true; save.write(); if (Object.keys(D.chests).filter(k => k.startsWith('1-')).length >= 3) unlockWeapon('goldschaufel', true); }
    if (e.name === 'die') { D.deathsTotal++; save.write(); if (D.deathsTotal >= 20) unlockWeapon('seelenschaufel', true); }
  }
  if (game.done && mode === 'play') { mode = 'won'; doneT = 0; touchEl.hidden = true; pauseBtn.hidden = true; }
  if (mode === 'won' && ++doneT === 80) finish();
}
function draw() {
  if (game && mode !== 'menu') { R.draw(game, ghosts); return; }
  drawMenuBg();
}
function drawMenuBg() {
  const th = THEMES.karte, bg = S.backdrop(th, VH), t = menuT;
  ctx.drawImage(bg.sky, 0, 0, VW, VH);
  ctx.fillStyle = th.stars; for (const s of bg.stars) if ((t / 20 + s.p) % 6 > 1) ctx.fillRect(s.x % VW, s.y, 1, 1);
  for (const [img, f] of [[bg.far, 0.15], [bg.near, 0.4]]) { const ox = -Math.round(t * f) % img.width; for (let k = ox - img.width; k < VW; k += img.width) ctx.drawImage(img, k, 0); }
  const ts = S.tileset(th);
  for (let x = -1; x < VW / 16 + 1; x++) { const px = x * 16 - (t % 16); ctx.drawImage(ts.top[(x + 99 + Math.floor(t / 16)) % 3], px, VH - 20); ctx.drawImage(ts.fill[0], px, VH - 4); }
  const hs = S.hero(D.armor, D.shovel, D.weapon);
  R.x = ctx; R.figure(hs, 40, VH - 34, 1, 1, t, 8);
}

/* ---------- Spielen ---------- */
async function startLevel(id, ghostCodes = []) {
  level = levelById(id); curCodes = ghostCodes;
  game = new Game(level, { shovel: D.shovel, armor: D.armor, weapon: D.weapon }, { seed: 7 });
  ghosts = [];
  for (const c of ghostCodes) { const g = await decodeGhost(c); if (g && g.level === id) { g.own = c === D.ghosts[id]; ghosts.push(g); } }
  R.snapCamera(game);
  clearInput();
  hideUI(); mode = 'play';
  touchEl.hidden = !isTouch; pauseBtn.hidden = false;
  playMusic(THEMES[level.theme].music);
  goFullscreen();
}
function pause() { mode = 'pause'; touchEl.hidden = true; pauseBtn.hidden = true; sfx('click'); show(`
  <div class="panel small"><h2>Pause</h2>
  <button class="big" data-a="resume">Weiter</button>
  <button data-a="restart">Neu starten</button>
  <button data-a="map">Zur Karte</button>
  ${toggles()}</div>`); }
function resume() { hideUI(); clearInput(); mode = 'play'; touchEl.hidden = !isTouch; pauseBtn.hidden = false; }

async function finish() {
  const id = level.id, frames = game.frame, first = !D.cleared[id];
  const bonus = first ? (level.boss ? 300 : 100) : 0;
  // Sterne: geschafft · unter Zielzeit · ohne Tod. Jeder neue Stern bringt 50.
  const got = [true, frames <= level.par * 60, game.deaths === 0];
  const had = D.stars[id] || [false, false, false];
  const newStars = got.map((g, i) => g && !had[i]);
  D.stars[id] = had.map((h, i) => h || got[i]);
  const starGems = newStars.filter(Boolean).length * 50;
  const earned = game.gems + bonus + starGems;
  D.gems += earned; D.earned += earned; D.cleared[id] = true;
  const li = LEVELS.findIndex(l => l.id === id);
  D.unlocked = Math.max(D.unlocked, li + 2);
  const old = D.best[id], record = !old || frames < old;
  const code = await encodeGhost({ level: id, name: D.name || 'Ich', frames, gear: { shovel: D.shovel, armor: D.armor }, rec: game.rec });
  if (record) { D.best[id] = frames; D.ghosts[id] = code; }
  // Waffen-Bedingungen am Levelende
  if (id === '1-1' && game.kills === 0) unlockWeapon('federklinge');
  if (id === '1-1' && frames < 25 * 60) unlockWeapon('blitzspaten');
  if (id === '1-2' && game.dirtTotal > 0 && game.dirtLeft() === 0) unlockWeapon('erdfresser');
  if (ghosts.some(g => !g.own && g.frames - frames >= 120)) unlockWeapon('geisterklinge');
  save.write();
  let up = '';
  if (record && online() && D.name) up = (await uploadGhost({ level: id, name: D.name, frames, code })) ? 'Online hochgeladen.' : 'Online-Upload fehlgeschlagen.';
  stopMusic(); sfx('win');
  mode = 'result';
  const next = LEVELS[li + 1];
  const starLbl = ['Geschafft', `Unter ${level.par} s`, 'Ohne Tod'];
  show(`<div class="panel small result">
    <h2>${level.boss ? 'Boss besiegt!' : 'Geschafft!'}</h2>
    <p class="lvl">${esc(level.id)} · ${esc(level.name)}</p>
    <div class="starrow">${got.map((g, i) => `<div class="star ${D.stars[id][i] ? 'on' : ''} ${newStars[i] ? 'new' : ''}" style="--d:${0.35 + i * 0.35}s"><span>★</span><small>${starLbl[i]}</small></div>`).join('')}</div>
    <div class="stats">
      <div><small>Zeit</small><b>${fmtTime(frames)}</b>${record ? '<em>Neue Bestzeit!</em>' : `<em>Best ${fmtTime(old)}</em>`}</div>
      <div><small>Edelsteine</small><b id="tally">+0</b><em>${[bonus ? `${bonus} Erst-Bonus` : '', starGems ? `${starGems} Sterne` : ''].filter(Boolean).join(' · ')}</em></div>
      <div><small>Beste Kette</small><b>×${game.maxChain}</b></div>
    </div>
    ${ghosts.map(g => { const d = frames - g.frames; return `<p class="vs ${d <= 0 ? 'win' : 'lose'}">gegen ${esc(g.name)}: ${d <= 0 ? '−' : '+'}${(Math.abs(d) / 60).toFixed(2)} s</p>`; }).join('')}
    ${up ? `<p class="note">${up}</p>` : ''}
    <div class="row">
      <button data-a="restart">Nochmal</button>
      ${next ? `<button class="big" data-a="play" data-id="${next.id}">Weiter</button>` : ''}
      <button data-a="map">Karte</button>
    </div>
    <button class="ghostbtn" data-a="share" data-code="${esc(code)}">Diesen Lauf als Geist teilen</button>
  </div>`);
  // Edelsteine hochzählen
  const el = $('#tally'), t0 = performance.now(), dur = Math.min(1400, 300 + earned * 6);
  let lastTick = 0;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), v = Math.round(earned * (1 - (1 - k) ** 3));
    if (el.isConnected) el.textContent = '+' + v;
    if (now - lastTick > 45 && k < 1) { sfx('tick'); lastTick = now; }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  newStars.forEach((n, i) => n && setTimeout(() => sfx('star'), 350 + i * 350));
  setTimeout(showReveals, 1200);
}

/* ---------- Vibration (Android; iPhones unterstützen das im Browser nicht) ---------- */
const HAPTIC = { hurt: [40, 30, 40], die: [80, 40, 120], hit: 12, poof: 18, bounce: 8, chest: [20, 30, 40], boing: 15, thud: 50, bossStart: [60, 40, 60], bossDie: [100, 50, 100, 50, 200], unlock: [30, 30, 30, 30, 120], check: 20, win: [20, 40, 20] };
function haptic(name) {
  const p = HAPTIC[name];
  if (!p || !D.vibrate || !isTouch) return;
  try { navigator.vibrate && navigator.vibrate(p); } catch {}
}

/* ---------- Waffen ---------- */
const reveals = [];
function unlockWeapon(id, inGame) {
  if (D.weapons[id] || !weaponById(id)) return;
  D.weapons[id] = true; save.write();
  reveals.push(id);
  const w = weaponById(id), r = RARITY[w.rar];
  if (inGame && game) {
    game.banner = { sub: `${r.name.toUpperCase()}E WAFFE ENTDECKT`, text: w.name, col: r.col, t: 150 };
    game.freeze = Math.max(game.freeze, 36); game.shake = 6;
    sfx('legend');
  }
}
function showReveals() {
  const id = reveals.shift(); if (!id) return;
  const w = weaponById(id), r = RARITY[w.rar];
  sfx('legend');
  const el = document.createElement('div');
  el.className = 'reveal ' + w.rar;
  el.innerHTML = `<div class="rays"></div><div class="rcard" style="--c:${r.col};--g:${r.glow}">
    <p class="rar">${r.name}e Waffe</p><canvas width="1" height="1"></canvas>
    <h2>${esc(w.name)}</h2><p class="perk">${esc(w.perk)}</p><p class="cond">${esc(w.cond)}</p>
    <div class="row"><button class="big" data-r="equip">Ausrüsten</button><button data-r="close">Später</button></div></div>`;
  document.body.appendChild(el);
  drawIcon(el.querySelector('canvas'), id, 7);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'equip') { D.weapon = id; save.write(); sfx('buy'); }
    el.remove(); setTimeout(showReveals, 150);
  });
}
function drawIcon(cv, id, scale) {
  const ic = S.weaponIcon(id);
  cv.width = ic.width * scale; cv.height = ic.height * scale;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(ic, 0, 0, cv.width, cv.height);
}

function armory(msg = '') {
  mode = 'menu';
  const n = WEAPONS.filter(w => D.weapons[w.id]).length;
  const cards = WEAPONS.map(w => {
    const have = D.weapons[w.id], r = RARITY[w.rar], on = D.weapon === w.id;
    if (!have) return `<div class="wcard locked ${w.rar}"><div class="wi"><canvas data-icon="${w.id}" class="sil"></canvas></div>
      <div><small style="color:${r.col}">${w.secret ? '???' : r.name}</small><b>???</b><p>${esc(w.secret ? 'Ein Gerücht erzählt von einem Glimmen in grosser Höhe …' : w.hint)}</p></div></div>`;
    return `<div class="wcard ${w.rar} ${on ? 'on' : ''}" style="--c:${r.col}"><div class="wi"><canvas data-icon="${w.id}"></canvas></div>
      <div><small style="color:${r.col}">${r.name}</small><b>${esc(w.name)}</b><p>${esc(w.perk)}</p>
      <button data-a="equip" data-id="${w.id}">${on ? 'Ausgerüstet ✓' : 'Ausrüsten'}</button></div></div>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Waffenkammer</h2><span class="gems">${n} / ${WEAPONS.length}</span></div>
    <p class="note">Diese Waffen kann man nicht kaufen. Jede verlangt eine besondere Tat. Sie nutzen Schaden und Reichweite deiner Schaufel-Stufe und legen ihre Kraft obendrauf.</p>
    <div class="wgrid">${cards}</div>
    <div class="row"><button data-a="equip" data-id="">${D.weapon ? 'Normale Schaufel nehmen' : 'Normale Schaufel ausgerüstet ✓'}</button></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
  for (const cv of document.querySelectorAll('[data-icon]')) drawIcon(cv, cv.dataset.icon, 3);
}

/* ---------- Menüs ---------- */
function show(html) { ui.innerHTML = html; ui.hidden = false; }
function hideUI() { ui.hidden = true; ui.innerHTML = ''; }

function title() {
  mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true;
  playMusic(THEMES.karte.music);
  show(`<div class="title">
    <h1>Schaufel<span>held</span></h1>
    <p>Grabe. Springe. Schmiede dich nach oben.</p>
    <button class="big" data-a="map">Spielen</button>
    <div class="row"><button data-a="forge">Schmiede</button><button data-a="armory">Waffenkammer</button><button data-a="options">Optionen</button></div>
    <p class="gems">◆ ${D.gems}</p>
    ${installTip()}
  </div>`);
}

let curWorld = 0;
const worldOpen = wi => WORLDS[wi] && LEVELS.findIndex(l => l.id === WORLDS[wi].levels[0]) < D.unlocked;
function installTip() {
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  if (!isTouch || standalone || window.__SH_BUNDLE) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return `<p class="tip">${ios ? 'Tipp: Teilen → „Zum Home-Bildschirm“ für Vollbild ohne Browserleisten.' : 'Tipp: Menü ⋮ → „App installieren“ für Vollbild und Offline-Spielen.'}</p>`;
}
function map(sel, wi) {
  mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true;
  playMusic(THEMES.karte.music);
  if (wi != null) curWorld = wi;
  else if (sel) curWorld = Math.max(0, WORLDS.findIndex(w => w.levels.includes(sel)));
  const w = WORLDS[curWorld];
  const tabs = WORLDS.map((ww, i) => `<button class="wtab ${i === curWorld ? 'on' : ''} ${worldOpen(i) ? '' : 'locked'}" data-a="${worldOpen(i) ? 'world' : 'nope'}" data-w="${i}">Welt ${ww.id}${worldOpen(i) ? '' : ' 🔒'}</button>`).join('');
  const cards = w.levels.map((id, i) => {
    const l = levelById(id), open = LEVELS.findIndex(x => x.id === id) < D.unlocked, best = D.best[id];
    return `<button class="card ${open ? '' : 'locked'} ${sel === id ? 'sel' : ''} th-${l.theme}" data-a="${open ? 'pick' : 'nope'}" data-id="${id}">
      <span class="no">${esc(id)}</span><b>${esc(l.name)}</b>
      <span class="cstars">${(D.stars[id] || [0, 0, 0]).map(v => `<em class="${v ? 'on' : ''}">★</em>`).join('')}</span>
      <small>${open ? (best ? '⏱ ' + fmtTime(best) : 'Neu') : 'Gesperrt'}</small></button>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="title">‹</button><h2>Welt ${w.id} · ${esc(w.name)}</h2><span class="gems">★ ${w.levels.reduce((n, id) => n + (D.stars[id] || []).filter(Boolean).length, 0)}/${w.levels.length * 3} · ◆ ${D.gems}</span></div>
    <div class="wtabs">${tabs}</div>
    <div class="cards">${cards}</div>
    <div id="detail">${sel ? '' : '<p class="note">Wähle ein Level.</p>'}</div>
    <div class="row"><button data-a="forge">Schmiede</button><button data-a="armory">Waffenkammer ${Object.keys(D.weapons).length}/${WEAPONS.length}</button><button data-a="options">Optionen</button></div>
    <p class="note soon">Welt 3 · Pilzwald von Moderbrück — in Arbeit</p>
  </div>`);
  if (sel) detail(sel);
}

async function detail(id) {
  const el = $('#detail'); if (!el) return;
  const l = levelById(id), opts = [];
  if (D.ghosts[id]) opts.push({ code: D.ghosts[id], label: `Mein Bestzeit-Geist (${fmtTime(D.best[id])})`, on: D.ghostOn });
  for (const g of D.imported[id] || []) opts.push({ code: g.code, label: `${g.name} (${fmtTime(g.frames)})`, on: true });
  const render = (list, loading) => {
    el.innerHTML = `<div class="detail">
      <div><h3>${esc(l.name)}</h3><p class="note">${D.best[id] ? 'Bestzeit ' + fmtTime(D.best[id]) : 'Noch nicht geschafft'}</p></div>
      <div class="ghosts"><small>Gegen Geister rennen</small>
        ${list.length ? list.map((o, i) => `<label><input type="checkbox" data-g="${i}" ${o.on ? 'checked' : ''}> ${esc(o.label)}</label>`).join('') : '<p class="note">Noch keine Geister. Schaff das Level oder importiere einen Code in den Optionen.</p>'}
        ${loading ? '<p class="note">Lade Online-Bestenliste …</p>' : ''}
      </div>
      <button class="big go" data-a="go" data-id="${esc(id)}">Los!</button></div>`;
    el._opts = list;
  };
  render(opts, online());
  if (online()) {
    const top = await topGhosts(id, 5);
    top.forEach((g, i) => opts.push({ code: g.code, label: `#${i + 1} ${g.name} (${fmtTime(g.frames)})`, on: i === 0 }));
    if ($('#detail') === el) render(opts, false);
  }
}

// Kleine Pixel-Leinwand mit einer Szene, hochskaliert
function stage(cv, w, h, draw) {
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const x = t.getContext('2d'), old = R.x, oldT = R.t; R.x = x; R.t = menuT; draw(x); R.x = old; R.t = oldT;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height); c.drawImage(t, 0, 0, cv.width, cv.height);
}
let forgeAnim = 0;
function forge(msg = '') {
  mode = 'menu';
  const row = (key, name, table) => {
    const cur = D[key], nx = cur + 1, can = nx < AVAILABLE, price = PRICE[nx];
    const chips = TIERS.map((t, i) => `<canvas class="gi ${i === cur ? 'cur' : ''} ${i <= cur ? 'own' : i < AVAILABLE ? '' : 'lock'}" data-gi="${key}:${i}" title="${esc(t.name)}"></canvas>`).join('');
    return `<div class="gear">
      <div class="gh"><b>${name}: <span style="color:${TIERS[cur].light}">${esc(TIERS[cur].name)}</span></b><small>${esc(table[cur].perk)}</small></div>
      <div class="chips">${chips}</div>
      ${nx < TIERS.length ? `<div class="next"><span>Nächste Stufe: <b style="color:${TIERS[nx].light}">${esc(TIERS[nx].name)}</b> — ${esc(table[nx].perk)}</span>
        ${can ? `<button class="${D.gems >= price ? 'big' : 'off'}" data-a="buy" data-k="${key}">◆ ${price}</button>` : '<span class="lockt">ab Welt 3</span>'}</div>` : '<div class="next">Maximum erreicht.</div>'}
    </div>`;
  };
  const nA = Math.min(D.armor + 1, TIERS.length - 1), nS = Math.min(D.shovel + 1, TIERS.length - 1);
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Schmiede</h2><span class="gems">◆ ${D.gems}</span></div>
    <div class="forge"><div class="pv"><canvas id="preview" width="216" height="120"></canvas><small>Jetzt <span>→</span> nächste Stufe</small></div>
      <div class="rows">${row('shovel', 'Schaufel', SHOVEL)}${row('armor', 'Rüstung', ARMOR)}
      <div class="gear"><div class="gh"><b>Waffe: ${D.weapon ? esc(weaponById(D.weapon).name) : 'keine (normale Schaufel)'}</b><small>Legendäre und mythische Waffen findest du nicht im Laden.</small></div><div class="next"><span></span><button data-a="armory">Waffenkammer</button></div></div>
      <div class="gear soon"><div class="gh"><b>Relikt</b><small>Bald: Funkenrute, Flügelstiefel, Erdglocke …</small></div></div></div></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
  for (const cv of document.querySelectorAll('[data-gi]')) {
    const [k, i] = cv.dataset.gi.split(':'), ic = k === 'shovel' ? S.shovelIcon(+i) : S.armorIcon(+i);
    cv.width = ic.width * 2; cv.height = ic.height * 2;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(ic, 0, 0, cv.width, cv.height);
  }
  // Vorschau läuft animiert (Effekte der hohen Stufen sichtbar)
  const pv = $('#preview'), id = ++forgeAnim;
  const tick = () => {
    if (id !== forgeAnim || !pv.isConnected) return;
    stage(pv, 72, 40, () => {
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 12, 18, 1, 0, 0, 8);
      const nh = S.hero(nA, nS, null), locked = nA >= AVAILABLE && nS >= AVAILABLE;
      R.x.globalAlpha = locked ? 0.45 : 1; R.figure(nh, 50, 18, 1, 3, 0, 4); R.x.globalAlpha = 1;
      R.x.fillStyle = '#ffd84a'; R.x.fillRect(33, 22, 5, 1); R.x.fillRect(36, 21, 1, 3); R.x.fillRect(37, 22, 1, 1);
    });
    requestAnimationFrame(tick);
  };
  tick();
}

// Grosse Enthüllung nach dem Schmieden
function gearReveal(kind, t) {
  const tier = TIERS[t], el = document.createElement('div');
  el.className = 'reveal gear';
  el.innerHTML = `<div class="rays"></div><div class="rcard" style="--c:${tier.light};--g:${tier.dark}">
    <p class="rar">${kind === 'shovel' ? 'Neue Schaufel geschmiedet' : 'Neue Rüstung geschmiedet'}</p>
    <canvas width="300" height="168"></canvas>
    <h2>${esc(tier.name)}</h2><p class="perk">${esc((kind === 'shovel' ? SHOVEL : ARMOR)[t].perk)}</p>
    <div class="row"><button class="big" data-r="close">Stark!</button></div></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('canvas'), id = ++forgeAnim;
  const tick = () => {
    if (!cv.isConnected) return;
    stage(cv, 50, 28, () => {
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 12, 12, 1, 0, 0, 8);
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 32, 12, 1, 3, 0, 4);
    });
    requestAnimationFrame(tick);
  };
  tick();
  el.addEventListener('click', e => { if (e.target.closest('[data-r]')) { el.remove(); forge(); } });
}

function options(msg = '') {
  mode = 'menu';
  show(`<div class="panel small">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Optionen</h2><span></span></div>
    <label class="field">Dein Name (für Geister)<input id="name" maxlength="16" value="${esc(D.name)}" placeholder="z. B. Raphi"></label>
    ${toggles()}
    <label class="field">Geist-Code importieren<textarea id="code" rows="3" placeholder="SH1.…"></textarea></label>
    <button data-a="import">Importieren</button>
    <p class="note">${online() ? 'Online-Geister: aktiv.' : 'Online-Geister: aus (siehe README).'} Version 0.5</p>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <button class="danger" data-a="reset">Spielstand löschen</button>
  </div>`);
  $('#name').addEventListener('change', e => { D.name = e.target.value.trim().slice(0, 16); save.write(); });
}
const toggles = () => `<div class="row toggles">
  <button data-a="sfx" class="${D.sfx ? 'on' : ''}">Effekte ${D.sfx ? 'an' : 'aus'}</button>
  <button data-a="music" class="${D.music ? 'on' : ''}">Musik ${D.music ? 'an' : 'aus'}</button>
  ${isTouch ? `<button data-a="stick" class="${D.stick ? 'on' : ''}">Links: ${D.stick ? 'Daumen-Stick' : 'Pfeiltasten'}</button>
  <button data-a="vibrate" class="${D.vibrate ? 'on' : ''}">Vibration ${D.vibrate ? 'an' : 'aus'}</button>
  <button data-a="fullscreen" class="${D.fullscreen ? 'on' : ''}">Vollbild ${D.fullscreen ? 'an' : 'aus'}</button>` : ''}</div>`;

let resetArm = 0;
ui.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  unlockAudio();
  const a = b.dataset.a, id = b.dataset.id;
  if (a !== 'nope' && a !== 'buy') sfx('click');
  switch (a) {
    case 'title': return title();
    case 'map': goFullscreen(); return map();
    case 'forge': return forge();
    case 'armory': return armory();
    case 'equip': D.weapon = id || null; save.write(); sfx('buy'); return armory(id ? `${esc(weaponById(id).name)} ausgerüstet.` : 'Normale Schaufel ausgerüstet.');
    case 'options': return options();
    case 'pick': return map(id);
    case 'world': return map(null, +b.dataset.w);
    case 'nope': return sfx('nope');
    case 'play': return startLevel(id, D.ghostOn && D.ghosts[id] ? [D.ghosts[id]] : []);
    case 'go': {
      const opts = $('#detail')._opts || [];
      const codes = [...document.querySelectorAll('[data-g]')].filter(c => c.checked).map(c => opts[+c.dataset.g].code);
      if (D.ghosts[id]) { D.ghostOn = codes.includes(D.ghosts[id]); save.write(); }
      return startLevel(id, codes);
    }
    case 'resume': return resume();
    case 'restart': return startLevel(level.id, curCodes);
    case 'buy': {
      const k = b.dataset.k, nx = D[k] + 1, price = PRICE[nx];
      if (nx >= AVAILABLE || D.gems < price) { sfx('nope'); return forge(`Dir fehlen noch ${price - D.gems} Edelsteine.`); }
      D.gems -= price; D[k] = nx; save.write(); sfx('legend');
      forge(); return gearReveal(k, nx);
    }
    case 'stick': D.stick = !D.stick; save.write(); applyControls(); b.outerHTML = toggles().match(/<button data-a="stick".*?<\/button>/s)[0]; return;
    case 'vibrate': D.vibrate = !D.vibrate; save.write(); haptic('hit'); b.outerHTML = toggles().match(/<button data-a="vibrate".*?<\/button>/s)[0]; return;
    case 'fullscreen': D.fullscreen = !D.fullscreen; save.write(); if (!D.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {}); b.outerHTML = toggles().match(/<button data-a="fullscreen".*?<\/button>/s)[0]; return;
    case 'sfx': D.sfx = !D.sfx; save.write(); setAudio(D.sfx, D.music); b.outerHTML = toggles().match(/<button data-a="sfx".*?<\/button>/)[0]; return;
    case 'music': D.music = !D.music; save.write(); setAudio(D.sfx, D.music); b.outerHTML = toggles().match(/<button data-a="music".*?<\/button>/)[0]; return;
    case 'import': {
      const g = await decodeGhost($('#code').value);
      if (!g || !levelById(g.level)) return options('Das ist kein gültiger Geist-Code.');
      (D.imported[g.level] = D.imported[g.level] || []).unshift({ code: $('#code').value.trim(), name: g.name, frames: g.frames });
      D.imported[g.level] = D.imported[g.level].slice(0, 5); save.write();
      return options(`Geist von ${esc(g.name)} für ${esc(g.level)} (${fmtTime(g.frames)}) importiert.`);
    }
    case 'share': {
      const code = b.dataset.code;
      try { await navigator.clipboard.writeText(code); b.textContent = 'Code kopiert! Schick ihn einem Freund.'; }
      catch { b.outerHTML = `<textarea class="codebox" readonly rows="3">${esc(code)}</textarea><p class="note">Code markieren und kopieren.</p>`; }
      return;
    }
    case 'reset':
      if (Date.now() - resetArm < 3000) { save.reset(); return title(); }
      resetArm = Date.now(); b.textContent = 'Wirklich? Nochmals tippen.'; return;
  }
});

// Vollbild auf Android (iOS kennt das nur als installierte Web-App)
function goFullscreen() {
  if (!isTouch || !D.fullscreen || document.fullscreenElement) return;
  try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (r) r.catch(() => {}); } catch {}
}


if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__SH_BUNDLE) navigator.serviceWorker.register('sw.js').catch(() => {});

if (location.search.includes('debug')) window.__sh = { get game() { return game; } };

title();
requestAnimationFrame(loop);
