# SkyMP YACA TS (English | Deutsch | Русский)

---

## English

This repository contains a starter Papyrus bridge script for SkyMP that mirrors core ideas from the FiveM YaCA TypeScript resource:

- plugin state sync
- voice range management
- microphone and sound mute states
- radio state
- phone call state

### Files

- `skymp5-scripts/psc/YacaBridgeQuest.psc`: Papyrus source script compiled to `.pex`
- `tools/build-pex.ps1`: PowerShell helper that compiles all `.psc` files

### TeamSpeak plugin

- Official YaCA website and TeamSpeak plugin: https://yaca.systems

### Requirements

#### Skyrim / Creation Kit

- Skyrim Special Edition installation
- Creation Kit installation
- Papyrus compiler: `Papyrus Compiler/PapyrusCompiler.exe`
- Papyrus flags file: `Data/Source/Scripts/TESV_Papyrus_Flags.flg`

#### YaCA / TeamSpeak

- TeamSpeak client
- YaCA TeamSpeak plugin from https://yaca.systems
- Server-side bridge/events implementation to forward voice state into Papyrus

### Build `.pex`

Example (PowerShell):

```powershell
./tools/build-pex.ps1 `
  -PapyrusCompilerPath "C:/Path/To/Papyrus Compiler/PapyrusCompiler.exe" `
  -FlagsFilePath "C:/Path/To/Data/Source/Scripts/TESV_Papyrus_Flags.flg" `
  -InputDir "./skymp5-scripts/psc" `
  -OutputDir "./skymp5-scripts/pex" `
  -ImportPath "./skymp5-scripts/psc;C:/Path/To/Data/Source/Scripts"
```

### Integration with SkyMP server-side logic

1. Attach `YacaBridgeQuest` to a quest/form available on your server.
2. From your server runtime, call exposed Papyrus functions when voice state changes.
3. Keep authoritative state in your server and call `ApplySnapshot(...)` on reconnect.

### Suggested mapping from yaca-systems/fivem-yaca-typescript

- `setVoiceRange` -> `SetVoiceRange`
- `changeVoiceRange` -> `CycleVoiceRange`
- `setVoiceRangeChangeAllowedState` -> `SetVoiceRangeChangeAllowed`
- plugin state updates -> `SetPluginState`
- mute updates -> `SetMicrophoneMuted`, `SetSoundMuted`
- phone/radio modules -> `StartPhoneCall`, `StopPhoneCall`, `SetRadioState`

### Notes

- This repository currently provides a focused baseline, not the full YaCA feature set.
- The exact transport/event bridge in SkyMP depends on your server implementation (TypeScript/C++ addon side).
- This project is a major work in progress (WIP), and large parts are still under active development.
- There is still significant research work pending, especially around reliable lip sync support in SkyMP.

---

## Deutsch

Dieses Repository enthaelt ein Starter-Papyrus-Bridge-Skript fuer SkyMP, das sich an den Kernideen aus dem FiveM-YaCA-TypeScript-Resource orientiert:

- Synchronisierung des Plugin-Status
- Verwaltung der Sprachreichweite
- Mikrofon- und Sound-Mute-Zustaende
- Funk-Status
- Telefonanruf-Status

### Dateien

- `skymp5-scripts/psc/YacaBridgeQuest.psc`: Papyrus-Quellskript, das zu `.pex` kompiliert wird
- `tools/build-pex.ps1`: PowerShell-Helfer zum Kompilieren aller `.psc`-Dateien

### TeamSpeak-Plugin

- Offizielle YaCA-Webseite und TeamSpeak-Plugin: https://yaca.systems

### Voraussetzungen

#### Skyrim / Creation Kit

- Installation von Skyrim Special Edition
- Installation des Creation Kit
- Papyrus-Compiler: `Papyrus Compiler/PapyrusCompiler.exe`
- Papyrus-Flags-Datei: `Data/Source/Scripts/TESV_Papyrus_Flags.flg`

#### YaCA / TeamSpeak

- TeamSpeak-Client
- YaCA-TeamSpeak-Plugin von https://yaca.systems
- Serverseitige Bridge/Event-Implementierung, die Voice-Status nach Papyrus weiterleitet

### `.pex` bauen

Beispiel (PowerShell):

```powershell
./tools/build-pex.ps1 `
  -PapyrusCompilerPath "C:/Path/To/Papyrus Compiler/PapyrusCompiler.exe" `
  -FlagsFilePath "C:/Path/To/Data/Source/Scripts/TESV_Papyrus_Flags.flg" `
  -InputDir "./skymp5-scripts/psc" `
  -OutputDir "./skymp5-scripts/pex" `
  -ImportPath "./skymp5-scripts/psc;C:/Path/To/Data/Source/Scripts"
```

