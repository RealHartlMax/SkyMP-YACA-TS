# YACA Voice als SkyMP-Plugin installieren

Für den geprüften SkyMP-Fork ist keine Änderung an Servercode oder `gamemode.js`
erforderlich. Die UI und der lokale YACA-Transport sind im Serverskript enthalten.

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

5. Auf dem Spieler-PC TeamSpeak und das YACA-Plugin starten, dem Server beitreten
   und in Skyrim **F8** drücken. Numpad **+ / −** ändern die Sprachreichweite;
   **N** sendet auf dem Hauptkanal, **Caps Lock** auf dem Zweitkanal.

Serverbetreiber brauchen für diese Installation kein `npm install`, keinen
Compiler und keine zusätzliche ESP-/PEX-/DLL-Datei. Spieler benötigen den zum
Fork passenden SkyrimPlatform-Client sowie TeamSpeak/YACA. Ein bestehender
Launcher oder die native Clientinstallation wird durch dieses Paket nicht verändert.

## Betrieb und Updates

Die Laufzeit besteht aus `server.js`, `plugin.json` und `config.json`. Quellen,
Lizenz, Anleitung und lokale Prüfbefunde im Paket dienen Entwicklung und Nachweis.
Der Plugin-Ordner kann umbenannt werden, solange er direkt unter `Plugins/`
liegt und der Manifestname `skymp-yaca-ts` eindeutig bleibt.

Bei einem Update die eigene **`config.json` behalten**, `server.js` und
`plugin.json` ersetzen und den Gameserver neu starten. Änderungen an der Config
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
