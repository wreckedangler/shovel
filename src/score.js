// Orchester-Musik für Schaufelheld: Chor, Blech, Streicher, Harfe, Bass, Pauken, Taikos, Becken, Glocke.
// Alles mit WebAudio erzeugt (keine Audiodateien). Dieselben Instrumente spielen live und beim
// Vorab-Rendern (OfflineAudioContext), damit die Hörprobe exakt dem Spiel entspricht.

/* ---------- Noten ---------- */
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function hz(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return 0;
  const s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * 2 ** ((s - 69) / 12);
}
const up = (n, oct) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m[1] + (+m[2] + oct); };

// Akkorde: Chor-Stimmen (eng geführt) und Grundton für den Bass
const CH = {
  Dm: { v: ['D3', 'F3', 'A3', 'D4'], r: 'D2' }, Bb: { v: ['D3', 'F3', 'Bb3', 'D4'], r: 'Bb1' }, F: { v: ['C3', 'F3', 'A3', 'C4'], r: 'F2' },
  C: { v: ['C3', 'E3', 'G3', 'C4'], r: 'C2' }, Gm: { v: ['D3', 'G3', 'Bb3', 'D4'], r: 'G1' }, A: { v: ['C#3', 'E3', 'A3', 'C#4'], r: 'A1' },
  'Dm/C': { v: ['C3', 'F3', 'A3', 'D4'], r: 'C2' }, Asus: { v: ['D3', 'E3', 'A3', 'D4'], r: 'A1' },
};

/* ---------- Die Titelmelodie: „Der letzte Schaufelheld“ (d-Moll, 84 Schläge) ---------- */
// Pro Takt 8 Achtel. Melodie: Note, '-' = halten, '.' = Pause.
// Drums je Takt: Zeichen pro Achtel. T = Taiko, t = leise Taiko, P = Pauke, R = Wirbel, X = Becken, . = nichts
export const TITLE = {
  bpm: 84, loopFrom: 1,
  sections: [
    { name: 'Intro', vel: 0.55, chords: 'Dm Dm Bb A',
      lead: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .',
      bells: [0, 16], harp: false, strings: false, horn: 'D3 - - - - - - - | A2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -',
      drums: 'P . . . . . . . | P . . . . . . . | P . . . . . . . | R R R R R R R R' },
    { name: 'Thema', vel: 0.72, chords: 'Dm Bb F C Dm Bb Gm A',
      lead: 'D4 - - - A4 - - - | Bb4 - A4 - G4 - F4 - | A4 - - - C5 - - - | G4 - - - - - E4 - | D4 - - - A4 - D5 - | D5 - C5 - Bb4 - A4 - | G4 - Bb4 - D5 - C5 - | A4 - - - - - - -',
      harp: true, strings: false,
      drums: 'P . . . t . . . | P . . . t . . . | P . . . t . . . | P . . . t . t . | P . . . t . . . | P . . . t . . . | P . . . t . t . | P . . . R R R R' },
    { name: 'Aufstieg', vel: 0.86, chords: 'Dm Bb Gm A Dm Bb C A',
      lead: 'F5 - E5 - D5 - A4 - | Bb4 - - - D5 - F5 - | G5 - F5 - E5 - D5 - | E5 - - - C#5 - A4 - | F5 - E5 - D5 - A5 - | Bb5 - A5 - G5 - F5 - | E5 - G5 - C6 - Bb5 - | A5 - - - - - - -',
      harp: true, strings: true,
      drums: 'T . . t T . t . | T . . t T . t . | T . . t T . t . | T . t t T t t t | T . . t T . t . | T . . t T . t . | T . t t T t t t | R R R R R R R R' },
    { name: 'Höhepunkt', vel: 1, chords: 'Bb C Dm Dm/C Bb Gm Asus A',
      lead: 'D5 - - - F5 - - - | E5 - D5 - C5 - - - | D5 - - - A4 - - - | F5 - E5 - D5 - C5 - | D5 - - - Bb4 - D5 - | G5 - F5 - E5 - D5 - | D5 - - - E5 - - - | C#5 - - - - - - -',
      harm: 'Bb4 - - - D5 - - - | C5 - Bb4 - A4 - - - | A4 - - - F4 - - - | D5 - C5 - A4 - A4 - | Bb4 - - - F4 - Bb4 - | D5 - D5 - C#5 - A4 - | A4 - - - A4 - - - | A4 - - - - - - -',
      harp: true, strings: true, choirLoud: true,
      drums: 'X . . t T . t . | T . . t T . t . | X . . t T . t . | T . t t T t t t | X . . t T . t . | T . . t T . t . | T . t t T t t t | X . . . R R R R' },
    { name: 'Ausklang', vel: 0.6, chords: 'Dm Bb Gm A',
      lead: 'D5 - - - A4 - - - | Bb4 - - - A4 - G4 - | F4 - - - E4 - - - | D4 - - - - - - -',
      bells: [0], harp: true, strings: false,
      drums: 'P . . . . . . . | P . . . . . . . | P . . . . . . . | P . . . R R R R' },
  ],
};

