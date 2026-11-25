// Optionale Online-Geister über Supabase (gratis). Ohne Konfiguration läuft alles lokal.
// Einrichtung: siehe README.md, Abschnitt "Online-Geister".
import { CONFIG } from './config.js';

export const online = () => !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
const headers = () => ({ apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}`, 'Content-Type': 'application/json' });

export async function uploadGhost({ level, name, frames, code }) {
  if (!online()) return false;
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/ghosts`, {
      method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ level, name, frames, code, version: CONFIG.version }),
    });
    return r.ok;
  } catch { return false; }
}

export async function topGhosts(level, limit = 10) {
  if (!online()) return [];
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/ghosts?level=eq.${encodeURIComponent(level)}&select=name,frames,code&order=frames.asc&limit=${limit}`, { headers: headers() });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

/* ---------- Tagesschacht ---------- */
// Ein Eintrag pro Lauf: Todesstelle (mit den letzten 3 Sekunden als Geist), optional eine Botschaft
export async function uploadDailyRun(run) {
  if (!online()) return false;
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...run, tail: JSON.stringify(run.tail || []).slice(0, 4000), version: CONFIG.version }) });
    return r.ok;
  } catch { return false; }
}
export async function fetchDailyMarks(date, limit = 400) {
  if (!online()) return [];
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs?date=eq.${encodeURIComponent(date)}&select=name,k,x,y,tail,ma,mb,mx,my,mk&order=created_at.desc&limit=${limit}`, { headers: headers() });
    if (!r.ok) return [];
    return (await r.json()).map(m => ({ ...m, tail: (() => { try { return JSON.parse(m.tail || '[]'); } catch { return []; } })() }));
  } catch { return []; }
}
const count = async q => { const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs?${q}&select=id`, { method: 'HEAD', headers: { ...headers(), Prefer: 'count=exact' } }); const cr = r.headers.get('content-range') || ''; return +(cr.split('/')[1] || 0); };
export async function dailyBetter(date, k) {
  if (!online()) return null;
  try { const all = await count(`date=eq.${encodeURIComponent(date)}`), lower = await count(`date=eq.${encodeURIComponent(date)}&k=lt.${k}`); return all > 1 ? Math.round(lower / all * 100) : null; } catch { return null; }
}
