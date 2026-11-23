// Geister: Aufzeichnung eines Laufs (x, y, Pose alle 2 Frames) als teilbarer Code.
// Format: "SH1." + base64url(JSON-Kopf) + "." + base64url(Bytes) — Bytes optional deflate-komprimiert.
// Bytes pro Sample: dx, dy (Int8) und Flags. Grosse Sprünge (Respawn) via Escape 127 + 2×Int16.

const b64 = {
  enc(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; },
};
const txt = { enc: s => new TextEncoder().encode(s), dec: b => new TextDecoder().decode(b) };

async function pipe(bytes, Stream, fmt) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new Stream(fmt)));
  return new Uint8Array(await out.arrayBuffer());
}
const canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function encodeGhost({ level, name, frames, gear, rec }) {
  const out = [];
  let px = 0, py = 0;
  for (const [x, y, f] of rec) {
    const dx = x - px, dy = y - py;
    if (dx > -127 && dx < 127 && dy > -127 && dy < 127) out.push(dx & 255, dy & 255, f & 255);
    else out.push(127, x & 255, (x >> 8) & 255, y & 255, (y >> 8) & 255, f & 255);
    px = x; py = y;
  }
  let bytes = new Uint8Array(out), z = 0;
  if (canZip()) { try { bytes = await pipe(bytes, CompressionStream, 'deflate-raw'); z = 1; } catch { z = 0; bytes = new Uint8Array(out); } }
  const head = { v: 1, l: level, n: String(name || 'Anonym').slice(0, 16), t: frames, s: gear.shovel, a: gear.armor, z, c: rec.length };
  return 'SH1.' + b64.enc(txt.enc(JSON.stringify(head))) + '.' + b64.enc(bytes);
}

export async function decodeGhost(code) {
  try {
    const [tag, h, d] = String(code).trim().split('.');
    if (tag !== 'SH1') return null;
    const head = JSON.parse(txt.dec(b64.dec(h)));
    let bytes = b64.dec(d);
    if (head.z) bytes = await pipe(bytes, DecompressionStream, 'deflate-raw');
    const rec = [];
    let x = 0, y = 0, i = 0;
    const s8 = v => (v > 127 ? v - 256 : v);
    while (i < bytes.length && rec.length < head.c) {
      if (bytes[i] === 127) {
        x = s16(bytes[i + 1] | bytes[i + 2] << 8); y = s16(bytes[i + 3] | bytes[i + 4] << 8);
        rec.push([x, y, bytes[i + 5]]); i += 6;
      } else { x += s8(bytes[i]); y += s8(bytes[i + 1]); rec.push([x, y, bytes[i + 2]]); i += 3; }
    }
    return { level: head.l, name: head.n, frames: head.t, gear: { shovel: head.s, armor: head.a }, rec };
  } catch { return null; }
}
const s16 = v => (v > 32767 ? v - 65536 : v);

// Position des Geists zu einem Frame (mit Interpolation)
export function ghostAt(g, frame) {
  const r = g.rec; if (!r.length) return null;
  const k = frame / 2 - 1, i = Math.floor(k);
  if (i >= r.length - 1) return { x: r[r.length - 1][0], y: r[r.length - 1][1], f: r[r.length - 1][2], finished: true };
  if (i < 0) return { x: r[0][0], y: r[0][1], f: r[0][2] };
  const a = r[i], b = r[i + 1], t = k - i;
  if (Math.abs(b[0] - a[0]) > 40 || Math.abs(b[1] - a[1]) > 40) return { x: a[0], y: a[1], f: a[2] };
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, f: t < 0.5 ? a[2] : b[2] };
}

export const fmtTime = frames => {
  const s = frames / 60, m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
