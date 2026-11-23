// Start, Hauptschleife und Menüs.
import { Game } from './game.js';
import { LEVELS, WORLDS, levelById } from './levels.js';
import { THEMES } from './themes.js';
import { TIERS, SHOVEL, ARMOR, PRICE, AVAILABLE } from './gear.js';
import { Renderer } from './render.js';
import { initInput, pollInput, clearInput } from './input.js';
import { unlockAudio, sfx, playMusic, stopMusic, setAudio } from './audio.js';
import { encodeGhost, decodeGhost, fmtTime } from './ghost.js';
import { save } from './save.js';
import { online, uploadGhost, topGhosts } from './online.js';
import * as S from './sprites.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canvas = $('#screen'), ctx = canvas.getContext('2d');
const ui = $('#ui'), touchEl = $('#touch'), pauseBtn = $('#pauseBtn');
const R = new Renderer(ctx);
const VH = 180;
let VW = 320;
const D = save.d;
setAudio(D.sfx, D.music);

let curCodes = [], mode = 'menu', game = null, ghosts = [], level = null, doneT = 0, menuT = 0;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function resize() {
  VW = Math.max(240, Math.min(400, Math.round(VH * innerWidth / innerHeight)));
  canvas.width = VW; canvas.height = VH; ctx.imageSmoothingEnabled = false;
  const sc = Math.min(innerWidth / VW, innerHeight / VH);
  canvas.style.width = VW * sc + 'px'; canvas.style.height = VH * sc + 'px';
  R.resize(VW, VH);
}
addEventListener('resize', resize); resize();

initInput(touchEl, () => unlockAudio());
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
  for (const e of game.events) sfx(e.name);
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
  const hs = S.hero(D.armor, D.shovel);
  R.x = ctx; R.figure(hs, 40, VH - 34, 1, 1, t, 8);
}

/* ---------- Spielen ---------- */
async function startLevel(id, ghostCodes = []) {
  level = levelById(id); curCodes = ghostCodes;
  game = new Game(level, { shovel: D.shovel, armor: D.armor }, { seed: 7 });
  ghosts = [];
  for (const c of ghostCodes) { const g = await decodeGhost(c); if (g && g.level === id) ghosts.push(g); }
  R.snapCamera(game);
  clearInput();
  hideUI(); mode = 'play';
  touchEl.hidden = !isTouch; pauseBtn.hidden = false;
  playMusic(THEMES[level.theme].music);
  tryLandscape();
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
  const earned = game.gems + bonus;
  D.gems += earned; D.earned += earned; D.cleared[id] = true;
  const li = LEVELS.findIndex(l => l.id === id);
  D.unlocked = Math.max(D.unlocked, li + 2);
  const old = D.best[id], record = !old || frames < old;
  const code = await encodeGhost({ level: id, name: D.name || 'Ich', frames, gear: { shovel: D.shovel, armor: D.armor }, rec: game.rec });
  if (record) { D.best[id] = frames; D.ghosts[id] = code; }
  save.write();
  let up = '';
  if (record && online() && D.name) up = (await uploadGhost({ level: id, name: D.name, frames, code })) ? 'Online hochgeladen.' : 'Online-Upload fehlgeschlagen.';
  stopMusic(); sfx('win');
  mode = 'result';
  const next = LEVELS[li + 1];
  show(`<div class="panel small result">
    <h2>${level.boss ? 'Boss besiegt!' : 'Geschafft!'}</h2>
    <p class="lvl">${esc(level.id)} · ${esc(level.name)}</p>
    <div class="stats">
      <div><small>Zeit</small><b>${fmtTime(frames)}</b>${record ? '<em>Neue Bestzeit!</em>' : `<em>Best ${fmtTime(old)}</em>`}</div>
      <div><small>Edelsteine</small><b>+${earned}</b>${bonus ? `<em>inkl. ${bonus} Erst-Bonus</em>` : ''}</div>
      <div><small>Tode</small><b>${game.deaths}</b></div>
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
    <div class="row"><button data-a="forge">Schmiede</button><button data-a="options">Optionen</button></div>
    <p class="gems">◆ ${D.gems}</p>
  </div>`);
}

