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
