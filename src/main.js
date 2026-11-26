// Start, Hauptschleife und Menüs.
import { Game } from './game.js';
import { DUELS } from './duels.js';
import { HUNTS } from './hunts.js';
import { LEVELS, WORLDS, levelById } from './levels.js';
import { THEMES } from './themes.js';
import { TIERS, SHOVEL, ARMOR, PRICE, AVAILABLE } from './gear.js';
import { Renderer } from './render.js';
import { initInput, pollInput, clearInput, setStickMode } from './input.js';
import { unlockAudio, sfx, playMusic, stopMusic, setAudio , setSpace, setAmbience, stopAmbience, stepSound, setIntensity, setMuffle, heartbeat } from './audio.js';
import { decodeGhost as decodeGhostOld, fmtTime } from './ghost.js';
import { replayOf, encodeReplay, decodeReplay, ghostFromReplay } from './replay.js';
// Geister: neue Codes (SH2) sind Tastendruck-Aufzeichnungen und werden nachgespielt; alte (SH1) enthalten Positionen
async function decodeGhost(code) {
  if (/SH2\./.test(code || '')) { const r = await decodeReplay(code.trim()); return r ? ghostFromReplay(r, r.name) : null; }
  return decodeGhostOld(code);
}
import { save } from './save.js';
import { online, uploadGhost, topGhosts , uploadDailyRun, fetchDailyMarks, dailyBetter , cloudSave, cloudLoad, uploadDeaths } from './online.js';
import * as S from './sprites.js';
import { initSkin, ic, logoImg, refreshLogo, serifImg } from './ui-skin.js';
import { CHEATS, cheatByCode, activeCheats, playCheats } from './cheats.js';
import { relicMods, SHARD_PRICE, CHESTS } from './loot.js';
import { generateLevel, BIOMES, STYLE_NAME as STYLE_NAME0 } from './gen.js';
const STYLE_NAME = { ...STYLE_NAME0, arena: 'Wächter' };
const bioName = L => L.biome || (BIOMES.find(b => b.id === L.theme) || {}).name || '';
import { darkness } from './atmo.js';
import { cleanName } from './names.js';
import { CONFIG } from './config.js';
import { GEN_VERSION } from './gen.js';
import { dayKey, dayNumber, daySeed, stageDepth, depthStage, msUntilTomorrow, MSG_A, MSG_B, msgText, encodeMark, decodeMark, shareText } from './daily.js';
import { initTreasury, treasury, treasuryClick, collection, collectionClick } from './treasury.js';
import { WEAPONS, RARITY, weaponById, finishWeapons, hasRoyalChests } from './weapons.js';
import { SECRET_WORLD, QUAL_WORLD } from './levels.js';
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
const T_ = 16;
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
    // 13 Kacheln breit statt 10: im Hochformat mehr Vorausblick
    VW = 208; VH = Math.max(170, Math.min(280, Math.round(VW * cssH / innerWidth)));
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
  autoQuality(now - last);
  acc += Math.min(100, now - last); last = now;
  const spd = mode === 'play' || mode === 'won' ? (D.cheatsOn.espresso ? 1.5 : D.cheatsOn.zeitlupe ? 0.5 : 1) : 1;
  const stepMs = 1000 / 60 / spd;
  while (acc >= stepMs) { acc -= stepMs; tick(); }
  R.alpha = mode === 'play' ? Math.max(0, Math.min(1, acc / stepMs)) : 1;
  draw();
  requestAnimationFrame(loop);
}
const SURF = { wald: 'gras', dornen: 'gras', hoehle: 'stein', grotte: 'stein', bau: 'erde', uhrturm: 'metall', glocke: 'stein', pendel: 'metall', pilz: 'pilz', moder: 'erde' };
const surfaceOf = c => c === '=' || c === 'm' || c === undefined ? 'holz' : c === 'D' ? 'erde' : c === 'S' || c === 'R' ? 'stein' : c === 'B' || c === 'c' ? 'pilz' : SURF[level.theme] || 'erde';
let tension = 0;
function tick() {
  if (mode === 'descent') { menuT++; return descentTick(); }
  if (mode !== 'play' && mode !== 'won') { menuT++; return; }
  let inp = mode === 'play' ? pollInput() : { };
  if (D.cheatsOn.spiegel && mode === 'play') inp = { ...inp, left: inp.right, right: inp.left };
  if (game.sign) for (const c of CHEATS) if (!D.cheatsKnown[c.id] && game.sign.includes(c.code)) learnCheat(c);
  game.step(inp);
  // Spannung: nahe Gegner oder Boss lassen die Musik anschwellen
  if (mode === 'play') {
    const p = game.p; let near = 0;
    if (game.boss && !game.boss.dead && game.boss.state !== 'idle') near = 1;
    else for (const e of game.ents) if (e.foe && !e.dead && !e.hidden) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 140) near = Math.max(near, 1 - d / 140 + 0.3); }
    tension += (Math.min(1, near) - tension) * 0.02; if (game.frame % 15 === 0) setIntensity(tension);
    heartbeat(p.hp > 0 && p.hp <= 1 && p.maxhp > 2);
  }
  for (const e of game.events) {
    if (e.name === 'step') { stepSound(surfaceOf(e.v)); continue; }
    sfx(e.name, e.v);
    haptic(e.name);
    if (e.name === 'unlock') unlockWeapon(e.v, true);
    if (e.name === 'check') moment('LATERNE ENTZÜNDET', 'Hier kehrst du zurück', 'gold', 2.6);
    if (e.name === 'bossDie') moment('GROSSER FEIND BEZWUNGEN', level.name, 'gold', 4.6);
    if (e.name === 'die') moment(tsRun(level) ? 'DER SCHACHT NIMMT DICH' : hcRun(level) ? 'DER LAUF ENDET' : 'DU BIST GEFALLEN', tsRun(level) ? `Stufe ${D.ts.k}` : '', 'death', 2.8);
    if (e.name === 'soul') { sfx('legend'); haptic('unlock'); }
    if (e.name === 'die' && tsRun(level)) { const lv = level; setTimeout(() => { if (level === lv && mode === 'play') tsDeath(); }, 1100); }
    if (e.name === 'die' && hcRun(level)) { const lv = level; setTimeout(() => { if (level === lv && mode === 'play') hcEnd(); }, 1100); }
    if (e.name === 'timeout') { moment('ZEIT ABGELAUFEN', 'Die Tiefe beginnt neu', 'death', 2.4); const lv = level; setTimeout(() => { if (level === lv && mode === 'play') startLevel(lv.id, curCodes); }, 1200); }
    if (e.name === 'chest' && e.v && !playCheats(D).length) {
      D.chests[e.v] = true;
      save.write();
      if (hasRoyalChests(D.chests)) unlockWeapon('goldschaufel', true);
    }
    if (e.name === 'die' && !level.gen) { const dm = D.deathMap[level.id] = D.deathMap[level.id] || []; dm.push(Math.round(game.p.x / T_)); if (dm.length > 120) dm.shift(); }
    if (e.name === 'die') { D.deathsTotal++; save.write(); checkAch(); }
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
  if (R.atmo) { R.atmo.noFlash = !D.a11y.flash; if (D.quality !== 'auto') R.atmo.low = D.quality === 'niedrig'; }
  R.look = D.look; R.scarfStyle = D.scarf; R.crown = /^raphi$/i.test(D.name || ''); R.noIntro = true;
  const playing = game && mode !== 'menu';
  canvas.style.filter = playing && D.cheatsOn.disco ? `hue-rotate(${(menuT * 0 + performance.now() / 8) % 360}deg) saturate(1.4)` : '';
  canvas.style.transform = (document.body.classList.contains('portrait') ? 'translateX(-50%)' : 'translate(-50%,-50%)') + (playing && D.cheatsOn.spiegel ? ' scaleX(-1)' : '');
  if (mode === 'descent') drawDescent(); else if (game && mode !== 'menu') R.draw(game, ghosts); else drawMenuBg();
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
  game = new Game(level, { shovel: D.shovel, armor: D.armor, weapon: D.weapon }, { seed: 7, roamerSeed: level.gen ? (level.seed ^ Math.imul(level.depth, 2654435761)) >>> 0 : Math.floor(Math.random() * 0x100000000), cheats: Object.fromEntries(activeCheats(D).map(id => [id, true])), relics: relicMods(D), autoPogo: D.autoPogo !== false, ...runOpts(level) });
  ghosts = [];
  for (const c of ghostCodes) { const g = await decodeGhost(c); if (g && g.level === id) { g.own = c === D.ghosts[id]; ghosts.push(g); } }
  R.snapCamera(game);
  clearInput();
  hideUI(); mode = 'play';
  touchEl.hidden = !isTouch; pauseBtn.hidden = false;
  playMusic(THEMES[level.theme].music);
  setAmbience(level.theme); setMuffle(false); tension = 0; setIntensity(0);
  setSpace(darkness(level) >= 0.6 ? 'cave' : ['uhrturm', 'glocke', 'pendel', 'bau'].includes(level.theme) ? 'hall' : 'open');
  goFullscreen();
  const wn = ALLW().find(w => w.levels.includes(id));
  const sub = tsRun(level) ? `Tagesschacht #${dayNumber()} · Stufe ${D.ts.k} · ${bioName(level)}` : level.gen ? `Tiefe ${level.depth} · ${bioName(level)} · ${STYLE_NAME[level.style]}` : wn ? (wn.id === '?' ? 'Geheimer Ort' : `Welt ${wn.id} · ${wn.name}`) : '';
  setTimeout(() => { if (game && game.level === level) moment(level.name.toUpperCase(), sub, level.secret || level.gen ? 'jade' : 'gold', 3.2); }, 250);
}
function pause() { mode = 'pause'; touchEl.hidden = true; pauseBtn.hidden = true; sfx('click'); setMuffle(true); show(`
  <div class="panel small"><h2>Rast</h2>${playCheats(D).length ? '<p class="warn">Schummelwörter aktiv</p>' : ''}
  ${tsRun(level) && !D.ts.msg ? '<button data-a="tsmsg">Botschaft hinterlassen</button>' : ''}
  ${tsRun(level) ? '<p class="warn">Verlassen beendet deinen Tagesschacht.</p>' : ''}
  <button class="big" data-a="resume">Weiter</button>
  <button data-a="restart">Neu starten</button>
  <button data-a="map">Zur Karte</button>
  ${toggles()}</div>`); }
