# Prüfung und lokaler Teststand

Fortgeschrieben am 28.10.2026 gegen die lokalen Checkouts
`D:\GitHub\skymp` und `D:\GitHub\SkyMP-UI-Core`. Maßgeblich sind die
Dateihashes in den aktuellen Prüfbefunden; Änderungen liegen lokal im
Arbeitsverzeichnis.

## Ergebnis

Die bisherige Bridge war mit dem tatsächlichen Server-API nicht ausführbar.
Die neue Implementierung registriert SkyMP-Properties und eine Client-Eventquelle,
liefert ein eigenständiges Overlay in das bestehende SkyrimPlatform-Frontend und
verbindet den lokalen Browser mit dem YACA-Plugin. Die tatsächliche Übertragung
von Sprache in TeamSpeak und das Verhalten in Skyrim müssen im Spiel getestet werden.

| Bereich | Bisheriger Befund | Aktueller Stand |
| --- | --- | --- |
| Server-API | `mp.setPropertyValue` und `mp.callPapyrusMethod` existieren im Fork nicht. | `mp.makeProperty`, `mp.makeEventSource`, `mp.get`/`mp.set`; native Registrierung lokal geprüft. |
| Papyrus | Die Quest verwaltet Werte und schreibt Logs. Es gibt keinen Plugin-Transport; der verwendete Helfer `GetKeyCode` fehlt im Repository. | Für den neuen Pfad wird keine Quest, ESP oder PEX benötigt. Historische Papyrus-Dateien werden nicht im Testpaket installiert. |
| Start | `node dist/yacaBridge.js` exportierte nur eine Funktion und initialisierte nichts. | Manifest-Plugin unter `Plugins/skymp-yaca-ts/`, Einstieg `server.js`, lädt die Bridge automatisch. `npm start` im Quellpaket startet die UI-Vorschau. |
| Plugin | Kein WebSocket, kein INIT/JOIN, keine Spielerzuordnung. | Lokaler WebSocket, INIT, JOIN-ID, Kanal-, Sprach- und Mute-Status, Wiederverbindung. |
| Räumliche Sprache | Keine Positionsübertragung. | INGAME-Spielerliste mit Metern, Blickrichtung des Actors und Ablauf veralteter Nachbarn. Innenräume werden getrennt, benachbarte Außenzellen desselben Worldspaces bleiben verbunden. |
| Reichweite | Menü und Numpad-Tasten. | V schaltet direkt durch; der Server berechnet den nächsten Index aus seinem aktuellen Zustand. Schnelle Tastendrücke hängen nicht von einem bereits zurückgelieferten Snapshot ab. Sperre gilt für Tasten und UI. |
| Funk | Früher Haupt-/Zweitkanal und PTT. | Für das Fantasy-Setting entfernt: keine Kanäle, PTT, Funklautstärke, Teilnehmerliste oder `comm_device`-Pakete. Alte Config-Felder werden verworfen. Historische, nicht installierte Papyrus-Quellen gehören nicht zum Laufzeitpfad. |
| UI | Eigenes HUD und Menü. | Dauerhafte Reichweitenanzeige über das Status-Template der öffentlichen UI-Core-API v1. F8-Einstellungen und Vollbild-Verbindungshinweis im selben CEF, ohne zweites HUD. |
| Verbindungshinweis | Nur kleiner Verbindungsstatus im Menü. | Automatischer halbtransparenter Vollbildhinweis bis Ingame-Kanal und Client-ID bestätigt sind, mit austauschbarem Bild, konfigurierbarem Text und Deckkraft. Kein Fokuswechsel durch den Hinweis. |
| Spielerzuordnung | Keine belastbare Anbindung. | Der Server verwendet die Actor-ID der nativen Eventquelle. Eine Actor-ID im Browser-Payload wird ignoriert. Plugin-Client-IDs bleiben Selbstauskünfte des Clients. |
| Installation | Das erste lokale Testpaket erforderte einen manuellen Aufruf aus dem Gamemode. | Plugin-Ordner hinzufügen, eigene Config ausfüllen, im bestehenden Workflow aktivieren und Gameserver neu starten. Keine Änderung an Servercode oder Gamemode. |

## Plugin-Lader

Der vorhandene Fork erkennt direkte Unterordner von `Plugins/` anhand von
`plugin.json`. Das Paket verwendet `kind: "gamemode"`. Neue Plugins bleiben
zunächst deaktiviert; das Paket liefert keinen Discovery-State und aktiviert
sich nicht selbst.

Der Fork kopiert den Entry vor `require()` in ein temporäres Verzeichnis.
Deshalb enthält `server.js` alle eigenen Module und die UI und findet seine
Config und das austauschbare Bild unter `assets/` über den eindeutigen Manifestnamen.
Zur Laufzeit werden nur Node-Builtins
benötigt; zusätzliche npm-Pakete entfallen.

