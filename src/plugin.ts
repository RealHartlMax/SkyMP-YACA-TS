import { BridgeOptions, initYacaBridge } from "./yacaBridge";
import { SkyMpRuntime } from "./types/runtime";

type Bridge = ReturnType<typeof initYacaBridge>;
export interface PluginController {
  getBridge(): Bridge | undefined;
  stop(): void;
}

const registryKey = Symbol.for("skymp-yaca-ts.plugins");
const globals = globalThis as unknown as Record<symbol, WeakMap<object, PluginController>>;
const registry = globals[registryKey] ?? (globals[registryKey] = new WeakMap());

/** Start once per runtime, including when the host evaluates a fresh temporary module. */
export function startYacaPlugin(options: BridgeOptions & { runtime: SkyMpRuntime }): PluginController {
  const runtime = options.runtime;
  if (!runtime || typeof runtime.clear !== "function") throw new Error("[YacaPlugin] SkyMP runtime mp.clear is required");
  const existing = registry.get(runtime);
  if (existing) return existing;
  const originalClear = runtime.clear as (...args: unknown[]) => unknown;
  const descriptor = Object.getOwnPropertyDescriptor(runtime, "clear");
  let bridge: Bridge | undefined = initYacaBridge(options);
  let pending: NodeJS.Immediate | undefined;
  let active = true;

  const wrappedClear = function (this: unknown, ...args: unknown[]) {
    const result = Reflect.apply(originalClear, this, args);
    if (!active) return result;
    bridge?.dispose();
    bridge = undefined;
    // The fork reloads only the main gamemode after clear(). Restore our own
    // registrations after that synchronous load, coalescing repeated clears.
    if (!pending) pending = setImmediate(() => {
      pending = undefined;
      if (!active) return;
      try {
        bridge = initYacaBridge(options);
        console.log("[YacaPlugin] Restored after gamemode reload");
      } catch (error) {
        console.error("[YacaPlugin] Could not restore voice bridge; check config.json and restart the gameserver:", error);
      }
    });
    return result;
  };

  try {
    // Native methods are non-writable on ScampServer.prototype. Shadow only
    // this instance; do not modify the native prototype or any host source file.
    Object.defineProperty(runtime, "clear", {
      value: wrappedClear, configurable: true, writable: true, enumerable: descriptor?.enumerable ?? false,
    });
  } catch (error) {
    bridge.dispose();
    throw error;
  }

  const controller: PluginController = {
    getBridge: () => bridge,
    stop() {
      if (!active) return;
      active = false;
      if (pending) clearImmediate(pending);
      bridge?.dispose();
      bridge = undefined;
      if (runtime.clear === wrappedClear) {
        if (descriptor) Object.defineProperty(runtime, "clear", descriptor);
        else delete runtime.clear;
      }
      registry.delete(runtime);
    },
  };
  registry.set(runtime, controller);
  console.log("[YacaPlugin] Active (UI and local YACA transport included)");
  return controller;
}