function resume() { setMuffle(false); hideUI(); clearInput(); mode = 'play'; touchEl.hidden = !isTouch; pauseBtn.hidden = false; }

async function finish() {
  cloudBackup(false);
  if (level.gen) return finishEndless();
  const id = level.id, frames = game.frame, first = !D.cleared[id];
  const viaSecret = game.exit === 'secret';
  const cheated = playCheats(D).length > 0;
  if (cheated) game.coins = [];
  const bonus = first ? (level.qual ? 1000 : level.boss ? 300 : level.secret ? 250 : 100) : 0;
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
  if (!level.secret && !level.qual) D.unlocked = Math.max(D.unlocked, li + 2);
  // Geheimausgang
  let secretMsg = '';
  const discovered = DUELS.filter(b => !D.secretOpen[b.id] && b.open(D));
  for (const b of discovered) D.secretOpen[b.id] = true;
  if (viaSecret && level.secretExit && !D.secretOpen[level.secretExit]) { D.secretOpen[level.secretExit] = true; secretMsg = `Geheimlevel entdeckt: ${levelById(level.secretExit).name}`; }
  const gruft = LEVELS.find(l => l.coinsNeeded);
  if (gruft && !D.secretOpen[gruft.id] && totalCoins(D) >= gruft.coinsNeeded) { D.secretOpen[gruft.id] = true; secretMsg = (secretMsg ? secretMsg + ' · ' : '') + 'Die Schaufelgruft hat sich geöffnet!'; }
  if (discovered.length) secretMsg = [secretMsg, ...discovered.map(b => b.hall + ' entdeckt · Karte → Geheim')].filter(Boolean).join(' · ');
  // Rang
  const info = LEVEL_INFO[id];
  const rank = rankFor(level, { frames, deaths: game.deaths, coinsGot: D.coins[id].length, coinsTotal: info.coins, secretsGot: D.secrets[id], secretsTotal: info.secrets });
  const oldRank = D.ranks[id], newRank = !oldRank || RANK_ORDER[rank] > RANK_ORDER[oldRank];
  if (newRank && !cheated) D.ranks[id] = rank;
  const old = D.best[id], record = !cheated && (!old || frames < old);
  const code = await encodeReplay(replayOf(game, { name: D.name || 'Ich' }));
  if (record) { D.best[id] = frames; D.ghosts[id] = code; }
  // Waffen-Bedingungen am Levelende
  for (const weapon of finishWeapons(game, ghosts)) unlockWeapon(weapon);
  // Schlüssel für die Schatzkammer (jeder Anlass zählt nur einmal pro Level)
  let keyHtml = '';
  const award = (tag, kind, why) => { const k = id + ':' + tag; if (cheated || D.keyLog[k]) return; D.keyLog[k] = true; keyHtml += grantKey(kind, 1, why); };
  if (first) award('clear', level.boss || level.qual ? 'urlicht' : level.secret ? 'gold' : 'holz', level.qual ? 'Qualpfad bezwungen' : level.boss ? 'Boss bezwungen' : level.secret ? 'Geheimer Ort' : 'Erstmals geschafft');
  if (first && level.qual) { D.gems += 1500; D.earned += 1500; }
  if (!level.secret && D.stars[id] && D.stars[id].every(Boolean)) award('stars', 'eisen', 'Alle drei Sterne');
  if (info.coins && D.coins[id].length >= info.coins) award('coins', 'eisen', 'Alle Münzen');
  if (D.ranks[id] === 'S') award('rankS', 'gold', 'S-Rang');
  save.write();
  checkAch();
  let up = '';
  if (record && online() && D.name) up = (await uploadGhost({ level: id, name: D.name, frames, code })) ? 'Online hochgeladen.' : 'Online-Upload fehlgeschlagen.';
  stopMusic(); sfx('win');
  mode = 'result';
  const next = viaSecret && level.secretExit ? levelById(level.secretExit) : level.secret ? null : level.qual ? null : LEVELS.slice(li + 1).find(l => !l.secret && !l.qual);
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
let updateReady = false;
const cloudToken = () => { if (!D.cloudToken) { const a = new Uint8Array(18); crypto.getRandomValues(a); D.cloudToken = [...a].map(b => b.toString(16).padStart(2, '0')).join(''); save.write(); } return D.cloudToken; };
let lastCloud = 0;
async function cloudBackup(force) {
  if (!online() || (!force && Date.now() - lastCloud < 10 * 60000)) return false;
  lastCloud = Date.now(); return cloudSave(cloudToken(), await save.exportCode());
}
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
  if (playCheats(D).length || D.weapons[id] || !weaponById(id)) return;
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
      <div><small style="color:${r.col}">${w.secret ? '???' : r.name}</small><b>???</b><p>${esc(w.hint)}</p></div></div>`;
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
/* ---------- Flüche und Läufe ohne Wiederkehr ---------- */
const CURSES = [
  { id: 'einherz', name: 'Einherz', desc: 'Nur ein Herz.', mul: 1 },
  { id: 'finsternis', name: 'Finsternis', desc: 'Fast völlige Dunkelheit, kleiner Lichtkreis.', mul: 0.5 },
  { id: 'flut', name: 'Gegnerflut', desc: 'Doppelt so viele Gegner.', mul: 0.6 },
  { id: 'zeitdruck', name: 'Zeitdruck', desc: 'Über der Zielzeit beginnt die Tiefe neu.', mul: 0.5 },
  { id: 'elite', name: 'Elite', desc: 'Jeder Gegner ist ein Elitegegner.', mul: 0.8 },
];
const cursesOpen = () => D.endless.best >= 10;
const hcRun = L => L && L.gen && D.endless.hc && D.endless.hc.on && L.seed === D.endless.hc.seed && L.depth === D.endless.hc.depth;
const mainRun = L => L && L.gen && L.seed === D.endless.seed && L.depth === D.endless.depth;
const activeCurses = () => cursesOpen() ? Object.fromEntries(CURSES.filter(c => D.endless.curses && D.endless.curses[c.id]).map(c => [c.id, true])) : {};
const curseMul = () => 1 + CURSES.filter(c => activeCurses()[c.id]).reduce((a, c) => a + c.mul, 0);
function runOpts(L) {
  if (!L.gen) return {};
  if (tsRun(L)) { const k = D.ts.k; D.ts.inStage = k; save.write(); return { elite: L.elite || 0, bossTier: L.bossTier || 0, noCheck: true, hudLabel: 'STUFE ' + k, marks: tsMarksFor(k) }; }
  const o = { elite: L.elite || 0, bossTier: L.bossTier || 0 };
  if (mainRun(L) || hcRun(L)) { o.curses = activeCurses(); if (o.curses.zeitdruck) o.timeLimit = Math.round(L.par * 60); }
  if (hcRun(L)) o.noCheck = true;
  return o;
}
function hcEnd() {
  const H = D.endless.hc, dep = H.depth - 1;
  H.on = false; H.best = Math.max(H.best || 0, dep); save.write();
  stopMusic(); mode = 'result';
  show(`<div class="panel small result">
    <h2>Ohne Wiederkehr</h2>
    <p class="lvl">Der Lauf endet in Tiefe ${H.depth}</p>
    <div class="stats"><div><small>Geschafft</small><b>${dep}</b><em>Tiefen</em></div><div><small>Rekord</small><b>${H.best}</b><em>ohne Wiederkehr</em></div><div><small>Samen</small><b>${H.seed}</b></div></div>
    <div class="row"><button class="big" data-a="hcstart">Neuer Lauf</button><button data-a="endless">Übersicht</button></div>
  </div>`);
}
/* ---------- Zugänglichkeit und Grafik ---------- */
function applyA11y() {
  const A = D.a11y;
  document.documentElement.style.setProperty('--ui-scale', A.uiScale || 1);
  document.body.classList.toggle('bigui', A.uiScale > 1);
  R.shakeMul = A.shake; R.symbols = A.symbols;
  const at = R.atmo; if (at) { at.noFlash = !A.flash; if (D.quality !== 'auto') at.low = D.quality === 'niedrig'; }
  const a = touchEl.querySelector('.a'), b = touchEl.querySelector('.b');
  if (a && b) { a.dataset.k = A.swapAB ? 'attack' : 'jump'; b.dataset.k = A.swapAB ? 'jump' : 'attack'; a.innerHTML = A.swapAB ? 'B<em>Schaufel</em>' : 'A<em>Sprung</em>'; b.innerHTML = A.swapAB ? 'A<em>Sprung</em>' : 'B<em>Schaufel</em>'; }
}
// Automatische Grafikstufe: dauerhaft langsame Bilder schalten Wetter, Vordergrund und Farblicht zurück
let frameEma = 16, slowFrames = 0, fastFrames = 0;
function autoQuality(dt) {
  frameEma += (dt - frameEma) * 0.05;
  const at = R.atmo; if (!at || D.quality !== 'auto' || mode !== 'play') return;
  if (frameEma > 21) { if (++slowFrames > 120 && !at.low) { at.low = true; slowFrames = 0; } } else slowFrames = 0;
  if (frameEma < 13) { if (++fastFrames > 600 && at.low) { at.low = false; fastFrames = 0; } } else fastFrames = 0;
}
/* ---------- Tagesschacht ---------- */
let tsServer = { date: '', marks: [], at: 0 }, tsLoading = null;
// Blutflecken und Botschaften aller Spieler automatisch vom Server holen (höchstens jede Minute)
function tsRefresh(force) {
  if (!online()) return Promise.resolve();
  const date = tsToday().date;
  if (!force && tsServer.date === date && Date.now() - tsServer.at < 60000) return Promise.resolve();
  if (tsLoading) return tsLoading;
  tsLoading = fetchDailyMarks(date).then(ms => { tsServer = { date, marks: ms, at: Date.now() }; }).finally(() => { tsLoading = null; });
  return tsLoading;
}
function tsToday() {
  const key = dayKey(), T = D.ts;
  if (T.date !== key) { Object.assign(T, { date: key, k: 1, done: false, path: [], end: null, msg: null, carried: 0, frames: 0, better: null, replays: [] }); for (const d in T.marks) if (d !== key) delete T.marks[d]; save.write(); }
  return T;
}
const tsSeed = () => daySeed(tsToday().date);
const tsId = k => genId(tsSeed(), stageDepth(k));
const tsRun = L => L && L.gen && D.ts.date === dayKey() && !D.ts.done && L.seed === daySeed(D.ts.date) && depthStage(L.depth) === D.ts.k;
function tsAllMarks() { const own = D.ts.marks[D.ts.date] || []; return [...(tsServer.date === D.ts.date ? tsServer.marks : []), ...own]; }
function tsMarksFor(k) {
  const out = [];
  for (const m of tsAllMarks()) {
    if ((m.v || m.gv || 1) !== GEN_VERSION) continue;
    if (m.k === k && m.x) out.push({ type: 'stain', x: m.x, y: m.y, name: m.name, tail: m.tail });
    if (m.ma >= 0 && m.mk === k) out.push({ type: 'msg', x: m.mx, y: m.my, name: m.name, text: msgText(m.ma, m.mb) });
  }
  return out.slice(0, 60);
}
const tsStreak = () => { let n = 0; const d = new Date(); if (!D.ts.history[dayKey(d)]) d.setDate(d.getDate() - 1); while (D.ts.history[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; };
const pathKind = L => L.bossTier ? 'boss' : L.chase ? (L.chase.kind === 'lava' ? 'lava' : 'chase') : L.style === 'hoehle' ? 'dark' : 'n';
function tsCode() { const T = D.ts, e = T.end || {}; return encodeMark({ date: T.date, name: D.name || 'Namenlos', k: e.k || T.k, x: e.x || 0, y: e.y || 0, ...(T.msg || {}) }); }
function tsShare() {
  const T = D.ts, txt = shareText({ num: dayNumber(), stage: T.end ? T.end.k : T.k, time: fmtTime(T.frames + (T.end ? T.end.frames : 0)), path: T.path, carried: T.carried, code: tsCode(), better: T.better });
  if (navigator.share) navigator.share({ text: txt }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Kopiert', 'Ergebnis in der Zwischenablage.'), () => {});
  return txt;
}
function tsAbandoned() {
  // Wer eine Stufe verlässt (Menü, App geschlossen), hat sie nicht überlebt
  const T = D.ts;
  if (!T.inStage || T.done || T.date !== dayKey() || (mode === 'play' && tsRun(level))) return false;
  T.done = true; T.end = { k: T.k, x: 0, y: 0, frames: 0, tail: [], abandoned: true }; T.history[T.date] = T.k; T.inStage = 0; save.write();
  if (online()) uploadDailyRun({ date: T.date, name: D.name || 'Namenlos', device: D.device, gv: GEN_VERSION, k: T.k, frames: T.frames, x: 0, y: 0, tail: [], carried: T.carried, ...(T.msg || {}) });
  return true;
}
async function tsDeath() {
  const T = D.ts, p = game.p; T.inStage = 0;
  (T.replays = T.replays || []).push(await encodeReplay(replayOf(game)));
  T.done = true; T.end = { k: T.k, x: Math.round(p.x), y: Math.round(p.y), frames: game.frame, tail: game.rec.slice(-90) };
  T.history[T.date] = T.k; T.carried += game.carried.length; save.write();
  if (online()) uploadDailyRun({ replay: (T.replays || []).join(' '), date: T.date, name: D.name || 'Namenlos', device: D.device, gv: GEN_VERSION, k: T.k, frames: T.frames + game.frame, x: T.end.x, y: T.end.y, tail: T.end.tail, carried: T.carried, ...(T.msg || {}) })
    .then(() => dailyBetter(T.date, T.k)).then(b => { T.better = b; save.write(); if (document.querySelector('.tsresult')) tagesschacht(); });
  tagesschacht();
}
function tagesschacht(msg = '') {
  stopAmbience(); setIntensity(0); setMuffle(false); setSpace('open'); mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'tagesschacht';
  playMusic(THEMES.karte.music);
  const mo = $('#moment'); if (mo) mo.className = '';
  const abandoned = tsAbandoned(); if (abandoned && !msg) msg = 'Du hast den Schacht mitten in einer Stufe verlassen. Das zählt als Tod.';
  const T = tsToday(), num = dayNumber(), left = msUntilTomorrow(), hh = Math.floor(left / 36e5), mm = Math.floor(left / 6e4) % 60;
  if (online() && (tsServer.date !== T.date || Date.now() - tsServer.at > 60000)) tsRefresh().then(() => { if (document.querySelector('.ts') && mode === 'menu') tagesschacht(msg); });
  const marks = tsAllMarks(), stains = marks.filter(m => m.x).length, hist = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const v = T.history[dayKey(d)]; return `<i class="${v ? 'on' : ''}" title="${dayKey(d)}">${v || ''}</i>`; }).join('');
  const preview = levelById(tsId(1));
  show(`<div class="panel ts ${T.done ? 'tsresult' : ''}">
    <div class="top"><button class="back" data-a="title">‹</button><h2>Tagesschacht #${num}</h2><span class="gems">Serie ${tsStreak()} ${ic('flame')}</span></div>
    ${T.done ? `
      <div class="tsend"><p class="rar">${T.end.abandoned ? 'Mitten in der Stufe verlassen' : 'Der Schacht hat dich verschlungen'}</p>
        <div class="tsbig">${serifImg('Stufe ' + T.end.k, 16, 'red', 3)}</div>
        <p class="note">${T.path.length} ${T.path.length === 1 ? 'Stufe' : 'Stufen'} bezwungen · ${fmtTime(T.frames + T.end.frames)}${T.carried ? ` · ${T.carried} ${T.carried === 1 ? 'Seele' : 'Seelen'} getragen` : ''}${T.better != null ? ` · besser als ${T.better} %` : ''}</p>
        <p class="tspath">${T.path.map(p => ({ n: '⛏️', boss: '👑', chase: '🌊', lava: '🔥', dark: '🌑' }[p])).join('')}💀</p>
        <div class="row"><button class="big" data-a="tsshare">Ergebnis teilen</button></div>
        <p class="note">Dein Blutfleck liegt jetzt im Schacht. Wer ihn findet, kann deine Seele tiefer tragen.</p>
        <p class="msg">Neuer Schacht in ${hh} h ${mm} min</p></div>`
    : `
      <p class="note">Ein Schacht für alle, jeden Tag neu. <b>Ein Leben</b>, keine Laternen-Rückkehr. Wie tief kommst du?</p>
      <div class="tsprev"><canvas class="mini" data-tsmini="1"></canvas><small>Stufe 1 · ${esc(preview.name)} · ${esc(bioName(preview))}</small></div>
      <div class="row"><button class="big" data-a="eplay" data-id="${tsId(T.k)}">${T.k > 1 ? `Weiter · Stufe ${T.k}` : 'Abstieg beginnen'}</button></div>
      <p class="note">Unterwegs liegen Blutflecken anderer. Berühre sie, um ihre Seele zu bergen und ihren letzten Moment zu sehen. ${T.msg ? 'Deine Botschaft liegt bereit.' : 'In der Pause kannst du eine Botschaft hinterlassen.'}</p>`}
    <div class="seedbox inset"><h3 class="sub">Blutflecken heute: ${stains}</h3>
      ${online() ? `<p class="note">${tsLoading ? 'Lade die Spuren der anderen …' : 'Die Blutflecken und Botschaften aller Spieler liegen automatisch in deinem Schacht.'}</p>
      <details class="tsmanual"><summary>Ohne Internet: Code von Freunden einfügen</summary>` : ''}
      <label class="field">Code von Freunden einfügen<textarea id="tscode" rows="2" placeholder="SHT.…"></textarea></label>
      <div class="row"><button data-a="tsimport">Blutfleck übernehmen</button></div>
      ${online() ? '</details>' : ''}
      ${msg ? `<p class="msg">${msg}</p>` : ''}
      <div class="tshist"><small>Letzte 7 Tage</small><div>${hist}</div></div>
    </div>
  </div>`);
  const cv = ui.querySelector('[data-tsmini]'); if (cv) { const m = miniMap(preview); cv.width = m.width; cv.height = m.height; cv.getContext('2d').drawImage(m, 0, 0); }
}
function tsMessage() {
  mode = 'pause';
  show(`<div class="panel small"><h2>Botschaft</h2>
    <p class="note">Sie bleibt an dieser Stelle liegen. Andere lesen sie, wenn sie hier vorbeikommen. Eine pro Tag.</p>
    <label class="field">Wort<select id="ma">${MSG_A.map((t, i) => `<option value="${i}">${esc(t)}</option>`).join('')}</select></label>
    <label class="field">Zusatz<select id="mb">${MSG_B.map((t, i) => `<option value="${i}">${esc(t)}</option>`).join('')}</select></label>
    <button class="big" data-a="tsmsgset">Hinterlassen</button><button data-a="resume">Zurück</button></div>`);
}
/* ---------- Abstieg: nahtloser Übergang zur nächsten Tiefe ---------- */
let desc = null;
function startDescent(info) {
  if (online() && D.ts.date === dayKey() && !D.ts.done) tsRefresh(true);
  const next = levelById(info.nextId);
  desc = { ...info, t: 0, from: level, next, parts: [] };
  mode = 'descent'; touchEl.hidden = true; pauseBtn.hidden = true; stopMusic(); stopAmbience(); setIntensity(0);
  sfx('whoosh'); haptic('win');
  if (info.keyHtml) setTimeout(() => toast('Schlüssel erhalten', info.keyHtml.replace(/<[^>]+>/g, ' ').trim(), 'ach'), 600);
}
function descentTick() {
  const d = desc; if (!d) return;
  d.t++;
  if (d.t % 18 === 0) sfx('tick');
  if (d.t === 95) sfx('rarStep', 2);
  if (d.t >= 170) { desc = null; sfx('thud'); haptic('thud'); startLevel(d.next.id); }
}
addEventListener('pointerdown', () => { if (mode === 'descent' && desc && desc.t > 30) desc.t = Math.max(desc.t, 165); });
function drawDescent() {
  const d = desc; if (!d) return;
  const t = d.t, mid = t > 95, th = THEMES[(mid ? d.next : d.from).theme], ts = S.tileset(th), bg = S.backdrop(th, VH);
  ctx.drawImage(bg.sky, 0, 0, VW, VH); ctx.fillStyle = 'rgba(5,4,3,0.55)'; ctx.fillRect(0, 0, VW, VH);
  // Schachtwände rasen nach oben
  const sp = Math.min(9, 2 + t * 0.12) * (t > 150 ? (170 - t) / 20 : 1), off = (t * sp) % 16, wall = 3;
  for (let y = -16; y < VH + 16; y += 16) for (let k = 0; k < wall; k++) {
    ctx.drawImage(ts.fill[(k + Math.floor((y - off) / 16)) & 1 ? 1 : 0], k * 16, Math.round(y - off));
    ctx.drawImage(ts.fill[((k * 3 + Math.floor((y - off) / 16)) % 3 + 3) % 3], VW - (k + 1) * 16, Math.round(y - off));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(wall * 16, 0, 3, VH); ctx.fillRect(VW - wall * 16 - 3, 0, 3, VH);
  // Fahrtwind
  if (d.parts.length < 40) d.parts.push({ x: wall * 16 + Math.random() * (VW - wall * 32), y: VH + 4, v: 4 + Math.random() * 6 });
  for (const q of d.parts) { q.y -= q.v * Math.min(1, t / 30); ctx.fillStyle = 'rgba(232,220,192,0.35)'; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 6); if (q.y < -10) q.y = VH + 4; }
  const hs = S.hero(D.armor, D.shovel, D.weapon); R.x = ctx; R.t = menuT;
  const hy = VH * 0.42 + Math.sin(t / 8) * 3 + (t > 150 ? (t - 150) * 3 : 0);
  R.figure(hs, VW / 2 - 5, Math.round(hy), 1, 2, t, 8, null, 0, 16, 0, 6);
  // Tiefenzähler
  const shown = mid ? d.dep + 1 : d.dep;
  S.drawText(ctx, 'TIEFE', VW / 2, 16, '#a2937a', 1, 'center');
  S.drawText(ctx, String(shown), VW / 2, 26, mid ? '#c58bff' : '#d4b46a', 3, 'center');
  if (t > 20) S.drawText(ctx, `+${d.earned} EDELSTEINE · MÜNZEN ${d.coins}/${d.coinTotal}`, VW / 2, VH - 22, '#e8dcc0', 1, 'center');
  if (d.rec && t > 40) S.drawText(ctx, 'NEUER TIEFENREKORD', VW / 2, VH - 13, (t >> 3) & 1 ? '#ffd84a' : '#fff2a0', 1, 'center');
  if (mid && t < 130) { ctx.globalAlpha = (130 - t) / 35; ctx.fillStyle = '#c58bff'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VW * 0.7); vg.addColorStop(0, 'rgba(5,4,3,0)'); vg.addColorStop(1, 'rgba(5,4,3,0.85)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  if (t > 150) { ctx.fillStyle = `rgba(5,4,3,${(t - 150) / 20})`; ctx.fillRect(0, 0, VW, VH); }
}
/* ---------- Endlose Tiefen ---------- */
// Systeme öffnen sich der Reihe nach, damit neue Spieler nicht erschlagen werden
const UNLOCKS = [
  { id: 'daily', name: 'Tagesschacht', test: () => !!D.cleared['1-1'], hint: 'Schaffe 1-1', desc: 'Jeden Tag ein Schacht für alle. Ein Leben.' },
  { id: 'forge', name: 'Schmiede', test: () => !!D.cleared['1-1'], hint: 'Schaffe 1-1', desc: 'Bessere Schaufel und Rüstung für Edelsteine.' },
  { id: 'chests', name: 'Truhen', test: () => !!D.cleared['1-2'], hint: 'Schaffe 1-2', desc: 'Schlüssel und Edelsteine öffnen Truhen mit Relikten und Aussehen.' },
  { id: 'weapons', name: 'Waffenkammer', test: () => Object.keys(D.weapons).length > 0 || !!D.cleared['1-3'], hint: 'Finde eine geheime Waffe', desc: 'Geheime Waffen mit eigenen Kräften.' },
  { id: 'endless', name: 'Endlose Tiefen', test: () => !!D.cleared['1-B'], hint: 'Besiege den Boss von Welt 1', desc: 'Unendlich viele erzeugte Levels, immer tiefer.' },
];
const isOpen = id => { const u = UNLOCKS.find(x => x.id === id); return !u || u.test() || playCheats(D).length > 0 || D.gems >= 999999; };
const endlessOpen = () => isOpen('endless');
function announceUnlocks() {
  D.seenUnlocks = D.seenUnlocks || {};
  const fresh = UNLOCKS.filter(u => u.test() && !D.seenUnlocks[u.id]);
  fresh.forEach((u, i) => { D.seenUnlocks[u.id] = true; setTimeout(() => { toast('Neu: ' + u.name, u.desc, 'ach'); sfx('secret'); }, 600 + i * 1800); });
  if (fresh.length) save.write();
}
const eSeed = () => { if (!D.endless.seed) { D.endless.seed = 1 + Math.floor(Math.random() * 999999); save.write(); } return D.endless.seed; };
const genId = (seed, depth) => `∞${depth}-${seed}`;
const E0 = () => D.endless;
const STYLE_IC = { lauf: '▶', hoehle: '▬', abgrund: '◇', schacht: '▲', arena: '♛' };
function miniMap(L) {
  // Kachelkarte im Kleinformat: zeigt, wie verschieden die Levels sind
  const th = THEMES[L.theme], H = L.map.length, W = L.map[0].length, vert = H > W;
  const c = document.createElement('canvas'); c.width = vert ? H : W; c.height = vert ? W : H;
  const x = c.getContext('2d'); x.fillStyle = th.sky[0]; x.fillRect(0, 0, c.width, c.height);
  const col = { '#': th.dirt, D: th.dirtL, '=': th.plank, c: th.plank, '^': '#e04050', B: '#ff6ad0', V: '#c0c0d0', F: th.dirt, G: '#4fd2ff', O: '#ffd84a', E: '#ffffff', P: '#7dffcf', C: '#ffb020', m: th.plank, T: '#ffd84a' };
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    let ch = L.map[yy][xx]; if ('bofqwvsku'.includes(ch)) { x.fillStyle = '#ff5a5a'; } else if (col[ch]) x.fillStyle = col[ch]; else continue;
    if (ch === '#' && yy > 0 && L.map[yy - 1][xx] === '.') x.fillStyle = th.grass || th.dirtL;
    if (vert) x.fillRect(H - 1 - yy, xx, 1, 1); else x.fillRect(xx, yy, 1, 1);
  }
  return c;
}
function endless(msg = '') {
  stopAmbience(); setIntensity(0); setMuffle(false); setSpace('open'); mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'endless';
  playMusic(THEMES.karte.music);
  const seed = eSeed(), E = D.endless, cards = [];
  for (let k = 0; k < 4; k++) {
    const dep = E.depth + k, L = levelById(genId(seed, dep)), bio = { name: bioName(L) };
    cards.push(`<button class="dcard th-${L.theme} ${k ? 'later' : 'now'}" ${k ? 'data-a="nope"' : `data-a="eplay" data-id="${genId(seed, dep)}"`}>
      <span class="no">Tiefe ${dep}${dep % 5 === 0 ? ` · ${ic('lock')}` : ''}</span><b>${esc(L.name)}</b>
      <canvas class="mini" data-mini="${dep}"></canvas>
      <small>${esc(bio.name)} · ${STYLE_IC[L.style]} ${STYLE_NAME[L.style]}${L.chase ? ` · <span style="color:#ff7a6a">${{ wurm: 'Wurm jagt dich', decke: 'Einsturz', flut: 'Flut steigt', lava: 'Lava steigt' }[L.chase.kind]}</span>` : ''}</small></button>`);
  }
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="map">‹</button><h2>Endlose Tiefen</h2><span class="gems">Rekord ${E.best} · ${ic('gem')} ${D.gems}</span></div>
    <p class="note">Jede Tiefe wird aus dem Weltsamen erzeugt: neun Biome, vier Bauarten, immer neue Wege, Gegner, Münzen und Geheimkammern. Je tiefer, desto härter. Alle 5 Tiefen ein Schlüssel.</p>
    <div class="dcards">${cards.join('')}</div>
    <div class="row"><button class="big" data-a="eplay" data-id="${genId(seed, E.depth)}">Tiefe ${E.depth} betreten</button></div>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    ${cursesOpen() ? `<div class="seedbox inset"><h3 class="sub">Flüche · Belohnung ×${curseMul().toFixed(1)}</h3><div class="curses">${CURSES.map(c => `<button class="icard curse ${E.curses && E.curses[c.id] ? 'on' : ''}" data-a="curse" data-id="${c.id}"><div><b>${esc(c.name)}</b><small>${esc(c.desc)} +${Math.round(c.mul * 100)} %</small></div></button>`).join('')}</div></div>`
      : `<p class="note">Ab Tiefe 10 kannst du Flüche wählen: schwerer, aber mehr Beute. Wächter warten auf jeder zehnten Tiefe.</p>`}
    <div class="seedbox inset hcbox"><h3 class="sub">Ohne Wiederkehr</h3>
      <p class="note">Neue Welt ab Tiefe 1, Laternen leuchten nur noch. Der erste Tod beendet den Lauf. Beute ×1,5. Rekord: <b>${(E.hc && E.hc.best) || 0}</b></p>
      <div class="row">${E.hc && E.hc.on ? `<button class="big" data-a="eplay" data-id="${genId(E.hc.seed, E.hc.depth)}">Lauf fortsetzen · Tiefe ${E.hc.depth}</button>` : '<button class="danger" data-a="hcstart">Lauf beginnen</button>'}</div></div>
    <div class="seedbox inset">
      <label class="field">Weltsamen (teilen = dieselbe Welt)<input id="eseed" inputmode="numeric" maxlength="9" value="${seed}"></label>
      <div class="row"><button data-a="eseed">Samen übernehmen</button><button data-a="ereroll">Neu würfeln</button></div>
      <p class="note">Ein neuer Samen beginnt wieder bei Tiefe 1. Dein Rekord bleibt.</p>
    </div>
  </div>`);
  for (const cv of ui.querySelectorAll('[data-mini]')) {
    const L = levelById(genId(+(cv.dataset.seed || seed), +cv.dataset.mini)), m = miniMap(L);
    cv.width = m.width; cv.height = m.height; cv.getContext('2d').drawImage(m, 0, 0);
  }
}
async function finishEndless() {
  if (tsRun(level)) {
    const T = D.ts, k = T.k, earned = Math.round(game.gems * 1.3) + 60 + k * 30; T.inStage = 0;
    (T.replays = T.replays || []).push(await encodeReplay(replayOf(game)));
    D.gems += earned; D.earned += earned; T.path.push(pathKind(level)); T.frames += game.frame; T.carried += game.carried.length; T.k = k + 1; T.history[T.date] = Math.max(T.history[T.date] || 0, k);
    let keyHtml = ''; const kk = 'T' + T.date + ':' + k;
    if ((k === 5 || k === 10) && !D.keyLog[kk]) { D.keyLog[kk] = true; keyHtml = grantKey(k === 10 ? 'urlicht' : 'gold', 1, `Tagesschacht Stufe ${k}`); }
    save.write(); checkAch();
    return startDescent({ dep: k, earned, coins: game.coins.length, coinTotal: (level.map.join('').match(/O/g) || []).length, keyHtml, rec: false, nextId: tsId(k + 1) });
  }
  const E = D.endless, dep = level.depth, hc = hcRun(level), main = mainRun(level) && !hc;
  const coins = game.coins.length, info = { coins: (level.map.join('').match(/O/g) || []).length };
  const mul = (main || hc ? curseMul() : 1) * (hc ? 1.5 : 1) * (level.bossTier ? 2 : 1) * 0.75;
  const bonus = Math.round((30 + dep * 6) * mul), coinGems = coins * 60, earned = Math.round(game.gems * mul) + bonus + coinGems;
  D.gems += earned; D.earned += earned; E.runs++; E.coins += coins;
  let keyHtml = '';
  if (main) {
    E.depth = dep + 1; const rec = dep > E.best; E.best = Math.max(E.best, dep);
    const award = (kind, why) => { const k = 'E' + dep + ':' + E.seed; if (playCheats(D).length || D.keyLog[k]) return; D.keyLog[k] = true; keyHtml += grantKey(kind, 1, why); };
    if (rec && dep % 25 === 0) award('urlicht', `Tiefe ${dep}`); else if (rec && dep % 10 === 0) award('gold', `Tiefe ${dep}`); else if (dep % 5 === 0) award(dep % 10 === 0 ? 'eisen' : 'holz', `Tiefe ${dep}`);
  }
  if (hc) { E.hc.depth = dep + 1; E.hc.best = Math.max(E.hc.best || 0, dep); if (dep % 5 === 0 && !D.keyLog['H' + dep + ':' + E.hc.seed]) { D.keyLog['H' + dep + ':' + E.hc.seed] = true; keyHtml += grantKey(dep % 10 === 0 ? 'gold' : 'eisen', 1, `Ohne Wiederkehr ${dep}`); } }
  save.write(); checkAch();
  if (hc) return startDescent({ dep, earned, coins, coinTotal: info.coins, keyHtml, rec: dep === E.hc.best, nextId: genId(E.hc.seed, E.hc.depth) });
  if (main) return startDescent({ dep, earned, coins, coinTotal: info.coins, keyHtml, rec: dep === E.best, nextId: genId(E.seed, E.depth) });
  stopMusic(); sfx('win'); mode = 'result';
  const coinRow = Array.from({ length: info.coins }, (_, k) => `<i class="${game.coins.includes(k) ? 'on new' : ''}"></i>`).join('');
  show(`<div class="panel small result">
    <h2>Tiefe ${dep} bezwungen</h2>
    <p class="lvl">${esc(level.name)} · ${esc(bioName(level))}</p>
    ${main && dep === E.best ? '<p class="secretmsg">Neuer Tiefenrekord!</p>' : ''}
    ${keyHtml ? `<div class="keys">${keyHtml}</div>` : ''}
    <div class="coinrow">${coinRow}<small>Münzen ${coins}/${info.coins}</small></div>
    <div class="stats">
      <div><small>Zeit</small><b>${fmtTime(game.frame)}</b><em>Ziel ${level.par} s</em></div>
      <div><small>Edelsteine</small><b id="tally">+${earned}</b><em>${bonus} Tiefe · ${coinGems} Münzen</em></div>
      <div><small>Tode</small><b>${game.deaths}</b></div>
    </div>
    <div class="row">
      ${main ? `<button class="big" data-a="eplay" data-id="${genId(E.seed, E.depth)}">Tiefer: ${E.depth}</button>` : ''}
      <button data-a="endless">Übersicht</button>
      ${keyHtml ? '<button class="treasurebtn" data-a="treasury">Truhe öffnen</button>' : ''}
    </div>
  </div>`);
}
function splash() {
  mode = 'menu';
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  show(`<div class="splash" data-a="title">${logoImg()}<div class="press">Tippe, um zu beginnen</div>${ios ? '<div class="note" style="margin-top:-12px">Kein Ton? Stummschalter prüfen.</div>' : ''}</div>`);
}
function hideUI() { ui.hidden = true; ui.innerHTML = ''; }

