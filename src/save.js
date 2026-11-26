// Spielstand im Browser (localStorage). Fällt still auf Arbeitsspeicher zurück.
const KEY = 'schaufelheld-v1', BACKUP = 'schaufelheld-v1-backup';
export const SAVE_VERSION = 4;
const DEF = {
  saveVersion: SAVE_VERSION, device: '', lastBackup: 0, playDays: 0, quality: 'auto', a11y: { symbols: false, shake: 1, flash: true, uiScale: 1, swapAB: false, lefty: false }, deathMap: {},
  gems: 0, earned: 0, shovel: 0, gearUnlocked: { shovel: 0 }, unlocked: 1,
  // Rüstung in vier Teilen: geschmiedete Stufe je Platz, angelegtes Teil (Stufe oder ID eines einzigartigen Stücks), gefundene Stücke
  helm: 0, brust: 0, umhang: 0, hose: 0, equip: { helm: 0, brust: 0, umhang: 0, hose: 0 }, pieces: {},
  best: {},        // levelId -> Frames
  ghosts: {},      // levelId -> eigener bester Geist-Code
  imported: {},    // levelId -> [{code, name, frames}]
  cleared: {},     // levelId -> true
  name: '', sfx: true, music: true, ghostOn: true,
  weapons: {},     // freigeschaltete Waffen
  weapon: null,    // ausgerüstete Waffe (null = Schaufel)
  deathsTotal: 0, stars: {}, chests: {},
  stick: false, vibrate: true, fullscreen: true,
  cheatsKnown: {}, cheatsOn: {}, seenSplash: false,
  endless: { seed: 0, depth: 1, best: 0, runs: 0, coins: 0, curses: {}, hc: { on: false, seed: 0, depth: 1, best: 0 } },
  ts: { date: '', k: 1, done: false, path: [], end: null, msg: null, history: {}, marks: {}, carried: 0, frames: 0, better: null },
  relics: {}, relicSlots: [null, null, null], cosmetics: {}, look: { spur: null, farbe: null, aura: null }, shards: 0,
  keys: { holz: 1, eisen: 0, gold: 0, urlicht: 0 }, loot: { pity: 0, opened: 0 }, keyLog: {},
  coins: {}, secrets: {}, secretOpen: {}, ach: {}, ranks: {}, daily: { last: '', streak: 0 }, scarf: 'auto', retro: false,
  stats: { dug: 0, bestChain: 0, golden: 0, rush: 0, legendChest: 0, flag: 0, sleep: 0, bossClean: 0, retro: 0 },
};
const fresh = () => JSON.parse(JSON.stringify(DEF));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
// Tiefes Zusammenführen: neue Felder aus DEF ergänzen, nichts Vorhandenes überschreiben
function mergeDeep(def, o) {
  const out = Array.isArray(def) ? (Array.isArray(o) ? o : def) : { ...def };
  if (!isObj(def)) return o === undefined ? def : o;
  for (const k in o) out[k] = k in def && isObj(def[k]) && isObj(o[k]) ? mergeDeep(def[k], o[k]) : o[k];
  return out;
}
// Umwandlung alter Spielstände
const SLOTS = ['helm', 'brust', 'umhang', 'hose'];
const MIGRATIONS = {
  // 4: eine Rüstung wird zu vier Teilen; geschmiedet ist die höchste je erworbene Stufe, angelegt die gewählte
  3: d => {
    const cl = v => Math.max(0, Math.min(11, Math.floor(+v || 0)));
    const sel = cl(d.armor), own = Math.max(sel, cl(d.gearUnlocked && d.gearUnlocked.armor));
    for (const k of SLOTS) d[k] = own; d.equip = { helm: sel, brust: sel, umhang: sel, hose: sel }; d.pieces = d.pieces || {};
    delete d.armor; if (d.gearUnlocked) delete d.gearUnlocked.armor; return d;
  },
  2: d => { d.gearUnlocked = { shovel: d.shovel, armor: d.armor }; return d; },
  1: d => { if (!Array.isArray(d.relicSlots)) d.relicSlots = [null, null, null]; while (d.relicSlots.length < 3) d.relicSlots.push(null); return d; },
};
function migrate(o) {
  let v = o.saveVersion || 1;
  while (v < SAVE_VERSION) { if (MIGRATIONS[v]) o = MIGRATIONS[v](o) || o; v++; }
  o.saveVersion = SAVE_VERSION; return o;
}
// Plausibilität: beschädigte Werte reparieren statt abzustürzen
function sanitize(d) {
  for (const k of ['gems', 'earned', 'shovel', 'unlocked', 'shards', 'deathsTotal', ...SLOTS]) if (!Number.isFinite(d[k]) || d[k] < 0) d[k] = DEF[k] ?? 0;
  d.shovel = Math.min(11, Math.floor(d.shovel));
  if (!isObj(d.gearUnlocked)) d.gearUnlocked = {};
  const owned = d.gearUnlocked.shovel;
  d.gearUnlocked = { shovel: Number.isFinite(owned) ? Math.max(d.shovel, Math.min(11, Math.floor(owned))) : d.shovel };
  if (!isObj(d.equip)) d.equip = { helm: 0, brust: 0, umhang: 0, hose: 0 };
  if (!isObj(d.pieces)) d.pieces = {};
  for (const k of SLOTS) {
    d[k] = Math.min(11, Math.floor(d[k]));
    const e = d.equip[k];
    // angelegt: Stufe bis zur geschmiedeten oder ein gefundenes Stück
    if (typeof e === 'string' ? !d.pieces[e] : !(Number.isFinite(e) && e >= 0 && e <= d[k])) d.equip[k] = d[k];
  }
  if (!d.device) d.device = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return d;
}
function readKey(k) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } }
const data = fresh();
let loadedFrom = 'neu';
{
  const main = readKey(KEY), bak = readKey(BACKUP), src = main || bak;
  if (src) { Object.assign(data, sanitize(mergeDeep(fresh(), migrate(src)))); loadedFrom = main ? 'speicher' : 'sicherung'; }
  else sanitize(data);
}
// Den Browser bitten, den Speicher nicht automatisch zu löschen (wirkt v. a. bei installierter App)
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

