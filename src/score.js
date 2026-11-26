// Orchester-Musik für Schaufelheld – komplett mit WebAudio erzeugt (keine Audiodateien).
// Besetzung wie ein Symphonieorchester, jede Gruppe an ihrem Platz im Stereobild:
// Violinen, Bratschen, Celli, Kontrabässe · Flöte, Oboe · Hörner, Trompeten, Posaunen ·
// Chor · Harfe, Celesta · Konzert-Basstrommel, Marschtrommel, Becken, Tamtam, Glocke.
// Dieselben Instrumente spielen live und beim Vorab-Rendern der Hörprobe (OfflineAudioContext).

/* ---------- Noten ---------- */
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function hz(n, tr = 0) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return 0;
  const s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 + tr;
  return 440 * 2 ** ((s - 69) / 12);
}
const up = (n, oct) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m[1] + (+m[2] + oct); };

// Akkorde: enge Lage für Chor und Streicher, Grundton für die Bässe
const CH = {
  Dm: { v: ['D3', 'F3', 'A3', 'D4'], r: 'D2' }, Bb: { v: ['D3', 'F3', 'Bb3', 'D4'], r: 'Bb1' }, F: { v: ['C3', 'F3', 'A3', 'C4'], r: 'F2' },
  C: { v: ['C3', 'E3', 'G3', 'C4'], r: 'C2' }, Gm: { v: ['D3', 'G3', 'Bb3', 'D4'], r: 'G1' }, A: { v: ['C#3', 'E3', 'A3', 'C#4'], r: 'A1' },
  'Dm/C': { v: ['C3', 'F3', 'A3', 'D4'], r: 'C2' }, Asus: { v: ['D3', 'E3', 'A3', 'D4'], r: 'A1' }, Eb: { v: ['Eb3', 'G3', 'Bb3', 'Eb4'], r: 'Eb2' },
  B: { v: ['D#3', 'F#3', 'B3', 'D#4'], r: 'B1' }, D: { v: ['D3', 'F#3', 'A3', 'D4'], r: 'D2' },
};

