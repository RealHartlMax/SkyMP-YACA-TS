const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initYacaBridge } = require('../dist/yacaBridge');
const { fixture } = require('./fixture.cjs');

test('registers actual SkyMP API, private owner settings and bounded client sources', () => {
  const f = fixture();
  assert.equal(f.properties.yacaOwner.isVisibleByNeighbors, false);
  assert.equal(f.properties.yacaPeer.isVisibleByOwner, true);
  assert.equal(f.properties.yacaPeer.isVisibleByNeighbors, true);
  assert.ok(Buffer.byteLength(f.sources._yacaClient) < 100 * 1024);
  new Function('ctx', f.sources._yacaClient);
  f.event(1, { type: 'ready' });
  assert.equal(f.owner(1).state.pluginState, 'NOT_CONNECTED');
  assert.equal(f.owner(1).state.rangeIndex, 1);
  assert.equal('serverPassword' in f.owner(1).config.teamspeak, false);
  assert.equal('yaca' in f.runtime.get(1, 'yacaPeer'), false);
  assert.throws(() => initYacaBridge({ runtime: {} }), /mp.makeProperty/);
});

test('validates requests, binds changes to the native sender and enforces range permissions', () => {
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  f.event(101, { type: 'action', action: 'range', value: 4, actorId: 102 });
  assert.equal(f.owner(101).state.rangeIndex, 4);
  assert.equal(f.owner(102).state.rangeIndex, 1);
  for (const value of [NaN, Infinity, -1, 1.5, '2', 99]) f.event(101, { type: 'action', action: 'range', value });
  assert.equal(f.owner(101).state.rangeIndex, 4);
  f.controller.setVoiceRangeChangeAllowed(101, false);
  f.event(101, { type: 'action', action: 'range', value: 0 });
  assert.equal(f.owner(101).state.rangeIndex, 4);
  assert.equal(f.owner(101).state.rangeChangeAllowed, false);
});

test('plugin mute/disconnect suppress speaking and never accepts another player ID', () => {
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  const report = { type: 'report', pluginState: 'IN_INGAME_CHANNEL', clientId: 11, talking: true,
    microphoneMuted: false, microphoneDisabled: false, soundMuted: false, soundDisabled: false, actorId: 102 };
  f.event(101, report);
  assert.deepEqual(f.activity.at(-1), { actorId: '101', isSpeaking: true, voiceRange: 3 });
  f.event(101, { ...report, microphoneMuted: true });
  assert.equal(f.activity.at(-1).isSpeaking, false);
  f.event(101, { ...report, clientId: 12 });
  assert.equal(f.owner(101).state.clientId, 11);
  f.event(101, { ...report, pluginState: 'NOT_CONNECTED', clientId: null });
  assert.equal(f.runtime.get(101, 'yacaPeer').clientId, null);
  assert.equal(f.activity.at(-1).isSpeaking, false);
});

test('radio roster works beyond spatial neighbors, validates PTT and releases on channel/connection changes', () => {
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  f.event(101, { type: 'action', action: 'transmit', value: 0 });
  assert.equal(f.owner(101).state.transmitting, null);
  f.event(101, { type: 'action', action: 'radioEnabled', value: true });
  f.event(101, { type: 'action', action: 'transmit', value: 8 });
  assert.equal(f.owner(101).state.transmitting, null);
  f.event(101, { type: 'action', action: 'transmit', value: 0 });
  assert.equal(f.owner(102).roster.find(p => p.actorId === 101).transmitting, 0);
  f.event(101, { type: 'action', action: 'primaryChannel', value: 3 });
  assert.equal(f.owner(101).state.transmitting, null);
  f.event(101, { type: 'action', action: 'transmit', value: 3 });
  f.event(101, { type: 'action', action: 'radioEnabled', value: false });
  assert.equal(f.owner(102).roster.find(p => p.actorId === 101).transmitting, null);
});

test('expires stale players and clears VAD while keeping other gamemode handlers intact', t => {
  let time = 100000;
  t.mock.method(Date, 'now', () => time);
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  time += 13000;
  f.event(102, { type: 'ready' });
  assert.equal(f.owner(102).roster.length, 0);
  assert.equal(f.runtime.get(101, 'yacaPeer'), null);
  const other = () => {};
  f.runtime._unrelated = other;
  f.controller.dispose();
  assert.equal(f.runtime._unrelated, other);
  assert.equal(f.runtime._yacaClient, undefined);
  assert.equal(f.owner(102).disabled, true);
  assert.equal(f.runtime.get(102, 'yacaPeer'), null);
});

