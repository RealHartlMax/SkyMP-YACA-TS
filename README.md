# SkyMP YACA TS

YACA-/TeamSpeak-Plugin für den SkyMP-Fork mit SkyrimPlatform-Browser.
Serverbetreiber fügen nur den Plugin-Ordner hinzu, konfigurieren TeamSpeak und
aktivieren das Plugin. Servercode und `gamemode.js` müssen nicht bearbeitet werden.
UI und Transport sind im einzelnen Serverskript `server.js` enthalten.

## Aktueller Umfang

- Plugin-Verbindung und Wiederverbindung über den lokalen YACA-WebSocket.
- INIT/JOIN, Spieler-Client-ID, Kanal-, Sprach-, Mikrofon- und Audiostatus.
- Bis zu acht Sprachreichweiten, serverseitige Reichweitensperre und Numpad +/−.
- Räumliche Spielerliste mit Meterumrechnung und Trennung von Innenräumen.
- Funk mit Haupt-/Zweitkanal, Sendetasten und Lautstärke.
- Kompaktes HUD und aufklappbare Oberfläche über **F8**, Schließen mit Escape.
- Optionaler `onVoiceActivity`-Callback für eine eigene VAD-Anbindung.

**Teststand:** lokaler Build, automatisierte Bridge-/Protokolltests, Chromium mit
simuliertem YACA-Plugin und vorhandenes natives Server-Addon. Echte TeamSpeak-
Audioübertragung und Skyrim-/CEF-Spielbetrieb sind noch zu prüfen. Automatischer
Lip-Sync, Telefon, Megafon und die komplette FiveM-Funktionspalette sind nicht enthalten.

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
außerdem die drei zur Laufzeit benötigten Dateien unter `dist/plugin/`.
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