### Integration in die SkyMP-Serverlogik

1. `YacaBridgeQuest` an eine Quest/Form auf deinem Server binden.
2. Aus der Server-Runtime heraus die Papyrus-Funktionen bei Voice-Statusaenderungen aufrufen.
3. Autoritativen Zustand serverseitig halten und bei Reconnect `ApplySnapshot(...)` aufrufen.

### Vorgeschlagenes Mapping aus yaca-systems/fivem-yaca-typescript

- `setVoiceRange` -> `SetVoiceRange`
- `changeVoiceRange` -> `CycleVoiceRange`
- `setVoiceRangeChangeAllowedState` -> `SetVoiceRangeChangeAllowed`
- Plugin-Status-Updates -> `SetPluginState`
- Mute-Updates -> `SetMicrophoneMuted`, `SetSoundMuted`
- Telefon/Funk-Module -> `StartPhoneCall`, `StopPhoneCall`, `SetRadioState`

### Hinweise

- Dieses Repository liefert derzeit ein fokussiertes Grundgeruest, nicht den kompletten YaCA-Funktionsumfang.
- Die konkrete Transport-/Event-Bridge in SkyMP haengt von deiner Server-Implementierung ab (TypeScript/C++-Addon-Seite).
- Dieses Projekt ist ein grosses Work in Progress (WIP), und viele Teile sind noch aktiv in Entwicklung.
- Es ist noch viel Research noetig, insbesondere beim Thema zuverlaessiger Lip-Sync-Unterstuetzung in SkyMP.

---

## Русский

Этот репозиторий содержит стартовый Papyrus bridge-скрипт для SkyMP, который повторяет ключевые идеи ресурса FiveM YaCA TypeScript:

- синхронизация состояния плагина
- управление голосовой дальностью
- состояния mute для микрофона и звука
- состояние радио
- состояние телефонного звонка

### Файлы

- `skymp5-scripts/psc/YacaBridgeQuest.psc`: исходный Papyrus-скрипт, компилируемый в `.pex`
- `tools/build-pex.ps1`: PowerShell-скрипт для компиляции всех `.psc` файлов

### TeamSpeak плагин

- Официальный сайт YaCA и TeamSpeak плагин: https://yaca.systems

### Требования

#### Skyrim / Creation Kit

- Установленная Skyrim Special Edition
- Установленный Creation Kit
- Papyrus compiler: `Papyrus Compiler/PapyrusCompiler.exe`
- Файл флагов Papyrus: `Data/Source/Scripts/TESV_Papyrus_Flags.flg`

#### YaCA / TeamSpeak

- TeamSpeak client
- YaCA TeamSpeak plugin с сайта https://yaca.systems
- Серверная bridge/event-логика для передачи voice-состояния в Papyrus

### Сборка `.pex`

Пример (PowerShell):

```powershell
./tools/build-pex.ps1 `
  -PapyrusCompilerPath "C:/Path/To/Papyrus Compiler/PapyrusCompiler.exe" `
  -FlagsFilePath "C:/Path/To/Data/Source/Scripts/TESV_Papyrus_Flags.flg" `
  -InputDir "./skymp5-scripts/psc" `
  -OutputDir "./skymp5-scripts/pex" `
  -ImportPath "./skymp5-scripts/psc;C:/Path/To/Data/Source/Scripts"
```

### Интеграция с серверной логикой SkyMP

1. Привяжите `YacaBridgeQuest` к квесту/форме, доступной на сервере.
2. Из серверного рантайма вызывайте Papyrus-функции при изменениях voice-состояния.
3. Храните авторитативное состояние на сервере и при реконнекте вызывайте `ApplySnapshot(...)`.

### Рекомендуемое соответствие с yaca-systems/fivem-yaca-typescript

- `setVoiceRange` -> `SetVoiceRange`
- `changeVoiceRange` -> `CycleVoiceRange`
- `setVoiceRangeChangeAllowedState` -> `SetVoiceRangeChangeAllowed`
- обновления состояния плагина -> `SetPluginState`
- обновления mute -> `SetMicrophoneMuted`, `SetSoundMuted`
- модули телефона/радио -> `StartPhoneCall`, `StopPhoneCall`, `SetRadioState`

### Примечания

- Сейчас репозиторий даёт базовый каркас, а не полный функционал YaCA.
- Конкретная transport/event-bridge в SkyMP зависит от вашей серверной реализации (сторона TypeScript/C++ addon).
- Проект находится на ранней стадии и является большим WIP (work in progress).
- Предстоит ещё много research, особенно по теме стабильного lip sync в SkyMP.
