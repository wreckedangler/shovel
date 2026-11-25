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
import { initSkin, ic, logoImg, refreshLogo, serifImg } from './ui-skin.js';
import { CHEATS, cheatByCode, activeCheats, playCheats } from './cheats.js';
import { relicMods, SHARD_PRICE, CHESTS } from './loot.js';
import { initTreasury, treasury, treasuryClick, collection, collectionClick } from './treasury.js';
import { WEAPONS, RARITY, weaponById } from './weapons.js';
import { SECRET_WORLD } from './levels.js';
import { ACH, SCARVES, LEVEL_INFO, TOTAL_COINS, rankFor, RANK_ORDER, completion, totalCoins, coinsOf, today, yesterday } from './progress.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canvas = $('#screen'), ctx = canvas.getContext('2d');
const ui = $('#ui'), touchEl = $('#touch'), pauseBtn = $('#pauseBtn');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const R = new Renderer(ctx);
let VH = 180, VW = 320;
const D = save.d;
let lastMenu = 'title';
setAudio(D.sfx, D.music);
initSkin();

const embers = [];
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
  const spd = mode === 'play' || mode === 'won' ? (D.cheatsOn.espresso ? 1.5 : D.cheatsOn.zeitlupe ? 0.5 : 1) : 1;
  const stepMs = 1000 / 60 / spd;
  while (acc >= stepMs) { acc -= stepMs; tick(); }
  draw();
  requestAnimationFrame(loop);
}
function tick() {
  if (mode !== 'play' && mode !== 'won') { menuT++; return; }
  let inp = mode === 'play' ? pollInput() : { };
  if (D.cheatsOn.spiegel && mode === 'play') inp = { ...inp, left: inp.right, right: inp.left };
  if (game.sign) for (const c of CHEATS) if (!D.cheatsKnown[c.id] && game.sign.includes(c.code)) learnCheat(c);
  game.step(inp);
  for (const e of game.events) {
    sfx(e.name, e.v);
    haptic(e.name);
    if (e.name === 'unlock') unlockWeapon(e.v, true);
    if (e.name === 'check') moment('LATERNE ENTZÜNDET', 'Hier kehrst du zurück', 'gold', 2.6);
    if (e.name === 'bossDie') moment('GROSSER FEIND BEZWUNGEN', level.name, 'gold', 4.6);
    if (e.name === 'die') moment('DU BIST GEFALLEN', '', 'death', 2.8);
    if (e.name === 'chest' && e.v) { D.chests[e.v] = true; save.write(); if (Object.keys(D.chests).filter(k => k.startsWith('1-')).length >= 3) unlockWeapon('goldschaufel', true); }
    if (e.name === 'die') { D.deathsTotal++; save.write(); if (D.deathsTotal >= 20) unlockWeapon('seelenschaufel', true); checkAch(); }
    const st = D.stats;
    switch (e.name) {
      case 'dig': st.dug++; if (st.dug % 50 === 0) checkAch(); break;
      case 'golden': st.golden++; checkAch(); break;
      case 'rush': st.rush++; checkAch(); break;
      case 'chestRare': if (e.v >= 0.98) { st.legendChest++; checkAch(); } break;
      case 'flag': st.flag++; checkAch(); break;
      case 'sleep': st.sleep++; checkAch(); break;
      case 'bossClean': st.bossClean++; checkAch(); break;
      case 'bounce': if (e.v > st.bestChain) { st.bestChain = e.v; if (e.v === 5 || e.v === 8) checkAch(); } break;
    }
  }
  if (game.done && mode === 'play') { mode = 'won'; doneT = 0; touchEl.hidden = true; pauseBtn.hidden = true; }
  if (mode === 'won' && ++doneT === 80) finish();
}
function draw() {
  R.look = D.look; R.scarfStyle = D.scarf; R.crown = /^raphi$/i.test(D.name || ''); R.noIntro = true;
  const playing = game && mode !== 'menu';
  canvas.style.filter = playing && D.cheatsOn.disco ? `hue-rotate(${(menuT * 0 + performance.now() / 8) % 360}deg) saturate(1.4)` : '';
  canvas.style.transform = (document.body.classList.contains('portrait') ? 'translateX(-50%)' : 'translate(-50%,-50%)') + (playing && D.cheatsOn.spiegel ? ' scaleX(-1)' : '');
  if (game && mode !== 'menu') R.draw(game, ghosts); else drawMenuBg();
  if (D.retro) retroFilter();
}
function drawMenuBg() {
  const th = THEMES.karte, bg = S.backdrop(th, VH), t = menuT;
  ctx.drawImage(bg.sky, 0, 0, VW, VH);
  ctx.fillStyle = th.stars; for (const s of bg.stars) if ((t / 20 + s.p) % 6 > 1) ctx.fillRect(s.x % VW, s.y, 1, 1);
  for (const [img, f] of [[bg.far, 0.15], [bg.near, 0.4]]) { const ox = -Math.round(t * f) % img.width; for (let k = ox - img.width; k < VW; k += img.width) ctx.drawImage(img, k, 0); }
  const ts = S.tileset(th);
  for (let x = -1; x < VW / 16 + 1; x++) { const px = x * 16 - (t % 16); ctx.drawImage(ts.top[(x + 99 + Math.floor(t / 16)) % 3], px, VH - 20); ctx.drawImage(ts.fill[0], px, VH - 4); }
  const hs = S.hero(D.armor, D.shovel, D.weapon);
  R.x = ctx; R.figure(hs, 40, VH - 34, 1, 1, t, 8, null, 0, 16, 2, 0);
  // Abdunkeln, goldenes Licht von oben, Nebel und fallende Asche
  ctx.fillStyle = 'rgba(7,6,5,0.55)'; ctx.fillRect(0, 0, VW, VH);
  const lg = ctx.createRadialGradient(VW / 2, -VH * 0.25, 10, VW / 2, -VH * 0.25, VH * 1.1);
  lg.addColorStop(0, 'rgba(255,214,140,0.38)'); lg.addColorStop(0.5, 'rgba(212,160,80,0.10)'); lg.addColorStop(1, 'rgba(212,160,80,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, VW, VH);
  for (let k = 0; k < 3; k++) {
    const fy = VH * (0.55 + k * 0.14), off = ((t * (0.15 + k * 0.08)) % (VW * 2)) - VW;
    const fg = ctx.createLinearGradient(off, 0, off + VW * 1.6, 0);
    fg.addColorStop(0, 'rgba(180,170,150,0)'); fg.addColorStop(0.5, `rgba(180,170,150,${0.07 + k * 0.03})`); fg.addColorStop(1, 'rgba(180,170,150,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, fy, VW, VH * 0.2);
  }
  if (embers.length < 60 && t % 2 === 0) embers.push({ x: Math.random() * VW * 1.2 - VW * 0.1, y: -4, vx: 0.15 + Math.random() * 0.25, vy: 0.15 + Math.random() * 0.3, life: 400, gold: Math.random() < 0.15, ph: Math.random() * 6 });
  for (const e of embers) {
    e.x += e.vx + Math.sin((t + e.ph * 50) / 40) * 0.12; e.y += e.vy; e.life--;
    ctx.globalAlpha = Math.min(1, e.life / 60) * (e.gold ? 0.9 : 0.55);
    ctx.fillStyle = e.gold ? ((t >> 3) + e.ph * 3) % 4 < 2 ? '#ffe6a0' : '#d4b46a' : '#c8beb0';
    ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
  }
  ctx.globalAlpha = 1;
  for (let k = embers.length - 1; k >= 0; k--) if (embers[k].life <= 0 || embers[k].y > VH + 4) embers.splice(k, 1);
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VW * 0.65);
  vg.addColorStop(0, 'rgba(5,4,3,0)'); vg.addColorStop(1, 'rgba(5,4,3,0.85)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
}

/* ---------- Spielen ---------- */
async function startLevel(id, ghostCodes = []) {
  level = levelById(id); curCodes = ghostCodes;
  game = new Game(level, { shovel: D.shovel, armor: D.armor, weapon: D.weapon }, { seed: 7, cheats: Object.fromEntries(activeCheats(D).map(id => [id, true])), relics: relicMods(D) });
  ghosts = [];
  for (const c of ghostCodes) { const g = await decodeGhost(c); if (g && g.level === id) { g.own = c === D.ghosts[id]; ghosts.push(g); } }
  R.snapCamera(game);
  clearInput();
  hideUI(); mode = 'play';
  touchEl.hidden = !isTouch; pauseBtn.hidden = false;
  playMusic(THEMES[level.theme].music);
  goFullscreen();
  const wn = ALLW().find(w => w.levels.includes(id));
  setTimeout(() => { if (game && game.level === level) moment(level.name.toUpperCase(), wn ? (wn.id === '?' ? 'Geheimer Ort' : `Welt ${wn.id} · ${wn.name}`) : '', level.secret ? 'jade' : 'gold', 3.2); }, 250);
}
function pause() { mode = 'pause'; touchEl.hidden = true; pauseBtn.hidden = true; sfx('click'); show(`
  <div class="panel small"><h2>Rast</h2>${playCheats(D).length ? '<p class="warn">Schummelwörter aktiv</p>' : ''}
  <button class="big" data-a="resume">Weiter</button>
  <button data-a="restart">Neu starten</button>
  <button data-a="map">Zur Karte</button>
  ${toggles()}</div>`); }
function resume() { hideUI(); clearInput(); mode = 'play'; touchEl.hidden = !isTouch; pauseBtn.hidden = false; }

async function finish() {
  const id = level.id, frames = game.frame, first = !D.cleared[id];
  const viaSecret = game.exit === 'secret';
  const cheated = playCheats(D).length > 0;
  if (cheated) game.coins = [];
  const bonus = first ? (level.boss ? 300 : level.secret ? 250 : 100) : 0;
  // Sterne: geschafft · unter Zielzeit · ohne Tod. Jeder neue Stern bringt 50.
  const got = [true, frames <= level.par * 60, game.deaths === 0];
  const had = D.stars[id] || [false, false, false];
  const newStars = level.secret ? [false, false, false] : got.map((g, i) => g && !had[i]);
  if (cheated) newStars.fill(false);
  if (!level.secret && !cheated) D.stars[id] = had.map((h, i) => h || got[i]);
  const starGems = newStars.filter(Boolean).length * 50;
  // Münzen und Geheimnisse dauerhaft speichern
  const prevCoins = new Set(D.coins[id] || []), newCoins = game.coins.filter(c => !prevCoins.has(c));
  D.coins[id] = [...new Set([...prevCoins, ...game.coins])].sort();
  const prevSec = D.secrets[id] || 0; D.secrets[id] = Math.max(prevSec, game.secretsFound);
  const coinGems = newCoins.length * 100;
  const earned = game.gems + bonus + starGems + coinGems;
  D.gems += earned; D.earned += earned; D.cleared[id] = true;
  const li = LEVELS.findIndex(l => l.id === id);
  if (!level.secret) D.unlocked = Math.max(D.unlocked, li + 2);
  // Geheimausgang
  let secretMsg = '';
  if (viaSecret && level.secretExit && !D.secretOpen[level.secretExit]) { D.secretOpen[level.secretExit] = true; secretMsg = `Geheimlevel entdeckt: ${levelById(level.secretExit).name}`; }
  const gruft = LEVELS.find(l => l.coinsNeeded);
  if (gruft && !D.secretOpen[gruft.id] && totalCoins(D) >= gruft.coinsNeeded) { D.secretOpen[gruft.id] = true; secretMsg = (secretMsg ? secretMsg + ' · ' : '') + 'Die Schaufelgruft hat sich geöffnet!'; }
  // Rang
  const info = LEVEL_INFO[id];
  const rank = rankFor(level, { frames, deaths: game.deaths, coinsGot: D.coins[id].length, coinsTotal: info.coins, secretsGot: D.secrets[id], secretsTotal: info.secrets });
  const oldRank = D.ranks[id], newRank = !oldRank || RANK_ORDER[rank] > RANK_ORDER[oldRank];
  if (newRank && !cheated) D.ranks[id] = rank;
  const old = D.best[id], record = !cheated && (!old || frames < old);
  const code = await encodeGhost({ level: id, name: D.name || 'Ich', frames, gear: { shovel: D.shovel, armor: D.armor }, rec: game.rec });
  if (record) { D.best[id] = frames; D.ghosts[id] = code; }
  // Waffen-Bedingungen am Levelende
  if (id === '1-1' && game.kills === 0) unlockWeapon('federklinge');
  if (id === '1-1' && frames < 25 * 60) unlockWeapon('blitzspaten');
  if (id === '1-2' && game.dirtTotal > 0 && game.dirtLeft() === 0) unlockWeapon('erdfresser');
  if (ghosts.some(g => !g.own && g.frames - frames >= 120)) unlockWeapon('geisterklinge');
  // Schlüssel für die Schatzkammer (jeder Anlass zählt nur einmal pro Level)
  let keyHtml = '';
  const award = (tag, kind, why) => { const k = id + ':' + tag; if (cheated || D.keyLog[k]) return; D.keyLog[k] = true; keyHtml += grantKey(kind, 1, why); };
  if (first) award('clear', level.boss ? 'urlicht' : level.secret ? 'gold' : 'holz', level.boss ? 'Boss bezwungen' : level.secret ? 'Geheimer Ort' : 'Erstmals geschafft');
  if (!level.secret && D.stars[id] && D.stars[id].every(Boolean)) award('stars', 'eisen', 'Alle drei Sterne');
  if (info.coins && D.coins[id].length >= info.coins) award('coins', 'eisen', 'Alle Münzen');
  if (D.ranks[id] === 'S') award('rankS', 'gold', 'S-Rang');
  save.write();
  checkAch();
  let up = '';
  if (record && online() && D.name) up = (await uploadGhost({ level: id, name: D.name, frames, code })) ? 'Online hochgeladen.' : 'Online-Upload fehlgeschlagen.';
  stopMusic(); sfx('win');
  mode = 'result';
  const next = viaSecret && level.secretExit ? levelById(level.secretExit) : level.secret ? null : LEVELS.slice(li + 1).find(l => !l.secret);
  const starLbl = ['Geschafft', `Unter ${level.par} s`, 'Ohne Tod'];
  const coinRow = Array.from({ length: info.coins }, (_, k) => `<i class="${D.coins[id].includes(k) ? 'on' : ''} ${newCoins.includes(k) ? 'new' : ''}"></i>`).join('');
  show(`<div class="panel small result">
    <div class="rankbig ${newRank && !cheated ? 'new' : ''}">${cheated ? '' : serifImg(rank, 30, { S: 'gold', A: 'jade', B: 'pale', C: 'dim' }[rank], 2)}</div>
    ${cheated ? `<p class="warn">Schummelrunde: keine Ränge, Rekorde, Sterne oder Münzen.</p>` : ''}
    <h2>${viaSecret ? 'Geheimer Ausgang!' : level.boss ? 'Boss besiegt!' : 'Geschafft!'}</h2>
    <p class="lvl">${esc(level.id)} · ${esc(level.name)}</p>
    ${secretMsg ? `<p class="secretmsg">${esc(secretMsg)}</p>` : ''}
    ${keyHtml ? `<div class="keys">${keyHtml}</div>` : ''}
    ${level.secret ? '' : `<div class="starrow">${got.map((g, i) => `<div class="star ${D.stars[id][i] ? 'on' : ''} ${newStars[i] ? 'new' : ''}" style="--d:${0.35 + i * 0.35}s">${ic(D.stars[id][i] ? 'star' : 'starOff')}<small>${starLbl[i]}</small></div>`).join('')}</div>`}
    <div class="coinrow">${coinRow}<small>Schaufelmünzen ${D.coins[id].length}/${info.coins}${info.secrets ? ` · Geheimnisse ${Math.min(D.secrets[id], info.secrets)}/${info.secrets}` : ''}</small></div>
    <div class="stats">
      <div><small>Zeit</small><b>${fmtTime(frames)}</b>${record ? '<em>Neue Bestzeit!</em>' : `<em>Best ${fmtTime(old)}</em>`}</div>
      <div><small>Edelsteine</small><b id="tally">+0</b><em>${[bonus ? `${bonus} Erst-Bonus` : '', starGems ? `${starGems} Sterne` : '', coinGems ? `${coinGems} Münzen` : ''].filter(Boolean).join(' · ')}</em></div>
      <div><small>Beste Kette</small><b>×${game.maxChain}</b></div>
    </div>
    ${ghosts.map(g => { const d = frames - g.frames; return `<p class="vs ${d <= 0 ? 'win' : 'lose'}">gegen ${esc(g.name)}: ${d <= 0 ? '−' : '+'}${(Math.abs(d) / 60).toFixed(2)} s</p>`; }).join('')}
    ${up ? `<p class="note">${up}</p>` : ''}
    <div class="row">
      <button data-a="restart">Nochmal</button>
      ${next ? `<button class="big" data-a="play" data-id="${next.id}">${viaSecret ? 'Geheimlevel!' : 'Weiter'}</button>` : ''}
      <button data-a="map">Karte</button>
    </div>
    ${keyHtml ? `<div class="row"><button class="treasurebtn" data-a="treasury">Truhe öffnen</button></div>` : ''}
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
  setTimeout(() => sfx(rank === 'S' ? 'legend' : 'star'), 1300);
  setTimeout(showReveals, 1900);
}

/* ---------- Erfolge & Einblendungen ---------- */
function toast(title, text, kind = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'toast ' + kind;
  el.innerHTML = `<b>${ic(kind === 'ach' ? 'trophy' : 'scroll')} ${esc(title)}</b><span>${text}</span>`;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2800); setTimeout(() => el.remove(), 3300);
}
function checkAch() {
  if (playCheats(D).length && (mode === 'play' || mode === 'won')) return;
  for (const a of ACH) {
    if (D.ach[a.id] || !a.test(D)) continue;
    D.ach[a.id] = true; D.gems += a.gems; D.earned += a.gems;
    toast('Erfolg: ' + a.name, `${esc(a.desc)} +${a.gems} ${ic('gem')}`, 'ach'); sfx('achieve'); haptic('unlock');
    const c = CHEATS.find(x => x.ach === a.id); if (c) setTimeout(() => learnCheat(c), 900);
  }
  save.write();
}
function achs() {
  mode = 'menu';
  const n = Object.keys(D.ach).length;
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Erfolge</h2><span class="gems">${n} / ${ACH.length}</span></div>
    <div class="bar"><i style="width:${n / ACH.length * 100}%"></i></div>
    <div class="achgrid">${ACH.map(a => `<div class="achc ${D.ach[a.id] ? 'on' : ''}"><b>${ic(D.ach[a.id] ? 'trophy' : 'lock')} ${esc(a.name)}</b><small>${esc(a.desc)}</small><em>+${a.gems} ${ic('gem')}</em></div>`).join('')}</div>
  </div>`);
}
function wardrobe(msg = '') {
  mode = 'menu';
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Garderobe</h2><span class="gems">Schal</span></div>
    <div class="wardrobe">${SCARVES.map(sc => { const ok = sc.ok(D); return `<button class="sc ${D.scarf === sc.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-a="${ok ? 'scarf' : 'nope'}" data-id="${sc.id}">
      <canvas data-sc="${sc.id}" width="168" height="96"></canvas><b>${esc(sc.name)}</b><small>${ok ? (D.scarf === sc.id ? 'Getragen' : 'Anziehen') : esc(sc.need)}</small></button>`; }).join('')}</div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
  const id = ++forgeAnim;
  const tick = () => {
    if (id !== forgeAnim) return;
    let any = false;
    for (const cv of document.querySelectorAll('[data-sc]')) {
      any = true; const keep = R.scarfStyle; R.scarfStyle = cv.dataset.sc;
      stage(cv, 42, 24, () => R.figure(S.hero(D.armor, D.shovel, D.weapon), 22, 9, 1, 1, menuT, 8, null, 0, 16, 2, 0));
      R.scarfStyle = keep;
    }
    if (any) requestAnimationFrame(tick);
  };
  tick();
}

/* ---------- Tagesschatz ---------- */
function dailyReady() { return D.daily.last !== today(); }
const keyCount = () => Object.values(D.keys).reduce((a, b) => a + b, 0);
function grantKey(kind, n = 1, why = '') {
  D.keys[kind] = (D.keys[kind] || 0) + n; save.write();
  const ch = CHESTS.find(c => c.id === kind);
  return `<p class="keygain" style="--cc:${ch.col}">${ic('lock')} ${n > 1 ? n + ' × ' : ''}Schlüssel: ${esc(ch.name)}${why ? ` <small>${esc(why)}</small>` : ''}</p>`;
}
function claimDaily() {
  if (!dailyReady()) return;
  D.daily.streak = D.daily.last === yesterday() ? D.daily.streak + 1 : 1;
  D.daily.last = today();
  const gems = 50 * Math.min(7, D.daily.streak) + (D.daily.streak % 7 === 0 ? 500 : 0);
  D.gems += gems; D.earned += gems; save.write(); checkAch();
  const keyHtml = grantKey(D.daily.streak % 7 === 0 ? 'urlicht' : 'holz', 1);
  sfx('legend'); haptic('chest');
  const el = document.createElement('div'); el.className = 'reveal gear';
  el.innerHTML = `<div class="rays"></div><div class="rcard" style="--c:#ffd84a;--g:#ffb020">
    <p class="rar">Tagesschatz · Tag ${D.daily.streak}</p>
    <div class="dchest">${ic('gem', 'huge')}</div><h2>+${gems} Edelsteine</h2>
    ${keyHtml}<p class="perk">${D.daily.streak % 7 === 0 ? 'Wochenbonus! +500 extra.' : `Morgen gibt es mehr: Tag ${D.daily.streak + 1} bringt ${50 * Math.min(7, D.daily.streak + 1)}.`}</p>
    <div class="row"><button class="big" data-r="close">Einsacken</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target.closest('[data-r]')) { el.remove(); title(); } });
}

/* ---------- Easter Egg: Retro-Modus ---------- */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konami = 0, logoTaps = [];
addEventListener('keydown', e => { konami = e.code === KONAMI[konami] ? konami + 1 : e.code === KONAMI[0] ? 1 : 0; if (konami === KONAMI.length) { konami = 0; toggleRetro(); } });
function toggleRetro() {
  D.retro = !D.retro; D.stats.retro = (D.stats.retro || 0) + 1; save.write(); checkAch();
  sfx('secret'); toast(D.retro ? 'Retro-Modus an' : 'Retro-Modus aus', D.retro ? 'Wie damals auf dem grauen Kasten.' : 'Zurück in Farbe.', 'ach');
}
const RETRO = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];
function retroFilter() {
  const im = ctx.getImageData(0, 0, VW, VH), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11, c = RETRO[l < 50 ? 0 : l < 100 ? 1 : l < 170 ? 2 : 3];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  ctx.putImageData(im, 0, 0);
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
    moment('WAFFE ERHALTEN', `${r.name}e Waffe · ${w.name}`, w.rar === 'mythisch' ? 'jade' : 'gold', 3.6);
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
      <button data-a="equip" data-id="${w.id}">${on ? 'Ausgerüstet ' + ic('check') : 'Ausrüsten'}</button></div></div>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Waffenkammer</h2><span class="gems">${n} / ${WEAPONS.length}</span></div>
    <p class="note">Diese Waffen kann man nicht kaufen. Jede verlangt eine besondere Tat. Sie nutzen Schaden und Reichweite deiner Schaufel-Stufe und legen ihre Kraft obendrauf.</p>
    <div class="wgrid">${cards}</div>
    <div class="row"><button data-a="equip" data-id="">${D.weapon ? 'Normale Schaufel nehmen' : 'Normale Schaufel ausgerüstet'}</button></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
  </div>`);
  for (const cv of document.querySelectorAll('[data-icon]')) drawIcon(cv, cv.dataset.icon, 3);
}

/* ---------- Menüs ---------- */
function show(html) {
  ui.innerHTML = html; ui.hidden = false;
  // Überschriften und Levelnamen in Pixel-Serifenschrift setzen
  for (const h of ui.querySelectorAll('h2')) if (!h.querySelector('img')) h.innerHTML = serifImg(h.textContent.trim(), 13, h.closest('.reveal.mythisch') ? 'jade' : 'gold', 2);
  for (const b of ui.querySelectorAll('.card b')) b.innerHTML = serifImg(b.textContent.trim(), b.textContent.trim().length > 14 ? 9 : 11, b.closest('.locked') ? 'dim' : 'pale', 2);
}
/* ---------- Grosse Momente ---------- */
let momentT = 0;
function moment(text, sub = '', kind = 'gold', dur = 3.2) {
  let el = $('#moment');
  if (!el) { el = document.createElement('div'); el.id = 'moment'; document.body.appendChild(el); }
  el.className = ''; void el.offsetWidth;
  const pal = kind === 'death' ? 'red' : kind;
  el.innerHTML = `<div class="in"><div class="line"></div>${serifImg(text, text.length > 18 ? 13 : 16, pal, innerWidth < 500 ? 2 : 3)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}<div class="line"></div></div>`;
  el.style.setProperty('--dur', dur + 's');
  el.className = 'show ' + (kind === 'death' ? 'death' : '');
  clearTimeout(momentT); momentT = setTimeout(() => { el.className = ''; }, dur * 1000);
  if (kind === 'death') sfx('die');
}
/* ---------- Schummelbuch ---------- */
function learnCheat(c) {
  if (D.cheatsKnown[c.id]) return;
  D.cheatsKnown[c.id] = true; save.write();
  toast('Schummelwort gelernt', `<b style="color:#f3e3b3;letter-spacing:.2em">${esc(c.code)}</b> · ${esc(c.name)} – im Schummelbuch einschalten.`, 'ach'); sfx('secret');
}
function cheatbook(msg = '') {
  mode = 'menu';
  const on = playCheats(D).length;
  show(`<div class="panel small">
    <div class="top"><button class="back" data-a="title">‹</button><h2>Schummelbuch</h2><span class="gems">${Object.keys(D.cheatsKnown).length} / ${CHEATS.length}</span></div>
    <p class="note">Schummelwörter verstecken sich auf Schildern an geheimen Orten und hinter Erfolgen. Wer sie kennt, darf sie hier eintragen.</p>
    <label class="field">Schummelwort eintragen<input id="cheatcode" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="…"></label>
    <div class="row"><button class="big" data-a="cheatenter">Einritzen</button></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    ${on ? `<p class="warn">Aktive Spielveränderungen: Ränge, Rekorde, Sterne und Münzen zählen nicht.</p>` : ''}
    <div class="cheatlist">${CHEATS.map(c => D.cheatsKnown[c.id]
      ? `<div class="cheat ${D.cheatsOn[c.id] ? 'on' : ''}"><div><b>${esc(c.name)}</b><small>${esc(c.desc)} · <i>${esc(c.code)}</i></small></div><button data-a="cheattoggle" data-id="${c.id}">${D.cheatsOn[c.id] ? 'An' : 'Aus'}</button></div>`
      : `<div class="cheat unknown"><div><b>???</b><small>${esc(c.hint)}</small></div></div>`).join('')}</div>
  </div>`);
  const inp = $('#cheatcode'); inp.addEventListener('keydown', e => { if (e.key === 'Enter') ui.querySelector('[data-a=cheatenter]').click(); });
}
function splash() {
  mode = 'menu';
  show(`<div class="splash" data-a="title">${logoImg()}<div class="press">Tippe, um zu beginnen</div></div>`);
}
function hideUI() { ui.hidden = true; ui.innerHTML = ''; }

function title() {
  mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'title';
  playMusic(THEMES.karte.music);
  show(`<div class="title">
    <div data-a="logo">${logoImg()}</div>
    <div class="tag">Grabe · Springe · Schmiede dich nach oben</div>
    <div class="menu">
      <button class="big" data-a="map">Abenteuer</button>
      <button class="treasurebtn" data-a="treasury">${ic('lock')} Schatzkammer${keyCount() ? ` <span class="badge">${keyCount()}</span>` : ''}</button>
      <div class="row"><button data-a="forge">${ic('anvil')} Schmiede</button><button data-a="armory">${ic('sword')} Waffen</button><button data-a="options">${ic('gear')} Optionen</button></div>
      <button data-a="cheats">${ic('scroll')} Schummelbuch</button>
      ${dailyReady() ? `<button class="daily" data-a="daily">${ic('trophy')} Tagesschatz bereit! <small>Tag ${D.daily.last === yesterday() ? D.daily.streak + 1 : 1}</small></button>` : ''}
    </div>
    <p class="gems">${ic('gem')} ${D.gems} &nbsp; ${ic('coin')} ${totalCoins(D)} &nbsp; ${ic('scroll')} ${completion(D)} %</p>
    ${dailyReady() ? '' : `<p class="note">Tagesschatz geholt · Serie ${D.daily.streak} ${D.daily.streak === 1 ? 'Tag' : 'Tage'}</p>`}
    ${installTip()}
  </div>`);
}

let curWorld = 0;
const worldOpen = wi => wi === WORLDS.length ? true : WORLDS[wi] && LEVELS.findIndex(l => l.id === WORLDS[wi].levels[0]) < D.unlocked;
const levelOpen = id => { const l = levelById(id); return l.secret ? !!D.secretOpen[id] : LEVELS.findIndex(x => x.id === id) < D.unlocked; };
const ALLW = () => [...WORLDS, SECRET_WORLD];
function installTip() {
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  if (!isTouch || standalone || window.__SH_BUNDLE) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return `<p class="tip">${ios ? 'Tipp: Teilen → „Zum Home-Bildschirm“ für Vollbild ohne Browserleisten.' : 'Tipp: Menü ⋮ → „App installieren“ für Vollbild und Offline-Spielen.'}</p>`;
}
function map(sel, wi) {
  mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'map';
  playMusic(THEMES.karte.music);
  if (wi != null) curWorld = wi;
  else if (sel) curWorld = Math.max(0, ALLW().findIndex(w => w.levels.includes(sel)));
  const w = ALLW()[curWorld];
  const nSec = SECRET_WORLD.levels.filter(id => D.secretOpen[id]).length;
  const tabs = WORLDS.map((ww, i) => `<button class="wtab ${i === curWorld ? 'on' : ''} ${worldOpen(i) ? '' : 'locked'}" data-a="${worldOpen(i) ? 'world' : 'nope'}" data-w="${i}">Welt ${ww.id}${worldOpen(i) ? '' : ' ' + ic('lock')}</button>`).join('')
    + `<button class="wtab sec ${curWorld === WORLDS.length ? 'on' : ''}" data-a="world" data-w="${WORLDS.length}">Geheim ${nSec}/${SECRET_WORLD.levels.length}</button>`;
  const cards = w.levels.map(id => {
    const l = levelById(id), open = levelOpen(id), best = D.best[id], info = LEVEL_INFO[id], rk = D.ranks[id];
    if (l.secret && !open) return `<button class="card locked secretcard" data-a="nope"><span class="no">???</span><b>???</b>
      <small>${l.coinsNeeded ? `Öffnet sich bei ${l.coinsNeeded} Schaufelmünzen (${totalCoins(D)})` : `Irgendwo in ${esc(l.from)} …`}</small></button>`;
    const coins = Array.from({ length: info.coins }, (_, k) => `<i class="${(D.coins[id] || []).includes(k) ? 'on' : ''}"></i>`).join('');
    return `<button class="card ${open ? '' : 'locked'} ${sel === id ? 'sel' : ''} th-${l.theme} ${l.secret ? 'secretcard' : ''}" data-a="${open ? 'pick' : 'nope'}" data-id="${id}">
      <span class="no">${esc(id)}</span><b>${esc(l.name)}</b>${rk ? `<span class="rank r${rk}">${rk}</span>` : ''}
      ${l.secret ? '' : `<span class="cstars">${(D.stars[id] || [0, 0, 0]).map(v => ic(v ? 'star' : 'starOff')).join('')}</span>`}
      <span class="ccoins">${coins}</span>
      <small>${open ? (best ? fmtTime(best) : 'Neu') : 'Gesperrt'}${open && info.secrets ? ` · ${Math.min(D.secrets[id] || 0, info.secrets)}/${info.secrets} Geheim.` : ''}</small></button>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="title">‹</button><h2>${w.id === '?' ? '' : `Welt ${w.id} · `}${esc(w.name)}</h2><span class="gems">${ic('scroll')} ${completion(D)} % ${ic('gem')} ${D.gems}</span></div>
    <div class="wtabs">${tabs}</div>
    <div class="cards">${cards}</div>
    <div id="detail">${sel ? '' : '<p class="note">Wähle ein Level.</p>'}</div>
    <div class="row"><button class="treasurebtn" data-a="treasury">Schatzkammer${keyCount() ? ` <span class="badge">${keyCount()}</span>` : ''}</button><button data-a="collection">Sammlung</button><button data-a="forge">Schmiede</button><button data-a="armory">Waffen ${Object.keys(D.weapons).length}/${WEAPONS.length}</button><button data-a="achs">Erfolge ${Object.keys(D.ach).length}/${ACH.length}</button><button data-a="wardrobe">Garderobe</button><button data-a="options">Optionen</button></div>
    <p class="note soon">Münzen ${totalCoins(D)}/${TOTAL_COINS} · Welt 4 · Kristallmagen — in Arbeit</p>
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
    const cur = D[key], nx = cur + 1, can = nx < AVAILABLE, price = PRICE[nx], sp = SHARD_PRICE[nx] || 0, afford = D.gems >= price && D.shards >= sp;
    const chips = TIERS.map((t, i) => `<canvas class="gi ${i === cur ? 'cur' : ''} ${i <= cur ? 'own' : i < AVAILABLE ? '' : 'lock'}" data-gi="${key}:${i}" title="${esc(t.name)}"></canvas>`).join('');
    return `<div class="gear">
      <div class="gh"><b>${name}: <span class="tn" style="--c:${TIERS[cur].light}">${esc(TIERS[cur].name)}</span></b><small>${esc(table[cur].perk)}</small></div>
      <div class="chips">${chips}</div>
      ${nx < TIERS.length ? `<div class="next"><span>Nächste Stufe: <b class="tn" style="--c:${TIERS[nx].light}">${esc(TIERS[nx].name)}</b> — ${esc(table[nx].perk)}</span>
        ${can ? `<button class="${afford ? 'big' : 'off'}" data-a="buy" data-k="${key}">${ic('gem')} ${price}${sp ? ` + ${ic('dia')} ${sp}` : ''}</button>` : ''}</div>` : '<div class="next">Maximum erreicht.</div>'}
    </div>`;
  };
  const nA = Math.min(D.armor + 1, TIERS.length - 1), nS = Math.min(D.shovel + 1, TIERS.length - 1);
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Schmiede</h2><span class="gems">${ic('gem')} ${D.gems} · ${ic('dia')} ${D.shards}</span></div>
    <div class="forge"><div class="pv"><canvas id="preview" width="216" height="120"></canvas><small>Jetzt <span>→</span> nächste Stufe</small></div>
      <div class="rows">${row('shovel', 'Schaufel', SHOVEL)}${row('armor', 'Rüstung', ARMOR)}
      <div class="gear"><div class="gh"><b>Waffe: ${D.weapon ? esc(weaponById(D.weapon).name) : 'keine (normale Schaufel)'}</b><small>Legendäre und mythische Waffen findest du nicht im Laden.</small></div><div class="next"><span></span><button data-a="armory">Waffenkammer</button></div></div>
      <div class="gear"><div class="gh"><b>Relikte: ${D.relicSlots.filter(Boolean).length} / 3 angelegt</b><small>Relikte, Spuren und Auren findest du in Truhen. Splitter ${ic('dia')} für die Stufen 7–12 auch.</small></div><div class="next"><span></span><button data-a="treasury">Schatzkammer</button><button data-a="collection">Sammlung</button></div></div></div></div>
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
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 16, 18, 1, 0, 0, 8);
      const nh = S.hero(nA, nS, null), locked = nA >= AVAILABLE && nS >= AVAILABLE;
      R.x.globalAlpha = locked ? 0.45 : 1; R.figure(nh, 52, 18, 1, 3, 0, 6); R.x.globalAlpha = 1;
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
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 14, 12, 1, 1, menuT, 8, null, 0, 16, 2, 0);
      R.figure(S.hero(D.armor, D.shovel, D.weapon), 34, 12, 1, 3, 0, 6);
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
    <p class="note">${online() ? 'Online-Geister: aktiv.' : 'Online-Geister: aus (siehe README).'} Version 0.10</p>
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
    case 'treasury': return treasury();
    case 'collection': return collection();
    case 'map': goFullscreen(); return map();
    case 'forge': return forge();
    case 'armory': return armory();
    case 'achs': return achs();
    case 'wardrobe': return wardrobe();
    case 'scarf': D.scarf = id; save.write(); sfx('buy'); return wardrobe(`${esc(SCARVES.find(x => x.id === id).name)} angezogen.`);
    case 'daily': return claimDaily();
    case 'cheats': return cheatbook();
    case 'cheatenter': {
      const v = $('#cheatcode').value, c = cheatByCode(v);
      if (!v.trim()) return;
      if (/^(GAMEBOY|RETRO)$/i.test(v.trim())) { toggleRetro(); return cheatbook('Die Farben verblassen … oder kehren zurück.'); }
      if (!c) { sfx('nope'); return cheatbook('Nichts geschieht. Das Wort hat keine Macht.'); }
      D.cheatsKnown[c.id] = true; D.cheatsOn[c.id] = true; save.write(); sfx('legend');
      return cheatbook(`${esc(c.name)} erwacht.`);
    }
    case 'cheattoggle': D.cheatsOn[id] = !D.cheatsOn[id]; save.write(); sfx(D.cheatsOn[id] ? 'secret' : 'click'); return cheatbook();
    case 'logo': { const now = Date.now(); logoTaps = logoTaps.filter(t => now - t < 3000); logoTaps.push(now); if (logoTaps.length >= 7) { logoTaps = []; toggleRetro(); } return; }
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
      const sp = SHARD_PRICE[nx] || 0;
      if (nx >= AVAILABLE || D.gems < price) { sfx('nope'); return forge(`Dir fehlen noch ${price - D.gems} Edelsteine.`); }
      if (D.shards < sp) { sfx('nope'); return forge(`Dir fehlen noch ${sp - D.shards} Splitter. Die gibt es in der Schatzkammer.`); }
      D.gems -= price; D.shards -= sp; D[k] = nx; save.write(); sfx('legend');
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

initTreasury({ D, save, sfx, haptic, show, ic, serifImg, S, R, esc, back: () => lastMenu, checkAch });
ui.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { unlockAudio(); treasuryClick(b) || collectionClick(b); } });
splash();
refreshLogo(() => { if (mode === 'menu' && document.querySelector('.title')) title(); else if (document.querySelector('.splash')) splash(); });
requestAnimationFrame(loop);
