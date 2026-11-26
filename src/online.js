// Optionale Online-Geister über Supabase (gratis). Ohne Konfiguration läuft alles lokal.
// Einrichtung: siehe README.md, Abschnitt "Online-Geister".
import { CONFIG } from './config.js';

export const online = () => !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
const headers = () => ({ apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}`, 'Content-Type': 'application/json' });

async function viaVerify(body) {
  try { const r = await fetch(CONFIG.verifyUrl, { method: 'POST', headers: headers(), body: JSON.stringify(body) }); return r.ok; } catch { return false; }
}
export async function uploadGhost({ level, name, frames, code }) {
  if (!online()) return false;
  if (CONFIG.verifyUrl) return viaVerify({ kind: 'ghost', code, name, version: CONFIG.version });
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
  if (CONFIG.verifyUrl) return viaVerify({ kind: 'daily', run: { ...run, tail: JSON.stringify(run.tail || []).slice(0, 4000), version: CONFIG.version } });
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...run, tail: JSON.stringify(run.tail || []).slice(0, 4000), version: CONFIG.version }) });
    return r.ok;
  } catch { return false; }
}
export async function fetchDailyMarks(date, limit = 400) {
  if (!online()) return [];
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs?date=eq.${encodeURIComponent(date)}&select=name,gv,k,x,y,tail,ma,mb,mx,my,mk&order=created_at.desc&limit=${limit}`, { headers: headers() });
    if (!r.ok) return [];
    return (await r.json()).map(m => ({ ...m, tail: (() => { try { return JSON.parse(m.tail || '[]'); } catch { return []; } })() }));
  } catch { return []; }
}
const count = async q => { const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/daily_runs?${q}&select=id`, { method: 'HEAD', headers: { ...headers(), Prefer: 'count=exact' } }); const cr = r.headers.get('content-range') || ''; return +(cr.split('/')[1] || 0); };
export async function dailyBetter(date, k) {
  if (!online()) return null;
  try { const all = await count(`date=eq.${encodeURIComponent(date)}`), lower = await count(`date=eq.${encodeURIComponent(date)}&k=lt.${k}`); return all > 1 ? Math.round(lower / all * 100) : null; } catch { return null; }
}

/* ---------- Cloud-Sicherung ---------- */
const saveHeaders = token => ({ ...headers(), 'x-save-token': token });
export async function cloudSave(token, data) {
  if (!online()) return false;
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/saves?on_conflict=token`, { method: 'POST', headers: { ...saveHeaders(token), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ token, data, updated_at: new Date().toISOString() }) });
    return r.ok;
  } catch { return false; }
}
export async function cloudLoad(token) {
  if (!online()) return null;
  try { const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/saves?token=eq.${encodeURIComponent(token)}&select=data,updated_at`, { headers: saveHeaders(token) }); const a = r.ok ? await r.json() : []; return a[0] || null; } catch { return null; }
}
/* ---------- Anonyme Todesstellen ---------- */
export async function uploadDeaths(map) {
  if (!online()) return false;
  const rows = Object.entries(map).filter(([, xs]) => xs.length).map(([level, xs]) => ({ level, xs: xs.slice(-200), version: CONFIG.version }));
  if (!rows.length) return true;
  try { const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/deaths_anon`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); return r.ok; } catch { return false; }
}

/* ---------- Schatten-Arena ---------- */
const rpc = (fn, body) => fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
// Eigenen Schatten hochladen; liefert die öffentliche Nummer des Schattens
export async function arenaUpsert(token, s) {
  if (!online()) return null;
  try {
    const r = await rpc('arena_upsert', { p_token: token, p_name: s.name, p_gear: s.gear, p_style: s.style, p_rating: s.rating, p_wins: s.wins, p_losses: s.losses, p_version: CONFIG.version });
    return r.ok ? +(await r.json()) || null : null;
  } catch { return null; }
}
export async function arenaReport(token, shade, shadeWon) {
  if (!online()) return false;
  try { return (await rpc('arena_report', { p_token: token, p_shade: shade, p_shade_won: !!shadeWon })).ok; } catch { return false; }
}
// Schatten in der Nähe der eigenen Wertung (zuletzt aktive zuerst)
export async function arenaShades(rating, limit = 40) {
  if (!online()) return [];
  try {
    const lo = Math.max(0, Math.round(rating) - 300), hi = Math.round(rating) + 300;
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/arena_shades?rating=gte.${lo}&rating=lte.${hi}&select=id,name,gear,style,rating,wins,losses&order=updated_at.desc&limit=${limit}`, { headers: headers() });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
export async function arenaShade(id) {
  if (!online() || !id) return null;
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/arena_shades?id=eq.${+id}&select=id,rating,wins,losses,shade_wins,shade_losses`, { headers: headers() });
    return r.ok ? (await r.json())[0] || null : null;
  } catch { return null; }
}
