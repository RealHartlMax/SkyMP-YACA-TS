// Verify the consumer against the actual local UI Core runtime/validators.
// All player identities and transport in this check are fixtures, not a game session.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { fixture } = require('../tests/fixture.cjs');
const coreRoot = path.resolve(process.argv[2] || '../SkyMP-UI-Core');
const { createUiCore } = require(path.join(coreRoot,'dist/runtime.cjs'));
const { validateFrame } = require(path.join(coreRoot,'dist/contracts.cjs'));
const mp = new EventEmitter(), output = [], identities = new Map([[0,101],[1,102]]);
mp.isConnected = id=>identities.has(id);
mp.getUserActor = id=>identities.get(id) || 0;
mp.getUserByActor = actor=>[...identities].find(([,value])=>value===actor)?.[0] ?? -1;
mp.getUserGuid = id=>'voice-core-test-'+id;
mp.sendCustomPacket = (userId,raw)=>output.push({userId,frame:JSON.parse(raw)});
const core = createUiCore(mp,{autoFlush:false});
const voice = fixture({uiProvider:()=>core.api});
try {
  voice.join(101,11); voice.join(102,12);
  for(const userId of identities.keys()) mp.emit('customPacket',userId,JSON.stringify({customPacketType:'skympUi:ready',protocolVersion:1,frontId:'voice-core-test-'+userId}));
  const current = userId=>validateFrame(output.filter(p=>p.userId===userId && ['skympUi:snapshot','skympUi:update'].includes(p.frame.customPacketType)).at(-1).frame);
  assert.equal(current(0).widgets[0].state.value,'3 m');
  voice.event(101,{type:'action',action:'cycleRange',value:1,actorId:102}); core.flush();
  assert.equal(current(0).widgets[0].state.value,'8 m');
  assert.equal(current(1).widgets[0].state.value,'3 m');
  voice.controller.setVoiceRangeChangeAllowed(101,false); core.flush();
  assert.match(current(0).widgets[0].state.text,/gesperrt/);
  voice.controller.dispose(); core.flush();
  assert.equal(current(0).widgets.length,0);
  const result={passed:true,coreRoot,checks:['real API v1 registration and validators','native actor target contract with fixture identities','private per-player range update','server range lock','widget cleanup'],skyrimStarted:false,identitiesSimulated:true};
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  fs.writeFileSync(path.resolve(__dirname,'../artifacts/ui-core-validation.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally { voice.controller.dispose(); core.stop(); }
