<a id="yaca-voice-als-skymp-plugin-installieren"></a>
# Install YACA Voice as a SkyMP plugin

Checked SkyMP fork requires no server/gamemode.js changes. Connection notice/local YACA transport are in server script. Persistent range indicator uses public API v1 of **SkyMP UI Core** (`skymp-ui-core`).

<a id="installation"></a>
## Installation

1. Extract **plugin ZIP** in game-server working directory. Files must exist:

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

   Spell `Plugins` exactly. Working directory is where server searches `Plugins/`, usually beside `server-settings.json`. Existing installation: add only new plugin folder.

2. Set in **`Plugins/skymp-yaca-ts/config.json`**:

   - `teamspeak.serverUrl`/`serverPort`: player-facing address.
   - `yaca.uniqueServerId`: real TeamSpeak server UID.
   - `yaca.ingameChannelId`/`defaultChannelId`: different numeric channel IDs.
   - `yaca.ingameChannelPassword`: if in-game channel requires password.

3. Start game server to discover plugin. New plugins default disabled. In existing plugin/admin workflow enable **YACA Voice** (`skymp-yaca-ts`) autostart and **restart game server**. If interactive `pluginDiscovery.mode: "prompt"` is already configured, confirm startup prompt with `y` instead.

   Without suitable admin UI: stop after first discovery, run in server directory:

   ```powershell
   node Plugins/skymp-yaca-ts/set-enabled.cjs
   ```

   Start server again. Helper backs up existing discovery state, changes only `startupEnabled` for `skymp-yaca-ts`. Other autostart/server sources stay. Undiscovered installation is not enabled.

4. Server log must contain **`[YacaPlugin] Active`**. Config failures show **`[YacaPlugin] Startup failed`** with file path. Current fork catches temporary-module errors; always check log, not dashboard status alone.

5. For persistent range enable **UI Core**, install matching client/CEF. Verified source `D:/GitHub/SkyMP-UI-Core`, especially `docs/CLIENT_DEPLOYMENT.md`. YACA registers bottom-right status widget `skymp-yaca-ts:voice-range`; updated renderer uses Metabolism rune/ring style. YACA supplies range/mute/unmute/speaking; the ring shows the range relative to the largest value of `voiceRanges.ranges`, status appears as rune/ring color and remains with locked range. Later update YACA server plugin/UI-Core runtime together. Players move/scale with `/UiEdit`. If UI Core starts later, YACA retries registration on subsequent state messages. Without it only indicator/presentation settings are missing; server logs a notice.

6. On player PC start TeamSpeak/YACA, join correct server. **V** cycles voice range without F8. Numpad **+ / −** move forward/back. **F8** opens optional settings, Escape closes. Skyrim menus/Chat/other browser input suspend gameplay keys; switching also works inside F8. Change key via `keyBinds.cycleVoiceRange`. Radio channels/keys removed.

<a id="vollbildhinweis-und-eigenes-bild"></a>
## Fullscreen notice and custom image

Translucent notice automatically appears with no local YACA, wrong TeamSpeak server, no in-game channel or plugin/channel error. It disappears only after **in-game channel/client ID** confirmation. Microphone mute does not trigger it. Successful `OK`/`JOIN` already confirms admission/ID; no extra initial `MOVED_CHANNEL` needed. Later channel changes, wrong server and disconnect still apply. Notice takes no mouse/keyboard focus and opens no menu. During a loading screen or missing game frames it is hidden, while the local YACA connection and confirmed channel admission remain. Spatial voice and the previous listener list are suspended until fresh position data arrives. A longer cell/world transition therefore causes no artificial TeamSpeak disconnect. Actual socket/channel errors still apply; game-server disconnect or plugin teardown ends the connection.

Replace supplied floating crystal image without rebuilding:

1. Replace `assets/voice-required.svg` with own SVG, or place e.g. `assets/meine-welt.webp` in plugin folder.
2. Adjust `config.json` as needed:

   ```json
   "connectionOverlay": {
     "imagePath": "assets/meine-welt.webp",
     "imageUrl": "",
     "imageAlt": "Wappen unserer Spielwelt",
     "message": "Tritt unserem TeamSpeak bei, um die anderen zu hören.",
     "backgroundOpacity": 0.68
   }
   ```

   Object belongs under **`ui`**. SVG/PNG/JPEG/WebP, local up to 64 KiB. Larger images can use full **HTTPS URL** in `imageUrl`, taking precedence. Server supplies local files, no separate Launcher delivery. Transparent images work well. Background opacity `0.1`–`0.9`. Reduced-motion setting keeps image still.
3. **Restart game server**. Image/config load at startup. No Launcher rebuild.

Operators need no `npm install`, compiler or extra ESP/PEX/DLL. Players need fork-compatible SkyrimPlatform plus TeamSpeak/YACA. Package changes neither existing Launcher nor native installation.

<a id="betrieb-und-updates"></a>
## Operation and updates

Runtime consists of `server.js`, `plugin.json`, `config.json`, `assets/`. Sources/license/guide/local evidence support development/verification. Folder can be renamed if directly under `Plugins/` and manifest name `skymp-yaca-ts` stays unique.

Updates: **keep own `config.json`**, replace `server.js`/`plugin.json`, add missing standard assets, restart. Preserve own images. Old `radio`/radio-key settings ignored; old configs default `cycleVoiceRange` to `V`. Configure another free key if V conflicts. Config rereads next startup/gamemode reload. Plugin re-registers itself on reload; no server-source edits/second manual `initYacaBridge()` needed.

Disable autostart through existing workflow/restart, or with stopped server run `node Plugins/skymp-yaca-ts/set-enabled.cjs --disable`. Then folder may be removed.

If old test package was manually integrated in gamemode, remove those `initYacaBridge()` lines when migrating to avoid loading twice.

<a id="testgrenzen"></a>
## Test limits

Bridge checked against local fork manifest/discovery/activation/temporary loader. Installer changes none of these server files. Existing UI/transport tests use simulated plugin. Real TeamSpeak audio/Skyrim/CEF/multiplayer still need game testing. Automatic lipsync stays off; details in source package `docs/COMPATIBILITY.md`.
