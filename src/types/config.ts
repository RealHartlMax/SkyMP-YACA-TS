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
  keyBinds: {
    cycleVoiceRange: string;
    increaseVoiceRange: string;
    decreaseVoiceRange: string;
  };
  client: { webSocketUrl: string; updateIntervalMs: number; unitsPerMeter: number };
  ui: {
    title: string;
    toggleKey: string;
    connectionOverlay: {
      imagePath: string;
      imageUrl: string;
      imageAlt: string;
      message: string;
      backgroundOpacity: number;
    };
  };
}
