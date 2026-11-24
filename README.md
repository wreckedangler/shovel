# Schaufelheld

Mobiler Pixel-Plattformer als installierbare Web-App. Graben, Schaufel-Sprünge, Ausrüstung in 12 Materialstufen schmieden und gegen Geister anderer Spieler rennen.

Keine Abhängigkeiten, kein Build-Schritt: reines HTML, CSS und JavaScript-Module.

## Steuerung

| Aktion | Touch | Tastatur | Gamepad |
|---|---|---|---|
| Laufen | ◀ ▶ | Pfeiltasten / A D | Stick, D-Pad |
| Springen | A | Leertaste / Z / W | A |
| Schaufel | B | X / J | X / B |
| Schaufel-Sprung | in der Luft ▼ halten | ↓ / S | ↓ |
| Durch Plattform fallen | ▼ + A | ↓ + Springen | ↓ + A |
| Pause | II | Esc / P | – |

## Lokal starten

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Tests (Level-Prüfung, Bot-Durchlauf, Geist-Codes):

```bash
node tools/test.mjs
```

## Veröffentlichen (GitHub Pages)

1. Repo auf GitHub pushen (öffentlich).
2. *Settings → Pages → Build and deployment → Deploy from a branch → `main` / root*.
3. Nach ein bis zwei Minuten läuft das Spiel unter `https://<name>.github.io/schaufelheld/`.
4. Auf dem Handy öffnen → *Zum Home-Bildschirm*. Danach läuft es im Vollbild und offline.

Bei jeder neuen Version in `sw.js` die `VERSION` erhöhen, sonst sehen Spieler den alten Stand aus dem Cache.

## Aufbau

```
index.html, style.css     Seite, Touch-Knöpfe, Menü-Stil
manifest.webmanifest      PWA-Angaben (Vollbild, quer)
sw.js                     Offline-Cache
src/game.js               Spiellogik ohne DOM (Physik, Gegner, Boss, Geist-Aufzeichnung)
src/levels.js             Levels als Textkarten (Legende oben in der Datei)
src/themes.js             Farben, Kulissen, Musik pro Welt
src/gear.js               Materialstufen, Preise, Werte und Perks
src/render.js             Zeichnen auf 180 px hohe Pixel-Leinwand
src/sprites.js            Sprites, Tiles, Kulissen, Pixel-Schrift
src/audio.js              Synthetisierte Effekte und Chiptune-Musik
src/input.js              Touch, Tastatur, Gamepad
src/ghost.js              Geist-Codes (komprimiert, teilbar)
src/online.js             Optionale Online-Bestenliste (Supabase)
tools/                    Tests und Icon-Generator
```

## Neues Level bauen

Levels bestehen aus 20 Kacheln breiten Segmenten mit 14 Reihen. Legende:

```
#  Boden        =  Plattform     D  Erde (grabbar)    S  Stein (ab Eisen)
^  Stacheln     B  Sprungpilz    P  Start             C  Laterne/Checkpoint
E  Ziel         G  Edelstein     h  Apfel             T  Truhe
i  Schild       b  Käfer         o  Blorb             v  Fledermaus    M  Boss
Q  Altar (geheime Waffe)
```

Faustregeln: Sprunghöhe 2 Kacheln, Sprungweite 3 Kacheln Lücke. Mit Pilz 4 Kacheln, mit Schaufel-Sprung auf Pilz 6.
Danach `node tools/test.mjs` laufen lassen.

## Sterne, Ketten und Waffen

- **Sterne:** Jedes Level hat drei: geschafft, unter der Zielzeit, ohne Tod. Jeder neue Stern bringt 50 Edelsteine.
- **Pogo-Ketten:** Ab drei Schaufel-Abprallern ohne Bodenkontakt gibt es Bonus-Edelsteine, die mit der Kette wachsen.
- **Edelstein-Serien:** Schnell hintereinander eingesammelte Steine klingen jedes Mal einen Halbton höher.
- **Legendäre und mythische Waffen (9):** Nicht kaufbar. Jede verlangt eine bestimmte Tat. In der Waffenkammer stehen nur Rätsel-Hinweise.

<details><summary>Spoiler: alle Bedingungen</summary>

| Waffe | Seltenheit | Bedingung | Wirkung |
|---|---|---|---|
| Federklinge | Legendär | 1-1 ohne einen Gegner zu besiegen | schneller, höher, längere Klinge |
| Blitzspaten | Legendär | 1-1 unter 25 s | rasend schnelle Hiebe |
| Erdfresser | Legendär | in 1-2 alle Erdblöcke ausgraben | gräbt 3×3, doppelte Erd-Beute |
| Goldschaufel des Königs | Legendär | die 3 Truhen hinter Stein öffnen | Edelsteine zählen doppelt |
| Geisterklinge | Legendär | fremden Geist um 2 s schlagen | Luft-Sprint mit A |
| Sternenspaten | Mythisch | Kette aus 12 Abprallern | Abpraller schleudern Sterne |
| Maulwurfkralle | Mythisch | Boss ohne Schaden besiegen | Erdwelle beim Hieb |
| Seelenschaufel | Mythisch | 20 Tode insgesamt | einmal pro Level auferstehen |
| Urfunke | Mythisch | Altar hoch über dem Dornenkamm (Pilz-Superprung auf dem Plateau, dann Wolkenpfad) | doppelter Schaden, brennende Hiebe |

</details>

Neue Waffen kommen in `src/weapons.js` (Daten und Wirkung), die Klingenform in `src/sprites.js` (`BLADES`), die Bedingung in `src/main.js` (`finish` oder ein `unlock`-Ereignis aus `game.js`).

## Online-Geister (optional)

Ohne Einrichtung funktionieren Geister lokal: eigene Bestzeit plus Codes, die man mit Freunden teilt (Ergebnis-Bildschirm → *Als Geist teilen*, Optionen → *Importieren*).

Für eine gemeinsame Bestenliste:

1. Gratis-Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im SQL-Editor ausführen:

```sql
create table ghosts (
  id bigint generated always as identity primary key,
  level text not null,
  name text not null check (char_length(name) between 1 and 16),
  frames int not null check (frames > 300),
  code text not null check (char_length(code) < 60000),
  version text,
  created_at timestamptz default now()
);
create index on ghosts (level, frames);
alter table ghosts enable row level security;
create policy "lesen" on ghosts for select using (true);
create policy "eintragen" on ghosts for insert with check (true);
```

3. In `src/config.js` Projekt-URL und `anon`-Schlüssel eintragen.

Hinweis: Ohne Server-Prüfung kann jemand gefälschte Zeiten hochladen. Für mehr Schutz später eine Supabase Edge Function bauen, die den Geist nachsimuliert.

## Fahrplan

- **Etappe 1:** Welt 1 mit 3 Levels und Boss, Schmiede bis Stahl, Geister lokal und per Code, PWA.
- **Etappe 1.5 (diese Version):** 9 legendäre/mythische Waffen, geheimer Himmelspfad, Sterne, Pogo-Ketten, Hit-Stop, Edelstein-Serien.
- **Etappe 2:** Welt 2 *Uhrturm von Zahnfels* (Zahnräder, bewegte Plattformen), Titan- und Adamantium-Stufe, erste Relikte.
- **Etappe 3:** Endloser Schacht-Modus mit erzeugten Levels und Tages-Seed für faire Geister-Rennen.
- **Etappe 4:** Level-Editor mit Teilen per Code.
- Danach: weitere Welten (Pilzwald, Lavaschmiede, Wolkenwerft, Kristallmagen) bis zur Urlicht-Stufe.
