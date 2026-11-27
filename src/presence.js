// Wer spielt gerade? Jedes offene Spiel meldet sich in einem gemeinsamen Realtime-Kanal an (Supabase Presence).
// Keine Datenbank, keine Namen: nur eine zufällige Kennung pro geöffnetem Spiel. Im Hintergrund meldet sich das Spiel ab.
import { CONFIG } from './config.js';
import { RealtimeSocket, randomId } from './live.js';

const me = randomId(12), subs = new Set();
let n = 0, sock = null, ch = null, retry = 0, waiting = false, started = false;
const set = v => { n = v; for (const f of subs) f(v); };
const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
export const onlineCount = () => n;
export function onOnline(fn) { subs.add(fn); fn(n); return () => subs.delete(fn); }

function reconnect() {
  if (waiting) return;
  waiting = true; set(0);
  try { sock && sock.close(); } catch {}
  sock = ch = null;
  setTimeout(() => { waiting = false; connect(); }, Math.min(60000, 3000 * 2 ** retry++));
}
async function connect() {
  try {
    const s = sock = new RealtimeSocket(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    await s.connect();
    const c = ch = s.channel('sh-online-1', { key: me });
    c.on('presence', p => set(Object.keys(p).length));
    c.onClose = reconnect;
    await c.join();
    retry = 0;
    if (visible()) c.track({ v: CONFIG.version });
  } catch { reconnect(); }
}
export function startPresence() {
  if (started || !CONFIG.supabaseUrl || !CONFIG.supabaseKey || typeof WebSocket === 'undefined') return;
  started = true; connect();
  document.addEventListener('visibilitychange', () => {
    if (!ch || !ch.joined) return;
    if (visible()) ch.track({ v: CONFIG.version }); else ch.untrack();
  });
}
