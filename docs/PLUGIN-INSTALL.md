# YACA Voice als SkyMP-Plugin installieren

Für den geprüften SkyMP-Fork ist keine Änderung an Servercode oder `gamemode.js`
erforderlich. Der Verbindungshinweis und der lokale YACA-Transport sind im
Serverskript enthalten. Die dauerhafte Reichweitenanzeige verwendet die
öffentliche API v1 von **SkyMP UI Core** (`skymp-ui-core`).

## Installation

1. Die **Plugin-ZIP** in das Arbeitsverzeichnis des Gameservers entpacken.
   Danach müssen diese Dateien vorhanden sein:

   ```text
   Server/
     Plugins/
       skymp-yaca-ts/
         plugin.json
         server.js
         config.json
         assets/
           voice-required.svg
   ```

   `Plugins` muss genau so geschrieben sein. Das Arbeitsverzeichnis ist das
   Verzeichnis, in dem der Server seine `Plugins/` sucht, normalerweise neben
   `server-settings.json`. Bei einer bestehenden Installation nur den neuen
   Plugin-Ordner hinzufügen.

2. In **`Plugins/skymp-yaca-ts/config.json`** eintragen:

   - `teamspeak.serverUrl` und `serverPort`: Adresse für die Spieler.
   - `yaca.uniqueServerId`: echte UID des TeamSpeak-Servers.
   - `yaca.ingameChannelId` und `defaultChannelId`: verschiedene numerische Kanal-IDs.
   - `yaca.ingameChannelPassword`: falls der Ingame-Kanal ein Passwort hat.

3. Den Gameserver starten, damit er das Plugin erkennt. Neue Plugins bleiben
   im Fork standardmäßig deaktiviert. Im bestehenden Plugin-/Admin-Workflow
   **YACA Voice** (`skymp-yaca-ts`) für den Autostart aktivieren und den
   **Gameserver neu starten**. Bei bereits eingerichtetem interaktivem
   `pluginDiscovery.mode: "prompt"` kann stattdessen der Startprompt mit `y`
   bestätigt werden.

   Ohne passende Admin-Oberfläche: Nach der ersten Erkennung den Gameserver
   stoppen und im Serververzeichnis ausführen:

   ```powershell
   node Plugins/skymp-yaca-ts/set-enabled.cjs
   ```

   Danach den Gameserver wieder starten. Der Helfer sichert den vorhandenen
   Discovery-State und ändert nur `startupEnabled` für `skymp-yaca-ts`.
   Autostart anderer Plugins und Serverquellen bleiben erhalten. Eine noch
   nicht entdeckte Installation aktiviert der Helfer nicht.

4. Im Serverlog muss **`[YacaPlugin] Active`** stehen. Fehler in der Konfiguration
   erscheinen mit **`[YacaPlugin] Startup failed`** und dem betroffenen Dateipfad.
   Der aktuelle Fork fängt Fehler aus temporären Plugin-Modulen ab; deshalb
   zusätzlich zum Dashboard-Status immer diesen Logeintrag prüfen.

5. Für die dauerhafte Reichweitenanzeige **UI Core** aktivieren und dessen
   Client-/CEF-Integration installieren. Die verifizierte Quelle ist
   `D:/GitHub/SkyMP-UI-Core`, insbesondere `docs/CLIENT_DEPLOYMENT.md`. YACA
   registriert `skymp-yaca-ts:voice-range` als Status-Widget unten rechts. Der
   aktualisierte UI-Core-Renderer zeigt es im selben Runensiegel-/Ringstil wie
   Metabolism. YACA liefert Reichweite, Mute-/Unmute- und Sprechstatus; auch bei
   gesperrter Reichweite bleibt der Mikrofonstatus sichtbar. Dafür später das
   YACA-Serverplugin und das UI-Core-Runtime-Paket gemeinsam aktualisieren.
   Position und Skalierung kann der Spieler mit `/UiEdit` ändern.
   Auch wenn UI Core später startet, versucht YACA die Registrierung bei den
   folgenden Zustandsmeldungen erneut. Ohne UI Core fehlen nur diese Anzeige
   und ihre Darstellungseinstellungen; das Serverlog weist darauf hin.

6. Auf dem Spieler-PC TeamSpeak und das YACA-Plugin starten und dem richtigen
   Server beitreten. **V** schaltet die Sprachreichweite direkt durch, ohne F8.
   Numpad **+ / −** schalten vor/zurück. **F8** öffnet die optionalen
   Spracheinstellungen; Escape schließt sie. In Skyrim-Menüs und während
   Chat-/anderer Browsereingaben werden die Gameplay-Tasten ausgesetzt. Im
   geöffneten F8-Panel funktioniert der Wechsel ebenfalls. Die Taste lässt sich
   über `keyBinds.cycleVoiceRange` ändern. Funkkanäle und Funktasten entfallen.

## Vollbildhinweis und eigenes Bild

