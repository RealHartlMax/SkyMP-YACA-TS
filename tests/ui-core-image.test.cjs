const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { fixture } = require('./fixture.cjs');
const { connectionImage } = require('../dist/connectionImage');
const { VOICE_WIDGET } = require('../dist/uiCoreAdapter');

test('registers and updates a private UI Core widget even when UI Core starts later', () => {
  const definitions = [], updates = [], visibility = [], removed = [];
  const api = { apiVersion:1, getStatus:()=>({ready:true,frontendProtocol:1}),
    registerWidget:d=>definitions.push(d), updateWidget:(target,id,state)=>updates.push({target,id,state}),
    setWidgetVisible:(target,id,visible)=>visibility.push({target,id,visible}), unregisterWidget:(owner,id)=>removed.push({owner,id}) };
  let provider;
  const f = fixture({uiProvider:()=>provider});
  f.event(101,{type:'ready'});
  assert.equal(definitions.length,0);
  provider = api;
  f.event(101,{type:'ready'});
  assert.equal(definitions[0].id,VOICE_WIDGET);
  assert.equal(definitions[0].defaultPosition,'bottom-right');
  assert.deepEqual(updates.at(-1).target,{actorId:101});
  assert.equal(updates.at(-1).state.value,'3 m');
  const updateCount = updates.length;
  f.event(101,{type:'ready'});
  assert.equal(updates.length,updateCount); // Repeated identical ready/heartbeat state is coalesced.
  f.event(101,{type:'action',action:'cycleRange',value:1,actorId:102});
  assert.equal(definitions.length,1);
  assert.deepEqual(updates.at(-1).target,{actorId:101});
  assert.equal(updates.at(-1).state.value,'8 m');
  assert.match(updates.at(-1).state.text,/TeamSpeak verbinden/);
  f.controller.setVoiceRangeChangeAllowed(101,false);
  assert.match(updates.at(-1).state.text,/gesperrt/);
  assert.equal(visibility.at(-1).visible,true);
  f.controller.dispose();
  assert.deepEqual(removed,[{owner:'skymp-yaca-ts',id:VOICE_WIDGET}]);
});

test('voice HUD follows mute and unmute reports, including a locked range and disabled audio', () => {
  const updates = [];
  const api = { apiVersion:1, getStatus:()=>({ready:true,frontendProtocol:1}), registerWidget:()=>{},
    updateWidget:(target,id,state)=>updates.push({target,state}), setWidgetVisible:()=>{}, unregisterWidget:()=>{} };
  const f = fixture({uiProvider:()=>api});
  try {
    f.join(101,11);
    const report = {type:'report',pluginState:'IN_INGAME_CHANNEL',clientId:11,talking:true,
      microphoneMuted:false,microphoneDisabled:false,soundMuted:false,soundDisabled:false};
    const last = () => updates.at(-1).state;
    assert.equal(last().text,'Mikrofon aktiv');
    f.event(101,report);
    assert.match(last().text,/Du sprichst/);
    assert.equal(last().tone,'success');
    f.event(101,{...report,microphoneMuted:true});
    assert.equal(last().text,'Mikrofon stumm');
    assert.equal(last().tone,'warning');
    f.controller.setVoiceRangeChangeAllowed(101,false);
    assert.equal(last().text,'Mikrofon stumm · Reichweite gesperrt');
    f.event(101,{...report,talking:false});
    assert.equal(last().text,'Mikrofon aktiv · Reichweite gesperrt');
    assert.equal(last().tone,'info');
    f.event(101,{...report,microphoneDisabled:true});
    assert.match(last().text,/Mikrofon deaktiviert/);
    assert.doesNotMatch(last().text,/Du sprichst/);
    assert.equal(last().tone,'warning');
    for (const key of ['soundMuted','soundDisabled']) {
      f.event(101,{...report,[key]:true});
      assert.match(last().text,/Mikrofon aktiv · Ton (stumm|deaktiviert)/);
      assert.doesNotMatch(last().text,/Du sprichst/);
      assert.equal(last().tone,'warning');
    }
    f.event(101,{...report,talking:false});
    assert.equal(last().text,'Mikrofon aktiv · Reichweite gesperrt');
    f.event(101,{...report,pluginState:'NOT_CONNECTED',clientId:null});
    assert.equal(last().text,'TeamSpeak verbinden · Reichweite gesperrt');
    assert.equal(last().tone,'warning');
    assert.ok(updates.every(update=>update.target.actorId===101));
  } finally { f.controller.dispose(); }
});

test('UI Core errors identify the failed API call and transient failures are retried', t => {
  const warnings = [], updates = [];
  t.mock.method(console,'warn',message=>warnings.push(message));
  let unavailable = true;
  const api = {apiVersion:1,getStatus:()=>({ready:true,frontendProtocol:1}),registerWidget:()=>{},
    updateWidget:(target,id,state)=>{if(unavailable)throw new Error('Target is not an authenticated player');updates.push(state);},
    setWidgetVisible:()=>{},unregisterWidget:()=>{}};
  const f = fixture({uiProvider:()=>api});
  f.event(101,{type:'ready'});
  assert.match(warnings.at(-1),/\[updateWidget\]: Target is not an authenticated player/);
  unavailable = false;
  f.event(101,{type:'ready'});
  assert.equal(updates.at(-1).value,'3 m');
  f.controller.dispose();
});

test('unavailable or incompatible UI Core never interrupts voice sessions', () => {
  const f = fixture({uiProvider:()=>({apiVersion:99})});
  f.join(101,11);
  f.event(101,{type:'action',action:'cycleRange',value:1});
  assert.equal(f.owner(101).state.rangeIndex,2);
  assert.equal(f.runtime.get(101,'yacaPeer').clientId,11);
  f.controller.dispose();
});

test('loads an operator picture at startup without a rebuild and bounds embedded image size', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'yaca-picture-'));
  t.after(()=>{
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  fs.mkdirSync(path.join(dir,'assets'));
  const f = fixture();
  const picture = path.join(dir,'assets','voice-required.svg');
  fs.writeFileSync(picture,'<svg xmlns="http://www.w3.org/2000/svg"><title>First</title></svg>');
  const first = connectionImage(f.config,dir);
  fs.writeFileSync(picture,'<svg xmlns="http://www.w3.org/2000/svg"><title>Replacement</title></svg>');
  assert.notEqual(connectionImage(f.config,dir),first);
  fs.writeFileSync(picture,Buffer.alloc(64*1024+1));
  assert.throws(()=>connectionImage(f.config,dir),/exceeds 64 KiB/);
  f.config.ui.connectionOverlay.imageUrl = 'https://example.com/world.webp';
  assert.equal(connectionImage(f.config,dir),'https://example.com/world.webp');
  f.controller.dispose();
});
