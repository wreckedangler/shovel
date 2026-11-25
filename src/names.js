// Namensfilter für sichtbare Spielernamen (Tagesschacht, Geister). Kein perfekter Schutz, aber er fängt das Gröbste ab.
// Der Server prüft später zusätzlich (supabase/schema.sql).
const BAD = ['arsch', 'fick', 'fuck', 'shit', 'scheiss', 'scheiß', 'hure', 'nutte', 'fotze', 'wichs', 'schwuchtel', 'spast', 'mongo', 'nigg', 'neger', 'hitler', 'nazi', 'sieg heil', 'heil', 'kanake', 'bitch', 'cunt', 'dick', 'penis', 'vagina', 'porn', 'sex', 'kill yourself', 'kys', 'rape', 'vergewalt', 'jude', 'kike', 'faggot', 'retard', 'whore', 'slut', '88', '1488'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
export function cleanName(raw) {
  const n = String(raw || '').replace(/[\u0000-\u001f<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const norm = n.toLowerCase().replace(/[013457@$!]/g, c => LEET[c] || c).replace(/[^a-zäöüß ]/g, '');
  const squash = norm.replace(/ /g, '');
  for (const w of BAD) { const ww = w.replace(/ /g, ''); if (/^\d+$/.test(ww) ? n.includes(ww) : squash.includes(ww)) return { ok: false, name: '' }; }
  return { ok: true, name: n };
}
