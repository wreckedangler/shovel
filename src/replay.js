// Wiederholungen aus Tastendrücken: "SH2." + base64url(deflate(JSON)).
// Weil die Spiellogik deterministisch ist, ergibt dieselbe Eingabefolge auf jedem Gerät denselben Lauf.
// Daraus entstehen Geister, Prüfungen auf dem Server und die Probeläufe der Tests.
import { Game } from './game.js';
import { levelById } from './levels.js';

/**
 * @typedef {{ shovel: number, armor?: number, weapon?: string | null, helm?: number | string, brust?: number | string, umhang?: number | string, hose?: number | string }} Gear
 * @typedef {{ v: number, level: string, gear: Gear, opt: Record<string, any>, frames: number, done: boolean, deaths: number, in: number[], name?: string }} Replay
 */
// 2: schnellerer Hieb, Mindestsprung, Schaufel-Sprung per B, kein Edelsteinverlust (Läufe von Version 1 passen nicht mehr)
export const REPLAY_VERSION = 2;
const MASK = ['left', 'right', 'down', 'jump', 'attack', 'jumpP', 'attackP'];
export const maskToInput = m => ({ left: !!(m & 1), right: !!(m & 2), down: !!(m & 4), jump: !!(m & 8), attack: !!(m & 16), jumpP: !!(m & 32), attackP: !!(m & 64) });
void MASK;

// Lauflängen-Kodierung: [Maske, Anzahl, Maske, Anzahl, …]
export function rle(inputs) { const out = []; for (const m of inputs) { if (out.length && out[out.length - 2] === m) out[out.length - 1]++; else out.push(m, 1); } return out; }
export function unrle(a) { const out = []; for (let i = 0; i < a.length; i += 2) for (let k = 0; k < a[i + 1]; k++) out.push(a[i]); return out; }

// Alles, was den Lauf beeinflusst, kommt in die Wiederholung (aber keine fremden Blutflecken)
export function replayOf(game, extra = {}) {
  const o = game.simOpt || {};
  return { v: REPLAY_VERSION, level: game.level.id, gear: game.gear, opt: { enemyRevision: game.enemyRevision, seed: o.seed || 7, roamerSeed: o.roamerSeed, cheats: o.cheats || {}, relics: o.relics || {}, curses: o.curses || {}, elite: o.elite || 0, bossTier: o.bossTier || 0, noCheck: !!o.noCheck, timeLimit: o.timeLimit || 0, autoPogo: o.autoPogo !== false },
    frames: game.frame, done: game.done, deaths: game.deaths, in: rle(game.inputs), ...extra };
}

const b64u = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { const b = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(b + '==='.slice((b.length + 3) % 4)), c => c.charCodeAt(0)); };
const canZip = () => typeof CompressionStream !== 'undefined';
async function pipe(bytes, Kind, fmt) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Kind(fmt))).arrayBuffer()); }

export async function encodeReplay(r) {
  let bytes = new TextEncoder().encode(JSON.stringify(r)), z = 0;
  if (canZip()) { try { bytes = await pipe(bytes, CompressionStream, 'deflate-raw'); z = 1; } catch {} }
  return `SH2.${z}.${b64u(bytes)}`;
}
export async function decodeReplay(code) {
  const m = /SH2\.(\d)\.([A-Za-z0-9_-]+)/.exec(code || ''); if (!m) return null;
  let bytes = unb64u(m[2]);
  if (m[1] === '1') bytes = await pipe(bytes, DecompressionStream, 'deflate-raw');
  const r = JSON.parse(new TextDecoder().decode(bytes));
  return r && r.v === REPLAY_VERSION && Array.isArray(r.in) ? r : null;
}

// Nachspielen. Gibt das Spiel nach dem letzten Schritt zurück; mit rec=true auch die Positionen für Geister.
/** @param {Replay} r @param {{ level?: any, max?: number }} [opts] */
export function simulate(r, opts = {}) {
  const L = opts.level || levelById(r.level); if (!L) return null;
  const g = new Game(L, r.gear, { ...r.opt, enemyRevision: r.opt?.enemyRevision ?? 0 });
  const ins = unrle(r.in), max = opts.max || 60 * 60 * 30;
  for (let i = 0; i < ins.length && i < max; i++) g.step(maskToInput(ins[i]));
  return g;
}
// Prüfen, ob eine Wiederholung hält, was sie verspricht
/** @param {Replay} r @param {{ level?: any }} [opts] */
export function verify(r, opts) {
  const g = simulate(r, opts); if (!g) return { ok: false, why: 'Level unbekannt' };
  const ok = g.done === !!r.done && g.frame === r.frames && (!r.done || g.deaths === r.deaths);
  return { ok, game: g, why: ok ? '' : `Abweichung: ziel=${g.done}/${r.done} frames=${g.frame}/${r.frames}` };
}
// Wiederholung als Geist (gleiche Form wie die alten SH1-Geister)
export function ghostFromReplay(r, name) {
  const g = simulate(r); if (!g) return null;
  return { level: r.level, name: name || r.name || 'Geist', frames: g.frame, gear: r.gear, rec: g.rec, verified: g.done && g.frame === r.frames };
}
