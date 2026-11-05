# Размещение runtime SkyMP YACA

[Deutsch](RUNTIME.de.md) · [English](RUNTIME.md)

YACA владеет native-JS-модулем жизненного цикла и voice-UI. Исходники: `client/runtime.cjs`, `ui/protocol.js`, `ui/voice.js`, `ui/view.html`, `ui/style.css`. `tools/build-ui.cjs` создаёт корневые `client/client.js`, `client/ui.js`; CSS/HTML встроены в `ui.js`. `tools/build-plugin.cjs` копирует каталог в `dist/plugin/client/`. При будущей разрешённой сборке результат:

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

На **игровом сервере** установить полный каталог в `<game-cwd>/Plugins/skymp-yaca-ts/`. `plugin.json` объявляет `"runtime": "client/manifest.json"`; manifest располагается прямо в этом Runtime. Не класть в Launcher-репозиторий, server-webroot или второй `Server/` внутри настоящего game-CWD. `<game-cwd>` — рабочий каталог процесса с `server-settings.json`.

Скачиваются лишь явно перечисленные публичные файлы под `client/`. `server.js`, server-config, исходники локалей, учётные данные, ключи остаются снаружи. DLL/EXE/PEX/native-плагины запрещены. Дополнительные публичные assets включать в явный file-list; одно копирование ничего не публикует.

**Подпись необязательна.** Без ключей достаточно манифеста с размером и SHA-256 каждого файла; это защищает от повреждённых загрузок, но не от вредоносного сервера. Только если игрок указал доверенных издателей в Launcher, действительные подписи этих издателей становятся обязательными.

Producer-SDK `tools/plugin-runtime/` создаёт SHA-256/размеры и Ed25519-подпись. Для будущей сборки задать `SKYMP_PLUGIN_SIGNING_KEY` приватным ключом вне публичного дерева, `SKYMP_PLUGIN_KEY_ID` — ID издателя, либо подписать собранный каталог SDK. Неподписанный developer-кандидат Launcher не принимает, release-упаковка запрещает. При смене байтов/ключа нужна новая версия; `(pluginId, version)` неизменно. Manifest/plugin-ID: `skymp-yaca-ts`.

После установки включить и перезапустить **игровой сервер**. Объявляются только успешно запущенные плагины. Сервер отдаёт подписанные manifest/файлы через `/api/launcher/plugin-runtime/`; Launcher устанавливает в `Data/Platform/PluginRuntime/packages/<pluginId>/<manifestSha256>/`, ведёт привязанный к серверу active-index. Игрокам нужны base-client/Launcher Runtime API 1 и независимое доверие публичному ключу. Общий bootstrap ставится один раз; совместимым обновлениям YACA далее нужны лишь plugin-build/доставка, без пересборки Launcher EXE/общего runtime.

Client API 1 использует `activate(api)`/cleanup; UI API 1 монтируется в существующий CEF-host, удаляет listener/таймеры/сокеты/state. YACA сохраняет native EventSource/TeamSpeak-транспорт. Обычный server-bundle больше не встраивает overlay в ограниченное тело EventSource. `dist/ui/overlay.js` остаётся для legacy-инструментов; `SKYMP_YACA_LEGACY_OVERLAY=1` явно включает его в будущие legacy-test-build. Постоянное отображение дальности принадлежит UI-Core; YACA даёт проверенные status-данные. Полный контракт, подпись, будущая приёмка: [Plugin Runtime Loader](docs/PLUGIN_RUNTIME.md).

Инструкция готовит только структуру исходников. В этом документировании новых сборок, ZIP, публикации ключей и игровой приёмки не было.
