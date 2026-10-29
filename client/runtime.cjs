'use strict';
// The established native EventSource still owns player/property transport.
// The signed module owns its lifetime when disconnecting or switching servers.
exports.apiVersion = 1;
exports.activate = function(api) {
  return function dispose() {
    const state = api.sp.storage.skympYaca;
    if (!state) return;
    state.disabled = true;
    if (state.browserHandler !== undefined && state.browserHandler !== null) {
      try { api.sp.unsubscribe(state.browserHandler); } catch (_) { /* Continue expiring the update chain. */ }
    }
    if (api.sp.storage.skympYaca === state) delete api.sp.storage.skympYaca;
    // EventSource callbacks check the stored instance before scheduling their next update.
  };
};