/* ---------- „Der letzte Schaufelheld“ – Symphonischer Satz in d-Moll ---------- */
// Je Takt 8 Achtel. Stimmen: Note, '-' halten, '.' Pause. Taktstriche '|' nur zur Übersicht.
// Schlagwerk je Achtel: B Basstrommel, b leise · S Marschtrommel, s leise, R Wirbel · C Becken, W Beckenschwelle · G Tamtam
const THEME = 'D4 - - - A4 - - - | Bb4 - A4 - G4 - F4 - | A4 - - - C5 - - - | G4 - - - - - E4 - | D4 - - - A4 - D5 - | D5 - C5 - Bb4 - A4 - | G4 - Bb4 - D5 - C5 - | A4 - - - - - - -';
const COUNTER = 'F3 - - - - - - - | D3 - - - F3 - - - | C3 - - - F3 - - - | E3 - - - G3 - - - | F3 - - - A3 - - - | F3 - - - D3 - - - | D3 - - - G3 - - - | E3 - - - C#3 - - -';
const oct = (s, k) => s.replace(/([A-G][#b]?)(-?\d)/g, (_, n, o) => n + (+o + k));
export const TITLE = {
  bpm: 84, loopFrom: 1,
  sections: [
    { name: 'Nebel', vel: 0.5, chords: 'Dm Dm Bb Bb Gm A', pads: ['low'], bass: 'long',
      lines: { flute: '. . . . . . . . | . . . . . . . . | A5 - - - - - - - | F5 - - - G5 - A5 - | D5 - - - - - - - | . . . . . . . .',
        horn: 'D3 - - - - - - - | D3 - - - - - - - | Bb2 - - - - - - - | Bb2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - -' },
      choirFrom: 2, bells: [0, 32],
      perc: 'G . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | W . . . . . . . | R R R R R R R R' },
    { name: 'Thema', vel: 0.66, chords: 'Dm Bb F C Dm Bb Gm A', pads: ['str'], bass: 'long', arp: 'harp',
      lines: { horn: THEME },
      perc: 'b . . . . . . . | b . . . . . . . | b . . . . . . . | b . . . . . s . | b . . . . . . . | b . . . . . . . | b . . . . . s . | b . . . R R R R' },
    { name: 'Thema, Violinen', vel: 0.76, chords: 'Dm Bb F C Dm Bb Gm A', pads: ['str', 'choir'], bass: 'long', arp: 'harp',
      lines: { vln: oct(THEME, 1), horn: oct(COUNTER, 1), cello: COUNTER,
        flute: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | A5 - - - - - - - | F6 - E6 - D6 - C6 - | Bb5 - - - D6 - - - | C#6 - - - - - - -' },
      perc: 'B . . . b . . . | B . s . b . s . | B . . . b . . . | B . s . b . s s | B . . . b . . . | B . s . b . s . | B . . . b . s s | B . . . R R R R' },
    { name: 'Aufstieg', vel: 0.86, chords: 'Dm Bb Gm A Dm Bb C A', pads: ['str', 'choir'], bass: 'drive', ost: true,
      lines: { vln: 'F5 - E5 - D5 - A4 - | Bb4 - - - D5 - F5 - | G5 - F5 - E5 - D5 - | E5 - - - C#5 - A4 - | F5 - E5 - D5 - A5 - | Bb5 - A5 - G5 - F5 - | E5 - G5 - C6 - Bb5 - | A5 - - - - - - -',
        horn: oct(COUNTER, 1),
        tpt: '. . . . . . . . | . . . . . . . . | . . . . . . . . | A4 . A4 A4 C#5 - E5 - | . . . . . . . . | . . . . . . . . | . . . . . . . . | A4 . A4 A4 C#5 - E5 -' },
      perc: 'B . s . B . s . | B . s . B . s s | B . s . B . s . | B . s s B s s s | B . s . B . s . | B . s . B . s s | B . s s B s s s | W R R R R R R R' },
    { name: 'Höhepunkt', vel: 1, chords: 'Bb C Dm Dm/C Bb Gm Asus A', pads: ['str', 'choir', 'brass'], bass: 'drive', ost: true, choirLoud: true,
      lines: { tpt: 'D5 - - - F5 - - - | E5 - D5 - C5 - - - | D5 - - - A4 - - - | F5 - E5 - D5 - C5 - | D5 - - - Bb4 - D5 - | G5 - F5 - E5 - D5 - | D5 - - - E5 - - - | C#5 - - - - - - -',
        vln: 'D6 - - - F6 - - - | E6 - D6 - C6 - - - | D6 - - - A5 - - - | F6 - E6 - D6 - C6 - | D6 - - - Bb5 - D6 - | G6 - F6 - E6 - D6 - | D6 - - - E6 - - - | C#6 - - - - - - -',
        tbn: 'Bb2 - - - D3 - - - | C3 - - - E3 - - - | D3 - - - F3 - - - | C3 - - - A2 - - - | Bb2 - - - F3 - - - | G2 - - - Bb2 - - - | A2 - - - D3 - - - | A2 - - - E3 - - -',
        cello: 'D3 - - - F3 - - - | G3 - F3 - E3 - - - | F3 - - - D3 - - - | A3 - G3 - F3 - E3 - | F3 - - - D3 - F3 - | Bb3 - A3 - G3 - F3 - | F3 - - - G3 - - - | E3 - - - - - - -' },
      perc: 'C . s . B . s . | B . s . B . s s | C . s . B . s . | B . s s B s s s | C . s . B . s . | B . s . B . s s | B . s s B s s s | C . . . R R R R' },
    { name: 'Stille', vel: 0.52, chords: 'F C Dm Bb F C Bb A', pads: ['str'], bass: 'long', arp: 'harp', cel: true,
      lines: { oboe: 'A4 - - - C5 - - - | G4 - - - - - E4 - | F4 - - - A4 - D5 - | D5 - - - C5 - Bb4 - | A4 - - - C5 - F5 - | E5 - - - G5 - - - | F5 - D5 - Bb4 - - - | A4 - - - - - - -',
        flute: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | F5 - - - - - - - | G5 - - - E5 - - - | D5 - - - - - - - | C#5 - - - - - - -' },
      perc: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | W . . . . . . .' },
    { name: 'Wiederkehr', vel: 0.8, chords: 'Gm Dm Bb F Gm Dm Eb B', pads: ['str', 'choir'], bass: 'drive', ost: true,
      lines: { horn: 'D4 - - - G4 - - - | A4 - - - F4 - - - | F4 - - - Bb4 - - - | C5 - - - A4 - - - | Bb4 - - - D5 - - - | A4 - - - F4 - D4 - | G4 - - - Bb4 - Eb5 - | D#5 - - - F#5 - - -',
        cello: 'G2 - - - Bb2 - - - | D3 - - - A2 - - - | Bb2 - - - D3 - - - | F2 - - - C3 - - - | G2 - - - Bb2 - - - | D3 - - - F3 - - - | Eb3 - - - G3 - - - | B2 - - - D#3 - - -',
        tpt: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | Eb5 . Eb5 Eb5 G5 - Bb5 - | B4 . B4 B4 D#5 - F#5 -' },
      perc: 'b . . . b . . . | b . . . b . s . | B . s . b . s . | B . s . B . s s | B . s . B . s . | B . s s B s s s | B . s s B s s s | W R R R R R R R' },
    { name: 'Finale', vel: 1, tr: 2, chords: 'Dm Bb F C Dm Bb Gm A', pads: ['str', 'choir', 'brass'], bass: 'drive', ost: true, arp: 'harp', choirLoud: true,
      lines: { tpt: oct(THEME, 1), vln: oct(THEME, 2), horn: oct(COUNTER, 1), tbn: COUNTER, cello: COUNTER },
      perc: 'C . s . B . s . | B . s . B . s s | B . s . B . s . | B . s s B s s s | C . s . B . s . | B . s . B . s s | B . s s B s s s | C . . . R R R R' },
    { name: 'Abgesang', vel: 0.58, chords: 'Bb A Dm Bb A Dm', pads: ['str', 'choir'], bass: 'long', cel: true,
      lines: { horn: 'D4 - - - A4 - - - | G4 - - - E4 - - - | F4 - - - D4 - - - | D4 - - - F4 - - - | E4 - - - C#4 - - - | D4 - - - - - - -',
        flute: 'F5 - - - - - - - | E5 - - - - - - - | D5 - - - - - - - | . . . . . . . . | . . . . . . . . | A5 - - - - - - -' },
      bells: [0, 40],
      perc: 'G . . . . . . . | . . . . . . . . | b . . . . . . . | . . . . . . . . | W . . . . . . . | b . . . . . . .' },
  ],
};

// Partitur in Ereignisse übersetzen (Zeit in Achteln). Kleine, feste Abweichungen machen das Spiel menschlich.
export function compile(score) {
  const ev = [], starts = [];
  let t0 = 0, seed = 1;
  const hum = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return ((seed % 9) - 4) * 0.012; };
  for (const sec of score.sections) {
    starts.push(t0);
    const chords = sec.chords.split(/\s+/), v = sec.vel, tr = sec.tr || 0;
    const push = e => ev.push({ tr, ...e });
    for (const [inst, str] of Object.entries(sec.lines || {})) {
      const tok = str.replace(/\|/g, ' ').trim().split(/\s+/);
      tok.forEach((n, i) => { if (n === '-' || n === '.') return; let d = 1; while (tok[i + d] === '-') d++; push({ t: t0 + i + hum(), k: inst, n, d, v }); });
    }
    chords.forEach((c, b) => {
      const C = CH[c], t = t0 + b * 8, pads = sec.pads || [];
      if (pads.includes('str')) { push({ t, k: 'strpad', notes: C.v.map(n => up(n, 1)), d: 8, v: v * 0.8 }); push({ t, k: 'strpad', notes: C.v.slice(0, 3), d: 8, v: v * 0.55, low: true }); }
      if (pads.includes('low')) push({ t, k: 'strpad', notes: [C.v[0], C.v[2]], d: 8, v: v * 0.7, low: true });
      if (pads.includes('choir') || (sec.choirFrom != null && b >= sec.choirFrom)) push({ t, k: 'choir', notes: C.v, d: 8, v: v * (sec.choirLoud ? 1 : 0.7) });
      if (pads.includes('brass')) push({ t, k: 'hornpad', notes: C.v.slice(1), d: 8, v: v * 0.7 });
      // Bässe: Kontrabass hält, Celli treiben in Achteln
      push({ t, k: 'cb', n: C.r, d: 8, v });
      if (sec.bass === 'drive') for (let s = 0; s < 8; s++) push({ t: t + s, k: 'cello8', n: up(C.r, 1), d: 1, v: v * (s % 2 ? 0.6 : 0.85) });
      if (sec.arp) [0, 2, 3, 1, 2, 3, 1, 3].forEach((ix, s) => push({ t: t + s, k: 'harp', n: up(C.v[ix], 1), d: 2, v: v * 0.75 }));
      if (sec.ost) [0, 2, 3, 2, 0, 2, 3, 2].forEach((ix, s) => push({ t: t + s, k: 'vla', n: up(C.v[ix], 1), d: 1, v: v * 0.7 }));
      if (sec.cel) [3, 2].forEach((ix, s) => push({ t: t + 2 + s * 4, k: 'celesta', n: up(C.v[ix], 2), d: 4, v: v * 0.7 }));
    });
    for (const b of sec.bells || []) ev.push({ t: t0 + b, k: 'bell', n: 'D5', d: 16, v, tr: 0 });
    const pc = (sec.perc || '').replace(/\|/g, ' ').trim().split(/\s+/);
    pc.forEach((c, i) => {
      const t = t0 + i, bar = Math.floor(i / 8);
      if (c === 'B') push({ t, k: 'bd', v }); if (c === 'b') push({ t, k: 'bd', v: v * 0.55 });
      if (c === 'S') push({ t, k: 'snare', v }); if (c === 's') push({ t, k: 'snare', v: v * 0.5 });
      if (c === 'C') { push({ t, k: 'crash', v }); push({ t, k: 'bd', v }); }
      if (c === 'W') push({ t, k: 'swell', v, d: 8 });
      if (c === 'G') push({ t, k: 'gong', v });
      // Wirbel: Zweiunddreissigstel mit Crescendo bis zum Taktende
      if (c === 'R') { const p0 = pc.slice(bar * 8, bar * 8 + 8).indexOf('R'); for (let k = 0; k < 4; k++) push({ t: t + k / 4, k: 'roll', v: v * (0.25 + 0.75 * ((i % 8) - p0 + k / 4) / (8 - p0)) }); }
    });
    t0 += chords.length * 8;
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
// Konzertsaal: erzeugter Nachhall (3,2 s), dunkel, Höhen klingen schneller ab
export function hall(ac, out) {
  const len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
  let s = 777;
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; const k = 0.07 + 0.45 * (1 - i / len) ** 3; lp += k * ((s / 2147483648 - 1) - lp); d[i] = lp * Math.pow(1 - i / len, 2.2) * 2.2; } }
  const cv = ac.createConvolver(); cv.buffer = ir;
  const wet = ac.createGain(); wet.gain.value = 0.36; const dry = ac.createGain(); dry.gain.value = 0.75;
  const inp = ac.createGain(); inp.connect(dry).connect(out); inp.connect(cv).connect(wet).connect(out);
  return inp;
}
// Platz im Orchester (Stereobild); ohne StereoPanner spielt alles aus der Mitte
const PAN = { choirL: -0.4, choirR: 0.4, vln: -0.45, vla: -0.15, cello: 0.3, cello8: 0.3, cb: 0.45, strpad: -0.2, flute: -0.25, oboe: 0.05, horn: 0.35, hornpad: 0.35, tpt: 0.15, tbn: 0.45, harp: -0.55, celesta: -0.35, bell: 0.1 };
const busCache = new WeakMap();
function bus(ac, room, k) {
  let m = busCache.get(room); if (!m) busCache.set(room, m = {});
  if (m[k]) return m[k];
  const p = PAN[k] || 0;
  if (!p || !ac.createStereoPanner) return (m[k] = room);
  const sp = ac.createStereoPanner(); sp.pan.value = p; sp.connect(room); return (m[k] = sp);
}
function env(g, t, a, peak, hold, rel) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  return t + a + hold + rel + 0.05;
}
// Ein Vibrato-Oszillator pro Stimme, der alle Oszillatoren dieser Stimme moduliert (spart Rechenzeit)
function vib(ac, t, rate, depth, delay, end) {
  const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.35);
  l.connect(lg); l.start(t); l.stop(end); return lg;
}
// Ensemble: mehrere leicht verstimmte Oszillatoren durch Filter und Hüllkurve
function voice(ac, out, f, t, dur, o) {
  const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = o.q || 0.7;
  lp.frequency.setValueAtTime(o.f0 || o.cut, t); if (o.f0) lp.frequency.linearRampToValueAtTime(o.cut, t + (o.fa || 0.12));
  const end = env(g, t, o.a, o.vol, Math.max(0.02, dur - o.a), o.r);
  const lfo = o.vib ? vib(ac, t, o.vib[0], f * o.vib[1], o.vib[2], end) : null;
  for (const [type, det, lv] of o.osc) {
    const x = ac.createOscillator(), xg = ac.createGain(); x.type = type; x.frequency.value = f; x.detune.value = det; xg.gain.value = lv;
    if (lfo) lfo.connect(x.frequency);
    x.connect(xg).connect(lp); x.start(t); x.stop(end);
  }
  if (o.bp) { const b = ac.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = o.bp; b.gain.value = 6; b.Q.value = 1.4; lp.connect(b).connect(g); } else lp.connect(g);
  g.connect(out);
}
const SAW3 = [['sawtooth', -8, 0.6], ['sawtooth', 0, 0.6], ['sawtooth', 9, 0.6]];
const INST = {
  vln: { osc: SAW3, cut: 3200, a: 0.12, r: 0.5, vol: 0.05, vib: [5.5, 0.006, 0.2] },
  vla: { osc: [['sawtooth', 0, 1]], cut: 2000, a: 0.02, r: 0.12, vol: 0.026 },
  cello: { osc: [['sawtooth', -6, 0.7], ['sawtooth', 6, 0.7]], cut: 1500, a: 0.15, r: 0.6, vol: 0.05, vib: [5, 0.005, 0.25] },
  cello8: { osc: [['sawtooth', 0, 1]], cut: 900, a: 0.02, r: 0.1, vol: 0.05 },
  cb: { osc: [['sawtooth', 0, 0.7], ['sine', 0, 0.8]], cut: 320, a: 0.25, r: 0.8, vol: 0.09 },
  flute: { osc: [['sine', 0, 1], ['triangle', 3, 0.35]], cut: 4000, a: 0.08, r: 0.45, vol: 0.06, vib: [5.2, 0.008, 0.3] },
  oboe: { osc: [['square', 0, 0.5], ['sawtooth', 4, 0.4]], cut: 2400, a: 0.06, r: 0.35, vol: 0.035, vib: [5.6, 0.006, 0.25], bp: 1300, q: 1.5 },
  horn: { osc: [['sawtooth', -4, 0.7], ['sawtooth', 5, 0.7], ['triangle', 0, 0.5]], f0: 350, cut: 1100, fa: 0.2, a: 0.12, r: 0.5, vol: 0.07, vib: [4.8, 0.004, 0.4] },
  tpt: { osc: [['sawtooth', 0, 0.8], ['square', 6, 0.35], ['sawtooth', -7, 0.6]], f0: 600, cut: 3400, fa: 0.08, a: 0.05, r: 0.35, vol: 0.06, vib: [5.4, 0.005, 0.3], q: 1.4 },
  tbn: { osc: [['sawtooth', 0, 0.8], ['sawtooth', 8, 0.6]], f0: 300, cut: 1300, fa: 0.15, a: 0.08, r: 0.45, vol: 0.07 },
};
function choir(ac, out, notes, t, dur, vel, tr) {
  notes.forEach((n, ix) => {
    const f = hz(n, tr), g = ac.createGain(), b1 = ac.createBiquadFilter(), b2 = ac.createBiquadFilter();
    b1.type = 'bandpass'; b1.frequency.value = ix < 2 ? 600 : 800; b1.Q.value = 1.2; b2.type = 'bandpass'; b2.frequency.value = ix < 2 ? 1000 : 1200; b2.Q.value = 2;
    const end = env(g, t, 0.6, 0.036 * vel, Math.max(0.1, dur - 0.6), 1.0);
    const lfo = vib(ac, t, 4.3 + ix * 0.2, f * 0.004, 0.4, end);
    for (const det of [-9, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; lfo.connect(o.frequency); o.connect(b1); o.connect(b2); o.start(t); o.stop(end); }
    b1.connect(g); b2.connect(g);
    g.connect(bus(ac, out, ix % 2 ? 'choirR' : 'choirL'));
  });
}
function pluck(ac, out, f, t, vel, type, decay, vol) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out); o.start(t); o.stop(t + decay + 0.05);
}
function noiseHit(ac, out, t, type, freq, q, vol, dec, attack = 0.002) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(ac);
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dec);
  s.connect(f).connect(g).connect(out); s.start(t, (t * 7.3) % 1.5); s.stop(t + attack + dec + 0.05);
}
// Konzert-Basstrommel: tiefer, weicher Schlag ohne Tonhöhen-Rutsch (keine Pauke)
function bassDrum(ac, out, t, vel) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.linearRampToValueAtTime(50, t + 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * vel, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g).connect(out); o.start(t); o.stop(t + 1.2);
  noiseHit(ac, out, t, 'lowpass', 220, 0.7, 0.12 * vel, 0.5, 0.008);
}
// Marschtrommel: Fell und Teppich (Schnarrsaiten)
function snare(ac, out, t, vel) {
  noiseHit(ac, out, t, 'bandpass', 3200, 0.8, 0.09 * vel, 0.16);
  noiseHit(ac, out, t, 'highpass', 6000, 0.5, 0.035 * vel, 0.1);
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.06);
  g.gain.setValueAtTime(0.06 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g).connect(out); o.start(t); o.stop(t + 0.1);
}
function gong(ac, out, t, vel) {
  for (const [m, a, d] of [[1, 0.06, 6], [1.48, 0.03, 4], [2.13, 0.02, 3], [2.94, 0.012, 2.5]]) pluck(ac, out, 52 * m, t, vel, 'sine', d, a);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(ac);
  f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 6);
}

