import { readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { loadConfig, validateConfig } from "./configLoader";
import { buildClientSources } from "./clientSources";
import { YacaBridgeConfig } from "./types/config";
import { PLUGIN_STATES, PluginState, VoiceState, PeerState, SkyMpRuntime } from "./types/runtime";

export const OWNER_PROPERTY = "yacaOwner";
export const PEER_PROPERTY = "yacaPeer";
export const CLIENT_EVENT = "_yacaClient";

export interface VoiceActivity {
  actorId: string;
  isSpeaking: boolean;
  voiceRange: number;
}

export interface BridgeOptions {
  runtime?: SkyMpRuntime;
  config?: YacaBridgeConfig;
  configPath?: string;
  overlaySource?: string;
  onVoiceActivity?: (state: VoiceActivity) => void;
}

interface Session {
  state: VoiceState;
  seenAt: number;
  bucketStart: number;
  events: number;
}

const installed = new WeakMap<object, { dispose(): void }>();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isChannel = (value: unknown, count: number): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < count;
const connected = (state: VoiceState): boolean =>
  state.clientId !== null && state.pluginState === "IN_INGAME_CHANNEL";

/** Register through the plugin entry or explicitly from a host gamemode. */
export function initYacaBridge(options: BridgeOptions = {}) {
  const globals = globalThis as typeof globalThis & {
    mp?: SkyMpRuntime;
  };
  const mp = options.runtime ?? globals.mp;
  for (const name of ["makeProperty", "makeEventSource", "get", "set"] as const) {
    if (!mp || typeof mp[name] !== "function") {
      throw new Error(`[YacaBridge] SkyMP runtime mp.${name} is required. Enable the server plugin; use npm run preview for the UI.`);
    }
  }
  const runtime = mp!;
  const config = options.config ? validateConfig(options.config) : loadConfig(options.configPath);
  const overlay = options.overlaySource ?? readFileSync(resolve(__dirname, "ui/overlay.js"), "utf8");
  const sources = buildClientSources(overlay, config);
  const bridgeId = randomUUID();
  const sessions = new Map<number, Session>();
  // The fork's current lip-sync path still has unit and form-ID mapping issues.
  // Hosts can opt into their own VAD adapter through this callback.
  const activity = options.onVoiceActivity ?? (() => {});
  let disposed = false;
  let revision = 0;
  installed.get(runtime)?.dispose();

  const voiceRange = (state: VoiceState) => config.voiceRanges.ranges[state.rangeIndex];
  const notifyActivity = (state: VoiceState) => activity({
    actorId: String(state.actorId),
    isSpeaking: connected(state) && state.talking && !state.microphoneMuted &&
      !state.microphoneDisabled && !state.soundMuted && !state.soundDisabled,
    voiceRange: voiceRange(state),
  });
  const peer = (state: VoiceState): PeerState => ({
    actorId: state.actorId,
    clientId: connected(state) ? state.clientId : null,
    voiceRange: voiceRange(state),
    radioEnabled: connected(state) && state.radioEnabled,
    primaryChannel: state.primaryChannel,
    secondaryChannel: state.secondaryChannel,
    transmitting: connected(state) && !state.microphoneMuted && !state.microphoneDisabled
      ? state.transmitting : null,
  });
  const clientConfig = {
    teamspeak: { serverUrl: config.teamspeak.serverUrl, serverPort: config.teamspeak.serverPort },
    yaca: config.yaca, voiceRanges: config.voiceRanges, radio: config.radio,
    client: config.client, ui: config.ui, keyBinds: config.keyBinds,
  };
  const publish = (all = false, actorId?: number) => {
    const roster = [...sessions.values()].map(s => peer(s.state)).filter(p => p.clientId !== null);
    for (const [id, session] of sessions) {
      if (!all && id !== actorId) continue;
      runtime.set(id, OWNER_PROPERTY, { bridgeId, revision: ++revision, config: clientConfig, state: session.state, roster });
    }
  };
  const prune = (now: number) => {
    let removed = false;
    for (const [id, session] of sessions) {
      if (now - session.seenAt <= 12000) continue;
      sessions.delete(id);
      notifyActivity({ ...session.state, talking: false });
      try { runtime.set(id, PEER_PROPERTY, null); } catch { /* Actor may already be gone. */ }
      removed = true;
    }
    return removed;
  };

  const handler = (actorId: number, payload: unknown) => {
    if (disposed || !Number.isInteger(actorId) || actorId <= 0 || actorId > 0xffffffff || !isRecord(payload)) return;
    const now = Date.now();
    const removed = prune(now);
    let session = sessions.get(actorId);
    if (payload.type === "ready" && !session) {
      session = {
        state: {
          actorId, pluginState: "NOT_CONNECTED", clientId: null, talking: false,
          microphoneMuted: false, microphoneDisabled: false, soundMuted: false, soundDisabled: false,
          rangeIndex: config.voiceRanges.defaultIndex, rangeChangeAllowed: true,
          radioEnabled: false, primaryChannel: config.radio.defaultChannel,
          secondaryChannel: config.radio.secondaryChannel, transmitting: null,
        },
        seenAt: now, bucketStart: now, events: 0,
      };
      sessions.set(actorId, session);
    }
    if (!session) return;
    if (now - session.bucketStart >= 1000) { session.bucketStart = now; session.events = 0; }
    if (++session.events > 30) return;
    session.seenAt = now;
    const state = session.state;
    const before = JSON.stringify(peer(state));
    if (payload.type === "ready") {
      runtime.set(actorId, PEER_PROPERTY, peer(state));
      publish(removed, actorId);
      return;
    }
    if (payload.type === "report") {
      if (typeof payload.pluginState !== "string" || !PLUGIN_STATES.includes(payload.pluginState as PluginState) ||
          !["talking", "microphoneMuted", "microphoneDisabled", "soundMuted", "soundDisabled"].every(k => typeof payload[k] === "boolean")) return;
      const clientId = payload.clientId;
      if (clientId !== null && (!Number.isInteger(clientId) || Number(clientId) < 1 || Number(clientId) > 65535)) return;
      // The native event source supplies actorId. Never trust one in the payload.
      if (clientId !== null && [...sessions.values()].some(s => s !== session && s.state.clientId === clientId)) return;
      state.pluginState = payload.pluginState as PluginState;
      state.clientId = state.pluginState === "NOT_CONNECTED" ? null : clientId as number | null;
      state.talking = connected(state) && payload.talking === true;
      for (const key of ["microphoneMuted", "microphoneDisabled", "soundMuted", "soundDisabled"] as const) state[key] = payload[key] as boolean;
      if (!connected(state)) state.transmitting = null;
    } else if (payload.type === "action") {
      if (payload.action === "range" && state.rangeChangeAllowed && Number.isInteger(payload.value) &&
          Number(payload.value) >= 0 && Number(payload.value) < config.voiceRanges.ranges.length) {
        state.rangeIndex = payload.value as number;
      } else if (payload.action === "radioEnabled" && typeof payload.value === "boolean") {
        state.radioEnabled = payload.value;
        if (!state.radioEnabled) state.transmitting = null;
      } else if (payload.action === "primaryChannel" && isChannel(payload.value, config.radio.maxChannels)) {
        state.primaryChannel = payload.value;
        state.transmitting = null;
      } else if (payload.action === "secondaryChannel" && (payload.value === null || isChannel(payload.value, config.radio.maxChannels))) {
        state.secondaryChannel = payload.value;
        state.transmitting = null;
      } else if (payload.action === "transmit" && (payload.value === null ||
          (state.radioEnabled && connected(state) && (payload.value === state.primaryChannel || payload.value === state.secondaryChannel)))) {
        state.transmitting = payload.value as number | null;
      } else return;
    } else return;
    const after = JSON.stringify(peer(state));
    if (after !== before) runtime.set(actorId, PEER_PROPERTY, peer(state));
    publish(removed || after !== before, actorId);
    notifyActivity(state);
  };

  runtime.makeProperty(OWNER_PROPERTY, {
    isVisibleByOwner: true, isVisibleByNeighbors: false,
    updateOwner: sources.owner, updateNeighbor: "",
  });
  runtime.makeProperty(PEER_PROPERTY, {
    isVisibleByOwner: true, isVisibleByNeighbors: true,
    updateOwner: "", updateNeighbor: sources.neighbor,
  });
  const previousHandler = runtime[CLIENT_EVENT];
  runtime[CLIENT_EVENT] = handler;
  runtime.makeEventSource(CLIENT_EVENT, sources.events);

  const controller = {
    setVoiceRangeChangeAllowed(actorId: number, allowed: boolean) {
      const session = sessions.get(actorId);
      if (!session || disposed || typeof allowed !== "boolean") return;
      session.state.rangeChangeAllowed = allowed;
      publish(false, actorId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [id, session] of sessions) {
        try {
          runtime.set(id, OWNER_PROPERTY, { bridgeId, revision: ++revision, disabled: true,
            config: clientConfig, state: session.state, roster: [] });
          runtime.set(id, PEER_PROPERTY, null);
        } catch { /* The host may have destroyed the actor already. */ }
      }
      if (runtime[CLIENT_EVENT] === handler) runtime[CLIENT_EVENT] = previousHandler;
      for (const session of sessions.values()) notifyActivity({ ...session.state, talking: false });
      sessions.clear();
      // The host owns other properties/events. Never call mp.clear() here.
    },
  };
  installed.set(runtime, controller);
  console.log(`[YacaBridge] Registered SkyMP properties, events and overlay (${config.voiceRanges.ranges.length} voice ranges).`);
  return controller;
}
