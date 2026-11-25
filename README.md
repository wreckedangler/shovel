# Schaufelheld

Mobiler Pixel-Plattformer als installierbare Web-App. Graben, Schaufel-Sprünge, Ausrüstung in 12 Materialstufen schmieden und gegen Geister anderer Spieler rennen.

Keine Abhängigkeiten, kein Build-Schritt: reines HTML, CSS und JavaScript-Module.

## Handy

- **Hochformat:** Spielfeld oben, grosse Knöpfe darunter (nichts verdeckt das Spiel).
- **Querformat:** gezoomte Ansicht, halbtransparente Knöpfe über dem Spiel.
- **Optionen:** links Pfeiltasten oder Daumen-Stick, Vibration (Android), Vollbild (Android; auf dem iPhone über „Zum Home-Bildschirm“).

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

Am einfachsten: `dist/schaufelheld.html` doppelklicken. Diese Einzeldatei enthält das ganze Spiel und braucht keinen Server.
Neu erzeugen nach Änderungen:

```bash
node tools/bundle.mjs
```

Entwicklung mit getrennten Dateien:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Aufs Handy im gleichen WLAN: Server wie oben starten, IP des Computers herausfinden und auf dem Handy `http://<IP>:8000` öffnen.

Tests (Level-Prüfung, Bot-Durchlauf, Geist-Codes):

```bash
node tools/test.mjs
node tools/solve.mjs 2-2     # Suchbot beweist, dass ein Level mit Holz-Ausrüstung schaffbar ist
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
tools/                    Tests, Suchbot, Einzeldatei-Bündler, Icon-Generator
dist/schaufelheld.html    Komplettes Spiel in einer Datei (zum Testen ohne Server)
```

## Neues Level bauen

Levels bestehen aus 20 Kacheln breiten Segmenten mit 14 Reihen. Legende:

```
#  Boden        =  Plattform     D  Erde (grabbar)    S  Stein (ab Eisen)
^  Stacheln     B  Sprungpilz    P  Start             C  Laterne/Checkpoint
E  Ziel         G  Edelstein     h  Apfel             T  Truhe
i  Schild       b  Käfer         o  Blorb             v  Fledermaus    M  Boss
Q  Altar (geheime Waffe)
Welt 3:  c  Bröckelpilz   s  Sporenspucker   N  Boss Morchelmutter
Geheim:  F  falsche Wand   H  unsichtbarer Block   O  Schaufelmünze   Y  Geheimtür
Welt 2:  m / n  waagrechte / senkrechte Schwebeplattform   V  Dampfrohr (hebt 6 Kacheln)
         R  Erz (ab Adamantium)   z  Zahnrad (Gefahr, Pogo möglich)   k  Zahnritter   u  Kuckuck   W  Boss Pendelwerk
```

Faustregeln: Sprunghöhe 2 Kacheln, Sprungweite 3 Kacheln Lücke. Mit Pilz 4 Kacheln, mit Schaufel-Sprung auf Pilz 6.
Danach `node tools/test.mjs` laufen lassen.

## Geheimnisse und Sammelkram

- **Schaufelmünzen:** 3 pro Level (48 insgesamt). Gespeichert wird erst beim Erreichen des Ziels.
- **Falsche Wände (F):** sehen aus wie Boden, haben einen feinen Riss und brechen mit Hieb oder Schaufel-Sprung. Dahinter liegen abgedeckte Kammern.
- **Unsichtbare Blöcke (H):** erscheinen, wenn man von unten dagegenspringt.
- **Geheimtüren (Y):** führen zu Geheimlevels (1-G Goldader, 2-G Tresor der Zeit, 3-G Myzelnetz). Die Schaufelgruft (X-0) öffnet sich bei 30 Münzen und enthält die Spürschaufel.
- **Ränge S–C:** aus Zeit, Toden, Münzen und Geheimnissen.
- **Rausch:** Siege, Ketten und Funde füllen die Leiste; voll gibt es 10 Sekunden doppelte Edelsteine. Treffer leeren sie.
- **Goldene Gegner:** selten, mehr Leben, viel Beute.
- **Truhen:** Seltenheit wird beim Öffnen ausgewürfelt (gewöhnlich bis legendär).
- **Erfolge (30), Tagesschatz mit Serie, Garderobe (7 Schal-Stile), Gesamtfortschritt in Prozent.**

<details><summary>Spoiler: Easter Eggs</summary>

- Konami-Code auf der Tastatur oder 7× schnell auf das Logo tippen: Retro-Modus in Game-Boy-Grün.
- 15 Sekunden nichts tun: Der Held schläft ein.
- Auf der Fahnenspitze landen: +100.
- Als Name „Raphi“ eintragen: Krone.
- Schilder in geheimen Kammern.

</details>

## Sterne, Ketten und Waffen

