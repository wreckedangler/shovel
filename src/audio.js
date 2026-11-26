import { startScore } from './score.js';
// Chiptune-Soundeffekte und Musik, komplett synthetisiert (WebAudio, keine Dateien).
let ac = null, master = null, musicGain = null, sfxGain = null, musicFilter = null, ambGain = null, revIn = null, revWet = null;
const st = { sfx: true, music: true };

export function unlockAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      musicFilter = ac.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 18000; musicFilter.connect(master);
      musicGain = ac.createGain(); musicGain.gain.value = st.music ? 0.32 : 0; musicGain.connect(musicFilter);
      sfxGain = ac.createGain(); sfxGain.gain.value = st.sfx ? 0.8 : 0; sfxGain.connect(master);
      ambGain = ac.createGain(); ambGain.gain.value = st.sfx ? 0.5 : 0; ambGain.connect(master);
      // Hall: erzeugte Impulsantwort, Effekte und Umgebung senden anteilig hinein
      const len = ac.sampleRate * 2.4, ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
      const conv = ac.createConvolver(); conv.buffer = ir;
      revIn = ac.createGain(); revWet = ac.createGain(); revWet.gain.value = 0;
      revIn.connect(conv).connect(revWet).connect(master);
      sfxGain.connect(revIn); ambGain.connect(revIn);
    } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}
export function setAudio(sfx, music) {
  st.sfx = sfx; st.music = music;
  if (sfxGain) sfxGain.gain.value = sfx ? 0.8 : 0;
  if (ambGain) ambGain.gain.value = sfx ? 0.5 : 0;
  if (musicGain) musicGain.gain.value = music ? 0.32 : 0;
}