Der halbtransparente Hinweis erscheint automatisch bei fehlender lokaler
YACA-Verbindung, falschem TeamSpeak-Server, fehlendem Ingame-Kanal oder einem
Plugin-/Kanalfehler. Er verschwindet erst, wenn **Ingame-Kanal und Client-ID**
bestätigt sind. Ein stummes Mikrofon blendet ihn nicht ein.
Eine erfolgreiche `OK`/`JOIN`-Antwort bestätigt bereits den Beitritt und die
Client-ID. Eine zusätzliche initiale `MOVED_CHANNEL`-Meldung ist dafür nicht
erforderlich. Spätere Kanalwechsel, falscher Server und Verbindungsabbruch
werden weiterhin ausgewertet.
Der Hinweis nimmt keinen Maus-/Tastaturfokus und öffnet kein Menü. Bei einem
Ladebildschirm oder ausbleibenden Spielframes wird die Anzeige ausgeblendet.
Die lokale YACA-Verbindung und der bestätigte Kanalbeitritt bleiben dabei
erhalten. Bis aktuelle Positionsdaten eintreffen, werden räumliche Sprache und
die bisherige Hörerliste ausgesetzt. Ein längerer Zell-/Weltwechsel löst dadurch
keine künstliche TeamSpeak-Trennung aus. Echte Socket-/Kanalfehler werden
weiterhin ausgewertet; ein Spielserver-Disconnect oder Plugin-Abbau beendet
die Verbindung.

Das mitgelieferte schwebende Kristallbild lässt sich ohne Neubau ändern:

1. `assets/voice-required.svg` durch ein eigenes SVG ersetzen; alternativ z. B.
   `assets/meine-welt.webp` in den Plugin-Ordner legen.
2. In `config.json` bei Bedarf anpassen:

   ```json
   "connectionOverlay": {
     "imagePath": "assets/meine-welt.webp",
     "imageUrl": "",
     "imageAlt": "Wappen unserer Spielwelt",
     "message": "Tritt unserem TeamSpeak bei, um die anderen zu hören.",
     "backgroundOpacity": 0.68
   }
   ```

   Dieses Objekt liegt unter **`ui`**. Zulässig sind SVG/PNG/JPEG/WebP, lokal bis
   64 KiB. Größere Bilder können über eine vollständige **HTTPS-URL** in
   `imageUrl` eingebunden werden; diese hat Vorrang vor `imagePath`. Lokale
   Dateien werden vom Server mitgeliefert und brauchen keine separate
   Launcher-Verteilung. Transparente Bilder wirken besonders gut. Die
   Hintergrunddeckkraft ist von `0.1` bis `0.9` einstellbar. Bei aktivierter
   Einstellung für reduzierte Bewegung bleibt das Bild ruhig.
3. Den **Gameserver neu starten**. Bild und Konfiguration werden beim Start
   eingelesen. Für diese Änderung muss der Launcher nicht neu gebaut werden.

Serverbetreiber brauchen für diese Installation kein `npm install`, keinen
Compiler und keine zusätzliche ESP-/PEX-/DLL-Datei. Spieler benötigen den zum
Fork passenden SkyrimPlatform-Client sowie TeamSpeak/YACA. Ein bestehender
Launcher oder die native Clientinstallation wird durch dieses Paket nicht verändert.

## Betrieb und Updates

Die Laufzeit besteht aus `server.js`, `plugin.json`, `config.json` und `assets/`. Quellen,
Lizenz, Anleitung und lokale Prüfbefunde im Paket dienen Entwicklung und Nachweis.
Der Plugin-Ordner kann umbenannt werden, solange er direkt unter `Plugins/`
liegt und der Manifestname `skymp-yaca-ts` eindeutig bleibt.

Bei einem Update die eigene **`config.json` behalten**, `server.js` und
`plugin.json` ersetzen, fehlende Standardassets ergänzen und den Gameserver neu
starten. Eigene Bilder behalten. Alte `radio`- und Funktasten-Einträge in der
Config werden ignoriert; `cycleVoiceRange` erhält bei alten Configs den Standard
`V`. Falls eine vorhandene andere Taste bereits V nutzt, eine andere freie
Taste konfigurieren. Änderungen an der Config
werden beim nächsten Serverstart bzw. bei einer Gamemode-Neuladung eingelesen.
Gamemode-Neuladungen registriert das Plugin selbst erneut; Serverquellen müssen
dafür nicht bearbeitet werden. Eine zweite manuelle `initYacaBridge()`-Einbindung
ist nicht erforderlich.

Zur Deaktivierung den Autostart im vorhandenen Plugin-Workflow ausschalten und
den Gameserver neu starten. Alternativ beim gestoppten Gameserver
`node Plugins/skymp-yaca-ts/set-enabled.cjs --disable` ausführen. Danach kann
der Plugin-Ordner entfernt werden.

Falls das frühere Testpaket bereits manuell im Gamemode eingebunden wurde,
die damals ergänzten `initYacaBridge()`-Zeilen bei der Umstellung entfernen,
damit die Bridge nur einmal geladen wird.

## Testgrenzen

Die Bridge ist gegen die Manifestprüfung, Erkennung, Aktivierung und den
temporären Entry-Lader des lokalen Forks geprüft. Der Installer verändert diese
Serverdateien nicht. Die bisherigen UI-/Transporttests verwenden ein simuliertes
Plugin. Echte TeamSpeak-Audioübertragung, Skyrim/CEF und Mehrspielerbetrieb
müssen weiterhin im Spiel getestet werden. Automatischer Lip-Sync bleibt aus;
Details stehen in `docs/COMPATIBILITY.md` des Quellpakets.
