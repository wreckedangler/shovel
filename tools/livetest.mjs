// Live-Duell ohne Netz: zwei Geräte, simuliert mit Laufzeit, Schwankung und Paketstau.
// Prüft, dass beide Seiten bitgenau dasselbe Duell rechnen und gleich enden.
import { Match, ShadeAI, cleanGear } from '../src/arena.js';
import { LiveDuel } from '../src/live.js';
import { rng } from '../src/core.js';

let fail = 0;
const bad = m => { console.log('FEHLER', m); fail++; };
function run(seed, lat, jit, arena) {
  const R = rng(seed * 7 + 1), q = [];
  let now = 0, msgs = 0;
  const chan = to => ({ send(ev, p) { msgs++; q.push({ at: now + lat + Math.floor(R() * jit), to, ev, p: JSON.parse(JSON.stringify(p)) }); } });
  const gH = cleanGear({ shovel: 5, weapon: 'blitzspaten', helm: 'mondkrone', brust: 5, umhang: 5, hose: 5 }), gG = cleanGear({ shovel: 3, weapon: null, helm: 4, brust: 'glutkern', umhang: 4, hose: 'wolkenhose' });
  const mk = (view) => new Match({ arena, seed, live: true, view, meGear: view === 'A' ? gH : gG, autoPogo: view === 'A', foe: { name: 'x', gear: view === 'A' ? gG : gH, autoPogo: view !== 'A' } });
  // Verzögerung wie im Spiel: aus der gemessenen Laufzeit (Median) plus Puffer
  const D = Math.max(5, Math.min(16, Math.ceil(lat + jit / 2) + 5));
  const H = new LiveDuel(mk('A'), true, D, chan('G')), G = new LiveDuel(mk('B'), false, D, chan('H'));
  const aiH = new ShadeAI(seed, { aggr: 0.7, pogo: 0.5, air: 0.5 }, 0.7), aiG = new ShadeAI(seed + 99, { aggr: 0.5, pogo: 0.3, air: 0.6 }, 0.6);
  let waitH = 0, waitG = 0;
  for (; now < 60 * 60 * 6 && !(H.m.over && G.m.over); now++) {
    for (let k = q.length - 1; k >= 0; k--) if (q[k].at <= now) { const m = q.splice(k, 1)[0], d = m.to === 'H' ? H : G; if (m.ev === 'in') d.recv(m.p); else if (m.ev === 'sum') d.peerSum(m.p); else if (m.ev === 'nak') d.resend(m.p.from); }
    const iH = H.m.state === 'fight' ? aiH.think(H.m.A, H.m.B) : {}, iG = G.m.state === 'fight' ? aiG.think(G.m.B, G.m.A) : {};
    H.tick(iH); G.tick(iG);
    if (H.waiting) waitH++; if (G.waiting) waitG++;
    if (H.ended || G.ended) { bad(`Seed ${seed}: abgebrochen – ${H.abortReason || G.abortReason}`); break; }
  }
  if (!H.m.over || !G.m.over) bad(`Seed ${seed}: kein Ende`);
  else {
    if (H.m.checksum() !== G.m.checksum()) bad(`Seed ${seed}: Zustand weicht ab`);
    const a = H.m.result, b = G.m.result;
    if (a.won !== (!b.won && !b.draw) || a.draw !== b.draw || a.score[0] !== b.score[1]) bad(`Seed ${seed}: Ergebnisse widersprechen sich`);
  }
  return { waitH, waitG, frames: H.f, msgs: msgs / (now / 60), D };
}
for (const [lat, jit] of [[3, 2], [6, 6], [10, 12]]) {
  let w = 0, f = 0, mps = 0; const n = 6;
  for (let s = 1; s <= n; s++) { const r = run(s * 13 + lat, lat, jit, ['aschenhof', 'glockenstuhl', 'saegeschlund'][s % 3]); w += r.waitH + r.waitG; f += r.frames * 2; mps += r.msgs; var D = r.D; }
  console.log(`Laufzeit ${Math.round(lat * 16.7)}–${Math.round((lat + jit) * 16.7)} ms: Verzögerung ${D} Bilder · Wartebilder ${(w / f * 100).toFixed(1)} % · ${(mps / n).toFixed(0)} Nachrichten/s (beide zusammen)`);
}
console.log(fail ? `${fail} Fehler` : 'Alles ok');
process.exit(fail ? 1 : 0);
