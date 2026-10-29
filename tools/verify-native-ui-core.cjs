// Isolated real plugin-loader + native bots check. No running gameserver is touched.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..'), coreRoot = path.resolve(process.argv[2] || '../SkyMP-UI-Core');
const { loader, nativeServer } = require(path.join(coreRoot,'tools/verify-fork.cjs'));
const { validateFrame } = require(path.join(coreRoot,'dist/contracts.cjs'));
const artifactRoot = path.join(root,'artifacts');
fs.mkdirSync(artifactRoot,{recursive:true});
const directory = fs.mkdtempSync(path.join(artifactRoot,'voice-core-native-'));
const previousDirectory = process.cwd(), previousMp = globalThis.mp;
const originalWarn = console.warn, warnings = [], output = [], users = [], actors = [], bots = [];
const hash = file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let mp, core, voice;
async function main() {
  const corePlugin = path.join(directory,'Plugins/SkyMPUICore'), voicePlugin = path.join(directory,'Plugins/YacaVoice');
  fs.mkdirSync(corePlugin,{recursive:true});fs.mkdirSync(voicePlugin,{recursive:true});
  for(const file of ['index.cjs','plugin.json','config.json']) fs.copyFileSync(path.join(coreRoot,'release/SkyMPUICore',file),path.join(corePlugin,file));
  fs.cpSync(path.join(coreRoot,'release/SkyMPUICore/locales'),path.join(corePlugin,'locales'),{recursive:true});
  fs.cpSync(path.join(coreRoot,'release/SkyMPUICore/Runtime'),path.join(corePlugin,'Runtime'),{recursive:true});
  for(const file of ['server.js','plugin.json'])fs.copyFileSync(path.join(root,'dist/plugin',file),path.join(voicePlugin,file));
  fs.cpSync(path.join(root,'dist/plugin/assets'),path.join(voicePlugin,'assets'),{recursive:true});
  fs.cpSync(path.join(root,'dist/plugin/Runtime'),path.join(voicePlugin,'Runtime'),{recursive:true});
  const config = JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
  config.yaca.uniqueServerId='native-ui-core-test';
  fs.writeFileSync(path.join(voicePlugin,'config.json'),JSON.stringify(config));
  process.chdir(directory);mp=nativeServer();globalThis.mp=mp;
  mp.on('connect',id=>users.push(id));
  const originalSend=mp.sendCustomPacket.bind(mp);
  Object.defineProperty(mp,'sendCustomPacket',{value:(userId,raw)=>{output.push({userId,frame:JSON.parse(raw)});originalSend(userId,raw);}});
  console.warn=(...args)=>{warnings.push(args.join(' '));originalWarn(...args);};
  const statuses=[], l=loader(statuses), options={mode:'safe',loadOrder:['skymp-ui-core','skymp-yaca-ts'],abortOnPluginError:true,processCommandAllowlist:[]};
  await l.bootstrapPlugins(mp,options);
  const state=l.readDiscoveryState();
  assert.equal(Object.keys(state.plugins).length,2);
  for(const plugin of Object.values(state.plugins))plugin.startupEnabled=true;
  l.writeDiscoveryState(state);await l.bootstrapPlugins(mp,options);
  core=globalThis[Symbol.for('skymp-ui-core.runtime.v1')];
  voice=globalThis[Symbol.for('skymp-yaca-ts.plugins')].get(mp);
  assert(core&&voice);
  for(let index=0;index<2;index++)bots.push(mp.createBot());
  mp.tick();assert.equal(users.length,2);
  for(let index=0;index<2;index++){const actor=mp.createActor(0,[index,0,0],0,0x3c);actors.push(actor);mp.setUserActor(users[index],actor);}
  const custom=(index,payload)=>{bots[index].send({t:1,contentJsonDump:JSON.stringify(payload)});mp.tick();};
  const event=(index,payload)=>{bots[index].send({t:15,eventName:'_yacaClient',argsJsonDumps:[JSON.stringify(payload)]});mp.tick();};
  const current=index=>validateFrame(output.filter(p=>p.userId===users[index]&&['skympUi:snapshot','skympUi:update'].includes(p.frame.customPacketType)).at(-1).frame);
  for(let index=0;index<2;index++){
    event(index,{type:'ready'});
    custom(index,{customPacketType:'skympUi:ready',protocolVersion:1,frontId:'native-voice-'+index});
    event(index,{type:'report',pluginState:'IN_INGAME_CHANNEL',clientId:index+11,talking:false,
      microphoneMuted:false,microphoneDisabled:false,soundMuted:false,soundDisabled:false});
  }
  core.flush();
  assert.equal(current(0).widgets[0].state.value,'3 m');
  assert.equal(current(1).widgets[0].state.value,'3 m');
  event(0,{type:'action',action:'cycleRange',value:1,actorId:actors[1]});core.flush();
  assert.equal(current(0).widgets[0].state.value,'8 m');assert.equal(current(1).widgets[0].state.value,'3 m');
  voice.getBridge().setVoiceRangeChangeAllowed(actors[0],false);core.flush();
  assert.match(current(0).widgets[0].state.text,/gesperrt/);
  event(0,{type:'action',action:'cycleRange',value:1});
  assert.equal(mp.get(actors[0],'yacaOwner').state.rangeIndex,2);
  mp.clear();await new Promise(setImmediate);
  event(0,{type:'ready'});core.flush();
  assert.equal(current(0).widgets[0].state.value,'3 m');
  assert.deepEqual(warnings.filter(line=>line.includes('[YacaBridge] UI Core:')),[]);
  voice.stop();core.flush();assert.equal(current(0).widgets.length,0);
  const result={passed:true,nativeRuntime:true,nativeBots:2,coreRoot,
    pluginSHA256:hash(path.join(voicePlugin,'server.js')),uiCoreSHA256:hash(path.join(corePlugin,'index.cjs')),
    checks:['both real bundled plugins loaded by fork requireTemp','real authenticated native user/actor routing',
      'native CustomEvent ingress and private UI Core transport','range change and lock','gamemode reload restores widget','no YACA UI Core warnings','cleanup'],
    skyrimStarted:false,teamspeakPluginStarted:false};
  fs.writeFileSync(path.join(artifactRoot,'ui-core-native-validation.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  voice?.stop();core?.stop();for(const bot of bots)bot.destroy();for(const actor of actors)mp?.destroyActor(actor);
  console.warn=originalWarn;globalThis.mp=previousMp;process.chdir(previousDirectory);process.exit(process.exitCode||0);
});
