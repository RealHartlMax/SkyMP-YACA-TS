import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./configLoader";

declare const mp: {
  setPropertyValue: (scriptName: string, propertyName: string, value: unknown) => void;
  callPapyrusMethod: (scriptName: string, methodName: string, args: unknown[]) => void;
};

function assertRequiredRuntimeFiles(): void {
  const requiredPaths = [
    path.resolve(process.cwd(), "skymp5-scripts/pex/YacaBridgeQuest.pex"),
    path.resolve(__dirname, "../skymp5-scripts/pex/YacaBridgeQuest.pex"),
  ];

  const pexPath = requiredPaths.find((candidate) => fs.existsSync(candidate));
  if (!pexPath) {
    throw new Error(
      "[YacaBridge] Required file missing: skymp5-scripts/pex/YacaBridgeQuest.pex. " +
      "Compile Papyrus and verify deployment paths before starting the server."
    );
  }
}

/**
 * Applies config.json values to the YacaBridgeQuest Papyrus properties
 * via SkyMP's mp.callPapyrusMethod / mp.setPropertyValue API.
 *
 * Call this once on server startup, e.g. in your main entry point.
 */
export function initYacaBridge(): void {
  assertRequiredRuntimeFiles();
  const config = loadConfig();

  const { ranges, defaultIndex } = config.voiceRanges;

  // Push all 8 voice range stages into the quest
  for (let i = 0; i < ranges.length; i++) {
    mp.setPropertyValue("YacaBridgeQuest", `VoiceRangeStage${i}`, ranges[i]);
  }
  mp.setPropertyValue("YacaBridgeQuest", "VoiceRangeCount", ranges.length);
  mp.setPropertyValue("YacaBridgeQuest", "VoiceRangeIndex", defaultIndex);
  mp.setPropertyValue("YacaBridgeQuest", "VoiceRange", ranges[defaultIndex]);

  // Key binds
  mp.setPropertyValue("YacaBridgeQuest", "KeyIncreaseRange", config.keyBinds.increaseVoiceRange);
  mp.setPropertyValue("YacaBridgeQuest", "KeyDecreaseRange", config.keyBinds.decreaseVoiceRange);
  mp.setPropertyValue("YacaBridgeQuest", "KeyRadioPrimary", config.keyBinds.primaryRadioTransmit);
  mp.setPropertyValue("YacaBridgeQuest", "KeyRadioSecondary", config.keyBinds.secondaryRadioTransmit);
  mp.setPropertyValue("YacaBridgeQuest", "KeyMegaphone", config.keyBinds.megaphone);
  mp.callPapyrusMethod("YacaBridgeQuest", "RefreshKeyBindings", []);

  // Radio defaults
  mp.setPropertyValue("YacaBridgeQuest", "RadioChannel", config.radio.defaultChannel);

  console.log(
    `[YacaBridge] Initialized — TS: ${config.teamspeak.serverUrl}:${config.teamspeak.serverPort}` +
    ` | ServerId: ${config.yaca.uniqueServerId}` +
    ` | VoiceRange: ${ranges[defaultIndex]}m (index ${defaultIndex}/${ranges.length - 1})` +
    ` | Keys: +=${config.keyBinds.increaseVoiceRange} -=${config.keyBinds.decreaseVoiceRange}`
  );
}
