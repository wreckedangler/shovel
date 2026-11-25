// Schummelwörter. Gefunden werden sie im Spiel: auf Schildern in Geheimräumen und als Belohnung für Erfolge.
// play: verändert das Spiel → Ränge, Rekorde, Sterne und Münzen zählen in dieser Runde nicht.
export const CHEATS = [
  { id: 'konfetti', code: 'KONFETTI', name: 'Konfettiregen', desc: 'Jeder Treffer und jeder Edelstein wird zur Party.', hint: 'Eine geheime Kammer im Moosweg flüstert es.' },
  { id: 'mond', code: 'MONDSCHWERKRAFT', name: 'Mondschwerkraft', desc: 'Halbe Schwerkraft. Alles schwebt.', hint: 'Ein Schild in der Goldader.', play: true },
  { id: 'spiegel', code: 'SPIEGELWELT', name: 'Spiegelwelt', desc: 'Die Welt ist gespiegelt, links ist rechts.', hint: 'Tief unter der Zahnradgasse.' },
  { id: 'maulwurf', code: 'MAULWURFSKOENIG', name: 'Maulwurfskönig', desc: 'Die Schaufel gräbt durch jeden Boden.', hint: 'Im Tresor der Zeit.', play: true },
  { id: 'riese', code: 'RIESENWUCHS', name: 'Riesenwuchs', desc: 'Der Held wird doppelt so gross (nur fürs Auge).', hint: 'Im Myzelnetz.' },
  { id: 'disco', code: 'DISCOGRUFT', name: 'Discogruft', desc: 'Die Welt wechselt unablässig die Farben.', hint: 'In der Schaufelgruft.' },
  { id: 'winzling', code: 'WINZLING', name: 'Winzling', desc: 'Der Held schrumpft auf halbe Grösse (nur fürs Auge).', hint: 'Erfolg „Nickerchen“.', ach: 'sleep' },
  { id: 'wolken', code: 'WOLKENLAEUFER', name: 'Wolkenläufer', desc: 'Springe in der Luft, so oft du willst.', hint: 'Erfolg „Flummi“.', ach: 'chain8', play: true },
  { id: 'midas', code: 'MIDAS', name: 'Midas', desc: 'Jeder Gegner ist golden.', hint: 'Erfolg „Goldfieber“.', ach: 'golden', play: true },
  { id: 'espresso', code: 'ESPRESSO', name: 'Espresso', desc: 'Das Spiel läuft anderthalbmal so schnell.', hint: 'Erfolg „Meisterlich“.', ach: 'rankS', play: true },
  { id: 'zeitlupe', code: 'ZEITLUPE', name: 'Zeitlupe', desc: 'Alles läuft halb so schnell.', hint: 'Erfolg „Hartnäckig“.', ach: 'die10', play: true },
  { id: 'gott', code: 'UNVERWUNDBAR', name: 'Unverwundbar', desc: 'Kein Schaden mehr. Abgründe bleiben tödlich.', hint: 'Erfolg „Unberührbar“.', ach: 'clean', play: true },
];
export const cheatByCode = code => CHEATS.find(c => c.code === String(code).trim().toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/\s+/g, ''));
export const activeCheats = D => Object.keys(D.cheatsOn || {}).filter(k => D.cheatsOn[k]);
export const playCheats = D => activeCheats(D).filter(id => CHEATS.find(c => c.id === id)?.play);
