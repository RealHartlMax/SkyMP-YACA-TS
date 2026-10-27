// Optional check against an existing SkyMP addon. Does not compile native code.
// node tools/smoke-native.cjs <absolute scam_native.node> <absolute data directory>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const addonPath = path.resolve(process.argv[2] || 'scam_native.node');
const dataDir = path.resolve(process.argv[3] || 'data');
const outputDir = path.join(root, 'artifacts', 'native-smoke');
fs.mkdirSync(outputDir, { recursive: true });
process.chdir(outputDir);
const { ScampServer } = require(addonPath);
const { initYacaBridge } = require(path.join(root, 'dist', 'yacaBridge'));
const { validateConfig } = require(path.join(root, 'dist', 'configLoader'));
const input = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
input.yaca.uniqueServerId = 'native-smoke-test-uid';
const server = new ScampServer(JSON.stringify({
  port: 0, listenHost: '127.0.0.1', maxPlayers: 2, dataDir,
  npcEnabled: false, itemsEnabled: false, logLevel: 'error',
}));
server._setSelf(server);
const activity = [];
const bridge = initYacaBridge({ runtime: server, config: validateConfig(input), onVoiceActivity: e => activity.push(e) });
const actor = server.createActor(7, [0, 0, 0], 0, 0x3c);
server._yacaClient(actor, { type: 'ready' });
assert.equal(server.get(actor, 'yacaOwner').state.rangeIndex, 1);
server._yacaClient(actor, { type: 'action', action: 'range', value: 2 });
assert.equal(server.get(actor, 'yacaOwner').state.rangeIndex, 2);
server._yacaClient(actor, {
  type: 'report', pluginState: 'IN_INGAME_CHANNEL', clientId: 41, talking: true,
  microphoneMuted: false, microphoneDisabled: false, soundMuted: false, soundDisabled: false,
});
assert.equal(server.get(actor, 'yacaPeer').clientId, 41);
assert.equal(activity.at(-1).actorId, String(actor));
assert.equal(activity.at(-1).isSpeaking, true);
bridge.dispose();
server.destroyActor(actor);
const result = {
  passed: true, addonPath, addonSha256: crypto.createHash('sha256').update(fs.readFileSync(addonPath)).digest('hex'),
  node: process.version, checks: ['native makeProperty/makeEventSource', 'native actor properties', 'range request', 'plugin report', 'VAD callback', 'cleanup'],
  skyrimClientStarted: false, teamspeakPluginStarted: false,
};
fs.writeFileSync(path.join(root, 'artifacts', 'native-validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
process.exit(0);