// Ein Ereignis zur Zeit t (Sekunden) spielen; e8 = Länge eines Achtels
export function playEvent(ac, room, e, t, e8) {
  const d = (e.d || 1) * e8, tr = e.tr || 0, out = bus(ac, room, e.k);
  if (INST[e.k]) { voice(ac, out, hz(e.n, tr), t, d * (e.k === 'vla' || e.k === 'cello8' ? 0.8 : 1), { ...INST[e.k], vol: INST[e.k].vol * e.v }); return; }
  switch (e.k) {
    case 'strpad': for (const n of e.notes) voice(ac, out, hz(n, tr), t, d, { osc: e.low ? [['sawtooth', 0, 0.8]] : [['sawtooth', -9, 0.5], ['sawtooth', 8, 0.5]], cut: e.low ? 1100 : 2600, a: 0.6, r: 1.0, vol: 0.02 * e.v }); break;
    case 'hornpad': for (const n of e.notes) voice(ac, out, hz(n, tr), t, d, { ...INST.horn, a: 0.3, vol: 0.035 * e.v, vib: null }); break;
    case 'choir': choir(ac, out, e.notes, t, d, e.v, tr); break;
    case 'harp': pluck(ac, out, hz(e.n, tr), t, e.v, 'triangle', 1.2, 0.04); pluck(ac, out, hz(e.n, tr) * 2, t, e.v, 'sine', 0.5, 0.012); break;
    case 'celesta': pluck(ac, out, hz(e.n, tr), t, e.v, 'sine', 1.6, 0.03); pluck(ac, out, hz(e.n, tr) * 4, t, e.v, 'sine', 0.4, 0.008); break;
    case 'bd': bassDrum(ac, out, t, e.v); break;
    case 'snare': snare(ac, out, t, e.v); break;
    case 'roll': snare(ac, out, t, e.v * 0.55); break;
    case 'crash': noiseHit(ac, out, t, 'bandpass', 6500, 0.6, 0.05 * e.v, 2.4, 0.004); break;
    case 'swell': noiseHit(ac, out, t, 'bandpass', 6000, 0.7, 0.045 * e.v, 0.25, d); break;
    case 'gong': gong(ac, out, t, e.v); break;
    case 'bell': for (const [m, a, dd] of [[1, 0.07, 4], [2.76, 0.035, 2.5], [5.4, 0.02, 1.4], [0.5, 0.045, 5]]) pluck(ac, out, hz(e.n) * m, t, e.v, 'sine', dd, a); break;
  }
}