function title() {
  stopAmbience(); setIntensity(0); setMuffle(false); setSpace('open'); mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'title';
  playMusic(THEMES.karte.music);
  tsAbandoned(); announceUnlocks();
  const next = LEVELS.find(l => !l.secret && !l.qual && levelOpen(l.id) && !D.cleared[l.id]) || LEVELS.find(l => l.id === '3-B');
  const tsDone = D.ts.date === dayKey() && D.ts.done, keys = keyCount();
  const tile = (a, icon, label, extra = '', lockId = '') => { const locked = lockId && !isOpen(lockId), hint = locked ? UNLOCKS.find(u => u.id === lockId).hint : '';
    return `<button class="tile ${locked ? 'locked' : ''}" data-a="${locked ? 'lockedhint' : a}" data-id="${esc(hint)}">${ic(locked ? 'lock' : icon)}<span>${label}</span>${locked ? `<small class="lh">${esc(hint)}</small>` : extra}</button>`; };
  const alerts = [
    updateReady ? '<button class="chip gold" data-a="reload">Neue Version laden</button>' : '',
    dailyReady() ? `<button class="chip ember" data-a="daily">${ic('trophy')} Tagesschatz bereit</button>` : '',
    D.playDays >= 3 && Date.now() - (D.lastBackup || 0) > 7 * 864e5 ? '<button class="chip warn" data-a="options">Spielstand sichern</button>' : '',
  ].join('');
  show(`<div class="title home">
    <div class="status"><span>${ic('gem')} ${D.gems.toLocaleString('de-CH')}</span><span>${ic('lock')} ${keys}</span><span>${ic('scroll')} ${completion(D)} %</span><button class="iconbtn" data-a="options" aria-label="Optionen">${ic('gear')}</button></div>
    <div data-a="logo">${logoImg()}</div>
    <button class="big play" data-a="continue" data-id="${next.id}">Abenteuer<small>Weiter: ${esc(next.id)} · ${esc(next.name)}</small></button>
    ${isOpen('daily') ? '' : '<!--'}<button class="tscard ${tsDone ? 'done' : ''}" data-a="tagesschacht"><b>Tagesschacht #${dayNumber()}</b><small>${tsDone ? `Heute geschafft: Stufe ${D.ts.end.k} ✓ · Serie ${tsStreak()}` : D.ts.date === dayKey() && D.ts.k > 1 ? `Läuft · Stufe ${D.ts.k}` : 'Heute noch offen · ein Leben'}</small>${tsDone ? '' : '<span class="badge">!</span>'}</button>${isOpen('daily') ? '' : '-->'}
    ${alerts ? `<div class="chips">${alerts}</div>` : ''}
    <div class="tiles">
      ${tile('endless', 'rune', 'Tiefen', D.endless.best ? `<em>${D.endless.best}</em>` : '', 'endless')}
      ${tile('treasury', 'dia', 'Truhen', keys ? `<i class="badge">${keys}</i>` : '', 'chests')}
      ${tile('forge', 'anvil', 'Schmiede', '', 'forge')}
      ${tile('collection', 'star', 'Sammlung', '', 'chests')}
      ${tile('armory', 'sword', 'Waffen', `<em>${Object.keys(D.weapons).length}/${WEAPONS.length}</em>`, 'weapons')}
      ${tile('achs', 'trophy', 'Erfolge', `<em>${Object.keys(D.ach).length}/${ACH.length}</em>`)}
    </div>
    <div class="foot"><button data-a="wardrobe">Garderobe</button><button data-a="cheats">Schummelbuch</button><button data-a="options">Optionen</button></div>
    ${installTip()}
  </div>`);
}