Der Fork lädt Plugins beim Boot, nach einem Gamemode-Reload aber bisher nicht
erneut. Das Plugin legt deshalb auf seiner Runtime-Instanz eine weiterleitende
`clear()`-Funktion an und registriert ausschließlich seine eigenen Properties
und Eventquelle im nächsten Eventloop erneut. Mehrere synchrone Clears werden
zusammengefasst. Native Prototypen und Serverdateien werden nicht verändert.
Die Client-Eventquelle installiert ihre versionierte UI beim ersten Frame
erneut. Ein alter Browser-Heartbeat kann die Umstellung dadurch nicht verhindern;
eine ältere Funk-Oberfläche wird dabei gestoppt und ersetzt.
Das originale `clear()` wird mit unveränderten Argumenten und Rückgabewert
ausgeführt; beim Stop wird die ursprüngliche Instanzeigenschaft wiederhergestellt.

## Quellen des Abgleichs

Die externe UI diente als Funktionsreferenz für Plugin-Hinweise. Ihre
Vue-Komponenten, Bilder und Schriften wurden nicht übernommen.

- [FiveM-YACA, geprüfter Commit 6d766a0](https://github.com/yaca-systems/fivem-yaca-typescript/tree/6d766a041671e0e76b3b63a31d068f21c8ded956)
- [Plugin-INIT und Antworten](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/apps/yaca-client/src/yaca/main.ts)
- [Lokaler WebSocket-Port](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/assets/yaca-voice/web/script.js)
- [YACA-UI, geprüfter Commit 85d6032](https://github.com/yaca-systems/yaca-ui/tree/85d6032d7f0a2950bb27f56432ca68624bf2b389)
- [Framework-Rückkanal der externen UI](https://github.com/yaca-systems/yaca-ui/blob/85d6032d7f0a2950bb27f56432ca68624bf2b389/yaca-ui/src/services/game-service.ts)

Maßgebliche Stellen im lokalen SkyMP-Fork:

- `skymp5-server/cpp/addon/ScampServer.cpp`: registriertes natives Server-API, 100-KiB-Limit je Client-Codekörper.
- `skymp5-client/src/services/services/gamemodeEventSourceService.ts`: native Eventquelle, `ctx.sendEvent`, Ablauf alter Kontexte.
- `skymp5-client/src/services/services/gamemodeUpdateService.ts`: Owner-/Neighbor-Updates pro Frame.
- `docs/skyrim_platform/browser.md`: Browser-API und Rückkanal.
- `skymp5-server/ts/index.ts`: vorhandene optionale Voice-Activity-Verteilung.

## Grenzen im aktuellen Fork

Die Reichweitenanzeige benötigt UI Core auf dem Gameserver **und** dessen
passenden Client-/CEF-Build. YACA ruft ausschließlich `registerWidget`,
`updateWidget`, `setWidgetVisible`, `unregisterWidget` und `getStatus` der
öffentlichen API v1 auf; die Empfängerauswahl erfolgt über die native Actor-ID.
Der Widget-Identifier ist `skymp-yaca-ts:voice-range`. Ohne oder bei inkompatiblem
UI Core bleiben Voice-Transport, Hinweis und Tasten funktionsfähig; die Anzeige
wartet mit einmaliger Logdiagnose. Das Plugin prüft den Service bei weiteren
Zustandsmeldungen erneut. Änderungen am UI-Core-Repository sind nicht erforderlich.

Lokale Bilder werden beim Serverstart als begrenzte Data-URL eingelesen und im
privaten Owner-Zustand übertragen. Sie liegen außerhalb des generierten
Client-Codekörpers. Das 100-KiB-Codekörperlimit des Forks bleibt damit unabhängig
vom eigenen Bild. Größere Bilder können über HTTPS eingebunden werden.

Die erfolgreiche `OK`/`JOIN`-Antwort bestätigt den initialen Kanalbeitritt und
die Client-ID. Das Overlay wartet danach nicht zusätzlich auf `MOVED_CHANNEL`;
diese Meldung steuert weiterhin spätere Kanalwechsel. JOIN-IDs werden als
Zahl und als numerischer String akzeptiert. Die vorherige zusätzliche
Bedingung konnte die Anzeige bei erfolgreichem automatischen Beitritt im
Zustand „Sprachverbindung wird hergestellt“ festhalten.

Der UI-Core-Adapter fasst identische Statusmeldungen zusammen und setzt die
Sichtbarkeit nur beim ersten bzw. erneuten Anzeigen. Damit werden nicht für
jeden YACA-Heartbeat zwei Updates vom gemeinsamen UI-Budget verbraucht.
Ein API-Fehler nennt im Log den fehlgeschlagenen Aufruf und seine begrenzte
Fehlermeldung; spätere Statusänderungen versuchen die Aktualisierung erneut.

Lip-Sync wird von dieser Bridge standardmäßig nicht aktiviert. `onVoiceActivity`
liefert optional eine serverseitig dem Absender zugeordnete Sprachmeldung für
eine eigene Anbindung. Folgende Stellen im Fork sind vor verlässlichem Lip-Sync
zu korrigieren und anschließend im Spiel zu prüfen:

1. `skymp5-server/ts/index.ts`, Empfängerauflösung der Voice Activity:
   `getActorPos` liefert Skyrim-Koordinaten, die euklidische Entfernung wird direkt
   mit den als Meter definierten `voiceRange`/`proximityDistance` verglichen.
   Es fehlt eine einheitliche Umrechnung. Die neue Plugin-Positionsübertragung
   verwendet dafür `client.unitsPerMeter` (Startwert 70, im Spiel kalibrieren).
2. `skymp5-client/src/sync/voiceActivitySync.ts`: Die übertragene Server-Actor-ID
   wird direkt an `Game.getFormEx` gegeben. Die im Fork vorhandene Umrechnung
   von Server- auf lokale Form-IDs wird dort nicht verwendet.
3. `YacaTeamSpeakAdapter.ts`: Wiederholte `true`-Meldungen erhöhen den
   Sprecherzähler erneut. Sein `initialize()` registriert keinen Transport.
   Außerdem beträgt der Standard-Inaktivitäts-Timeout des Managers 1000 ms;
   Meldetakt und Timeout müssten aufeinander abgestimmt werden.

Die Bridge verwendet den fehlerhaften Custom-Packet-Pfad nicht automatisch.
Das Paket enthält keine Änderungen an `D:\GitHub\skymp` und keine neu gebauten
Skyrim-/SKSE-DLLs.

## Umfang des lokalen Nachweises

- TypeScript-Build und Regressionstests für Konfiguration, Protokoll,
  Eigentümer-/Nachbar-Properties, Eingabevalidierung, Reichweitensperre,
  Meterumrechnung, Raumtrennung, Tastenflanken und Ablauf alter Eventquellen.
- Sichtbarer Chromium-Browser: Vorschau am Desktop und bei 375 px Breite.
  Zusätzlich echter lokaler WebSocket gegen ein simuliertes YACA-Plugin:
  INIT/JOIN, Sprechen/Mute, Kanalzustand, Reichweitenbefehle/Sperre,
  Positionspakete ohne Funk, falscher TS-Server, Reconnect,
  Escape und Aufräumen. Keine Browserfehler im geprüften Lauf.
- Vorhandenes natives Addon aus `build/dist/server/scam_native.node` des Forks:
  Properties/Eventquelle registriert, Test-Actor angelegt, Reichweite und
  Gamemode-Neuladung über echte Actor-Properties sowie Aufräumen geprüft.
  Es wurde kein vorhandener Serverprozess verändert. Der Test verwendet einen
  separaten Prozess, einen dynamischen Loopback-Port und sein eigenes Arbeitsverzeichnis.
- Die unveränderten Manifest-, Discovery-, Aktivierungs- und `requireTemp`-Funktionen
  des Forks werden aus dessen TypeScript-Quelldateien geladen und in einem
  isolierten Serververzeichnis geprüft. Dazu gehören die anfängliche Deaktivierung,
  Aktivierung über den Discovery-State, umbenannte Plugin-Ordner, ein mehrfach
  geladenes Entry, Gamemode-Neuladung und unveränderte bestehende Gamemode-Dateien.
  Die Prüfscripte verwenden Status-Fixtures statt eines gestarteten Dashboards;
  der optionale native Lauf verwendet dabei zusätzlich das echte Addon.
- `node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core` prüft den Verbraucher
  gegen den tatsächlichen UI-Core-Service und dessen Frame-Validatoren.
  Spielerzuordnung und Pakettransport sind dort Fixtures; es ist kein Spieltest.
- `node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core` lädt beide
  gebündelten Plugins über den tatsächlichen Fork-Loader. Zwei native Bots
  prüfen echte User-/Actor-Zuordnung, CustomEvent-Eingang, private Anzeigen,
  Reichweitensperre und Wiederherstellung nach `mp.clear()`. In diesem Lauf
  traten keine YACA-UI-Core-Warnungen auf. Das startet keinen Skyrim-Client.

Die maschinenlesbaren Laufbefunde werden beim lokalen Paketbau in
`validation/` mitgeliefert, soweit sie im Workspace vorhanden sind. Ein
simuliertes Plugin beweist weder echte Audioausgabe noch TeamSpeak-Lizenzierung,
CEF-Verhalten in Skyrim oder Mehrspieler-Spielbetrieb.

Telefon, Megafon, GTA-/RedM-Akustik, Wasser-/Occlusion-Effekte und automatische
Lippenanimationen sowie Funkgerät/Funkkanäle sind nicht implementiert.
