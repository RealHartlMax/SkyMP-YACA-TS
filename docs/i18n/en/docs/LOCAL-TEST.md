<a id="lokal-bauen-und-testen"></a>
# Build and test locally

<a id="oberfläche-sofort-ansehen"></a>
## View the interface immediately

In the repository:

```powershell
npm ci
npm run preview
```

Open `http://127.0.0.1:4173`. In built **source package**, `npm start` suffices; preview needs no installed npm packages. It connects to no TeamSpeak and displays example data only.

<a id="plugin-in-einer-lokalen-serverkopie-laden"></a>
## Load plugin in a local server copy

Prerequisites: Node.js 22+, your SkyMP fork with SkyrimPlatform browser, TeamSpeak/YACA plugin and matching channel IDs.

1. Extract plugin ZIP, put its `Plugins/skymp-yaca-ts` in local server copy. Alternatively copy `dist/plugin/` files to `Server/Plugins/skymp-yaca-ts/`.
2. Enter real TeamSpeak server UID/numeric channel IDs in `Server/Plugins/skymp-yaca-ts/config.json`.
3. Discover plugin, enable in existing plugin/admin workflow, restart server. Complete guide: [PLUGIN-INSTALL.md](PLUGIN-INSTALL.md). No `gamemode.js` edit.
4. Install UI Core/client/CEF integration. Connect client and open TeamSpeak/YACA. Range appears via UI Core. Optional F8 interface/connection notice use existing browser; no new URL.
5. Two players enter same world. Check near/far, interior/exterior-cell boundaries. Tap **V** repeatedly without opening F8: range/UI-Core indicator must follow. Holding triggers once. Check Numpad +/− and server range lock. The ring must follow the range (largest value of `voiceRanges.ranges` = full ring, e.g. 20 of 40 m = half ring). Mute/unmute TeamSpeak microphone: rune and ring must turn orange and back to gold, even with locked range. Speaking turns them green; the seal must not jump. Microphone/audio mute or disabled devices must not show speaking (green). Use `/UiEdit` to move/scale range/Metabolism; saved layout must remain. Rendering is in UI-Core repository; status data in YACA `src/uiCoreAdapter.ts`.
6. Disconnect TeamSpeak/join wrong server: fullscreen notice appears automatically. Reconnect correctly: disappears. Microphone mute alone must not trigger it. Replace image, restart server and verify new image. Skyrim menus, Chat and server change must leave no stuck input focus.
7. Enter an unloaded tavern from Tamriel and return. Even with loading times exceeding 3 or 12 seconds, the existing TeamSpeak/YACA connection must remain. The old listener list must not be reused while loading; afterwards spatial voice and status must resume without rejoining the channel. Also actually disconnect TeamSpeak or enter an excluded channel during loading: the appropriate notice must appear on return, and a real disconnect must still reconnect automatically.

No PEX files or quest. Existing server settings/saves/gamemode remain in local copy. Plugin re-registers after server-side `mp.clear()` but never triggers it itself.

<a id="bedienung-und-konfiguration"></a>
## Controls and configuration

| Setting | Meaning |
| --- | --- |
| `ui.toggleKey` | Default `F8`: open/close UI. Escape also closes. |
| `keyBinds.cycleVoiceRange` | Default `V`: cycle range directly. |
| `keyBinds.increaseVoiceRange` / `decreaseVoiceRange` | Default `ADD` / `SUBTRACT`: Numpad +/−, edge-triggered. |
| `voiceRanges.ranges` | 1–8 ascending ranges in meters, at most 100 m. |
| `ui.connectionOverlay.imagePath` | Replaceable local `assets/` image, up to 64 KiB. |
| `ui.connectionOverlay.imageUrl` | Optional HTTPS image URL, takes precedence. |
| `ui.connectionOverlay.message` / `imageAlt` | Operator text/image description. |
| `ui.connectionOverlay.backgroundOpacity` | Fullscreen background opacity, 0.1–0.9. |
| `client.webSocketUrl` | Default `ws://127.0.0.1:30125/`, loopback only. Connection is on each player's PC. |
| `client.unitsPerMeter` | Skyrim coordinate conversion; initial 70, calibrate in game. |
| `client.updateIntervalMs` | Position packets, default 250 ms. |

Microphone/audio mute reflects actual plugin state; change in TeamSpeak. Old config `pluginVersion` is not enforced; YACA checks version and may report `OUTDATED_VERSION`. `teamspeak.serverPassword` is not shared with other players and bridge does not use it to autojoin TeamSpeak server.

Library API still supplies `setVoiceRangeChangeAllowed(actorId, false)` for extensions. Range lock also covers manipulated UI commands; normal plugin installation needs no custom extension.

<a id="weitere-prüfung-und-paketbau"></a>
## Further checks and packaging

```powershell
npm test
node tools/verify-fork-plugin.cjs D:/GitHub/skymp
node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core
node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core
./tools/package-local.ps1
```

Package is created under `artifacts/local-build-<Zeitstempel>/`. Script performs no Git writes/network transfers. Optional native test against existing addon:

```powershell
node tools/smoke-native.cjs D:/GitHub/skymp/build/dist/server/scam_native.node D:/GitHub/skymp/build/dist/server/data
node tools/verify-fork-plugin.cjs D:/GitHub/skymp --native
```

Needs existing Skyrim masters, may take minutes on first load, uses its own `artifacts/` working directory. Second command additionally checks fork loader/automatic restoration after gamemode reloads. No native client build.

Optional VAD callback/outstanding lipsync issues: [COMPATIBILITY.md](COMPATIBILITY.md).