let curWorld = 0;
const worldOpen = wi => wi >= WORLDS.length ? true : WORLDS[wi] && LEVELS.findIndex(l => l.id === WORLDS[wi].levels[0]) < D.unlocked;
const qualOpen = n => WORLDS[n - 1].levels.some(id => D.ranks[id] === 'S');
const levelOpen = id => { const l = levelById(id); if (l.duel != null) return !!D.secretOpen[id] || DUELS[l.duel].open(D); if (l.qual) return qualOpen(l.qual); return l.secret ? !!D.secretOpen[id] : LEVELS.findIndex(x => x.id === id) < D.unlocked; };
const ALLW = () => [...WORLDS, SECRET_WORLD, QUAL_WORLD];
function installTip() {
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  if (!isTouch || standalone || window.__SH_BUNDLE) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return `<p class="tip">${ios ? 'Tipp: Teilen → „Zum Home-Bildschirm“ für Vollbild ohne Browserleisten.' : 'Tipp: Menü ⋮ → „App installieren“ für Vollbild und Offline-Spielen.'}</p>`;
}
function map(sel, wi) {
  stopAmbience(); setIntensity(0); setMuffle(false); setSpace('open'); mode = 'menu'; game = null; touchEl.hidden = true; pauseBtn.hidden = true; lastMenu = 'map';
  playMusic(THEMES.karte.music);
  if (wi != null) curWorld = wi;
  else if (sel) curWorld = Math.max(0, ALLW().findIndex(w => w.levels.includes(sel)));
  const w = ALLW()[curWorld];
  const nSec = SECRET_WORLD.levels.filter(levelOpen).length;
  const tabs = WORLDS.map((ww, i) => `<button class="wtab ${i === curWorld ? 'on' : ''} ${worldOpen(i) ? '' : 'locked'}" data-a="${worldOpen(i) ? 'world' : 'nope'}" data-w="${i}">Welt ${ww.id}${worldOpen(i) ? '' : ' ' + ic('lock')}</button>`).join('')
    + `<button class="wtab sec ${curWorld === WORLDS.length ? 'on' : ''}" data-a="world" data-w="${WORLDS.length}">Geheim ${nSec}/${SECRET_WORLD.levels.length}</button>`
    + `<button class="wtab qual ${curWorld === WORLDS.length + 1 ? 'on' : ''}" data-a="world" data-w="${WORLDS.length + 1}">Qual ${QUAL_WORLD.levels.filter(id => D.cleared[id]).length}/${QUAL_WORLD.levels.length}</button>`
    + `<button class="wtab inf ${endlessOpen() ? '' : 'locked'}" data-a="${endlessOpen() ? 'endless' : 'nope'}">∞ Tiefen${endlessOpen() ? (D.endless.best ? ' ' + D.endless.best : '') : ' ' + ic('lock')}</button>`;
  const cards = w.levels.map(id => {
    const l = levelById(id), open = levelOpen(id), best = D.best[id], info = LEVEL_INFO[id], rk = D.ranks[id];
    if (l.qual && !open) return `<button class="card locked qualcard" data-a="nope"><span class="no">${esc(id)}</span><b>${esc(l.name)}</b><small>Ein S-Rang in Welt ${l.qual} öffnet diesen Pfad.</small></button>`;
    if (l.secret && !open) return `<button class="card locked secretcard" data-a="nope"><span class="no">???</span><b>???</b>
      <small>${l.duel != null ? esc(DUELS[l.duel].hint) : l.coinsNeeded ? `Öffnet sich bei ${l.coinsNeeded} Schaufelmünzen (${totalCoins(D)})` : `Irgendwo in ${esc(l.from)} …`}</small></button>`;
    const coins = Array.from({ length: info.coins }, (_, k) => `<i class="${(D.coins[id] || []).includes(k) ? 'on' : ''}"></i>`).join('');
    return `<button class="card ${open ? '' : 'locked'} ${sel === id ? 'sel' : ''} th-${l.theme} ${l.secret ? 'secretcard' : ''}" data-a="${open ? 'pick' : 'nope'}" data-id="${id}">
      <span class="no">${esc(id)}</span><b>${esc(l.name)}</b>${rk ? `<span class="rank r${rk}">${rk}</span>` : ''}
      ${l.secret ? '' : `<span class="cstars">${(D.stars[id] || [0, 0, 0]).map(v => ic(v ? 'star' : 'starOff')).join('')}</span>`}
      <span class="ccoins">${coins}</span>
      <small>${l.hunt != null ? HUNTS[l.hunt].difficulty + ' · ' : ''}${open ? (best ? fmtTime(best) : 'Neu') : 'Gesperrt'}${open && info.secrets ? ` · ${Math.min(D.secrets[id] || 0, info.secrets)}/${info.secrets} Geheim.` : ''}</small></button>`;
  }).join('');
  show(`<div class="panel">
    <div class="top"><button class="back" data-a="title">‹</button><h2>${w.id === '?' || w.id === 'Q' ? '' : `Welt ${w.id} · `}${esc(w.name)}</h2><span class="gems">${ic('scroll')} ${completion(D)} % ${ic('gem')} ${D.gems}</span></div>
    <div class="wtabs">${tabs}</div>
    <div class="cards">${cards}</div>
    <div id="detail">${sel ? '' : '<p class="note">Wähle ein Level.</p>'}</div>
    <div class="row">${isOpen('chests') ? `<button class="treasurebtn" data-a="treasury">Schatzkammer${keyCount() ? ` <span class="badge">${keyCount()}</span>` : ''}</button><button data-a="collection">Sammlung</button>` : ''}${isOpen('forge') ? '<button data-a="forge">Schmiede</button>' : ''}${isOpen('weapons') ? `<button data-a="armory">Waffen ${Object.keys(D.weapons).length}/${WEAPONS.length}</button>` : ''}<button data-a="achs">Erfolge ${Object.keys(D.ach).length}/${ACH.length}</button><button data-a="options">Optionen</button></div>
    <p class="note soon">Münzen ${totalCoins(D)}/${TOTAL_COINS} · ${endlessOpen() ? 'Endlose Tiefen offen: Tab ∞' : 'Schaffe 1-1, um die endlosen Tiefen zu öffnen'}</p>
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
      <div><h3>${esc(l.name)}</h3>${l.duel != null ? `<p>${esc(DUELS[l.duel].name)} · Optionales Meisterduell</p>` : ''}${l.hunt != null ? `<p>${esc(HUNTS[l.hunt].boss.name)} · ${esc(HUNTS[l.hunt].difficulty)}</p>` : ''}<p class="note">${D.best[id] ? 'Bestzeit ' + fmtTime(D.best[id]) : 'Noch nicht geschafft'}</p></div>
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
    const cur = D[key], nx = D.gearUnlocked[key] + 1, can = nx < AVAILABLE, price = PRICE[nx], sp = SHARD_PRICE[nx] || 0, afford = D.gems >= price && D.shards >= sp;
    const chips = TIERS.map((t, i) => `<button class="tier-pick" data-a="gear-tier" data-k="${key}" data-tier="${i}" aria-label="${name} aus ${esc(t.name)}" title="${esc(t.name)}" aria-pressed="${cur === i}" ${i > D.gearUnlocked[key] ? 'disabled' : ''}><canvas class="gi ${i === cur ? 'cur' : ''} ${i <= D.gearUnlocked[key] ? 'own' : i < AVAILABLE ? '' : 'lock'}" data-gi="${key}:${i}" aria-hidden="true"></canvas></button>`).join('');
    return `<div class="gear">
      <div class="gh"><b>${name}: <span class="tn" style="--c:${TIERS[cur].light}">${esc(TIERS[cur].name)}</span></b><small>${esc(table[cur].perk)}</small></div>
      <div class="chips">${chips}</div>
      ${nx < TIERS.length ? `<div class="next"><span>Nächste Stufe: <b class="tn" style="--c:${TIERS[nx].light}">${esc(TIERS[nx].name)}</b> — ${esc(table[nx].perk)}</span>
        ${can ? `<button class="${afford ? 'big' : 'off'}" data-a="buy" data-k="${key}">${ic('gem')} ${price}${sp ? ` + ${ic('dia')} ${sp}` : ''}</button>` : ''}</div>` : '<div class="next">Maximum erreicht.</div>'}
    </div>`;
  };
  const nA = Math.min(D.gearUnlocked.armor + 1, TIERS.length - 1), nS = Math.min(D.gearUnlocked.shovel + 1, TIERS.length - 1);
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
  const A = D.a11y, ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  show(`<div class="panel small">
    <div class="top"><button class="back" data-a="${lastMenu === 'title' ? 'title' : 'map'}">‹</button><h2>Optionen</h2><span></span></div>
    <label class="field">Dein Name (sichtbar für andere)<input id="name" maxlength="16" value="${esc(D.name)}" placeholder="z. B. Raphi"></label>
    ${toggles()}
    <h3 class="sub">Grafik und Zugänglichkeit</h3>
    <div class="row toggles">
      <button data-a="quality">Grafik: ${{ auto: 'Automatisch', hoch: 'Hoch', niedrig: 'Sparsam' }[D.quality]}</button>
      <button data-a="a11y" data-id="symbols" class="${A.symbols ? 'on' : ''}">Symbole statt nur Farben ${A.symbols ? 'an' : 'aus'}</button>
      <button data-a="a11y" data-id="shake" class="${A.shake < 1 ? 'on' : ''}">Bildwackeln ${A.shake >= 1 ? 'voll' : A.shake > 0 ? 'wenig' : 'aus'}</button>
      <button data-a="a11y" data-id="flash" class="${!A.flash ? 'on' : ''}">Blitze ${A.flash ? 'an' : 'aus'}</button>
      <button data-a="a11y" data-id="uiScale">Schrift ${A.uiScale > 1 ? 'gross' : 'normal'}</button>
      ${isTouch ? `<button data-a="a11y" data-id="swapAB" class="${A.swapAB ? 'on' : ''}">A/B ${A.swapAB ? 'getauscht' : 'normal'}</button>` : ''}
      <button data-a="autopogo" class="${D.autoPogo !== false ? 'on' : ''}">Schaufel-Sprung: ${D.autoPogo !== false ? 'B im Fallen' : 'nur ▼ halten'}</button>
    </div>
    <h3 class="sub">Spielstand sichern</h3>
    <p class="note">${save.loadedFrom === 'sicherung' ? '<b style="color:#ff9a80">Der Spielstand wurde aus der Notfall-Kopie wiederhergestellt.</b> ' : ''}Der Browser kann gespeicherte Daten löschen (Safari nach 7 Tagen ohne Besuch). Sichere deinen Spielstand als Code, z. B. in deinen Notizen.${D.lastBackup ? ` Letzte Sicherung: ${new Date(D.lastBackup).toLocaleDateString('de-CH')}.` : ' Noch nie gesichert.'}</p>
    <div class="row"><button class="big" data-a="exportsave">Spielstand als Code</button></div>
    <label class="field">Spielstand-Code laden<textarea id="savecode" rows="2" placeholder="SHSAVE.…"></textarea></label>
    <button data-a="importsave">Laden (ersetzt den aktuellen Stand)</button>
    ${ios && !standalone ? '<p class="note"><b>iPhone:</b> Für Vollbild und sicheren Speicher: Teilen-Symbol antippen, dann „Zum Home-Bildschirm“. Kein Ton? Stummschalter an der Seite prüfen.</p>' : ''}
    ${online() ? `<h3 class="sub">Cloud</h3>
    <p class="note">Automatische Sicherung beim Spielen. Mit dem Cloud-Schlüssel holst du den Stand auf ein anderes Gerät. Schlüssel geheim halten!</p>
    <div class="row"><button data-a="cloudsave">Jetzt sichern</button><button data-a="cloudkey">Schlüssel zeigen</button></div>
    <label class="field">Cloud-Schlüssel eines anderen Geräts<input id="cloudkey" autocomplete="off" placeholder="…"></label>
    <button data-a="cloudload">Aus der Cloud laden</button>` : ''}
    <h3 class="sub">Geister</h3>
    <label class="field">Geist-Code importieren<textarea id="code" rows="2" placeholder="SH1.…"></textarea></label>
    <button data-a="import">Importieren</button>
    <p class="note">${online() ? 'Online: verbunden.' : 'Online: aus (wird mit Supabase aktiv).'} Version ${CONFIG.version} · Generator ${GEN_VERSION}</p>
    <button data-a="checkupdate">Nach Update suchen</button>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <button class="danger" data-a="reset">Spielstand löschen</button>
  </div>`);
  $('#name').addEventListener('change', e => {
    const r = cleanName(e.target.value);
    if (!r.ok) { e.target.value = D.name; return options('Dieser Name ist nicht erlaubt. Bitte einen anderen wählen.'); }
    D.name = r.name; save.write();
  });
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
    case 'lockedhint': sfx('nope'); return toast('Noch verschlossen', id || '');
    case 'continue': goFullscreen(); return map(id);
    case 'treasury': return treasury();
    case 'tagesschacht': return tagesschacht();
    case 'reload': location.reload(); return;
    case 'checkupdate': { try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} sfx('click'); location.reload(); return; }
    case 'tsshare': tsShare(); return;
    case 'tsmsg': return tsMessage();
    case 'tsmsgset': { const p = game.p; D.ts.msg = { ma: +$('#ma').value, mb: +$('#mb').value, mx: Math.round(p.x), my: Math.round(p.y), mk: D.ts.k }; save.write(); sfx('secret'); return resume(); }
    case 'tsimport': {
      const T = tsToday(), raw = $('#tscode').value; let n = 0, wrong = 0;
      for (const c of raw.match(/SHT\.[A-Za-z0-9_-]+/g) || []) { const m = decodeMark(c); if (!m) continue; if (m.date !== T.date) { wrong++; continue; } (T.marks[T.date] = T.marks[T.date] || []).push(m); n++; }
      save.write(); return tagesschacht(n ? `${n} ${n === 1 ? 'Blutfleck liegt' : 'Blutflecken liegen'} jetzt im Schacht.` : wrong ? 'Dieser Code gehört zu einem anderen Tag.' : 'Kein gültiger Code gefunden.');
    }
    case 'endless': return endlessOpen() ? endless() : sfx('nope');
    case 'eplay': { goFullscreen(); const L = levelById(id); if (tsRun(L) && online()) { b.textContent = 'Spuren werden geladen …'; await Promise.race([tsRefresh(), new Promise(r => setTimeout(r, 2500))]); } return startLevel(id); }
    case 'eseed': { const v = parseInt($('#eseed').value, 10); if (!(v > 0)) return endless('Bitte eine Zahl eingeben.'); if (v !== D.endless.seed) { D.endless.seed = v; D.endless.depth = 1; save.write(); } return endless(`Weltsamen ${v} gesetzt.`); }
    case 'curse': { if (!cursesOpen()) return; E0().curses = E0().curses || {}; E0().curses[id] = !E0().curses[id]; save.write(); sfx(E0().curses[id] ? 'troll' : 'click'); return endless(); }
    case 'hcstart': D.endless.hc = { on: true, seed: 1 + Math.floor(Math.random() * 999999), depth: 1, best: (D.endless.hc && D.endless.hc.best) || 0 }; save.write(); goFullscreen(); return startLevel(genId(D.endless.hc.seed, 1));
    case 'ereroll': D.endless.seed = 1 + Math.floor(Math.random() * 999999); D.endless.depth = 1; save.write(); return endless('Eine neue Welt wurde erschaffen.');
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
      if (v.trim().toUpperCase().replace(/\s+/g, '') === 'MEISTERSCHAUFLER') { D.gems = 999999; D.shards = Math.max(D.shards, 99999); D.keys.urlicht += 20; D.keys.gold += 20; save.write(); sfx('legend'); haptic('unlock'); return cheatbook('Meisterschaufler: 999 999 Edelsteine, 99 999 Splitter und je 20 Gold- und Urlicht-Schlüssel.'); }
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
    case 'gear-tier': {
      const k = b.dataset.k, tier = Number(b.dataset.tier);
      if (!['shovel', 'armor'].includes(k) || !Number.isInteger(tier) || tier < 0 || tier > D.gearUnlocked[k]) return;
      D[k] = tier; save.write();
      forge();
      ui.querySelector('[data-a="gear-tier"][data-k="' + k + '"][data-tier="' + tier + '"]')?.focus();
      return;
    }
    case 'buy': {
      const k = b.dataset.k, nx = D.gearUnlocked[k] + 1, price = PRICE[nx];
      const sp = SHARD_PRICE[nx] || 0;
      if (nx >= AVAILABLE || D.gems < price) { sfx('nope'); return forge(`Dir fehlen noch ${price - D.gems} Edelsteine.`); }
      if (D.shards < sp) { sfx('nope'); return forge(`Dir fehlen noch ${sp - D.shards} Splitter. Die gibt es in der Schatzkammer.`); }
      D.gems -= price; D.shards -= sp; D.gearUnlocked[k] = nx; D[k] = nx; save.write(); sfx('legend');
      forge(); return gearReveal(k, nx);
    }
    case 'stick': D.stick = !D.stick; save.write(); applyControls(); b.outerHTML = toggles().match(/<button data-a="stick".*?<\/button>/s)[0]; return;
    case 'vibrate': D.vibrate = !D.vibrate; save.write(); haptic('hit'); b.outerHTML = toggles().match(/<button data-a="vibrate".*?<\/button>/s)[0]; return;
    case 'autopogo': D.autoPogo = D.autoPogo === false; save.write(); return options(D.autoPogo ? 'B im Fallen löst den Schaufel-Sprung aus. ▼ halten geht weiterhin.' : 'Schaufel-Sprung nur noch mit ▼ halten.');
    case 'quality': D.quality = { auto: 'hoch', hoch: 'niedrig', niedrig: 'auto' }[D.quality] || 'auto'; save.write(); applyA11y(); return options();
    case 'a11y': { const A = D.a11y;
      if (id === 'shake') A.shake = A.shake >= 1 ? 0.4 : A.shake > 0 ? 0 : 1; else if (id === 'uiScale') A.uiScale = A.uiScale > 1 ? 1 : 1.18; else A[id] = !A[id];
      save.write(); applyA11y(); return options(); }
    case 'exportsave': { const c = await save.exportCode(); let ok = false; try { if (navigator.share) { await navigator.share({ text: c }); ok = true; } else if (navigator.clipboard) { await navigator.clipboard.writeText(c); ok = true; } } catch {}
      options(ok ? 'Code geteilt bzw. kopiert. Gut aufbewahren!' : 'Code unten markieren und kopieren.'); if (!ok) { $('#savecode').value = c; $('#savecode').select(); } return; }
    case 'importsave': { try { await save.importCode($('#savecode').value); applyA11y(); return options('Spielstand geladen.'); } catch (err) { return options(esc(err.message)); } }
    case 'cloudsave': { const ok = await cloudBackup(true); return options(ok ? 'In der Cloud gesichert.' : 'Sicherung fehlgeschlagen. Internet?'); }
    case 'cloudkey': return options(`Dein Cloud-Schlüssel: <b style="user-select:all;-webkit-user-select:all">${esc(cloudToken())}</b>`);
    case 'cloudload': { const t = ($('#cloudkey').value || '').trim(); if (t.length < 24) return options('Schlüssel zu kurz.'); const row = await cloudLoad(t); if (!row) return options('Unter diesem Schlüssel liegt nichts.');
      try { await save.importCode(row.data); D.cloudToken = t; save.write(); applyA11y(); return options(`Spielstand vom ${new Date(row.updated_at).toLocaleString('de-CH')} geladen.`); } catch (err) { return options(esc(err.message)); } }
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


if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__SH_BUNDLE) {
  const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => setInterval(() => r.update().catch(() => {}), 30 * 60000)).catch(() => {});
  // Neue Version: nicht mitten im Spiel neu laden, sondern Bescheid geben
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtl) return; updateReady = true; toast('Neue Version bereit', 'Im Titelmenü antippen zum Aktualisieren.', 'ach'); if (mode === 'menu' && document.querySelector('.title')) title(); });
}

if (location.search.includes('debug')) window.__sh = { get game() { return game; } };

if (D.lastDay !== dayKey()) {
  D.lastDay = dayKey(); D.playDays = (D.playDays || 0) + 1; save.write();
  if (online()) uploadDeaths(D.deathMap).then(ok => { if (ok) { D.deathMap = {}; save.write(); } });
}
// Handy-Tastatur: Eingabefeld sichtbar halten
document.addEventListener('focusin', e => { if (e.target.matches('input, textarea, select')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });
applyA11y();
tsRefresh();
initTreasury({ D, save, sfx, haptic, show, ic, serifImg, S, R, esc, back: () => lastMenu, checkAch });
ui.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { unlockAudio(); treasuryClick(b) || collectionClick(b); } });
if (/[?&]debug/.test(location.search)) window.__sh = { get game() { return game; }, startLevel: id => startLevel(id) };
splash();
refreshLogo(() => { if (mode === 'menu' && document.querySelector('.title')) title(); else if (document.querySelector('.splash')) splash(); });
requestAnimationFrame(loop);