// Partitur in einzelne Ereignisse übersetzen (Zeit in Achteln)
export function compile(score) {
  const ev = [], starts = [];
  let t0 = 0;
  for (const sec of score.sections) {
    starts.push(t0);
    const chords = sec.chords.split(/\s+/), bars = chords.length, v = sec.vel;
    const voice = (str, kind, vol) => {
      if (!str) return;
      const tok = str.replace(/\|/g, ' ').trim().split(/\s+/);
      tok.forEach((n, i) => { if (n === '-' || n === '.') return; let d = 1; while (tok[i + d] === '-') d++; ev.push({ t: t0 + i, k: kind, n, d, v: v * vol }); });
    };
    voice(sec.lead, 'brass', 1); voice(sec.harm, 'brass2', 0.7); voice(sec.horn, 'horn', 1);
    chords.forEach((c, b) => {
      const C = CH[c], t = t0 + b * 8;
      ev.push({ t, k: 'choir', notes: C.v, d: 8, v: v * (sec.choirLoud ? 1 : 0.75) });
      ev.push({ t, k: 'bass', n: C.r, d: 4, v }); ev.push({ t: t + 4, k: 'bass', n: C.r, d: 4, v: v * 0.8 });
      if (sec.harp) [0, 2, 3, 1, 2, 3, 1, 3].forEach((ix, s) => ev.push({ t: t + s, k: 'harp', n: up(C.v[ix], 1), d: 2, v: v * 0.8 }));
      if (sec.strings) [0, 2, 3, 2, 0, 2, 3, 2].forEach((ix, s) => ev.push({ t: t + s, k: 'string', n: up(C.v[ix], 1), d: 1, v: v * 0.7 }));
    });
    (sec.bells || []).forEach(b => ev.push({ t: t0 + b, k: 'bell', n: 'D5', d: 16, v }));
    const dr = sec.drums.replace(/\|/g, ' ').trim().split(/\s+/);
    dr.forEach((c, i) => {
      const t = t0 + i;
      if (c === 'T') ev.push({ t, k: 'taiko', v });
      if (c === 't') ev.push({ t, k: 'taiko', v: v * 0.5 });
      if (c === 'P') ev.push({ t, k: 'timp', n: 'D2', v });
      if (c === 'X') { ev.push({ t, k: 'crash', v }); ev.push({ t, k: 'taiko', v }); ev.push({ t, k: 'timp', n: 'D2', v }); }
      if (c === 'R') for (let k = 0; k < 2; k++) ev.push({ t: t + k / 2, k: 'roll', v: v * (0.35 + 0.65 * ((i % 8) + k / 2) / 8) });
    });
    t0 += bars * 8;
  }
  ev.sort((a, b) => a.t - b.t);
  return { ev, total: t0, loopAt: starts[score.loopFrom] || 0 };
}

/* ---------- Instrumente ---------- */
const N = new WeakMap();
function noiseBuf(ac) {
  if (N.has(ac)) return N.get(ac);
  const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
  let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  N.set(ac, b); return b;
}
// Saal: erzeugter Nachhall (2,8 s) – macht aus Synthesizern ein Orchester im Raum
export function hall(ac, out) {
  const len = ac.sampleRate * 2.8, ir = ac.createBuffer(2, len, ac.sampleRate);
  let s = 777;
  // dunkler Saal: Rauschen geglättet (Tiefpass), Höhen klingen schneller ab als Tiefen
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; const k = 0.08 + 0.5 * (1 - i / len) ** 3; lp += k * ((s / 2147483648 - 1) - lp); d[i] = lp * Math.pow(1 - i / len, 2.4) * 2.2; } }
  const cv = ac.createConvolver(); cv.buffer = ir;
  const wet = ac.createGain(); wet.gain.value = 0.32; const dry = ac.createGain(); dry.gain.value = 0.8;
  const inp = ac.createGain(); inp.connect(dry).connect(out); inp.connect(cv).connect(wet).connect(out);
  return inp;
}
function env(ac, g, t, a, peak, hold, rel) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  return t + a + hold + rel + 0.05;
}
function vib(ac, o, t, rate, depth, delay) {
  const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.3);
  l.connect(lg).connect(o.frequency); l.start(t); return l;
}
function brass(ac, out, f, t, dur, vel, bright = 1) {
  const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
  lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1600 + 1800 * vel * bright, t + 0.12); lp.frequency.setTargetAtTime(1300 + 900 * vel, t + 0.2, 0.4);
  const end = env(ac, g, t, 0.06, 0.07 * vel, Math.max(0.05, dur - 0.1), 0.35);
  for (const [type, det, lv] of [['sawtooth', 0, 1], ['sawtooth', 7, 0.7], ['square', -5, 0.35]]) {
    const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; og.gain.value = lv;
    const l = vib(ac, o, t, 5.2, f * 0.006, 0.25); o.connect(og).connect(lp); o.start(t); o.stop(end); l.stop(end);
  }
  lp.connect(g).connect(out);
}
function choir(ac, out, notes, t, dur, vel) {
  for (const n of notes) {
    const f = hz(n), g = ac.createGain(), bp = ac.createBiquadFilter(), bp2 = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 750; bp.Q.value = 1.2; bp2.type = 'bandpass'; bp2.frequency.value = 1150; bp2.Q.value = 2;
    const end = env(ac, g, t, 0.55, 0.032 * vel, Math.max(0.1, dur - 0.6), 0.9);
    for (const det of [-9, 0, 8]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const l = vib(ac, o, t, 4.4 + det * 0.05, f * 0.004, 0.4); o.connect(bp); o.connect(bp2); o.start(t); o.stop(end); l.stop(end);
    }
    bp.connect(g); bp2.connect(g); g.connect(out);
  }
}
function pluck(ac, out, f, t, vel, type = 'triangle', decay = 0.9, vol = 0.05) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out); o.start(t); o.stop(t + decay + 0.05);
}
function strings(ac, out, f, t, dur, vel) {
  const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  const end = env(ac, g, t, 0.02, 0.028 * vel, Math.max(0.02, dur * 0.55), 0.12);
  for (const det of [-6, 6]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(end); }
  lp.connect(g).connect(out);
}
function bass(ac, out, f, t, dur, vel) {
  const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const end = env(ac, g, t, 0.03, 0.12 * vel, Math.max(0.05, dur - 0.2), 0.3);
  for (const [type, m] of [['sawtooth', 1], ['sine', 0.5]]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f * m; o.connect(lp); o.start(t); o.stop(end); }
  lp.connect(g).connect(out);
}
function drum(ac, out, f0, f1, t, dec, vol, nvol, nfreq) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(g).connect(out); o.start(t); o.stop(t + dec + 0.05);
  if (nvol) {
    const s = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain(); s.buffer = noiseBuf(ac);
    nf.type = 'lowpass'; nf.frequency.value = nfreq; ng.gain.setValueAtTime(nvol, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dec * 0.4);
    s.connect(nf).connect(ng).connect(out); s.start(t); s.stop(t + dec);
  }
}
function crash(ac, out, t, vel) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(ac);
  f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 0.6; g.gain.setValueAtTime(0.04 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 2.3);
}
function bell(ac, out, f, t, vel) {
  for (const [m, a, d] of [[1, 0.08, 4], [2.76, 0.04, 2.5], [5.4, 0.025, 1.4], [0.5, 0.05, 5]]) pluck(ac, out, f * m, t, vel, 'sine', d, a);
}

