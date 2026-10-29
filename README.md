# SkyMP YACA TS

> Stand 29.10.2026: Der neue [Plugin Runtime Loader](docs/PLUGIN_RUNTIME.md) liefert Plugin-Clientcode und UI über signierte Pakete vom Gameserver. Die gemeinsame Runtime und der Launcher benötigen einmalig den generischen Bootstrap; danach bleiben kompatible Plugin-Updates im Plugin-Projekt. Die folgende ältere Build-/Integrationsbeschreibung gilt nur, soweit sie dem neuen Vertrag nicht widerspricht. Diese Änderung wurde ausschließlich im Quellcode umgesetzt; neue Builds, ZIPs und Spielabnahmen stehen noch aus.

YACA-/TeamSpeak-Plugin für den SkyMP-Fork mit SkyrimPlatform-Browser.
Serverbetreiber fügen nur den Plugin-Ordner hinzu, konfigurieren TeamSpeak und
aktivieren das Plugin. Servercode und `gamemode.js` müssen nicht bearbeitet werden.
Verbindungshinweis und Transport sind im Serverskript `server.js` enthalten;
die dauerhafte Reichweitenanzeige verwendet **SkyMP UI Core**.

Die Reichweitenanzeige erhält dort denselben Runensiegel-/Ringstil wie die
Metabolism-Anzeigen und lässt sich mit `/UiEdit` verschieben und skalieren.
YACA liefert nur die Daten: Reichweite, Mikrofon aktiv/stumm/deaktiviert,
Tonstatus und Sprechstatus. Mute-/Unmute-Meldungen von TeamSpeak/YACA erscheinen
automatisch im HUD, auch bei gesperrter Reichweite. Während Mikrofon oder Ton
stumm/deaktiviert sind, zeigt das HUD keinen Sprechstatus. Die F8-Einstellungen
enthalten weiterhin die Tastenhinweise; die Verbindungswarnung gehört zu YACA.
Diese Anpassung ist als Quelle vorbereitet und benötigt später einen Build des
YACA-Serverplugins und des UI-Core-Runtime-Pakets.

## Aktueller Umfang

- Plugin-Verbindung und Wiederverbindung über den lokalen YACA-WebSocket.
- INIT/JOIN, Spieler-Client-ID, Kanal-, Sprach-, Mikrofon- und Audiostatus.
- Bis zu acht Sprachreichweiten, direkt mit **V** durchschalten; zusätzlich Numpad +/−.
- Serverseitige Reichweitensperre und private Reichweitenanzeige über UI Core.
- Räumliche Spielerliste mit Meterumrechnung und Trennung von Innenräumen.
- Halbtransparenter Vollbildhinweis mit schwebendem, austauschbarem Bild, solange
  TeamSpeak/YACA nicht im richtigen Server und Ingame-Kanal verbunden ist.
- Optionale Spracheinstellungen über **F8**, Schließen mit Escape.
- Optionaler `onVoiceActivity`-Callback für eine eigene VAD-Anbindung.

**Teststand:** lokaler Build, automatisierte Bridge-/Protokolltests, Chromium mit
simuliertem YACA-Plugin und vorhandenes natives Server-Addon. Echte TeamSpeak-
Audioübertragung und Skyrim-/CEF-Spielbetrieb sind noch zu prüfen. Automatischer
Lip-Sync, Funkgerät, Telefon und Megafon sind nicht enthalten.

## Schnellstart für die Vorschau

Node.js 22+:

```powershell
npm ci
npm run preview
```

`http://127.0.0.1:4173` öffnen. Die Vorschau verwendet ausschließlich Beispieldaten.
Im fertig gebauten Paket genügt `npm start`; hierfür sind keine npm-Abhängigkeiten nötig.

## Lokal in SkyMP testen

Die **Plugin-ZIP** enthält direkt `Plugins/skymp-yaca-ts/`. Zum Installieren:

