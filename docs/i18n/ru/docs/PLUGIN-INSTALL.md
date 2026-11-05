<a id="yaca-voice-als-skymp-plugin-installieren"></a>
# Установка YACA Voice как SkyMP-плагина

Проверенный fork не требует правок server/`gamemode.js`. Предупреждение и локальный YACA-транспорт в server-script. Постоянный индикатор использует public API v1 **SkyMP UI Core** (`skymp-ui-core`).

<a id="installation"></a>
## Установка

1. Распаковать **plugin-ZIP** в рабочий каталог сервера. Должны быть файлы:

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

   `Plugins` пишется точно. CWD — где сервер ищет `Plugins/`, обычно рядом с `server-settings.json`. В существующую установку добавить лишь новый каталог.

2. В **`Plugins/skymp-yaca-ts/config.json`** указать:

   - `teamspeak.serverUrl`, `serverPort`: адрес для игроков.
   - `yaca.uniqueServerId`: настоящий UID TeamSpeak.
   - `yaca.ingameChannelId`, `defaultChannelId`: разные числовые ID.
   - `yaca.ingameChannelPassword`: пароль игрового канала при наличии.

3. Запустить сервер для discovery. Новые плагины отключены. В существующем workflow включить автозапуск **YACA Voice** (`skymp-yaca-ts`), **перезапустить сервер**. При уже настроенном `pluginDiscovery.mode: "prompt"` можно подтвердить prompt `y`.

   Без подходящей панели после первого обнаружения остановить сервер и выполнить в его каталоге:

   ```powershell
   node Plugins/skymp-yaca-ts/set-enabled.cjs
   ```

   Запустить вновь. Helper резервирует discovery-state, меняет лишь `startupEnabled` для `skymp-yaca-ts`; другие плагины/исходники сохраняет. Ещё не обнаруженную установку не включает.

4. Нужна строка **`[YacaPlugin] Active`**. Ошибки config: **`[YacaPlugin] Startup failed`** и путь. Fork ловит ошибки временных модулей, поэтому проверять лог кроме статуса dashboard.

5. Для постоянной дальности включить **UI Core**, установить client/CEF. Проверенный источник `D:/GitHub/SkyMP-UI-Core`, особенно `docs/CLIENT_DEPLOYMENT.md`. YACA регистрирует status-widget `skymp-yaca-ts:voice-range` справа снизу. Новый renderer использует руны/кольца Metabolism. YACA даёт дальность/mute/unmute/речь; кольцо показывает дальность относительно наибольшего значения `voiceRanges.ranges`, статус виден цветом руны/кольца и при lock. Позже обновить server-plugin YACA и runtime UI-Core вместе. Позиция/масштаб — `/UiEdit`. При позднем UI Core YACA повторяет регистрацию на следующих status. Без него нет лишь индикатора/его настроек, в журнале notice.

6. На ПК игрока запустить TeamSpeak/YACA, войти на нужный сервер. **V** меняет дальность без F8, Numpad **+ / −** вперёд/назад. **F8** открывает настройки, Escape закрывает. Меню Skyrim/Chat/другой browser-input приостанавливают игровые клавиши. В F8 переключение работает. Клавиша меняется `keyBinds.cycleVoiceRange`. Радиоканалов/клавиш нет.

<a id="vollbildhinweis-und-eigenes-bild"></a>
## Полноэкранное предупреждение и своя картинка

Полупрозрачный notice возникает без local-YACA, при wrong-TS-server, отсутствии игрового канала, plugin/channel-ошибке. Исчезает после подтверждения **канала/client-ID**. Microphone-mute его не вызывает. `OK`/`JOIN` уже подтверждает вход/ID, дополнительный initial `MOVED_CHANNEL` не нужен. Последующие переходы/wrong-server/disconnect учитываются. Фокус мыши/клавиатуры не берётся, меню не открывается. При экране загрузки или отсутствии game-frame предупреждение скрывается, но локальное соединение YACA и подтверждённый вход в канал сохраняются. Пространственная речь и прежний список слушателей приостановлены до новых данных позиции. Поэтому долгий переход ячейки/мира не вызывает искусственного отключения TeamSpeak. Настоящие socket/channel-ошибки учитываются; game-server-disconnect или выгрузка плагина завершает соединение.

Парящий кристалл меняется без сборки:

1. Заменить `assets/voice-required.svg` своим SVG либо поместить, например, `assets/meine-welt.webp`.
2. При необходимости поменять `config.json`:

   ```json
   "connectionOverlay": {
     "imagePath": "assets/meine-welt.webp",
     "imageUrl": "",
     "imageAlt": "Wappen unserer Spielwelt",
     "message": "Tritt unserem TeamSpeak bei, um die anderen zu hören.",
     "backgroundOpacity": 0.68
   }
   ```

   Объект под **`ui`**. SVG/PNG/JPEG/WebP, локально до 64 KiB. Большие картинки — полный **HTTPS-URL** `imageUrl`, с приоритетом. Локальные файлы отдаёт сервер, Launcher отдельно не нужен. Прозрачные картинки подходят особенно хорошо. Opacity `0.1`–`0.9`. При reduced-motion картинка неподвижна.
3. **Перезапустить сервер**: config/картинка читаются при старте. Launcher пересобирать не надо.

Оператору не нужны `npm install`, compiler, дополнительные ESP/PEX/DLL. Игроку нужны подходящий SkyrimPlatform и TeamSpeak/YACA. Пакет не меняет существующий Launcher/native-installation.

<a id="betrieb-und-updates"></a>
## Эксплуатация и обновление

Runtime: `server.js`, `plugin.json`, `config.json`, `assets/`. Исходники/license/инструкция/доказательства — для разработки и проверки. Каталог можно переименовать, если он прямо под `Plugins/`, а имя manifest `skymp-yaca-ts` уникально.

При обновлении **сохранить свой `config.json`**, заменить `server.js`/`plugin.json`, добавить отсутствующие стандартные assets, перезапустить. Свои картинки сохранить. Старые `radio`/клавиши игнорируются; старые config получают `cycleVoiceRange: V`. При конфликте V выбрать свободную. Config перечитывается при следующем server-start/gamemode-reload. Плагин регистрируется вновь сам, правок server-source и второго ручного `initYacaBridge()` не нужно.

Отключить autostart обычным workflow, перезапустить; либо при остановленном сервере `node Plugins/skymp-yaca-ts/set-enabled.cjs --disable`. После можно удалить каталог.

Если прежний тест вручную подключался к gamemode, при переходе убрать добавленные `initYacaBridge()` строки, чтобы bridge загружался один раз.

<a id="testgrenzen"></a>
## Границы тестов

Bridge проверен настоящими manifest/discovery/activation/temporary-loader локального fork; installer серверные файлы не меняет. Старые UI/transport-тесты используют имитацию плагина. Настоящее TeamSpeak-аудио/Skyrim/CEF/multiplayer требуют игры. Автоматический lipsync выключен, детали — `docs/COMPATIBILITY.md` исходного пакета.
