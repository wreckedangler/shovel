// Packt das ganze Spiel in EINE HTML-Datei (dist/schaufelheld.html).
// Die läuft ohne Server: Doppelklick genügt, auch offline (nur die Schrift fällt dann zurück).
// node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const mods = {};
for (const f of readdirSync(new URL('src/', root))) if (f.endsWith('.js')) mods[f] = read('src/' + f);

let html = read('index.html');
const css = read('style.css');
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