// Live abspielen mit Vorausplanung; gibt eine Stopp-Funktion zurück
export function startScore(ac, out, score) {
  const C = compile(score), e8 = 60 / score.bpm / 2, room = hall(ac, out);
  let i = 0, base = ac.currentTime + 0.15, off = 0;
  const tick = () => {
    const horizon = ac.currentTime + 0.5;
    for (;;) {
      if (i >= C.ev.length) { off += C.total - C.loopAt; i = C.ev.findIndex(e => e.t >= C.loopAt - 0.1); }
      const e = C.ev[i], t = base + (e.t + off) * e8;
      if (t > horizon) break;
      if (t > ac.currentTime - 0.05) playEvent(ac, room, e, Math.max(t, ac.currentTime), e8);
      i++;
    }
  };
  tick(); const timer = setInterval(tick, 100);
  return () => { clearInterval(timer); try { room.disconnect(); } catch {} };
}
// Vorab rendern (Hörprobe): einmal komplett durch
// Wie live: immer nur die nächsten Sekunden anlegen (OfflineAudioContext.suspend), sonst rechnen alle Filter von Anfang an mit
export function renderScore(ac, score) {
  const C = compile(score), e8 = 60 / score.bpm / 2, room = hall(ac, ac.destination), len = 0.2 + C.total * e8 + 4;
  let i = 0;
  const sched = until => { while (i < C.ev.length && 0.2 + Math.max(0, C.ev[i].t) * e8 < until) { playEvent(ac, room, C.ev[i], 0.2 + Math.max(0, C.ev[i].t) * e8, e8); i++; } };
  sched(2.5);
  for (let s = 2; s < len; s += 2) ac.suspend(s).then(() => { sched(s + 2.5); ac.resume(); });
  return len;
}