function osc(type, f0, f1, dur, vol, when = 0, out = sfxGain) {
  if (!ac) return;
  const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol, freq = 1200, when = 0) {
  if (!ac) return;
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ac.currentTime + when, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(sfxGain); s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  jump: () => osc('square', 300, 620, 0.12, 0.12),
  swing: () => noise(0.08, 0.15, 3000),
  dig: () => { noise(0.14, 0.35, 700); osc('triangle', 180, 90, 0.12, 0.2); },
  crack: () => { noise(0.2, 0.4, 1600); osc('square', 220, 70, 0.15, 0.12); },
  clink: () => { osc('square', 1600, 1400, 0.06, 0.08); osc('triangle', 2400, 2200, 0.1, 0.06, 0.02); },
  // Edelstein-Serie: jeder weitere Stein in kurzer Folge einen Halbton höher (bis eine Oktave)
  gem: (n = 1) => { const k = 2 ** (Math.min(12, n - 1) / 12); osc('square', 988 * k, 988 * k, 0.06, 0.08); osc('square', 1319 * k, 1319 * k, 0.12, 0.08, 0.05); },
  hit: () => { osc('square', 440, 110, 0.1, 0.15); noise(0.06, 0.2, 2000); },
  // Pogo-Kette: steigende Tonleiter
  bounce: (n = 1) => { const k = 2 ** ([0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19][Math.min(11, n - 1)] / 12); osc('square', 200 * k, 800 * k, 0.1, 0.12); if (n >= 3) osc('triangle', 523 * k, 523 * k, 0.12, 0.08, 0.03); },
  chainEnd: (n = 3) => [0, 4, 7, 12].slice(0, Math.min(4, n - 1)).forEach((s, i) => osc('square', 523 * 2 ** (s / 12), 523 * 2 ** (s / 12), 0.1, 0.07, i * 0.05)),
  dash: () => { noise(0.18, 0.25, 4000); osc('sine', 900, 300, 0.2, 0.12); },
  wave: () => { noise(0.25, 0.3, 500); osc('triangle', 140, 60, 0.2, 0.2); },
  click: () => { osc('square', 1800, 1800, 0.02, 0.06); osc('square', 1200, 1200, 0.02, 0.05, 0.05); },
  twang: () => { osc('triangle', 520, 180, 0.15, 0.12); noise(0.08, 0.06, 3000); },
  creak: () => osc('sawtooth', 140, 90, 0.25, 0.05),
  flip: () => { osc('square', 300, 80, 0.15, 0.1); noise(0.1, 0.08, 900); },
  troll: () => { osc('square', 300, 300, 0.08, 0.1); osc('square', 240, 240, 0.08, 0.1, 0.1); osc('square', 180, 180, 0.2, 0.1, 0.2); },
  drown: () => { noise(0.6, 0.2, 600); osc('sine', 400, 80, 0.6, 0.15); },
  chomp: () => { osc('sawtooth', 120, 40, 0.3, 0.25); noise(0.3, 0.25, 400); },
  rumble: () => { noise(0.8, 0.12, 200); },
  whoosh: () => { noise(2.6, 0.22, 500); osc('sine', 300, 60, 2.4, 0.08); },
  shield: () => { osc('triangle', 880, 1320, 0.12, 0.12); osc('sine', 1760, 1760, 0.2, 0.06, 0.04); },
  // Truhen: Klopfen, aufsteigende Stufen, Aufbruch je Seltenheit
  knock: v => osc('square', 90 + (v || 0) * 10, 60, 0.08, 0.14),
  rarStep: v => { const n = [392, 523, 659, 880][v || 0]; osc('triangle', n, n, 0.25, 0.12); osc('square', n * 2, n * 2, 0.08, 0.04); },
  upgrade: () => [523, 659, 784, 1047, 1319].forEach((n, i) => osc('square', n, n, 0.09, 0.08, i * 0.05)),
  burst: v => { noise(0.35, 0.18); const base = [262, 330, 392, 523][v || 0]; [1, 1.25, 1.5, 2, 2.5].slice(0, 3 + (v || 0)).forEach((m, i) => osc('triangle', base * m, base * m, 0.5, 0.1, 0.05 + i * 0.07)); },
  revive: () => [262, 330, 392, 523, 659, 784].forEach((n, i) => osc('triangle', n, n, 0.3, 0.12, i * 0.08)),
  legend: () => {
    [392, 523, 659, 784, 1047].forEach((n, i) => osc('square', n, n, 0.18, 0.09, i * 0.09));
    [1047, 1319, 1568].forEach(n => osc('square', n, n, 0.9, 0.06, 0.5)); osc('triangle', 131, 131, 1.2, 0.25, 0.5); noise(0.8, 0.15, 6000, 0.5);
  },
  star: () => { osc('square', 1568, 1568, 0.08, 0.08); osc('square', 2093, 2093, 0.25, 0.08, 0.08); },
  tick: () => osc('square', 1760, 1760, 0.02, 0.04),
  secret: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((n, i) => osc('triangle', n, n, 0.12, 0.12, i * 0.07)),
  coin: () => { [988, 1319, 1568, 1976].forEach((n, i) => osc('square', n, n, 0.12, 0.08, i * 0.05)); osc('triangle', 2637, 2637, 0.4, 0.06, 0.2); },
  golden: () => { noise(0.2, 0.3, 3000); [784, 988, 1175, 1568].forEach((n, i) => osc('square', n, n, 0.1, 0.09, i * 0.04)); },
  rush: () => { [262, 330, 392, 523, 659, 784, 1047].forEach((n, i) => osc('sawtooth', n, n, 0.12, 0.06, i * 0.03)); noise(0.5, 0.2, 5000, 0.1); },
  flag: () => [784, 1047, 1319, 1568, 2093].forEach((n, i) => osc('triangle', n, n, 0.12, 0.1, i * 0.06)),
  crumble: () => noise(0.15, 0.25, 900),
  chestRare: (r = 0) => { if (r >= 0.88) [523, 659, 784, 1047, 1319, 1568].forEach((n, i) => osc('square', n, n, 0.15, 0.09, 0.3 + i * 0.07)); },
  sleep: () => [392, 330, 262].forEach((n, i) => osc('sine', n, n, 0.4, 0.08, i * 0.35)),
  achieve: () => [659, 784, 988, 1319].forEach((n, i) => osc('square', n, n, 0.12, 0.08, i * 0.08)),
  boing: () => { osc('triangle', 150, 900, 0.25, 0.25); osc('square', 300, 1200, 0.2, 0.05); },
  hurt: () => { osc('sawtooth', 400, 80, 0.3, 0.18); noise(0.15, 0.2, 900); },
  die: () => { [0, 0.12, 0.24, 0.36].forEach((w, i) => osc('square', 440 / (i + 1), 200 / (i + 1), 0.14, 0.14, w)); },
  poof: () => { noise(0.2, 0.3, 1200); osc('square', 600, 120, 0.15, 0.08); },
  heal: () => [523, 659, 784].forEach((n, i) => osc('triangle', n, n, 0.12, 0.15, i * 0.06)),
  check: () => [392, 523, 659, 784].forEach((n, i) => osc('square', n, n, 0.12, 0.08, i * 0.07)),
  chest: () => [523, 659, 784, 1047, 1319].forEach((n, i) => osc('square', n, n, 0.14, 0.09, i * 0.06)),
  win: () => [523, 523, 523, 659, 784, 1047].forEach((n, i) => osc('square', n, n, 0.2, 0.1, [0, .12, .24, .36, .5, .7][i])),
  win2: () => SFX.win(),
  blob: () => osc('sine', 200, 420, 0.12, 0.12),
  screech: () => osc('sawtooth', 1800, 1200, 0.12, 0.04),
  bossStart: () => { noise(0.6, 0.4, 400); osc('sawtooth', 80, 40, 0.6, 0.2); },
  charge: () => osc('sawtooth', 120, 260, 0.3, 0.12),
  thud: () => { noise(0.4, 0.5, 300); osc('triangle', 90, 40, 0.3, 0.35); },
  rumble: () => noise(0.5, 0.3, 200),
  pop: () => { noise(0.25, 0.4, 600); osc('square', 100, 300, 0.15, 0.12); },
  boom: () => { noise(0.3, 0.4, 500); osc('triangle', 120, 40, 0.25, 0.25); },
  bossDie: () => { noise(1, 0.4, 600); [330, 262, 196, 131].forEach((n, i) => osc('square', n, n / 2, 0.3, 0.12, i * 0.2)); },
  buy: () => [659, 880, 1175].forEach((n, i) => osc('square', n, n, 0.12, 0.1, i * 0.07)),
  nope: () => osc('square', 160, 120, 0.15, 0.1),
  click: () => osc('square', 880, 880, 0.04, 0.06),
};
export function sfx(name, v) { if (ac && SFX[name]) SFX[name](v); }

