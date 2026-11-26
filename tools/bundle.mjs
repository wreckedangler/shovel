// Packt das ganze Spiel in EINE HTML-Datei (dist/schaufelheld.html).
// Die läuft ohne Server: Doppelklick genügt, auch offline (nur die Schrift fällt dann zurück).
// node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const mods = {};
for (const f of readdirSync(new URL('src/', root))) if (f.endsWith('.js')) mods[f] = read('src/' + f);

let html = read('index.html');
const css = read('style.css').replace(/url\('(art\/[\w-]+\.webp)'\)/g, (_, path) =>
  'url(data:image/webp;base64,' + readFileSync(new URL(path, root)).toString('base64') + ')');
const icon = 'data:image/png;base64,' + readFileSync(new URL('icons/icon-192.png', root)).toString('base64');
html = html
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" href="${icon}">`)
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="${icon}">`)
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`);

// Module als JSON einbetten; ein kleiner Lader macht daraus Blob-Module und biegt die Importe um.
const loader = `<script>
(() => {
  const SRC = ${JSON.stringify(mods).replace(/<\/script/gi, '<\\/script')};
  const urls = {};
  const load = name => {
    if (urls[name]) return urls[name];
    const code = SRC[name].replace(/from\\s+'\\.\\/([\\w-]+\\.js)'/g, (_, dep) => "from '" + load(dep) + "'");
    return (urls[name] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  };
  window.__SH_BUNDLE = true;
  import(load('main.js')).catch(e => { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#fff;position:fixed;inset:0;z-index:99;padding:20px;background:#200">Fehler beim Start: ' + e + '</pre>'); });
})();
</script>`;
html = html.replace('<script type="module" src="src/main.js"></script>', loader);

mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/schaufelheld.html', root), html);
console.log(`dist/schaufelheld.html geschrieben (${(html.length / 1024).toFixed(0)} KB, ${Object.keys(mods).length} Module)`);

// Offline-Download: dieselbe Datei als ZIP (Codex: öffentlicher Download), damit er nie veraltet
{
  const { deflateRawSync, crc32 } = await import('node:zlib');
  const name = Buffer.from('Schaufelheld.html'), data = Buffer.from(html), comp = deflateRawSync(data, { level: 9 }), crc = crc32(data);
  const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(0x0800, 6); loc.writeUInt16LE(8, 8);
  loc.writeUInt32LE(crc >>> 0, 14); loc.writeUInt32LE(comp.length, 18); loc.writeUInt32LE(data.length, 22); loc.writeUInt16LE(name.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
  cen.writeUInt32LE(crc >>> 0, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(name.length, 28);
  const off = 30 + name.length + comp.length, end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + name.length, 12); end.writeUInt32LE(off, 16);
  writeFileSync(new URL('dist/schaufelheld.zip', root), Buffer.concat([loc, name, comp, cen, name, end]));
}
