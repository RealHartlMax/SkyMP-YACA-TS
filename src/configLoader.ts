import { readFileSync } from "fs";
import { resolve } from "path";
import { YacaBridgeConfig } from "./types/config";

export const KEY_CODES: Readonly<Record<string, number>> = {
  ADD: 78, SUBTRACT: 74, N: 49, CAPITAL: 58, B: 48,
  F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88,
  V: 47, O: 24, P: 25, R: 19, T: 20, M: 50,
};

export function loadConfig(filename = resolve(__dirname, "../config.json")): YacaBridgeConfig {
  return validateConfig(JSON.parse(readFileSync(filename, "utf8")));
}

export function validateConfig(input: unknown): YacaBridgeConfig {
  const fail = (message: string): never => { throw new Error(`[YacaBridge] config.json: ${message}`); };
  const record = (v: unknown): Record<string, any> => v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, any> : fail("expected a configuration object");
  const root = record(input);
  const teamspeak = record(root.teamspeak);
  const yaca = record(root.yaca);
  const voiceRanges = record(root.voiceRanges);
  const keyBinds: Record<string, any> = { cycleVoiceRange: "V", ...record(root.keyBinds) };
  const client = { webSocketUrl: "ws://127.0.0.1:30125/", updateIntervalMs: 250, unitsPerMeter: 70, ...root.client };
  const ui = { title: "SkyMP Voice", toggleKey: "F8", ...root.ui };
  const connectionOverlay = {
    imagePath: "assets/voice-required.svg", imageUrl: "", imageAlt: "Schwebender Seelenkristall",
    message: "Verbinde dich mit dem TeamSpeak dieser Spielwelt, um die Stimmen der anderen zu hören.",
    backgroundOpacity: 0.68, ...ui.connectionOverlay,
  };
  if (typeof teamspeak.serverUrl !== "string" || !teamspeak.serverUrl.trim()) fail("teamspeak.serverUrl is required");
  if (!Number.isInteger(teamspeak.serverPort) || teamspeak.serverPort < 1 || teamspeak.serverPort > 65535) fail("teamspeak.serverPort must be 1..65535");
  if (typeof yaca.uniqueServerId !== "string" || !yaca.uniqueServerId.trim() || yaca.uniqueServerId === "YOUR_UNIQUE_SERVER_ID") fail("yaca.uniqueServerId must be the real TeamSpeak server UID");
  const defaultChannelId = yaca.defaultChannelId ?? 1;
  if (![defaultChannelId, yaca.ingameChannelId].every(v => Number.isSafeInteger(v) && v > 0)) fail("yaca channel IDs must be positive integers");
  if (defaultChannelId === yaca.ingameChannelId) fail("yaca.defaultChannelId and ingameChannelId must differ");
  if (typeof yaca.useWhisper !== "boolean") fail("yaca.useWhisper must be boolean");
  const excludeChannels = yaca.excludeChannels ?? [];
  if (!Array.isArray(excludeChannels) || !excludeChannels.every(v => Number.isSafeInteger(v) && v > 0)) fail("yaca.excludeChannels must contain positive channel IDs");
  const password = yaca.ingameChannelPassword ?? teamspeak.ingameChannelPassword ?? "";
  if (typeof password !== "string") fail("yaca.ingameChannelPassword must be a string");
  const ranges = voiceRanges.ranges;
  if (!Array.isArray(ranges) || ranges.length < 1 || ranges.length > 8 ||
      !ranges.every((v, i) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100 && (i === 0 || v > ranges[i - 1]))) fail("voiceRanges.ranges must contain 1..8 increasing, finite distances in meters (0..100]");
  if (!Number.isInteger(voiceRanges.defaultIndex) || voiceRanges.defaultIndex < 0 || voiceRanges.defaultIndex >= ranges.length) fail("voiceRanges.defaultIndex is outside ranges");
  const bindings = [keyBinds.cycleVoiceRange, keyBinds.increaseVoiceRange, keyBinds.decreaseVoiceRange, ui.toggleKey];
  if (!bindings.every(k => typeof k === "string" && Object.prototype.hasOwnProperty.call(KEY_CODES, k))) fail(`unsupported key binding; allowed: ${Object.keys(KEY_CODES).join(", ")}`);
  if (new Set(bindings).size !== bindings.length) fail("key bindings must be distinct");
  if (typeof ui.title !== "string" || !ui.title.trim() || ui.title.length > 60) fail("ui.title must contain 1..60 characters");
  if (typeof connectionOverlay.imagePath !== "string" || !/^assets\/[a-zA-Z0-9_./-]+\.(svg|png|jpe?g|webp)$/.test(connectionOverlay.imagePath) || connectionOverlay.imagePath.split("/").includes("..")) fail("ui.connectionOverlay.imagePath must name an SVG/PNG/JPEG/WebP inside assets/");
  if (typeof connectionOverlay.imageUrl !== "string" || connectionOverlay.imageUrl.length > 2048) fail("ui.connectionOverlay.imageUrl must be an HTTPS URL or empty");
  if (connectionOverlay.imageUrl) {
    try {
      const imageUrl = new URL(connectionOverlay.imageUrl);
      if (imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password) fail("ui.connectionOverlay.imageUrl must use HTTPS without credentials");
    } catch { fail("ui.connectionOverlay.imageUrl must be a valid HTTPS URL"); }
  }
  if (typeof connectionOverlay.imageAlt !== "string" || connectionOverlay.imageAlt.length > 160 || typeof connectionOverlay.message !== "string" || connectionOverlay.message.length > 512) fail("ui.connectionOverlay imageAlt/message are too long or invalid");
  if (typeof connectionOverlay.backgroundOpacity !== "number" || !Number.isFinite(connectionOverlay.backgroundOpacity) || connectionOverlay.backgroundOpacity < 0.1 || connectionOverlay.backgroundOpacity > 0.9) fail("ui.connectionOverlay.backgroundOpacity must be 0.1..0.9");
  let url: URL;
  try { url = new URL(client.webSocketUrl); } catch { return fail("client.webSocketUrl is invalid"); }
  if (url.protocol !== "ws:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password) fail("client.webSocketUrl must use ws:// and a loopback host");
  if (!Number.isInteger(client.updateIntervalMs) || client.updateIntervalMs < 100 || client.updateIntervalMs > 1000) fail("client.updateIntervalMs must be 100..1000");
  if (typeof client.unitsPerMeter !== "number" || !Number.isFinite(client.unitsPerMeter) || client.unitsPerMeter <= 0) fail("client.unitsPerMeter must be positive and finite");
  return {
    teamspeak: { ...teamspeak } as YacaBridgeConfig["teamspeak"],
    yaca: { uniqueServerId: yaca.uniqueServerId, ingameChannelId: yaca.ingameChannelId, defaultChannelId,
      ingameChannelPassword: password, useWhisper: yaca.useWhisper, excludeChannels: [...excludeChannels] },
    voiceRanges: { ranges: [...ranges], defaultIndex: voiceRanges.defaultIndex },
    // Old radio settings are deliberately dropped when an existing config is reused.
    keyBinds: { cycleVoiceRange: keyBinds.cycleVoiceRange, increaseVoiceRange: keyBinds.increaseVoiceRange,
      decreaseVoiceRange: keyBinds.decreaseVoiceRange }, client, ui: { ...ui, connectionOverlay },
  };
}
