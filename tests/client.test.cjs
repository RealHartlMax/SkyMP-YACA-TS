const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./fixture.cjs');

test('generated client samples meters, isolates worlds and cycles range without opening F8', t => {
  let now = 100000;
  t.mock.method(Date,'now',() => now);
  const f = fixture();
  f.join(101,11);
  const sent = [], scripts = [], pending = [], keys = new Set();
  let focused = false, menu = false, browserHandler;
  const ref = (x, cell = 1, interior = false) => ({
    getFormID: () => x + cell * 1000,
    getPositionX: () => x, getPositionY: () => 140, getPositionZ: () => 210, getAngleZ: () => 90,
    getParentCell: () => ({isInterior:() => interior,getFormID:() => cell}),
    getWorldSpace: () => ({getFormID:() => 10}),
  });
  const sp = {
    storage: {}, once: (event, cb) => pending.push(cb),
    on: (event, cb) => { browserHandler = cb; return 1; }, unsubscribe: () => {},
    browser: {executeJavaScript: s => scripts.push(s),isFocused:() => focused,setFocused:f => focused = f,setVisible:() => {}},
    Utility: {isInMenuMode:() => menu}, Input: {isKeyPressed:code => keys.has(code)}, Game: {getPlayer:() => ref(70)},
  };
  const ctx = {sp,sendEvent:p => sent.push(p),_expired:false};
  new Function('ctx', f.sources._yacaClient)(ctx);
  const tick = () => { now += 300; const cb = pending.shift(); assert.ok(cb); cb(); };
  const update = () => new Function('ctx',f.properties.yacaOwner.updateOwner)({...ctx,value:f.owner(101)});
  const neighbor = (reference, clientId) => new Function('ctx',f.properties.yacaPeer.updateNeighbor)({...ctx,refr:reference,value:{clientId,voiceRange:8}});
  update();
  // A previous overlay's heartbeat must not suppress installing the new UI.
  browserHandler({arguments:[{source:'skymp-yaca',type:'heartbeat'}]});
  neighbor(ref(700,2),12); // Adjacent exterior cell in the same world stays audible.
  neighbor(ref(700,3,true),13); // An interior in the same coordinates stays isolated.
  tick();
  assert.ok(scripts.some(s=>s.includes('var overlayVersion')));
  const code = scripts.findLast(s => s.startsWith('window.SkyMpYaca && window.SkyMpYaca.receive('));
  const frames = [];
  new Function('window',code)({SkyMpYaca:{receive:f => frames.push(f)}});
  assert.deepEqual(frames[0].local.position,{x:1,y:2,z:3});
  assert.equal(frames[0].peers.length,1);
  assert.equal(frames[0].peers[0].clientId,12);
  keys.add(47); tick(); tick(); // V works with the browser closed; holding does not repeat.
  assert.deepEqual(sent.filter(p => p.action),[{type:'action',action:'cycleRange',value:1}]);
  assert.equal(scripts.some(s => s.includes('SkyMpYaca.toggle()')),false);
  keys.clear(); tick(); keys.add(78); tick();
  assert.equal(sent.filter(p => p.action === 'cycleRange').length,2);
  keys.clear(); focused = true; tick(); keys.add(47); tick();
  assert.equal(sent.filter(p => p.action === 'cycleRange').length,2); // Chat/other UI owns input.
  keys.clear(); focused = false; menu = true; tick(); keys.add(47); tick();
  assert.equal(sent.filter(p => p.action === 'cycleRange').length,2);
  keys.clear(); menu = false; tick();
  f.controller.setVoiceRangeChangeAllowed(101,false); update(); keys.add(47); tick();
  assert.equal(sent.filter(p => p.action === 'cycleRange').length,2);
  const lastFrame = [];
  new Function('window', scripts.findLast(s => s.startsWith('window.SkyMpYaca && window.SkyMpYaca.receive(')))({SkyMpYaca:{receive:f => lastFrame.push(f)}});
  assert.deepEqual(lastFrame[0].peers,[]); // Despawned/unrefreshed neighbors expire.
  browserHandler({arguments:[{source:'other-app',type:'action',action:'range',value:0}]});
  assert.equal(sent.filter(p => p.action).length,2);
  ctx._expired = true;
  tick();
  assert.equal(pending.length,0);
});