- **Sterne:** Jedes Level hat drei: geschafft, unter der Zielzeit, ohne Tod. Jeder neue Stern bringt 50 Edelsteine.
- **Pogo-Ketten:** Ab drei Schaufel-Abprallern ohne Bodenkontakt gibt es Bonus-Edelsteine, die mit der Kette wachsen.
- **Edelstein-Serien:** Schnell hintereinander eingesammelte Steine klingen jedes Mal einen Halbton höher.
- **Legendäre und mythische Waffen (11):** Nicht kaufbar. Jede verlangt eine bestimmte Tat. In der Waffenkammer stehen nur Rätsel-Hinweise.

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
| Pendelhammer | Mythisch | Pendelwerk nur mit Schaufel-Sprüngen besiegen | Druckwelle bei jedem Abpraller |
| Spürschaufel | Legendär | Ende der Schaufelgruft erreichen | zeigt falsche Wände, unsichtbare Blöcke und Münzen |
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
- **Etappe 1.5:** 9 legendäre/mythische Waffen, geheimer Himmelspfad, Sterne, Pogo-Ketten, Hit-Stop, Edelstein-Serien.
- **Etappe 2 (diese Version):** Welt 2 *Uhrturm von Zahnfels* mit Schwebeplattformen, Dampfrohren, Zahnrädern, Zahnrittern, Kuckucken, Erz und Boss *Pendelwerk*; Titan- und Adamantium-Stufe; 10. Waffe; Einzeldatei zum lokalen Testen.
- **Etappe 3 (diese Version):** Welt 3 *Pilzwald von Moderbrück* mit Boss *Morchelmutter*, 4 Geheimlevels, Schaufelmünzen, falsche Wände, unsichtbare Blöcke, Rausch, Erfolge, Ränge, Tagesschatz, Garderobe, Easter Eggs.
- **Danach:** Welt 4 *Kristallmagen*, erste Relikte (Funkenrute, Flügelstiefel), Level-Editor.
- **Etappe 3:** Endloser Schacht-Modus mit erzeugten Levels und Tages-Seed für faire Geister-Rennen.
- **Etappe 4:** Level-Editor mit Teilen per Code.
- Danach: weitere Welten (Pilzwald, Lavaschmiede, Wolkenwerft, Kristallmagen) bis zur Urlicht-Stufe.


## Schummelbuch (Spoiler)

Im Titelmenü unter *Schummelbuch*. Schummelwörter stehen auf Schildern in Geheimräumen oder werden durch Erfolge gelernt.
Mit spielverändernden Cheats zählen Ränge, Rekorde, Sterne, Münzen und Erfolge nicht.

| Wort | Wirkung | Fundort |
|---|---|---|
| KONFETTI | Konfetti bei Treffern und Edelsteinen | Geheimkammer 1-1 |
| MONDSCHWERKRAFT | halbe Schwerkraft | 1-G Goldader |
| SPIEGELWELT | gespiegelte Welt und Steuerung | Geheimkammer Zahnradgasse |
| MAULWURFSKOENIG | gräbt durch jeden Boden | 2-G Tresor der Zeit |
| RIESENWUCHS / WINZLING | Held gross / klein | 3-G Myzelnetz / Erfolg Nickerchen |
| DISCOGRUFT | Farbwechsel | X-0 Schaufelgruft |
| WOLKENLAEUFER | unbegrenzte Luftsprünge | Erfolg Flummi |
| MIDAS | alle Gegner golden | Erfolg Goldfieber |
| ESPRESSO / ZEITLUPE | Tempo ×1.5 / ×0.5 | Erfolg Meisterlich / Hartnäckig |
| UNVERWUNDBAR | kein Schaden (Abgründe bleiben tödlich) | Erfolg Unberührbar |
| RETRO | Gameboy-Farben | – |

## Schatzkammer (v0.10)

Truhen kosten Edelsteine oder einen Schlüssel. Schlüssel gibt es für den ersten Abschluss eines Levels (Boss: Urlicht, Geheimlevel: Gold), alle drei Sterne, alle Münzen, den S-Rang und den Tagesschatz.

| Truhe | Preis | Gewöhnlich / Selten / Episch / Legendär | Aufwertung |
|---|---|---|---|
| Holz | 250 (10× 2250) | 68 / 26 / 5 / 1 | 12 % |
| Eisen | 700 (10× 6300) | 35 / 45 / 16 / 4 | 10 % |
| Gold | 1800 | 0 / 55 / 33 / 12 | 8 % |
| Urlicht | nur Schlüssel | 0 / 0 / 60 / 40 | – |

- Garantie: spätestens nach 30 Öffnungen ohne Legendär ist die nächste legendär.
- Fehlende Gegenstände fallen doppelt so oft wie Duplikate. Duplikate werden zu Splittern.
- Inhalte (`src/loot.js`): 11 Relikte (3 Plätze, Stufe 1–3), 6 Spuren, 5 Färbungen, 3 Auren.
- Splitter + Edelsteine schmieden die Stufen 7–12 (Mithril bis Urlicht) mit echten Perks: schnellere Hiebe, Sternenhieb, Flächenhieb, Doppel-/Dreifachsprung, Schutz beim ersten Treffer, Edelstein-Magnet, Rückspulen bei Absturz.

## Endlose Tiefen (v0.11, `src/gen.js`)

