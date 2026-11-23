// Spielstand im Browser (localStorage). Fällt still auf Arbeitsspeicher zurück.
const KEY = 'schaufelheld-v1';
const DEF = {
  gems: 0, earned: 0, shovel: 0, armor: 0, unlocked: 1,
  best: {},        // levelId -> Frames
  ghosts: {},      // levelId -> eigener bester Geist-Code
  imported: {},    // levelId -> [{code, name, frames}]
  cleared: {},     // levelId -> true
  name: '', sfx: true, music: true, ghostOn: true,
};
const fresh = () => JSON.parse(JSON.stringify(DEF));
const data = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(data, JSON.parse(raw)); } catch {}

export const save = {
  get d() { return data; },
  write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
  reset() { const name = data.name; for (const k in data) delete data[k]; Object.assign(data, fresh(), { name }); this.write(); },
};
