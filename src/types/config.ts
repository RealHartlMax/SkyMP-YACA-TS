export interface YacaBridgeConfig {
  teamspeak: {
    serverUrl: string;
    serverPort: number;
    serverPassword?: string;
    defaultChannel?: string;
    ingameChannel?: string;
    ingameChannelPassword?: string;
  };
  yaca: {
    uniqueServerId: string;
    ingameChannelId: number;
    defaultChannelId: number;
    ingameChannelPassword: string;
    useWhisper: boolean;
    excludeChannels: number[];
    pluginVersion?: string;
  };
  voiceRanges: { ranges: number[]; defaultIndex: number };
  radio: { defaultChannel: number; maxChannels: number; secondaryChannel: number | null };
  keyBinds: {
    increaseVoiceRange: string;
    decreaseVoiceRange: string;
    primaryRadioTransmit: string;
    secondaryRadioTransmit: string;
    megaphone?: string;
  };
  client: { webSocketUrl: string; updateIntervalMs: number; unitsPerMeter: number };
  ui: { title: string; toggleKey: string };
}
