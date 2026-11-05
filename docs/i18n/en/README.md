<a id="skymp-yaca-ts"></a>
# SkyMP YACA TS

> As of 29 October 2026: The new [Plugin Runtime Loader](docs/PLUGIN_RUNTIME.md) delivers plugin client code/UI as signed game-server packages. Shared runtime/Launcher need generic bootstrap once; compatible updates then stay in plugin project. Older descriptions below apply only where consistent with new contract. This change is source-only; new builds, ZIPs and game acceptance remain outstanding.

YACA/TeamSpeak plugin for SkyMP fork with SkyrimPlatform browser. Operators add only plugin folder, configure TeamSpeak and enable plugin. No server/gamemode.js edits required. Connection notice/transport are in `server.js`; persistent range indicator uses **SkyMP UI Core**.

Range indicator uses the same rune-seal/ring style as Metabolism and can move/scale through `/UiEdit`. YACA supplies data only: range, microphone active/muted/disabled, audio and speaking state. The seal shows the range, e.g. “8 / 40 m”; the ring around it shows it relative to the largest range in `voiceRanges.ranges` (full ring = largest value, half ring = 50 %). TeamSpeak/YACA mute/unmute colors rune and ring automatically, including locked range: gold active, green while speaking, orange for muted/disabled microphone or audio and without TeamSpeak. While microphone/audio is muted/disabled, HUD shows no speaking state. No status text sits below the seal; the element stays in place while speaking. F8 settings retain key hints; connection warning belongs to YACA. This is source-prepared and later needs YACA server-plugin/UI-Core runtime builds.

<a id="aktueller-umfang"></a>
## Current scope

- Plugin connection/reconnection over local YACA WebSocket.
- INIT/JOIN, player client ID, channel/language/microphone/audio state.
- Up to eight voice ranges, cycle directly with **V**, additionally Numpad +/−.
- Server-side range lock/private range indicator through UI Core.
- Spatial player list with meter conversion and interior separation.
- Translucent fullscreen notice with floating replaceable picture until TeamSpeak/YACA is connected to correct server/in-game channel.
- Optional voice settings through **F8**, Escape closes.
- Optional `onVoiceActivity` callback for custom VAD integration.

**Test status:** local build, automated bridge/protocol tests, Chromium with simulated YACA plugin, existing native server addon. Real TeamSpeak audio/Skyrim/CEF gameplay still needs testing. Automatic lipsync, radio, phone and megaphone are not included.

<a id="schnellstart-für-die-vorschau"></a>
## Quick preview

Node.js 22+:

```powershell
npm ci
npm run preview
```

Open `http://127.0.0.1:4173`. Preview uses example data only. Built package runs with `npm start`, with no npm dependencies needed.

<a id="lokal-in-skymp-testen"></a>
## Test locally in SkyMP

The **plugin ZIP** directly contains `Plugins/skymp-yaca-ts/`. Install:

1. Place folder in game-server `Plugins/`.
2. Put real TeamSpeak UID/channel IDs in its `config.json`.
3. Enable via existing plugin/admin workflow, restart game server. New plugins initially stay disabled in fork.
4. Enable `skymp-ui-core` and deliver matching client/CEF integration for range indicator. Without UI Core connection notice/range keys work; persistent indicator waits for UI Core with one log notice.

Default image: **`assets/voice-required.svg`**. Replace it or select custom PNG/JPEG/WebP/SVG under `assets/` through `ui.connectionOverlay.imagePath` in `config.json`; restart game server. No rebuild required. Message, image description, opacity are configurable there too; see installation guide.

No npm dependencies are installed on server. Existing gamemode stays intact; plugin handles its reloads too.

Installation: [docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md). Development/preview tests: [docs/LOCAL-TEST.md](docs/LOCAL-TEST.md). Actual-fork comparison/outstanding lipsync findings: [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).

```powershell
npm test
./tools/package-local.ps1
```

Local packaging creates a plugin ZIP/source package under `artifacts/`. No commit/push/upload. Build also creates installable folder with `assets/` at `dist/plugin/`. Historical Papyrus files are not installed.

<a id="referenzen"></a>
## References

- [FiveM/RedM YACA TypeScript](https://github.com/yaca-systems/fivem-yaca-typescript)
- [YACA-UI](https://github.com/yaca-systems/yaca-ui) as functional reference; included UI is an independent SkyMP implementation.
- [YACA / TeamSpeak plugin](https://yaca.systems)

The original's shorter English/Russian overview is covered in full by this localized document: native properties/events and SkyrimPlatform overlay, no server/gamemode edits, runtime npm dependencies or Papyrus quest; no radio or enabled automatic lipsync. Real in-game audio/Skyrim/CEF still needs acceptance.
