<a id="prüfung-und-lokaler-teststand"></a>
# Проверка и локальный тестовый статус

Обновлено 28.10.2026 относительно локальных `D:\GitHub\skymp` и `D:\GitHub\SkyMP-UI-Core`. Приоритет у хешей текущих результатов; изменения находятся локально в рабочем дереве.

<a id="ergebnis"></a>
## Результат

Прежний bridge не работал с настоящим server-API. Новая реализация регистрирует properties/client-event-source, даёт самостоятельный overlay существующему SkyrimPlatform-фронтенду, соединяет локальный браузер с YACA. Реальная передача речи TeamSpeak и поведение Skyrim требуют игры.

| Область | Прежний вывод | Текущее состояние |
| --- | --- | --- |
| Server-API | `mp.setPropertyValue`, `mp.callPapyrusMethod` отсутствуют. | `mp.makeProperty`, `mp.makeEventSource`, `mp.get`/`mp.set`; регистрация проверена нативно. |
| Papyrus | Quest ведёт значения/логи, транспорта нет, helper `GetKeyCode` отсутствует. | Новый путь не требует quest/ESP/PEX. Старые Papyrus не устанавливаются. |
| Старт | `node dist/yacaBridge.js` лишь экспортировал функцию. | Manifest-плагин `Plugins/skymp-yaca-ts/`, entry `server.js`, автоматический старт. `npm start` исходного пакета запускает preview. |
| Плагин | Нет WebSocket/INIT/JOIN/player-mapping. | Локальный WebSocket, INIT, JOIN-ID, канал/речь/mute, reconnect. |
| Пространственная речь | Нет передачи позиций. | INGAME-список в метрах, направление actor, истечение соседей. Интерьеры разделены, соседние внешние ячейки одного worldspace связаны. |
| Дальность | Меню/Numpad. | V переключает прямо; следующий index рассчитывает сервер по своему state. Быстрым нажатиям не нужен уже вернувшийся snapshot. Lock действует на клавиши/UI. |
| Радио | Ранее основной/второй канал/PTT. | Убрано для fantasy: нет каналов/PTT/громкости/участников/`comm_device`. Старые config-поля отбрасываются, неустановленный Papyrus вне runtime. |
| UI | Свой HUD/меню. | Постоянная дальность через status-template UI-Core API v1. F8/полноэкранный notice в том же CEF, без второго HUD. |
| Notice | Маленький статус меню. | Полупрозрачный полный экран до подтверждения игрового канала/client-ID; сменная картинка, текст/opacity, без фокуса. |
| Идентичность | Нет надёжной связи. | Сервер использует actor-ID native-event-source, browser actor-ID игнорируется. Client-ID плагина остаётся самодекларацией клиента. |
| Установка | Первый тест требовал ручной вызов gamemode. | Каталог, config, включение, server-restart. Правок server/gamemode нет. |

<a id="plugin-lader"></a>
## Загрузчик плагинов

Fork обнаруживает прямые подкаталоги `Plugins/` через `plugin.json`. `kind: "gamemode"`. Новые плагины сначала отключены; пакет не поставляет discovery-state и сам не включается.

До `require()` entry копируется во временный каталог. Поэтому `server.js` содержит свои модули/UI, а config/картинку `assets/` находит по уникальному manifest-name. Runtime использует только Node-builtins, без дополнительных npm.

Fork загружает плагины при boot, но пока не после gamemode-reload. Поэтому плагин устанавливает forwarding `clear()` на runtime-instance и следующим event-loop повторно регистрирует лишь свои properties/source. Несколько синхронных clear объединяются. Native-prototype/server-файлы не меняются. Client-source при первом frame переустанавливает versioned-UI; старый heartbeat не мешает переходу, старый радио-UI останавливается/заменяется. Оригинальный `clear()` вызывается с прежними аргументами/результатом; stop возвращает исходное instance-свойство.

<a id="quellen-des-abgleichs"></a>
## Источники сверки

Внешний UI служил функциональным образцом уведомлений. Его Vue-компоненты, картинки, шрифты не копировались.