Ab 1-1 gibt es im Kartenmenü den Tab **∞ Tiefen**. Jede Tiefe wird aus dem *Weltsamen* erzeugt: Gleicher Samen = gleiche Welt (zum Teilen), neuer Samen = neue Welt.

- **9 Biome** (Wurzelwald, Tiefhöhle, Dornenhang, Maulwurfsbau, Zahnradwerk, Glockenhallen, Pilzdickicht, Leuchtgrotte, Modersumpf) mit eigener Optik, eigenen Gegnern und Mechaniken.
- **4 Bauarten:** Pfad (offenes Gelände), Höhle (mit Decke, viel Graben), Abgrund (Inseln und Brücken), Schacht (senkrecht nach oben).
- **Bausteine:** Lücken, Stufen, Stachelfelder, Plattformbrücken, Erdwände, Sprungpilze, Bröckelbrücken, Schwebeplattformen, Dampfrohre, Zahnräder, Geheimkammern unter falschen Böden, unsichtbare Blöcke, Laternen.
- **Schwierigkeit** steigt bis Tiefe 40 (breitere Lücken, mehr Gegner, längere Levels).
- **Neue Gegner:** Springkröte (`f`, springt dich an), Irrlicht (`w`, schwebt durch Wände, ideal für Pogo-Ketten), Stachelschnecke (`q`, Pogo auf den Panzer tut weh, von der Seite treffen).
- **Belohnungen:** Edelsteine pro Tiefe, alle 5 Tiefen ein Schlüssel (10: Eisen/Gold, 25: Urlicht).
- **Garantie:** Jedes Level wird beim Erzeugen auf Erreichbarkeit von Ziel und allen 3 Münzen geprüft (`reachable()`), sonst wird neu gewürfelt. `node tools/gentest.mjs 1000` prüft 1000 Levels, `GEN=seed:tiefe node tools/solve.mjs gen` spielt eines mit echter Physik durch.

## Atmosphäre (v0.12, `src/atmo.js`, `src/audio.js`)

- **Licht:** Höhlen, Grotten, Bau, Sumpf und generierte Höhlen sind dunkel. Licht spenden der Held (flackernd), Laternen, Münzen, Truhen, Irrlichter, Sprungpilze, Erz, goldene Gegner, Funken und das Ziel. Darüber liegt farbiges Licht.
- **Vordergrund:** dunkle Silhouetten pro Thema (Ranken, Stalaktiten, Ketten, Zahnräder, Riesenpilze) ziehen schneller vorbei als die Welt.
- **Wetter:** pro Level fest gewürfelt (Regen mit Blitzen, Laub, Blüten, Glühwürmchen, Tropfen, Staub, Wind, Glut, Funken, Schnee, Sporen, Leuchtteilchen, Nebel) plus Lichtstrahlen in hellen Gebieten.
- **Ton:** Hall je nach Ort, Umgebungsklang pro Biom (Wind, Vögel, Tropfen, Brummen, Ticken, Glocken, Blubbern), Schritte je nach Untergrund, Spannungsschicht in der Musik bei nahen Gegnern und Bossen, gedämpfte Musik in der Pause, Herzschlag bei einem Herz.
- **Abstieg:** In den endlosen Tiefen fällt der Held nach dem Ziel durch einen Schacht direkt in die nächste Tiefe (Antippen überspringt). Tiefenanzeige im Spiel.

## Härte (v0.13)

**Neue Fallen:** `L` Fallstachel (zittert, dann Absturz, kommt nach 4 s wieder), `Z`/`U` Kreissäge auf Schiene, `A` Pfeilwerfer (Klick und rotes Glühen vor dem Schuss), `K` Kippboden (wackelt, kippt, klappt zurück), `I` Trollblock (unsichtbar und fest, nur ein seltenes Glitzern; die Spürschaufel zeigt ihn rot).

**Verfolgung:** `chase: { kind: 'wurm' | 'decke' | 'flut' | 'lava', speed, delay }` an einem Level. Laternen setzen den Verfolger beim Neustart zurück. Roter Rand warnt, wenn er nahe ist.

**Qualpfade (Tab „Qual“):** Q-1 Die Nadelkammer (dunkle Fallenhöhle), Q-2 Wurmgrund (Wurm-Verfolgung), Q-3 Der Glutschlund (Schacht mit steigender Lava). Öffnen sich mit einem S-Rang in Welt 1/2/3. Erster Abschluss: Urlicht-Schlüssel und 2500 Edelsteine.

**Endlose Tiefen:** Fallen ab Tiefe 6, Verfolgungen ab Tiefe 6 (Schacht) bzw. 12, Elitegegner ab Tiefe 15 (schnell, zäh oder teilend), **Wächter** alle 10 Tiefen (Boss-Arena, jedes Mal mehr Leben und schneller), **Flüche** ab Rekord 10 (Einherz, Finsternis, Gegnerflut, Zeitdruck, Elite, jeweils mehr Beute), **Ohne Wiederkehr** (neue Welt, Laternen ohne Rücksetzpunkt, erster Tod beendet den Lauf, Beute ×1,5).
