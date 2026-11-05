# SkyMP YACA runtime placement

[Deutsch](RUNTIME.de.md) · [Русский](RUNTIME.ru.md)

YACA owns its native-JS lifecycle module and voice UI. Edit `client/runtime.cjs` and `ui/protocol.js`, `ui/voice.js`, `ui/view.html`, `ui/style.css` in this repository. `tools/build-ui.cjs` prepares root `client/client.js` and `client/ui.js`; CSS/HTML are embedded in `ui.js`. `tools/build-plugin.cjs` copies the complete directory into `dist/plugin/client/`. On a later authorized build, the output is:

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

On the **game server**, install that complete plugin folder under `<game-cwd>/Plugins/skymp-yaca-ts/`. Its `plugin.json` declares `"runtime": "client/manifest.json"`; the runtime manifest belongs directly inside that directory. Do not put it in the Launcher repository, the server webroot or a second `Server/` below the actual game CWD. `<game-cwd>` is the process working directory containing `server-settings.json`.

Only explicitly declared public files in `client/` are downloadable. Keep `server.js`, server configuration, locale sources, credentials and signing keys outside it. Do not place DLL/EXE/PEX/native plugins there. Extra public assets must be added to the manifest's explicit file list; copying an undeclared file does not publish it.

**Signatures are optional.** Without keys, the manifest with each file's size and SHA-256 is sufficient; this protects against damaged downloads, not against a malicious server. Only when a player configures trusted publishers in the Launcher do valid signatures from those publishers become mandatory.

Use the producer SDK in `tools/plugin-runtime/` to produce SHA-256/size entries and an Ed25519 signature. Set `SKYMP_PLUGIN_SIGNING_KEY` to a private key outside the public tree and `SKYMP_PLUGIN_KEY_ID` to its publisher ID for a later build, or sign the built directory with the SDK. Use a new plugin version whenever package bytes or signing key change; `(pluginId, version)` is immutable. Manifest/plugin ID is `skymp-yaca-ts`.

Enable the plugin and restart the **game server** after deployment. Only successfully started plugins are advertised. The server serves manifests/files through `/api/launcher/plugin-runtime/`; Launcher downloads them into `Data/Platform/PluginRuntime/packages/<pluginId>/<manifestSha256>/` and maintains the server-bound active index. Players must use a base client/Launcher with Runtime API 1. Install the generic bootstrap once; later compatible YACA updates require only the plugin build/deployment, without rebuilding Launcher EXE or shared runtime.

Client module API 1 uses `activate(api)` and cleanup; UI API 1 mounts inside the existing CEF host and disposes listeners/timers/sockets/state. YACA keeps its existing native EventSource/TeamSpeak transport. The normal server bundle no longer embeds the overlay in a size-limited EventSource body. `dist/ui/overlay.js` remains for legacy tooling; `SKYMP_YACA_LEGACY_OVERLAY=1` explicitly includes it for later legacy test builds. Persistent range rendering still belongs to UI-Core; YACA supplies its validated status data. Full contract, signing and later acceptance: [Plugin Runtime Loader](docs/PLUGIN_RUNTIME.md).

This guide prepares source layout only. No new build, ZIP, key publication or game acceptance was performed for this documentation task.
