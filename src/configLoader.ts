import * as fs from "fs";
import * as path from "path";
import { YacaBridgeConfig } from "./types/config";

const CONFIG_PATH = path.resolve(__dirname, "../config.json");

export function loadConfig(): YacaBridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`[YacaBridge] config.json not found at: ${CONFIG_PATH}`);
  }

  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config: YacaBridgeConfig = JSON.parse(raw);

  validateConfig(config);

  return config;
}

function validateConfig(config: YacaBridgeConfig): void {
  if (!config.teamspeak?.serverUrl) {
    throw new Error("[YacaBridge] config.json: teamspeak.serverUrl is required");
  }
  if (!config.yaca?.uniqueServerId || config.yaca.uniqueServerId === "YOUR_UNIQUE_SERVER_ID") {
    throw new Error("[YacaBridge] config.json: yaca.uniqueServerId must be set to a real server ID");
  }
  if (!Array.isArray(config.voiceRanges?.ranges) || config.voiceRanges.ranges.length === 0) {
    throw new Error("[YacaBridge] config.json: voiceRanges.ranges must be a non-empty array");
  }
  const maxIndex = config.voiceRanges.ranges.length - 1;
  if (config.voiceRanges.defaultIndex < 0 || config.voiceRanges.defaultIndex > maxIndex) {
    throw new Error(`[YacaBridge] config.json: voiceRanges.defaultIndex must be between 0 and ${maxIndex}`);
  }
}
