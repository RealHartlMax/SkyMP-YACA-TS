import { VoiceState } from "./types/runtime";
import { YacaBridgeConfig } from "./types/config";

// Structural subset of SkyMP-UI-Core/shared/contracts.ts, public API v1.
// Keeping this contract local avoids a runtime dependency or changes to UI Core.
export interface VoiceUiApi {
  readonly apiVersion: number;
  getStatus(): { ready: boolean; frontendProtocol: number };
  registerWidget(definition: {
    id: string; owner: string; kind: "status"; schemaVersion: 1;
    defaultPosition: "bottom-right"; defaultVisible: boolean;
  }): void;
  updateWidget(target: { actorId: number }, id: string, state: {
    schemaVersion: 1; label: string; value: string; text: string; tone: "info" | "success" | "warning";
  }): void;
  setWidgetVisible(target: { actorId: number }, id: string, visible: boolean): void;
  unregisterWidget(owner: string, id: string): void;
}

export const VOICE_WIDGET = "skymp-yaca-ts:voice-range";
const OWNER = "skymp-yaca-ts";

export function createVoiceUi(config: YacaBridgeConfig, provider: () => VoiceUiApi | undefined =
  () => (globalThis as typeof globalThis & { skympUi?: VoiceUiApi }).skympUi) {
  let api: VoiceUiApi | undefined;
  let warned = false;
  const published = new Map<number, { signature: string; at: number }>();
  const warn = (message: string) => {
    if (!warned) { console.warn("[YacaBridge] UI Core: " + message); warned = true; }
  };
  return {
    update(state: VoiceState) {
      let operation = "getStatus";
      try {
        // Resolve on updates too: UI Core may start after this plugin.
        const candidate = provider();
        if (!candidate || candidate.apiVersion !== 1 || candidate.getStatus().frontendProtocol !== 1 || !candidate.getStatus().ready) {
          warn("Sprachreichweitenanzeige wartet auf skymp-ui-core API/Frontend v1.");
          return;
        }
        if (api !== candidate) {
          operation = "registerWidget";
          candidate.registerWidget({ id: VOICE_WIDGET, owner: OWNER, kind: "status", schemaVersion: 1,
            defaultPosition: "bottom-right", defaultVisible: true });
          api = candidate;
          published.clear();
          warned = false;
        }
        const online = state.pluginState === "IN_INGAME_CHANNEL" && state.clientId !== null;
        const muted = state.microphoneMuted || state.microphoneDisabled;
        const soundMuted = state.soundMuted || state.soundDisabled;
        const speaking = online && state.talking && !muted && !soundMuted;
        const status = !online ? "TeamSpeak verbinden" : state.microphoneDisabled ? "Mikrofon deaktiviert" :
          muted ? "Mikrofon stumm" : "Mikrofon aktiv";
        const details = [status];
        if (online && soundMuted) details.push(state.soundDisabled ? "Ton deaktiviert" : "Ton stumm");
        if (speaking) details.push("Du sprichst");
        if (!state.rangeChangeAllowed) details.push("Reichweite gesperrt");
        const widgetState = {
          schemaVersion: 1, label: "Stimme", value: config.voiceRanges.ranges[state.rangeIndex] + " m",
          text: details.join(" · "),
          tone: !online || muted || soundMuted ? "warning" : speaking ? "success" : "info",
        } as const;
        const now = Date.now(), previous = published.get(state.actorId), signature = JSON.stringify(widgetState);
        // YACA status heartbeats do not need to spend the shared UI budget.
        if (previous?.signature === signature && now - previous.at < 5000) return;
        operation = "updateWidget";
        api.updateWidget({ actorId: state.actorId }, VOICE_WIDGET, widgetState);
        if (!previous) {
          operation = "setWidgetVisible";
          api.setWidgetVisible({ actorId: state.actorId }, VOICE_WIDGET, true);
        }
        published.set(state.actorId, { signature, at: now });
      } catch (error) {
        // A disconnected native actor or UI budget must not interrupt voice transport.
        const reason = error instanceof Error ? error.message.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 180) : "Unknown API error";
        warn(`Anzeige derzeit nicht verfügbar [${operation}]: ${reason}`);
      }
    },
    remove(actorId: number) {
      published.delete(actorId);
      try { api?.setWidgetVisible({ actorId }, VOICE_WIDGET, false); } catch { /* Actor/session may already be gone. */ }
    },
    dispose() {
      try { api?.unregisterWidget(OWNER, VOICE_WIDGET); } catch { /* Host can stop UI Core first. */ }
      api = undefined;
      published.clear();
    },
  };
}
