const { initYacaBridge } = require('../dist/yacaBridge');
const { validateConfig } = require('../dist/configLoader');
const sample = require('../config.json');

function fixture(options = {}) {
  const values = new Map(), properties = {}, sources = {}, activity = [];
  const runtime = {
    makeProperty(name, value) { properties[name] = value; },
    makeEventSource(name, source) { sources[name] = source; },
    get(id, name) { return values.get(id + ':' + name); },
    set(id, name, value) { values.set(id + ':' + name, structuredClone(value)); },
  };
  const config = validateConfig({ ...structuredClone(sample), yaca: { ...sample.yaca, uniqueServerId: 'test-server-uid' } });
  const controller = initYacaBridge({ runtime, config, onVoiceActivity: e => activity.push(e), ...options });
  const event = (id, payload) => runtime._yacaClient(id, payload);
  const owner = id => runtime.get(id, 'yacaOwner');
  const join = (id, clientId) => {
    event(id, { type: 'ready' });
    event(id, { type: 'report', pluginState: 'IN_INGAME_CHANNEL', clientId, talking: false,
      microphoneMuted: false, microphoneDisabled: false, soundMuted: false, soundDisabled: false });
  };
  return { runtime, config, controller, properties, sources, activity, event, owner, join };
}
module.exports = { fixture };
