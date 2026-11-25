// Spielstand im Browser (localStorage). Fällt still auf Arbeitsspeicher zurück.
const KEY = 'schaufelheld-v1';
const DEF = {
  gems: 0, earned: 0, shovel: 0, armor: 0, unlocked: 1,
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
  relics: {}, relicSlots: [null, null, null], cosmetics: {}, look: { spur: null, farbe: null, aura: null }, shards: 0,
  keys: { holz: 1, eisen: 0, gold: 0, urlicht: 0 }, loot: { pity: 0, opened: 0 }, keyLog: {},
  coins: {}, secrets: {}, secretOpen: {}, ach: {}, ranks: {}, daily: { last: '', streak: 0 }, scarf: 'auto', retro: false,
  stats: { dug: 0, bestChain: 0, golden: 0, rush: 0, legendChest: 0, flag: 0, sleep: 0, bossClean: 0, retro: 0 },
};
const fresh = () => JSON.parse(JSON.stringify(DEF));
const data = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); Object.assign(data, o, { stats: { ...data.stats, ...(o.stats || {}) }, daily: { ...data.daily, ...(o.daily || {}) }, keys: { ...data.keys, ...(o.keys || {}) }, loot: { ...data.loot, ...(o.loot || {}) }, look: { ...data.look, ...(o.look || {}) } }); } } catch {}

export const save = {
  get d() { return data; },
  write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
  reset() { const name = data.name; for (const k in data) delete data[k]; Object.assign(data, fresh(), { name }); this.write(); },
};
