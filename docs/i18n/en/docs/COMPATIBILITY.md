<a id="prüfung-und-lokaler-teststand"></a>
# Validation and local test status

Updated on 28 October 2026 against local checkouts `D:\GitHub\skymp` and `D:\GitHub\SkyMP-UI-Core`. File hashes in current validation results are authoritative; changes are local in the working directory.

<a id="ergebnis"></a>
## Result

The former bridge could not run against the actual server API. The new implementation registers SkyMP properties/a client event source, supplies a standalone overlay to existing SkyrimPlatform frontend and connects local browser to YACA plugin. Real TeamSpeak voice transmission and Skyrim behavior require in-game tests.

| Area | Previous finding | Current status |
| --- | --- | --- |
| Server API | `mp.setPropertyValue`/`mp.callPapyrusMethod` do not exist in fork. | `mp.makeProperty`, `mp.makeEventSource`, `mp.get`/`mp.set`; native registration checked locally. |
| Papyrus | Quest manages values/logs. No plugin transport; helper `GetKeyCode` absent. | No quest/ESP/PEX needed on new path. Historical Papyrus files not installed in test package. |
| Startup | `node dist/yacaBridge.js` only exported a function, initialized nothing. | Manifest plugin `Plugins/skymp-yaca-ts/`, entry `server.js`, loads automatically. Source-package `npm start` starts preview. |
| Plugin | No WebSocket, INIT/JOIN or player mapping. | Local WebSocket, INIT, JOIN ID, channel/speech/mute state, reconnect. |
| Spatial voice | No position transfer. | INGAME player list with meters, actor direction, stale-neighbor expiry. Interiors separated; adjacent exterior cells of same worldspace stay connected. |
| Range | Menu/Numpad keys. | V cycles directly; server derives next index from current state. Rapid presses need no already-returned snapshot. Lock covers keys/UI. |
| Radio | Former primary/secondary channel/PTT. | Removed for fantasy setting: no channels/PTT/radio volume/participants/`comm_device` packets. Old config discarded. Historical uninstalled Papyrus is outside runtime path. |
| UI | Own HUD/menu. | Persistent range via public UI-Core API v1 status template. F8/fullscreen connection notice in same CEF, no second HUD. |
| Notice | Small connection state in menu only. | Automatic translucent fullscreen notice until in-game channel/client ID confirmed; replaceable image, configurable text/opacity. No focus change. |
| Player identity | No reliable connection. | Server uses actor ID from native event source. Browser-supplied actor ID ignored. Plugin client IDs remain client claims. |
| Installation | First local package needed manual gamemode call. | Add folder/configure/enable/restart. No server/gamemode changes. |

<a id="plugin-lader"></a>
## Plugin loader

Fork discovers direct `Plugins/` subfolders through `plugin.json`. Package uses `kind: "gamemode"`. New plugins initially disabled; package ships no discovery state and never enables itself.

Fork copies entry to temporary directory before `require()`. Therefore `server.js` contains owned modules/UI, locating configuration/replaceable `assets/` image through unique manifest name. Only Node builtins needed at runtime, no additional npm packages.

Fork loads plugins at boot but currently not again after gamemode reload. Plugin therefore installs a forwarding `clear()` on runtime instance and re-registers only owned properties/event source next event-loop iteration. Multiple synchronous clears coalesce. No native prototype/server-file changes. Client event source reinstalls versioned UI on first frame; old browser heartbeat cannot prevent upgrade, and old radio UI is stopped/replaced. Original `clear()` receives unchanged arguments/return; stopping restores original instance property.

<a id="quellen-des-abgleichs"></a>
## Comparison sources

External UI served as a functional reference for plugin notices. Its Vue components/images/fonts were not copied.