test('client stops on bridge disposal and stops forwarding frozen server snapshots', t => {
  let now = 100000;
  t.mock.method(Date,'now',() => now);
  const f = fixture(); f.join(1,11);
  const pending = [], scripts = [];
  const sp = {storage:{},once:(_,cb)=>pending.push(cb),on:()=>1,
    browser:{executeJavaScript:s=>scripts.push(s),isFocused:()=>false,setFocused:()=>{},setVisible:()=>{}},
    Utility:{isInMenuMode:()=>false},Input:{isKeyPressed:()=>false},Game:{getPlayer:()=>({
      getPositionX:()=>0,getPositionY:()=>0,getPositionZ:()=>0,getAngleZ:()=>0,
      getParentCell:()=>({isInterior:()=>true,getFormID:()=>1}),getWorldSpace:()=>null,
    })}};
  const ctx={sp,sendEvent:()=>{}};
  new Function('ctx',f.sources._yacaClient)(ctx);
  new Function('ctx',f.properties.yacaOwner.updateOwner)({...ctx,value:f.owner(1)});
  const tick=()=>{now+=300;pending.shift()();};
  tick();
  assert.equal(scripts.filter(s=>s.includes('window.SkyMpYaca.receive(')).length,1);
  now+=9000;
  // updateOwner runs every frame, but only a new server revision refreshes the heartbeat.
  new Function('ctx',f.properties.yacaOwner.updateOwner)({...ctx,value:f.owner(1)});
  tick();
  assert.equal(scripts.filter(s=>s.includes('window.SkyMpYaca.receive(')).length,1);
  f.controller.dispose();
  new Function('ctx',f.properties.yacaOwner.updateOwner)({...ctx,value:f.owner(1)});
  tick();tick();
  assert.equal(scripts.filter(s=>s==='window.SkyMpYaca && window.SkyMpYaca.stop()').length,1);
});

test('loading cells suspend spatial sampling, resume in the new cell and still stop on a real server disconnect', t => {
  let now = 100000, loading = false, connected = true, playerPresent = true, hasCell = true, cellThrows = false;
  let interior = false, samples = 0;
  t.mock.method(Date, 'now', () => now);
  const f = fixture(); f.join(101, 11);
  const pending = [], frames = [], scripts = [], unsubscribed = [];
  const ref = {
    getPositionX: () => { samples++; return 70; }, getPositionY: () => 140, getPositionZ: () => 210, getAngleZ: () => 0,
    getParentCell: () => {
      if (cellThrows) throw new Error('cell is unloading');
      return hasCell ? { isInterior: () => interior, getFormID: () => interior ? 2 : 1 } : null;
    },
    getWorldSpace: () => hasCell && !interior ? { getFormID: () => 10 } : null,
  };
  const sp = { storage: {}, once: (_, cb) => pending.push(cb), on: () => 1, unsubscribe: id => unsubscribed.push(id),
    mpClientPlugin: { isConnected: () => connected },
    browser: { executeJavaScript: code => {
      scripts.push(code);
      if (code.startsWith('window.SkyMpYaca && window.SkyMpYaca.receive('))
        new Function('window', code)({ SkyMpYaca: { receive: frame => frames.push(frame) } });
    }, isFocused: () => false, setFocused() {}, setVisible() {} },
    Utility: { isInMenuMode: () => loading }, Ui: { isMenuOpen: name => loading && name === 'Loading Menu' },
    Input: { isKeyPressed: () => false }, Game: { getPlayer: () => playerPresent ? ref : null } };
  const ctx = { sp, sendEvent: payload => {
    f.event(101, payload);
    new Function('ctx', f.properties.yacaOwner.updateOwner)({ ...ctx, value: f.owner(101) });
  } };
  new Function('ctx', f.sources._yacaClient)(ctx);
  const tick = () => { now += 300; const cb = pending.shift(); assert.ok(cb); cb(); };
  tick();
  assert.equal(frames.at(-1).local.position.x, 1);
  loading = true;
  const before = samples;
  tick();
  assert.equal(frames.at(-1).suspended, true);
  assert.equal(samples, before); // Loading Menu never samples the unloading player.
  now += 45000;
  tick();
  assert.equal(frames.at(-1).suspended, true);
  loading = false; interior = true;
  tick();
  assert.equal(frames.at(-1).suspended, undefined);
  assert.deepEqual(frames.at(-1).peers, []);
  assert.equal(scripts.includes('window.SkyMpYaca && window.SkyMpYaca.stop()'), false);
  for (const unavailable of ['player', 'cell', 'throw']) {
    playerPresent = unavailable !== 'player'; hasCell = unavailable !== 'cell'; cellThrows = unavailable === 'throw';
    tick();
    assert.equal(frames.at(-1).suspended, true);
  }
  connected = false;
  tick();
  assert.equal(scripts.at(-1), 'window.SkyMpYaca && window.SkyMpYaca.stop()');
  assert.deepEqual(unsubscribed, [1]);
  assert.equal(sp.storage.skympYaca, undefined);
  assert.equal(pending.length, 0);
});
