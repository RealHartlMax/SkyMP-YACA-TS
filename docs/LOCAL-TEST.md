# Lokal bauen und testen

## Oberfläche sofort ansehen

Im Repository:

```powershell
npm ci
npm run preview
```

Dann `http://127.0.0.1:4173` öffnen. Im gebauten **Quellpaket** genügt `npm start`;
die Vorschau benötigt keine installierten npm-Pakete. Sie verbindet sich nicht
mit TeamSpeak und zeigt ausschließlich Beispieldaten.

## Plugin in einer lokalen Serverkopie laden

Voraussetzungen: Node.js 22+, dein SkyMP-Fork mit SkyrimPlatform-Browser,
TeamSpeak mit YACA-Plugin und passende TeamSpeak-Kanal-IDs.

1. Die Plugin-ZIP entpacken und ihren Ordner `Plugins/skymp-yaca-ts` in die
   lokale Serverkopie legen. Alternativ die Dateien aus `dist/plugin/` in
   `Server/Plugins/skymp-yaca-ts/` kopieren.
2. Die echte TeamSpeak-Server-UID und die numerischen Kanal-IDs in
   `Server/Plugins/skymp-yaca-ts/config.json` eintragen.
3. Plugin erkennen lassen, im vorhandenen Plugin-/Admin-Workflow aktivieren
   und den Gameserver neu starten. Die vollständige Anleitung steht in
   [PLUGIN-INSTALL.md](PLUGIN-INSTALL.md). Eine Änderung an `gamemode.js` entfällt.
4. UI Core mit seiner Client-/CEF-Integration installieren. Mit dem Client
   verbinden und TeamSpeak/YACA öffnen. Die Reichweite erscheint über UI Core.
   Die optionale F8-Oberfläche und der Verbindungshinweis liegen im vorhandenen
   Browser; es wird keine neue Browser-URL geladen.
5. Mit zwei Spielern dieselbe Spielwelt betreten. Nähe/Ferne sowie Innenraum-
   und Außenzellengrenzen prüfen. **V** mehrfach antippen, ohne F8 zu öffnen:
   Reichweite und UI-Core-Anzeige müssen mitwechseln. Gedrückthalten schaltet nur
   einmal. Zusätzlich Numpad +/− und die serverseitige Reichweitensperre prüfen.
   TeamSpeak-Mikrofon stumm- und wieder einschalten: Das Runensiegel muss
   „Mikrofon stumm“ bzw. „Mikrofon aktiv“ zeigen, auch bei gesperrter Reichweite.
   Bei aktivem Sprechen erscheint „Du sprichst“. Mikrofon-/Ton-Mute oder
   deaktivierte Audiogeräte dürfen keinen Sprechstatus anzeigen. Mit `/UiEdit`
   Reichweite und Metabolism-Anzeigen verschieben und skalieren; das gespeicherte
   Layout muss erhalten bleiben. Die Darstellung liegt im UI-Core-Repository,
   die Statusdaten im YACA-Adapter `src/uiCoreAdapter.ts`.
6. TeamSpeak trennen und einen falschen Server betreten: Der Vollbildhinweis
   muss automatisch erscheinen. Wieder korrekt verbinden: Er verschwindet.
   Ein reines Mikrofon-Mute darf ihn nicht auslösen. Bilddatei austauschen,
   Gameserver neu starten und das neue Bild prüfen. Skyrim-Menüs, Chat und
   Serverwechsel dürfen keinen festhängenden Eingabefokus hinterlassen.

Es werden keine PEX-Dateien installiert und keine Quest benötigt. Vorhandene
Server-Einstellungen, Spielstände und Gamemode-Logik bleiben in der lokalen
Serverkopie erhalten. Das Plugin registriert sich nach einem serverseitigen
`mp.clear()` erneut; es löst selbst kein `mp.clear()` aus.

## Bedienung und Konfiguration

| Einstellung | Bedeutung |
| --- | --- |
| `ui.toggleKey` | Standard `F8`: UI öffnen/schließen. Escape schließt ebenfalls. |
| `keyBinds.cycleVoiceRange` | Standard `V`: Reichweite direkt durchschalten. |
| `keyBinds.increaseVoiceRange` / `decreaseVoiceRange` | Standard `ADD` / `SUBTRACT`: Numpad +/−; als Flanke ausgewertet. |
| `voiceRanges.ranges` | 1–8 aufsteigende Reichweiten in Metern, höchstens 100 m. |
| `ui.connectionOverlay.imagePath` | Austauschbares lokales Bild aus `assets/`, bis 64 KiB. |
| `ui.connectionOverlay.imageUrl` | Optionale HTTPS-Bildadresse, hat Vorrang. |
| `ui.connectionOverlay.message` / `imageAlt` | Betreibertext und Bildbeschreibung. |
| `ui.connectionOverlay.backgroundOpacity` | Deckkraft des Vollbildhintergrunds, 0.1–0.9. |
| `client.webSocketUrl` | Standard `ws://127.0.0.1:30125/`, ausschließlich Loopback-Adressen. Verbindung läuft auf jedem Spieler-PC. |
| `client.unitsPerMeter` | Umrechnung der Skyrim-Koordinaten; Startwert 70, im Spiel kalibrieren. |
| `client.updateIntervalMs` | Positionspakete, Standard 250 ms. |

Mikrofon- und Sound-Mute sind Anzeigen des echten Plugin-Status; ändern lassen
sie sich in TeamSpeak. `pluginVersion` aus der alten Config wird nicht erzwungen;
die Versionprüfung übernimmt YACA und liefert gegebenenfalls `OUTDATED_VERSION`.
`teamspeak.serverPassword` wird nicht an andere Spieler weitergegeben und wird
von der Bridge nicht zum automatischen Beitritt auf den TeamSpeak-Server benutzt.

Die Bibliotheks-API stellt für eigene Erweiterungen weiterhin
`setVoiceRangeChangeAllowed(actorId, false)` bereit. Die Reichweitensperre gilt
auch für manipulierte UI-Befehle; eine eigene Erweiterung ist für die normale
Plugin-Installation nicht erforderlich.

## Weitere Prüfung und Paketbau

```powershell
npm test
node tools/verify-fork-plugin.cjs D:/GitHub/skymp
node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core
node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core
./tools/package-local.ps1
```

Das Paket wird unter `artifacts/local-build-<Zeitstempel>/` angelegt. Das Skript
führt keine Git-Schreiboperationen aus und überträgt nichts ins Netzwerk.
Ein optionaler nativer Test gegen ein bereits vorhandenes Addon ist möglich:

```powershell
node tools/smoke-native.cjs D:/GitHub/skymp/build/dist/server/scam_native.node D:/GitHub/skymp/build/dist/server/data
node tools/verify-fork-plugin.cjs D:/GitHub/skymp --native
```

Dieser Test benötigt die vorhandenen Skyrim-Masterdateien, kann beim ersten
Laden einige Minuten dauern und verwendet sein eigenes Arbeitsverzeichnis
unter `artifacts/`. Der zweite Aufruf prüft zusätzlich den Plugin-Lader des
Forks und die automatische Wiederherstellung nach Gamemode-Neuladungen.
Es wird nichts am nativen Client gebaut.

Für den optionalen VAD-Callback und die noch offenen Lip-Sync-Probleme siehe
[COMPATIBILITY.md](COMPATIBILITY.md).
