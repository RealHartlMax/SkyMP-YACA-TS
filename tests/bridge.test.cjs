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

test('range cycles use current server state, wrap, respect locks and reject removed radio commands', () => {
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  f.event(101, { type: 'action', action: 'cycleRange', value: 1 });
  f.event(101, { type: 'action', action: 'cycleRange', value: 1 });
  assert.equal(f.owner(101).state.rangeIndex,3);
  f.event(101, { type: 'action', action: 'range', value: 0 });
  f.event(101, { type: 'action', action: 'cycleRange', value: -1 });
  assert.equal(f.owner(101).state.rangeIndex,7);
  f.event(101, { type: 'action', action: 'cycleRange', value: 1 });
  assert.equal(f.owner(101).state.rangeIndex,0);
  f.controller.setVoiceRangeChangeAllowed(101,false);
  f.event(101, { type: 'action', action: 'cycleRange', value: 1 });
  assert.equal(f.owner(101).state.rangeIndex,0);
  assert.equal(f.owner(102).state.rangeIndex,1);
  const previous = structuredClone(f.owner(101));
  for (const action of ['radioEnabled','primaryChannel','secondaryChannel','transmit'])
    f.event(101,{type:'action',action,value:1});
  assert.deepEqual(f.owner(101),previous);
  assert.equal('radio' in f.owner(101).config,false);
  assert.equal('radioEnabled' in f.owner(101).state,false);
  assert.equal('roster' in f.owner(101),false);
});

test('expires stale players and clears VAD while keeping other gamemode handlers intact', t => {
  let time = 100000;
  t.mock.method(Date, 'now', () => time);
  const f = fixture();
  f.join(101, 11); f.join(102, 12);
  time += 13000;
  f.event(102, { type: 'ready' });
  assert.equal(f.runtime.get(101, 'yacaPeer'), null);
  const other = () => {};
  f.runtime._unrelated = other;
  f.controller.dispose();
  assert.equal(f.runtime._unrelated, other);
  assert.equal(f.runtime._yacaClient, undefined);
  assert.equal(f.owner(102).disabled, true);
  assert.equal(f.runtime.get(102, 'yacaPeer'), null);
});

