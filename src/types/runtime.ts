export const PLUGIN_STATES = [
  "NOT_CONNECTED", "CONNECTED", "OUTDATED_VERSION", "WRONG_TS_SERVER",
  "IN_INGAME_CHANNEL", "IN_EXCLUDED_CHANNEL",
] as const;
export type PluginState = typeof PLUGIN_STATES[number];
export interface VoiceState {
  actorId: number;
  pluginState: PluginState;
  clientId: number | null;
  talking: boolean;
  microphoneMuted: boolean;
  microphoneDisabled: boolean;
  soundMuted: boolean;
  soundDisabled: boolean;
  rangeIndex: number;
  rangeChangeAllowed: boolean;
  radioEnabled: boolean;
  primaryChannel: number;
  secondaryChannel: number | null;
  transmitting: number | null;
}
export interface PeerState {
  actorId: number;
  clientId: number | null;
  voiceRange: number;
  radioEnabled: boolean;
  primaryChannel: number;
  secondaryChannel: number | null;
  transmitting: number | null;
}
export interface SkyMpRuntime {
  makeProperty(name: string, options: {
    isVisibleByOwner: boolean; isVisibleByNeighbors: boolean;
    updateOwner: string; updateNeighbor: string;
  }): void;
  makeEventSource(name: string, body: string): void;
  get(actorId: number, property: string): unknown;
  set(actorId: number, property: string, value: unknown): void;
  [eventName: string]: unknown;
}