1. Den Ordner in das `Plugins/`-Verzeichnis des Gameservers legen.
2. In seiner `config.json` die echte TeamSpeak-UID und Kanal-IDs eintragen.
3. Das Plugin über den bestehenden Plugin-/Admin-Workflow aktivieren und den
   Gameserver neu starten. Neue Plugins bleiben im Fork zunächst deaktiviert.
4. Für die Reichweitenanzeige `skymp-ui-core` aktivieren und dessen passende
   Client-/CEF-Integration ausliefern. Ohne UI Core funktionieren der
   Verbindungshinweis und die Reichweitentasten; die dauerhafte Anzeige wartet
   mit einem einmaligen Loghinweis auf UI Core.

Das Standardbild liegt unter **`assets/voice-required.svg`**. Einfach ersetzen
oder in `config.json` unter `ui.connectionOverlay.imagePath` eine eigene PNG-,
JPEG-, WebP- oder SVG-Datei aus `assets/` wählen und den Gameserver neu starten.
Ein Neubau ist dafür nicht nötig. Nachricht, Bildbeschreibung und Deckkraft sind
ebenfalls dort einstellbar; Details stehen in der Installationsanleitung.

Es werden keine npm-Abhängigkeiten auf dem Server installiert. Der bestehende
Gamemode bleibt erhalten; auch seine Neuladungen werden vom Plugin berücksichtigt.

Die Installation steht in [docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md).
Entwicklungs-/Vorschautests stehen in [docs/LOCAL-TEST.md](docs/LOCAL-TEST.md).
Der Abgleich mit dem aktuellen Fork und die offenen Lip-Sync-Befunde stehen in
[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).

```powershell
npm test
./tools/package-local.ps1
```

Der lokale Paketbau erstellt unter `artifacts/` eine Plugin-ZIP und ein
Quellpaket. Er führt keinen Commit, Push oder Upload aus. Ein Build erzeugt
außerdem den installierbaren Plugin-Ordner samt `assets/` unter `dist/plugin/`.
Die historischen Papyrus-Dateien werden nicht installiert.

## Referenzen

- [FiveM/RedM YACA TypeScript](https://github.com/yaca-systems/fivem-yaca-typescript)
- [YACA-UI](https://github.com/yaca-systems/yaca-ui) als Funktionsreferenz;
  die enthaltene UI ist eine eigenständige SkyMP-Implementierung.
- [YACA / TeamSpeak-Plugin](https://yaca.systems)

## English

SkyMP voice bridge using native properties/events and a SkyrimPlatform browser
overlay. Build with `npm run build`, run regression tests with `npm test`, or
open the demo with `npm run preview`. The built package runs the demo with
`npm start` without installing dependencies. To install, copy the plugin ZIP's
`Plugins/skymp-yaca-ts` folder to your server, configure its TeamSpeak UID/channel
IDs, enable it through the existing plugin workflow and restart the gameserver.
The persistent voice range widget requires SkyMP UI Core and its client/CEF
integration. Press **V** to cycle range without opening F8. A translucent
fullscreen notice shows a floating operator-replaceable picture until connected
to the correct TeamSpeak server/channel. Radio has been removed.
No server or gamemode source changes, npm runtime dependencies or Papyrus quest
are required. Real in-game audio and
Skyrim/CEF operation still need validation; automatic lip sync is not enabled.
See the linked local-test and compatibility guides.

## Русский

Мост YACA/TeamSpeak для SkyMP через свойства, события и браузер SkyrimPlatform.
Сборка: `npm run build`, тесты: `npm test`, демонстрация: `npm run preview`.
В пакете исходников достаточно `npm start` для демонстрации. Для установки
скопируйте `Plugins/skymp-yaca-ts` на сервер, укажите UID TeamSpeak и ID каналов,
активируйте плагин и перезапустите игровой сервер. Изменения кода сервера или
gamemode и Papyrus-квест не требуются. Реальную передачу голоса и работу в Skyrim/CEF
нужно проверить в игре; автоматическая синхронизация губ пока не включена.