/* ---------- Raum, Umgebung, Schritte, Spannung ---------- */
// Hall je nach Ort: Höhlen hallen stark, Hallen mittel, draussen kaum
export function setSpace(kind) {
  if (!ac) return;
  const wet = { cave: 0.55, hall: 0.3, open: 0.06 }[kind] ?? 0.06;
  revWet.gain.setTargetAtTime(wet, ac.currentTime, 0.4);
}
// Gedämpfte Musik (Pause, Geheimkammer, wenig Leben)
export function setMuffle(f) { if (ac) musicFilter.frequency.setTargetAtTime(f ? 700 : 18000, ac.currentTime, 0.25); }
let intensity = 0;
export function setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); }

let amb = null;
function ambOsc(type, f0, f1, dur, vol, when = 0) { osc(type, f0, f1, dur, vol, when, ambGain); }
function ambNoise(dur, vol, freq, type = 'bandpass', when = 0, q = 1) {
  if (!ac) return; noise(0.0001, 0.0001);
  const t = ac.currentTime + when, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(ambGain); s.start(t); s.stop(t + dur + 0.05);
}
// Dauerklang (Wind, Brummen) plus zufällige Ereignisse (Tropfen, Vögel, Ticken, Blubbern)
const AMB = {
  wald: { bed: [500, 0.05, 'lowpass'], ev: [[0.05, () => { const f = 2600 + Math.random() * 1600; ambOsc('sine', f, f * 1.25, 0.08, 0.035); ambOsc('sine', f * 1.2, f, 0.07, 0.03, 0.1); }], [0.03, () => ambNoise(1.2, 0.05, 900, 'bandpass')]] },
  hoehle: { bed: [90, 0.06, 'lowpass'], drone: 55, ev: [[0.07, () => { const f = 1400 + Math.random() * 1400; ambOsc('sine', f, f * 0.6, 0.12, 0.06); }]] },
  grotte: { bed: [120, 0.05, 'lowpass'], drone: 65, ev: [[0.09, () => { const f = 1800 + Math.random() * 1200; ambOsc('sine', f, f * 0.55, 0.14, 0.06); }], [0.02, () => ambOsc('triangle', 880, 880, 1.2, 0.012)]] },
  bau: { bed: [200, 0.05, 'lowpass'], drone: 48, ev: [[0.04, () => ambNoise(0.4, 0.04, 300, 'lowpass')], [0.03, () => { const f = 1500 + Math.random() * 900; ambOsc('sine', f, f * 0.6, 0.1, 0.04); }]] },
  dornen: { bed: [700, 0.09, 'bandpass', 0.6], ev: [[0.05, () => ambNoise(2.4, 0.08, 500 + Math.random() * 500, 'bandpass', 0, 1.5)]] },
  uhrturm: { bed: [300, 0.025, 'lowpass'], tick: 0.5, ev: [[0.02, () => ambNoise(0.9, 0.06, 5000, 'highpass')]] },
  glocke: { bed: [400, 0.03, 'lowpass'], tick: 1, ev: [[0.008, () => [220, 277, 330].forEach((f, i) => ambOsc('sine', f, f, 3, 0.02, i * 0.02))]] },
  pendel: { bed: [300, 0.03, 'lowpass'], tick: 0.75, ev: [] },
  pilz: { bed: [400, 0.03, 'lowpass'], ev: [[0.05, () => { ambOsc('sine', 300 + Math.random() * 200, 900, 0.12, 0.03); }], [0.03, () => ambOsc('triangle', 1200 + Math.random() * 600, 1200, 0.5, 0.01)]] },
  moder: { bed: [160, 0.06, 'lowpass'], drone: 41, ev: [[0.1, () => { const f = 150 + Math.random() * 200; ambOsc('sine', f, f * 3, 0.09, 0.05); }]] },
};
export function setAmbience(theme) {
  if (!ac) return;
  if (amb && amb.theme === theme) return;
  stopAmbience(); const A = AMB[theme]; if (!A) return;
  amb = { theme, nodes: [], timer: 0 };
  noise(0.0001, 0.0001);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = A.bed[2]; f.frequency.value = A.bed[0]; if (A.bed[3]) f.Q.value = A.bed[3];
  g.gain.value = 0; g.gain.setTargetAtTime(A.bed[1], ac.currentTime, 1);
  s.connect(f).connect(g).connect(ambGain); s.start(); amb.nodes.push(s, g); amb.bedGain = g; amb.bedF = f;
  if (A.drone) { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.value = A.drone; og.gain.value = 0; og.gain.setTargetAtTime(0.03, ac.currentTime, 2); o.connect(og).connect(ambGain); o.start(); amb.nodes.push(o, og); }
  let tk = 0;
  amb.timer = setInterval(() => {
    if (!ac) return;
    for (const [p, fn] of A.ev) if (Math.random() < p) fn();
    if (A.tick && (tk += 0.1) >= A.tick) { tk = 0; noise(0.02, 0.05, 3500); osc('square', 2400, 2400, 0.01, 0.015, 0, ambGain); }
    // Wind schwillt an und ab
    if (amb.bedGain) amb.bedGain.gain.setTargetAtTime(A.bed[1] * (0.6 + Math.random() * 0.8), ac.currentTime, 0.8);
  }, 100);
}
export function stopAmbience() {
  if (!amb) return; clearInterval(amb.timer);
  for (const n of amb.nodes) { try { if (n.gain) n.gain.setTargetAtTime(0, ac.currentTime, 0.3); else n.stop(ac.currentTime + 1); } catch {} }
  amb = null;
}
// Schritte nach Untergrund
export function stepSound(surface) {
  if (!ac) return;
  const v = 0.85 + Math.random() * 0.3;
  switch (surface) {
    case 'gras': noise(0.05, 0.05 * v, 2200); break;
    case 'erde': noise(0.05, 0.07 * v, 700); osc('sine', 90, 60, 0.04, 0.05 * v); break;
    case 'stein': noise(0.03, 0.06 * v, 3000); osc('square', 180 * v, 120, 0.02, 0.025); break;
    case 'holz': osc('triangle', 220 * v, 160, 0.05, 0.09); noise(0.02, 0.03, 1500); break;
    case 'metall': osc('square', 900 * v, 700, 0.03, 0.03); osc('triangle', 1800 * v, 1700, 0.06, 0.02); break;
    case 'pilz': osc('sine', 260 * v, 420, 0.06, 0.06); break;
  }
}
let heartT = 0;
export function heartbeat(on) {
  if (!ac || !on) return;
  const t = ac.currentTime; if (t < heartT) return; heartT = t + 0.85;
  osc('sine', 70, 40, 0.12, 0.25); osc('sine', 65, 38, 0.1, 0.18, 0.18);
}