let lastBak = 0;
export const save = {
  get d() { return data; },
  get loadedFrom() { return loadedFrom; },
  write() {
    try {
      const raw = JSON.stringify(data); localStorage.setItem(KEY, raw);
      // zweite Kopie höchstens jede Minute: hilft, wenn ein Schreibvorgang mittendrin abbricht
      if (Date.now() - lastBak > 60000) { localStorage.setItem(BACKUP, raw); lastBak = Date.now(); }
    } catch {}
  },
  reset() { const name = data.name, device = data.device; for (const k in data) delete data[k]; Object.assign(data, fresh(), { name, device }); this.write(); },
  // Export als Text-Code (komprimiert, mit Prüfsumme)
  async exportCode() {
    const json = JSON.stringify(data), bytes = new TextEncoder().encode(json);
    let out = bytes, z = 0;
    if (typeof CompressionStream !== 'undefined') { try { out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); z = 1; } catch {} }
    let bin = ''; for (const b of out) bin += String.fromCharCode(b);
    data.lastBackup = Date.now(); this.write();
    return `SHSAVE.${z}.${sum(json)}.` + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  async importCode(code) {
    const m = /SHSAVE\.(\d)\.([a-z0-9]+)\.([A-Za-z0-9_-]+)/.exec(code || ''); if (!m) throw new Error('Kein gültiger Spielstand-Code.');
    const b = m[3].replace(/-/g, '+').replace(/_/g, '/'), bin = atob(b + '==='.slice((b.length + 3) % 4));
    let bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    if (m[1] === '1') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    const json = new TextDecoder().decode(bytes);
    if (sum(json) !== m[2]) throw new Error('Der Code ist beschädigt (Prüfsumme stimmt nicht).');
    const o = sanitize(mergeDeep(fresh(), migrate(JSON.parse(json))));
    for (const k in data) delete data[k]; Object.assign(data, o); this.write();
  },
};
function sum(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