// Ein Ereignis zur Zeit t (Sekunden im Kontext) spielen; e8 = Länge eines Achtels in Sekunden
export function playEvent(ac, out, e, t, e8) {
  const d = (e.d || 1) * e8;
  switch (e.k) {
    case 'brass': brass(ac, out, hz(e.n), t, d, e.v); break;
    case 'brass2': brass(ac, out, hz(e.n), t, d, e.v, 0.7); break;
    case 'horn': brass(ac, out, hz(e.n), t, d, e.v * 0.9, 0.4); break;
    case 'choir': choir(ac, out, e.notes, t, d, e.v); break;
    case 'harp': pluck(ac, out, hz(e.n), t, e.v, 'triangle', 1.1, 0.045); pluck(ac, out, hz(e.n) * 2, t, e.v, 'sine', 0.5, 0.012); break;
    case 'string': strings(ac, out, hz(e.n), t, d, e.v); break;
    case 'bass': bass(ac, out, hz(e.n), t, d, e.v); break;
    case 'taiko': drum(ac, out, 110, 48, t, 0.55, 0.5 * e.v, 0.12 * e.v, 900); break;
    case 'timp': drum(ac, out, hz(e.n) * 1.02, hz(e.n), t, 1.4, 0.35 * e.v, 0.05 * e.v, 500); break;
    case 'roll': drum(ac, out, 100, 70, t, 0.25, 0.22 * e.v, 0.08 * e.v, 1200); break;
    case 'crash': crash(ac, out, t, e.v); break;
    case 'bell': bell(ac, out, hz(e.n), t, e.v); break;
  }
}

// Live abspielen mit Vorausplanung; gibt eine Stopp-Funktion zurück
export function startScore(ac, out, score) {
  const C = compile(score), e8 = 60 / score.bpm / 2, room = hall(ac, out);
  let i = 0, base = ac.currentTime + 0.15, off = 0;
  const tick = () => {
    const horizon = ac.currentTime + 0.4;
    for (;;) {
      if (i >= C.ev.length) { off += C.total - C.loopAt; i = C.ev.findIndex(e => e.t >= C.loopAt); }
      const e = C.ev[i], t = base + (e.t + off) * e8;
      if (t > horizon) break;
      if (t > ac.currentTime - 0.05) playEvent(ac, room, e, t, e8);
      i++;
    }
  };
  tick(); const timer = setInterval(tick, 100);
  return () => { clearInterval(timer); try { room.disconnect(); } catch {} };
}
// Vorab rendern (Hörprobe): Intro und ein voller Durchlauf
export function renderScore(ac, score) {
  const C = compile(score), e8 = 60 / score.bpm / 2, room = hall(ac, ac.destination);
  for (const e of C.ev) playEvent(ac, room, e, 0.1 + e.t * e8, e8);
  return 0.1 + C.total * e8 + 3;
}