- [FiveM-YACA, commit 6d766a0](https://github.com/yaca-systems/fivem-yaca-typescript/tree/6d766a041671e0e76b3b63a31d068f21c8ded956)
- [INIT/ответы](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/apps/yaca-client/src/yaca/main.ts)
- [Локальный WebSocket-port](https://github.com/yaca-systems/fivem-yaca-typescript/blob/6d766a041671e0e76b3b63a31d068f21c8ded956/assets/yaca-voice/web/script.js)
- [YACA-UI, commit 85d6032](https://github.com/yaca-systems/yaca-ui/tree/85d6032d7f0a2950bb27f56432ca68624bf2b389)
- [Обратный framework-канал UI](https://github.com/yaca-systems/yaca-ui/blob/85d6032d7f0a2950bb27f56432ca68624bf2b389/yaca-ui/src/services/game-service.ts)

Важные места локального fork:

- `skymp5-server/cpp/addon/ScampServer.cpp`: native-API, предел 100 KiB client-code-body.
- `skymp5-client/src/services/services/gamemodeEventSourceService.ts`: native-source, `ctx.sendEvent`, истечение старых контекстов.
- `skymp5-client/src/services/services/gamemodeUpdateService.ts`: owner/neighbor на frame.
- `docs/skyrim_platform/browser.md`: browser-API/обратный канал.
- `skymp5-server/ts/index.ts`: прежняя необязательная раздача voice-activity.

<a id="grenzen-im-aktuellen-fork"></a>
## Ограничения текущего fork

Дальности нужен UI Core на сервере **и** подходящий client/CEF. YACA использует только public v1 `registerWidget`, `updateWidget`, `setWidgetVisible`, `unregisterWidget`, `getStatus`; получатель — native actor-ID. Widget `skymp-yaca-ts:voice-range`. Без совместимого UI Core voice/notice/keys работают, индикатор ждёт с одной диагностикой; service проверяется при следующих state. Изменения UI-Core не нужны.

Локальные картинки при старте читаются ограниченным data-URL и передаются в private-owner-state, вне сгенерированного client-code-body. Предел 100 KiB независим от картинки; большие могут использовать HTTPS.

Успешный `OK`/`JOIN` подтверждает начальный вход/client-ID. Overlay дополнительно `MOVED_CHANNEL` не ждёт; сообщение управляет поздними переходами. JOIN-ID принимает число/числовую строку. Прежнее дополнительное условие могло оставлять «подключение голоса» при успешном автоматическом входе.

UI-Core-адаптер объединяет одинаковые status и задаёт visibility лишь при первом/повторном показе, не расходуя два updates общего бюджета на heartbeat. API-ошибка пишет вызов/ограниченный текст; поздние изменения повторяют update.

Lipsync по умолчанию выключен. `onVoiceActivity` опционально передаёт серверную привязку говорящего для своей интеграции. До надёжного lipsync исправить и проверить в игре:

1. `skymp5-server/ts/index.ts`, выбор получателей: `getActorPos` даёт Skyrim-координаты, расстояние прямо сравнивается с метрическими `voiceRange`/`proximityDistance`. Единого пересчёта нет. Новые позиции используют `client.unitsPerMeter`, исходно 70, калибровать.
2. `skymp5-client/src/sync/voiceActivitySync.ts`: server actor-ID прямо передан `Game.getFormEx`, существующий server→local-пересчёт не используется.
3. `YacaTeamSpeakAdapter.ts`: повторный `true` снова увеличивает счётчик; `initialize()` не регистрирует транспорт. Idle-timeout менеджера 1000 мс также согласовать с частотой.

Bridge автоматически не использует ошибочный CustomPacket-путь. В пакете нет изменений `D:\GitHub\skymp`/новых Skyrim/SKSE-DLL.

<a id="umfang-des-lokalen-nachweises"></a>
## Объём локальных доказательств

- TS-build/regression: config, protocol, owner/neighbor, input, range-lock, метры, разделение пространств, key-edge, истечение source.
- Видимый Chromium: desktop и 375 px; настоящий local-WebSocket с имитацией YACA: INIT/JOIN, речь/mute, каналы, дальность/lock, позиции без радио, wrong-server, reconnect, Escape/cleanup. Browser-ошибок нет.
- Существующий fork-addon `build/dist/server/scam_native.node`: properties/source, test-actor, дальность/gamemode-reload через настоящие actor-properties, cleanup. Старый server-процесс не меняется: отдельный процесс, динамический loopback-port, свой CWD.
- Настоящие неизменённые manifest/discovery/activation/`requireTemp` из TS проверяются в изолированном серверном каталоге: initial-disabled, включение state, переименованные каталоги, повторный entry, reload, неизменные gamemode-файлы. Используются status-fixtures, не dashboard; optional native-run добавляет настоящий addon.
- `node tools/verify-ui-core.cjs D:/GitHub/SkyMP-UI-Core`: настоящий service/frame-validator. Identity/transport — fixtures, не игра.
- `node tools/verify-native-ui-core.cjs D:/GitHub/SkyMP-UI-Core`: оба bundle через настоящий fork-loader. Два native-bot проверяют identity, CustomEvent, приватность, range-lock, восстановление после `mp.clear()`. YACA/UI-Core warnings не было. Skyrim не запускается.

Машиночитаемые результаты при локальной упаковке включаются в `validation/`, если существуют. Имитация не доказывает настоящее аудио, TeamSpeak-лицензирование, CEF в Skyrim или multiplayer.

Телефон, мегафон, GTA/RedM-акустика, вода/occlusion, автоматические губы, радио/каналы не реализованы.