- [FiveM YACA, checked commit 6d766a0](https://github.com/yaca-systems/fivem-yaca-typescript/tree/6d766a041671e0e76b3b63a31d068f21c8ded956)
- [Plugin INIT/replies](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/apps/yaca-client/src/yaca/main.ts)
- [Local WebSocket port](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/assets/yaca-voice/web/script.js)
- [YACA UI, checked commit 85d6032](https://github.com/yaca-systems/yaca-ui/tree/85d6032d7f0a2950bb27f56432ca68624bf2b389)
- [External UI framework return path](https://github.com/yaca-systems/yaca-ui/blob/85d6032d7f0a2950bb27f56432ca68624bf2b389/yaca-ui/src/services/game-service.ts)

Relevant local fork locations:

- `skymp5-server/cpp/addon/ScampServer.cpp`: registered native API, 100 KiB per client-code body.
- `skymp5-client/src/services/services/gamemodeEventSourceService.ts`: native source, `ctx.sendEvent`, old context expiry.
- `skymp5-client/src/services/services/gamemodeUpdateService.ts`: owner/neighbor updates per frame.
- `docs/skyrim_platform/browser.md`: browser API/return path.
- `skymp5-server/ts/index.ts`: existing optional voice-activity distribution.

<a id="grenzen-im-aktuellen-fork"></a>
## Limits in the current fork

Range indicator needs UI Core on server **and** matching client/CEF build. YACA calls only public v1 `registerWidget`, `updateWidget`, `setWidgetVisible`, `unregisterWidget`, `getStatus`; native actor ID selects recipient. ID: `skymp-yaca-ts:voice-range`. Without compatible UI Core, transport/notice/keys work; indicator waits with one diagnostic. Service is rechecked on later state messages. No UI-Core repository changes needed.

Local images are read at server start into bounded data URLs and sent in private owner state, outside generated client-code body. Fork's 100 KiB code limit stays independent of image; bigger images may use HTTPS.

Successful `OK`/`JOIN` confirms initial channel admission/client ID. Overlay does not additionally wait for `MOVED_CHANNEL`; that still controls later channel changes. JOIN IDs accept number/numeric string. Previous extra condition could leave notice stuck at “Connecting voice” despite successful automatic admission.

UI-Core adapter coalesces identical status and sets visibility only when first showing/reshowing, avoiding two shared-budget updates on every heartbeat. API error logs failed call/bounded error message; later changes retry.

Lipsync is disabled by default. Optional `onVoiceActivity` supplies a server-associated sender voice report for custom integration. Before reliable lipsync, fix and in-game test:

1. `skymp5-server/ts/index.ts`, voice recipient selection: `getActorPos` returns Skyrim coordinates but Euclidean distance is compared directly to meter-valued `voiceRange`/`proximityDistance`. Consistent conversion missing. New plugin positions use `client.unitsPerMeter` (initial 70; calibrate in game).
2. `skymp5-client/src/sync/voiceActivitySync.ts`: server actor ID passed directly to `Game.getFormEx`, ignoring existing server→local form conversion.
3. `YacaTeamSpeakAdapter.ts`: repeated `true` increments speaker count again; `initialize()` registers no transport. Manager default idle timeout 1000 ms also needs alignment with report interval.

Bridge does not automatically use broken CustomPacket path. Package contains no changes to `D:\GitHub\skymp` or newly built Skyrim/SKSE DLLs.

<a id="umfang-des-lokalen-nachweises"></a>
## Scope of local evidence

- TypeScript build/regressions for config/protocol/owner-neighbor properties/input/range lock/meter conversion/space separation/key edges/source expiry.
- Visible Chromium: desktop preview and 375 px. Real local WebSocket against simulated YACA: INIT/JOIN, speech/mute, channels, range/lock, positions without radio, wrong server, reconnect, Escape/cleanup. No browser errors in checked run.
- Existing fork `build/dist/server/scam_native.node`: properties/source, test actor, range/gamemode reload via real properties, cleanup. No existing server process altered; separate process, dynamic loopback port, own working directory.
- Actual unchanged fork manifest/discovery/activation/`requireTemp` functions loaded from TypeScript and tested in isolated server directory: initial disabled state, discovery-state activation, renamed folders, repeated entry, reload, unchanged gamemode files. Scripts use status fixtures, no dashboard; optional native run additionally uses real addon.
- `node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core` checks consumer against real UI-Core service/frame validators. Identity/transport are fixtures, no game test.
- `node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core` loads both real bundles via fork loader. Two native bots check identity, CustomEvent input, private widgets, range lock/restoration after `mp.clear()`. No YACA/UI-Core warnings in that run; no Skyrim client.

Machine-readable results are included under `validation/` during local packaging where present. Simulation proves neither actual audio, TeamSpeak licensing, CEF in Skyrim nor multiplayer gameplay.

Phone, megaphone, GTA/RedM acoustics, water/occlusion, automatic lip animation and radio/channels are not implemented.
