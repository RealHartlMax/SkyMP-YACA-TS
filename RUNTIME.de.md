# Ablage der SkyMP-YACA-Runtime

[English](RUNTIME.md) · [Русский](RUNTIME.ru.md)

YACA besitzt sein natives JS-Lifecycle-Modul und die Voice-Oberfläche. Quellen: `client/runtime.cjs` und `ui/protocol.js`, `ui/voice.js`, `ui/view.html`, `ui/style.css` in diesem Repository. `tools/build-ui.cjs` erzeugt `client/client.js` und `client/ui.js` an der Wurzel; CSS/HTML stecken in `ui.js`. `tools/build-plugin.cjs` kopiert den vollständigen Ordner nach `dist/plugin/client/`. Bei einem später beauftragten Build entsteht:

```text
dist/plugin/client/
  manifest.json
  client.js
  ui.js
dist/plugin/
  plugin.json
  server.js
  config.json
  assets/
  client/
```

Auf dem **Gameserver** den vollständigen Pluginordner unter `<game-cwd>/Plugins/skymp-yaca-ts/` installieren. `plugin.json` enthält `"runtime": "client/manifest.json"`; das Runtime-Manifest gehört direkt in diesen Ordner. Nicht im Launcher-Repository, Server-Webroot oder einem zweiten `Server/` unterhalb des tatsächlichen Game-CWD ablegen. `<game-cwd>` ist das Prozess-Arbeitsverzeichnis mit `server-settings.json`.

Herunterladbar sind nur ausdrücklich deklarierte öffentliche Dateien unter `client/`. `server.js`, Serverkonfiguration, Locale-Quellen, Zugangsdaten und Signierschlüssel bleiben außerhalb. DLL/EXE/PEX/native Plugins gehören dort nicht hinein. Zusätzliche öffentliche Assets in die explizite Manifest-Dateiliste aufnehmen; bloßes Kopieren veröffentlicht nichts.

**Signaturen sind optional.** Ohne Schlüssel reicht das Manifest mit Größe und SHA-256 jeder Datei; das schützt vor beschädigten Downloads, nicht vor einem böswilligen Server. Erst wenn ein Spieler im Launcher vertrauenswürdige Herausgeber einträgt, sind gültige Signaturen dieser Herausgeber Pflicht.

Das Producer-SDK in `tools/plugin-runtime/` erzeugt SHA-256/Größen und Ed25519-Signatur. Für einen späteren Build `SKYMP_PLUGIN_SIGNING_KEY` auf einen privaten Schlüssel außerhalb des öffentlichen Baums und `SKYMP_PLUGIN_KEY_ID` auf dessen Herausgeber-ID setzen oder den gebauten Ordner mit dem SDK signieren. Unsignierte Entwicklerkandidaten werden weder vom Launcher akzeptiert noch als Release paketiert. Bei geänderten Paketbytes oder Schlüsseln neue Pluginversion verwenden; `(pluginId, version)` bleibt unveränderlich. Manifest-/Plugin-ID: `skymp-yaca-ts`.

Nach Auslieferung aktivieren und den **Gameserver** neu starten. Nur erfolgreich gestartete Plugins werden angekündigt. Der Server liefert Manifeste/Dateien über `/api/launcher/plugin-runtime/`; der Launcher installiert unter `Data/Platform/PluginRuntime/packages/<pluginId>/<manifestSha256>/` und verwaltet den servergebundenen aktiven Index. Spieler benötigen Basis-Client/Launcher mit Runtime API 1 und müssen den öffentlichen Herausgeberschlüssel unabhängig freigeben. Der generische Bootstrap wird einmal installiert; kompatible spätere YACA-Updates brauchen nur Plugin-Build/-Auslieferung, keinen Launcher-EXE- oder gemeinsamen Runtime-Neubau.

Clientmodul API 1 verwendet `activate(api)` mit Aufräumen; UI API 1 läuft im vorhandenen CEF-Host und entfernt Listener/Timer/Sockets/Zustand beim Abbau. YACA behält den bestehenden nativen EventSource-/TeamSpeak-Transport. Das normale Server-Bundle bettet die Oberfläche nicht mehr in den größenbegrenzten EventSource-Codekörper ein. `dist/ui/overlay.js` bleibt für Legacy-Werkzeuge; `SKYMP_YACA_LEGACY_OVERLAY=1` nimmt es bei späteren Legacy-Testbuilds ausdrücklich auf. Die dauerhafte Reichweitendarstellung gehört weiterhin UI-Core; YACA liefert validierte Statusdaten. Vollständiger Vertrag, Signierung und spätere Abnahme: [Plugin Runtime Loader](docs/PLUGIN_RUNTIME.md).

Diese Anleitung bereitet nur die Quellstruktur vor. Kein neuer Build, ZIP, veröffentlichter Schlüssel oder Spieltest in diesem Dokumentationsauftrag.
