const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../dist/configLoader');
const protocol = require('../ui/protocol');
const sample = require('../config.json');
const valid = () => ({ ...structuredClone(sample), yaca: { ...sample.yaca, uniqueServerId: 'real-ts-uid' } });

test('normalizes legacy configuration and rejects malformed numeric values/keys/transport', () => {
  const config = valid();
  delete config.client; delete config.ui; delete config.keyBinds.cycleVoiceRange;
  config.radio = {maxChannels:'obsolete'};
  config.keyBinds.primaryRadioTransmit = 'INVALID';
  const result = validateConfig(config);
  assert.equal(result.client.webSocketUrl, 'ws://127.0.0.1:30125/');
  assert.equal(result.ui.toggleKey, 'F8');
  assert.equal(result.keyBinds.cycleVoiceRange, 'V');
  assert.equal(result.ui.connectionOverlay.imagePath, 'assets/voice-required.svg');
  assert.equal('radio' in result, false);
  assert.equal('primaryRadioTransmit' in result.keyBinds, false);
  const mutations = [
    c => c.voiceRanges.defaultIndex = NaN,
    c => c.voiceRanges.defaultIndex = 1.2,
    c => c.voiceRanges.ranges = [1, Infinity],
    c => c.voiceRanges.ranges = [3, 1],
    c => c.voiceRanges.ranges = Array.from({length:9}, (_,i) => i+1),
    c => c.yaca.ingameChannelId = c.yaca.defaultChannelId,
    c => c.yaca.useWhisper = 'false',
    c => c.client.webSocketUrl = 'ws://external.example:30125/',
    c => c.keyBinds.cycleVoiceRange = 'F8',
    c => c.keyBinds.cycleVoiceRange = 'INVALID',
    c => c.ui.connectionOverlay.imagePath = 'assets/../../secret.png',
    c => c.ui.connectionOverlay.imageUrl = 'javascript:alert(1)',
    c => c.ui.connectionOverlay.imageUrl = 'https://user:secret@example.com/logo.png',
    c => c.ui.connectionOverlay.backgroundOpacity = 1,
  ];
  for (const mutate of mutations) { const c = valid(); mutate(c); assert.throws(() => validateConfig(c), /config.json/); }
  assert.throws(() => validateConfig(null));
  assert.throws(() => validateConfig(sample), /real TeamSpeak server UID/);
});

test('INIT uses upstream wire fields and numeric channels, excluding unrelated passwords', () => {
  const c = validateConfig(valid());
  const command = protocol.init(c, 'SkyMP-ff000001');
  assert.equal(command.base.request_type, 'INIT');
  assert.equal(command.server_guid, 'real-ts-uid');
  assert.equal(command.ingame_channel, 3);
  assert.equal(command.default_channel, 1);
  assert.equal(command.operation_mode, 0);
  assert.equal(command.ingame_name, 'SkyMP-ff000001');
  assert.equal(command.serverPassword, undefined);
});

test('decodes YaCA JOIN/TALK/SOUND/channel/error responses, ignores malformed frames', () => {
  const parse = data => protocol.response(JSON.stringify(data));
  assert.deepEqual(parse({ code: 'OK', requestType: 'JOIN', message: '42' }), { kind: 'joined', clientId: 42 });
  assert.deepEqual(parse({ code: 'OK', requestType: 'JOIN', message: 42 }), { kind: 'joined', clientId: 42 });
  assert.deepEqual(parse({ code: 'TALK_STATE', message: '1' }), { kind: 'talk', talking: true });
  const sound = { microphoneMuted: true, microphoneDisabled: false, soundMuted: false, soundDisabled: true };
  assert.deepEqual(parse({ code: 'SOUND_STATE', message: JSON.stringify(sound) }), { kind: 'sound', sound });
  assert.deepEqual(parse({ code: 'MOVED_CHANNEL', message: 'INGAME_CHANNEL' }), { kind: 'state', state: 'IN_INGAME_CHANNEL' });
  for (const message of ['0', '-1', '1foo', '65536', 0, -1, 1.5, 65536, true, null]) assert.equal(parse({code:'OK',requestType:'JOIN',message}), null);
  for (const bad of ['{', 'null', '[]', '{}']) assert.equal(protocol.response(bad), null);
  assert.equal(parse({code:'SOUND_STATE',message:'{"microphoneMuted":"false"}'}), null);
});

test('spatial packets follow plugin wire format without communication devices', () => {
  const local = {position:{x:1,y:2,z:3},direction:{x:0,y:1,z:0}};
  const frame = {local,peers:[{clientId:12,voiceRange:8,...local}]};
  const message = protocol.spatial(frame, 3, false);
  assert.equal(message.player.player_range, 3);
  assert.equal(message.player.players_list[0].client_id, 12);
  assert.equal('comm_device' in message,false);
  assert.equal(protocol.radio,undefined);
});