/* ---------- Musik ---------- */
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => { const m = n.match(/^([A-G]#?)(\d)$/); if (!m) return 0; return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
const parse = s => s.trim().split(/\s+/);
let song = null, timer = null, step = 0, nextT = 0, scoreStop = null;

export function playMusic(m) {
  if (song === m) return;
  stopMusic(); song = m; if (!m || !ac) return;
  // Orchester-Partitur (score.js) statt Chiptune-Zeilen
  if (m.score) { scoreStop = startScore(ac, musicGain, m.score); return; }
  const lead = parse(m.lead), bass = parse(m.bass), dt = 60 / m.bpm / 2;
  step = 0; nextT = ac.currentTime + 0.1;
  const len = (arr, i) => { let n = 1; while (arr[(i + n) % arr.length] === '-' && n < 8) n++; return n; };
  timer = setInterval(() => {
    if (!ac) return;
    while (nextT < ac.currentTime + 0.25) {
      const i = step % lead.length, j = step % bass.length;
      const l = lead[i], b = bass[j];
      if (l !== '.' && l !== '-') { const d = dt * len(lead, i); osc('square', freq(l), freq(l), d * 0.9, 0.09, nextT - ac.currentTime, musicGain); osc('square', freq(l) * 1.005, freq(l) * 1.005, d * 0.6, 0.03, nextT - ac.currentTime + 0.01, musicGain); }
      if (b !== '.' && b !== '-') { const d = dt * len(bass, j); osc('triangle', freq(b), freq(b), d * 0.95, 0.22, nextT - ac.currentTime, musicGain); }
      if (step % 4 === 0) noiseHat(nextT - ac.currentTime, step % 8 === 0 ? 0.06 : 0.03);
      // Spannungsschicht: Kick und Snare, sobald Gegner nahe sind
      if (intensity > 0.05) {
        const w = nextT - ac.currentTime;
        if (step % 4 === 0) osc('sine', 130, 42, 0.14, 0.32 * intensity, w, musicGain);
        if (step % 8 === 4) { noiseHat(w, 0.0001); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + w; s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.16 * intensity, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); s.connect(f).connect(g).connect(musicGain); s.start(t); s.stop(t + 0.14); }
        if (step % 2 === 1 && intensity > 0.6) noiseHat(w, 0.025 * intensity);
      }
      nextT += dt; step++;
    }
  }, 60);
}
function noiseHat(when, vol) {
  if (!ac || !noiseBuf) { noise(0.001, 0.0001); return; }
  const t = ac.currentTime + when, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  s.connect(f).connect(g).connect(musicGain); s.start(t); s.stop(t + 0.06);
}
export function stopMusic() { if (timer) clearInterval(timer); timer = null; song = null; if (scoreStop) { scoreStop(); scoreStop = null; } }
