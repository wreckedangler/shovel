// Erzeugt icons/icon-192.png und icon-512.png ohne Abhängigkeiten.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const ART = [
  '................',
  '..........kkk...',
  '.........kSSSk..',
  '........kSSSSk..',
  '........kSSSk...',
  '.......khkkk....',
  '....kkkhk.......',
  '...kAAkh........',
  '..kAAAhAk.......',
  '..kAvhvAk.......',
  '..kAhevAk.......',
  '..khAAAak.......',
  '.khkkaakk.......',
  '.kk.............',
  '................',
  '................',
];
const PAL = { k: [20, 12, 28], A: [233, 162, 90], a: [138, 79, 31], v: [36, 26, 58], e: [255, 224, 102], S: [238, 245, 252], h: [107, 68, 38] };
const BG = [42, 22, 64], BG2 = [255, 79, 122];
function png(size) {
  const px = size / 16, raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor(y / px)][Math.floor(x / px)];
      const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      const col = PAL[ch] || (d < 0.78 ? BG2.map((v, i) => Math.round(v * 0.25 + BG[i] * 0.75)) : BG);
      raw.set([...col, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [192, 512]) writeFileSync(new URL(`../icons/icon-${s}.png`, import.meta.url), png(s));
console.log('Icons geschrieben');
