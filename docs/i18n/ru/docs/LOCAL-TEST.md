<a id="lokal-bauen-und-testen"></a>
# Локальная сборка и тестирование

<a id="oberfläche-sofort-ansehen"></a>
## Сразу посмотреть интерфейс

В репозитории:

```powershell
npm ci
npm run preview
```

Открыть `http://127.0.0.1:4173`. В собранном **исходном пакете** достаточно `npm start`; установленные npm-пакеты preview не нужны. TeamSpeak не подключается, данные только примерные.

<a id="plugin-in-einer-lokalen-serverkopie-laden"></a>
## Загрузка в локальную копию сервера

Условия: Node.js 22+, свой SkyMP-fork с браузером SkyrimPlatform, TeamSpeak с YACA, подходящие ID каналов.

1. Распаковать plugin-ZIP, поместить `Plugins/skymp-yaca-ts` в локальную копию. Либо скопировать `dist/plugin/` в `Server/Plugins/skymp-yaca-ts/`.
2. Записать настоящий UID TeamSpeak/числовые channel-ID в `Server/Plugins/skymp-yaca-ts/config.json`.
3. Обнаружить плагин, включить существующим plugin/admin-workflow, перезапустить. Полная инструкция: [PLUGIN-INSTALL.md](PLUGIN-INSTALL.md). `gamemode.js` менять не надо.
4. Поставить UI Core/client/CEF. Подключить клиент, открыть TeamSpeak/YACA. Дальность видна в UI Core. F8 и предупреждение используют существующий браузер, новый URL не загружается.
5. Двум игрокам войти в один мир. Проверить близко/далеко, границы интерьеров/внешних ячеек. Несколько раз нажать **V** без F8: дальность/UI-Core-индикатор меняются вместе. Удержание переключает один раз. Проверить Numpad +/−, серверный lock. Кольцо следует за дальностью (наибольшее значение `voiceRanges.ranges` = полное кольцо, например 20 из 40 m = половина). Заглушить/включить микрофон TeamSpeak: руна и кольцо становятся оранжевыми и снова золотыми, и при lock. При речи они зелёные; печать не должна прыгать. Mute микрофона/звука, отключённые устройства не должны показывать речь (зелёный). Через `/UiEdit` двигать/масштабировать дальность/Metabolism; сохранённый layout остаётся. Rendering в UI-Core, данные в YACA `src/uiCoreAdapter.ts`.
6. Отключить TeamSpeak, войти на неверный сервер: полноэкранное предупреждение появляется. Правильно подключиться: исчезает. Один microphone-mute его не вызывает. Заменить картинку, перезапустить сервер, проверить. Меню Skyrim/Chat/смена сервера не оставляют залипший фокус.
7. Войти из Tamriel в ещё не загруженную таверну и вернуться. Даже при загрузке дольше 3 или 12 секунд существующее соединение TeamSpeak/YACA должно сохраняться. Во время загрузки прежний список слушателей не используется; после неё пространственная речь и статус продолжаются без повторного входа в канал. Также во время загрузки действительно отключить TeamSpeak либо перейти в исключённый канал: после возвращения появляется правильное предупреждение, а настоящее отключение по-прежнему автоматически переподключается.

PEX/квест не устанавливаются. Старые настройки/сохранения/gamemode остаются в копии. После серверного `mp.clear()` плагин регистрируется снова; сам его не вызывает.

<a id="bedienung-und-konfiguration"></a>
## Управление и конфигурация

| Настройка | Значение |
| --- | --- |
| `ui.toggleKey` | Стандарт `F8`: открыть/закрыть UI. Escape тоже закрывает. |
| `keyBinds.cycleVoiceRange` | Стандарт `V`: прямое переключение дальности. |
| `keyBinds.increaseVoiceRange` / `decreaseVoiceRange` | `ADD` / `SUBTRACT`: Numpad +/−, по фронту нажатия. |
| `voiceRanges.ranges` | 1–8 возрастающих дальностей в метрах, до 100 м. |
| `ui.connectionOverlay.imagePath` | Сменная картинка `assets/`, до 64 KiB. |
| `ui.connectionOverlay.imageUrl` | Необязательный HTTPS-адрес, приоритетный. |
| `ui.connectionOverlay.message` / `imageAlt` | Текст оператора/описание картинки. |
| `ui.connectionOverlay.backgroundOpacity` | Непрозрачность полноэкранного фона, 0.1–0.9. |
| `client.webSocketUrl` | `ws://127.0.0.1:30125/`, только loopback. Соединение на ПК каждого игрока. |
| `client.unitsPerMeter` | Пересчёт координат Skyrim; исходно 70, калибровать в игре. |
| `client.updateIntervalMs` | Позиционные пакеты, стандарт 250 мс. |

Mute микрофона/звука отражает настоящий статус плагина, меняется в TeamSpeak. Старый `pluginVersion` не навязывается; YACA проверяет версию и может вернуть `OUTDATED_VERSION`. `teamspeak.serverPassword` не передаётся другим игрокам, bridge не использует его для автоматического входа на TS-сервер.

Для расширений API сохраняет `setVoiceRangeChangeAllowed(actorId, false)`. Lock действует и на поддельные UI-команды; обычной установке расширение не требуется.

<a id="weitere-prüfung-und-paketbau"></a>
## Дальнейшие проверки и упаковка

```powershell
npm test
node tools/verify-fork-plugin.cjs D:/GitHub/skymp
node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core
node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core
./tools/package-local.ps1
```

Пакет создаётся в `artifacts/local-build-<Zeitstempel>/`. Скрипт не пишет в Git/не передаёт по сети. Возможен native-тест существующего addon:

```powershell
node tools/smoke-native.cjs D:/GitHub/skymp/build/dist/server/scam_native.node D:/GitHub/skymp/build/dist/server/data
node tools/verify-fork-plugin.cjs D:/GitHub/skymp --native
```

Нужны Skyrim-master, первая загрузка может занять минуты, рабочий каталог свой под `artifacts/`. Второй вызов ещё проверяет fork-loader/восстановление после gamemode-reload. Нативный клиент не собирается.

VAD-callback/открытый lipsync: [COMPATIBILITY.md](COMPATIBILITY.md).