function map(sel) {
  mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true;
  playMusic(THEMES.karte.music);
  const w = WORLDS[0];
  const cards = w.levels.map((id, i) => {
    const l = levelById(id), open = i < D.unlocked, best = D.best[id];
    return `<button class="card ${open ? '' : 'locked'} ${sel === id ? 'sel' : ''} th-${l.theme}" data-a="${open ? 'pick' : 'nope'}" data-id="${id}">
      <span class="no">${esc(id)}</span><b>${esc(l.name)}</b>
      <small>${open ? (best ? '⏱ ' + fmtTime(best) : 'Neu') : 'Gesperrt'}</small>${D.cleared[id] ? '<i>✓</i>' : ''}</button>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="title">‹</button><h2>Welt ${w.id} · ${esc(w.name)}</h2><span class="gems">◆ ${D.gems}</span></div>
    <div class="cards">${cards}</div>
    <div id="detail">${sel ? '' : '<p class="note">Wähle ein Level.</p>'}</div>
    <div class="row"><button data-a="forge">Schmiede</button><button data-a="options">Optionen</button></div>
    <p class="note soon">Welt 2 · Uhrturm von Zahnfels — in Arbeit</p>
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

function forge(msg = '') {
  mode = 'menu';
  const row = (key, name, table) => {
    const cur = D[key], nx = cur + 1, can = nx < AVAILABLE, price = PRICE[nx];
    const chips = TIERS.map((t, i) => `<span class="chip ${i === cur ? 'cur' : ''} ${i < AVAILABLE ? '' : 'lock'}" style="--d:${t.dark};--l:${t.light}" title="${esc(t.name)}"></span>`).join('');
    return `<div class="gear">
      <div class="gh"><b>${name}: ${esc(TIERS[cur].name)}</b><small>${esc(table[cur].perk)}</small></div>
      <div class="chips">${chips}</div>
      ${nx < TIERS.length ? `<div class="next"><span>Nächste Stufe: <b>${esc(TIERS[nx].name)}</b> — ${esc(table[nx].perk)}</span>
        ${can ? `<button class="${D.gems >= price ? 'big' : 'off'}" data-a="buy" data-k="${key}">◆ ${price}</button>` : '<span class="lockt">ab Welt 2</span>'}</div>` : '<div class="next">Maximum erreicht.</div>'}
    </div>`;
  };
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Schmiede</h2><span class="gems">◆ ${D.gems}</span></div>
    <div class="forge"><canvas id="preview" width="48" height="40"></canvas>
      <div class="rows">${row('shovel', 'Schaufel', SHOVEL)}${row('armor', 'Rüstung', ARMOR)}
      <div class="gear soon"><div class="gh"><b>Relikt</b><small>Bald: Funkenrute, Flügelstiefel, Erdglocke …</small></div></div></div></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
  const pv = $('#preview'), px = pv.getContext('2d');
  px.imageSmoothingEnabled = false;
  const old = R.x; R.x = px; R.figure(S.hero(D.armor, D.shovel), 14, 20, 1, 0, 0, 8); R.figure(S.hero(D.armor, D.shovel), 28, 20, 1, 3, 0, 8); R.x = old;
}

function options(msg = '') {
  mode = 'menu';
  show(`<div class="panel small">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Optionen</h2><span></span></div>
    <label class="field">Dein Name (für Geister)<input id="name" maxlength="16" value="${esc(D.name)}" placeholder="z. B. Raphi"></label>
    ${toggles()}
    <label class="field">Geist-Code importieren<textarea id="code" rows="3" placeholder="SH1.…"></textarea></label>
    <button data-a="import">Importieren</button>
    <p class="note">${online() ? 'Online-Geister: aktiv.' : 'Online-Geister: aus (siehe README).'} Version 0.1</p>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <button class="danger" data-a="reset">Spielstand löschen</button>
  </div>`);
  $('#name').addEventListener('change', e => { D.name = e.target.value.trim().slice(0, 16); save.write(); });
}
const toggles = () => `<div class="row toggles">
  <button data-a="sfx" class="${D.sfx ? 'on' : ''}">Effekte ${D.sfx ? 'an' : 'aus'}</button>
  <button data-a="music" class="${D.music ? 'on' : ''}">Musik ${D.music ? 'an' : 'aus'}</button></div>`;

let resetArm = 0;
ui.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  unlockAudio();
  const a = b.dataset.a, id = b.dataset.id;
  if (a !== 'nope' && a !== 'buy') sfx('click');
  switch (a) {
    case 'title': return title();
    case 'map': return map();
    case 'forge': return forge();
    case 'options': return options();
    case 'pick': return map(id);
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
      D.gems -= price; D[k] = nx; save.write(); sfx('buy');
      return forge(`${k === 'shovel' ? 'Schaufel' : 'Rüstung'} aus ${TIERS[nx].name} geschmiedet!`);
    }
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

function tryLandscape() {
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch {}
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

if (location.search.includes('debug')) window.__sh = { get game() { return game; } };

title();
requestAnimationFrame(loop);
