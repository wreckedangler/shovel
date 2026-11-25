// Chiptune-Soundeffekte und Musik, komplett synthetisiert (WebAudio, keine Dateien).
let ac = null, master = null, musicGain = null, sfxGain = null;
const st = { sfx: true, music: true };

export function unlockAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = st.music ? 0.32 : 0; musicGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = st.sfx ? 0.8 : 0; sfxGain.connect(master);
    } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}
export function setAudio(sfx, music) {
  st.sfx = sfx; st.music = music;
  if (sfxGain) sfxGain.gain.value = sfx ? 0.8 : 0;
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

/* ---------- Musik ---------- */
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => { const m = n.match(/^([A-G]#?)(\d)$/); if (!m) return 0; return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
const parse = s => s.trim().split(/\s+/);
let song = null, timer = null, step = 0, nextT = 0;

export function playMusic(m) {
  if (song === m) return;
  stopMusic(); song = m; if (!m || !ac) return;
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
export function stopMusic() { if (timer) clearInterval(timer); timer = null; song = null; }
