export interface TeamSpeakConfig {
  serverUrl: string;
  serverPort: number;
  serverPassword: string;
  defaultChannel: string;
  ingameChannel: string;
  ingameChannelPassword: string;
}

export interface YacaConfig {
  pluginVersion: string;
  uniqueServerId: string;
  ingameChannelId: number;
  useWhisper: boolean;
}

export interface VoiceRangeConfig {
  ranges: number[];
  defaultIndex: number;
}

export interface RadioConfig {
  defaultChannel: number;
  maxChannels: number;
}

export interface KeyBindsConfig {
  increaseVoiceRange: string;
  decreaseVoiceRange: string;
  primaryRadioTransmit: string;
  secondaryRadioTransmit: string;
  megaphone: string;
}

export interface YacaBridgeConfig {
  teamspeak: TeamSpeakConfig;
  yaca: YacaConfig;
  voiceRanges: VoiceRangeConfig;
  radio: RadioConfig;
  keyBinds: KeyBindsConfig;
}
