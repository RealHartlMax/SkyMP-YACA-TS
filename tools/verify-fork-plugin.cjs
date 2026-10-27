// Exercise the unmodified discovery/activation/temp-loader helpers from a local
// SkyMP checkout. The isolated runtime is a fixture unless --native is passed.
// Usage: node tools/verify-fork-plugin.cjs D:/GitHub/skymp [--native]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const fork = path.resolve(process.argv[2] || 'D:/GitHub/skymp');
const native = process.argv.includes('--native');
const artifactDir=path.join(root,'artifacts');
fs.mkdirSync(artifactDir,{recursive:true});
const serverDir=fs.mkdtempSync(path.join(artifactDir,native?'plugin-native-':'plugin-loader-'));
const initialCwd=process.cwd();
const previousMp=globalThis.mp;

function transpile(text) {
  return ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
}

function loadForkHelpers(statuses) {
  const sourcePath=path.join(fork,'skymp5-server','ts','index.ts');
  const source=fs.readFileSync(sourcePath,'utf8');
  const ast=ts.createSourceFile(sourcePath,source,ts.ScriptTarget.Latest,true);
  const names=new Set(['pluginsLog','pluginsWarn','pluginsError','SAFE_PLUGIN_NAME_RE','SAFE_VERSION_RE',
    'toAbsolutePath','getAlternativeNtfsAliasPath','resolveExistingPath','sha256','ensureMainPath','isRelativePathSafe',
    'readPluginManifest','fingerprintPlugin','discoverPlugins','buildPluginSortOrder','requireTemp','runGamemodePlugin','bootstrapPlugins']);
  const selected=[];
  for (const node of ast.statements) {
    const declared=ts.isFunctionDeclaration(node)&&node.name?[node.name.text]:ts.isVariableStatement(node)?node.declarationList.declarations.map(d=>d.name.getText(ast)):[];
    if (declared.some(n=>names.has(n))) {selected.push(node.getFullText(ast));for(const name of declared)names.delete(name);}
  }
  assert.equal(names.size,0,'Fork loader changed; missing helpers: '+[...names].join(', '));
  const stateModule={exports:{}};
  new Function('require','module','exports',transpile(fs.readFileSync(path.join(fork,'skymp5-server','ts','pluginDiscoveryState.ts'),'utf8')))(require,stateModule,stateModule.exports);
  const state=stateModule.exports;
  const ui={updatePluginRuntimeStatus:(name,status)=>statuses.push({name,status})};
  const code=transpile(selected.join('\n'))+'\nreturn {discoverPlugins,bootstrapPlugins};';
  const helpers=new Function('fs','os','path','crypto','ui','readDiscoveryState','writeDiscoveryState','PLUGINS_DIR','installShutdownHooks','askToEnablePlugin','runProcessPlugin','require',code)(
    fs,os,path,crypto,ui,state.readDiscoveryState,state.writeDiscoveryState,state.PLUGINS_DIR,
    ()=>{},()=>{throw new Error('Unexpected interactive prompt');},()=>{throw new Error('Unexpected process plugin');},require);
  return {...helpers,...state,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
}

async function main() {
  process.chdir(serverDir);
  const pluginDir=path.join(serverDir,'Plugins','YACA Voice');
  fs.mkdirSync(pluginDir,{recursive:true});
  for(const name of ['server.js','plugin.json'])fs.copyFileSync(path.join(root,'dist','plugin',name),path.join(pluginDir,name));
  const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
  config.yaca.uniqueServerId='isolated-plugin-test-uid';
  fs.writeFileSync(path.join(pluginDir,'config.json'),JSON.stringify(config));
  const untouchedGamemode=path.join(serverDir,'gamemode.js');
  fs.writeFileSync(untouchedGamemode,'// Existing host gamemode. Plugin installation must not modify this file.\n');
  const hostHash=crypto.createHash('sha256').update(fs.readFileSync(untouchedGamemode)).digest('hex');
  const statuses=[];
  const loader=loadForkHelpers(statuses);
  let runtime;
  if(native) {
    const addonPath=path.join(fork,'build','dist','server','scam_native.node');
    const {ScampServer}=require(addonPath);
    runtime=new ScampServer(JSON.stringify({port:0,listenHost:'127.0.0.1',maxPlayers:2,
      dataDir:path.join(fork,'build','dist','server','data'),npcEnabled:false,itemsEnabled:false,logLevel:'error'}));
    runtime._setSelf(runtime);
  } else {
    const prototype={};
    Object.defineProperty(prototype,'clear',{value:function(){this.properties={};this.sources={};}});
    runtime=Object.assign(Object.create(prototype),{properties:{},sources:{},values:new Map(),
      makeProperty(n,p){assert.equal(this.properties[n],undefined,'duplicate native property');this.properties[n]=p;},
      makeEventSource(n,p){this.sources[n]=p;},get(i,n){return this.values.get(i+':'+n);},set(i,n,v){this.values.set(i+':'+n,structuredClone(v));}});
  }
  globalThis.mp=runtime;
  const discovered=loader.discoverPlugins();
  assert.equal(discovered.length,1);
  assert.equal(discovered[0].manifest.name,'skymp-yaca-ts');
  const settings={mode:'safe',loadOrder:[],abortOnPluginError:false,processCommandAllowlist:[]};
  await loader.bootstrapPlugins(runtime,settings);
  assert.equal(runtime._yacaClient,undefined); // Discovery must not grant activation.
  const state=loader.readDiscoveryState();
  assert.equal(state.plugins['skymp-yaca-ts'].startupEnabled,false);
  state.plugins['skymp-yaca-ts'].startupEnabled=true; // Simulate the existing admin activation workflow.
  loader.writeDiscoveryState(state);
  await loader.bootstrapPlugins(runtime,settings);
  assert.equal(typeof runtime._yacaClient,'function');
  const actor=native?runtime.createActor(7,[0,0,0],0,0x3c):101;
  runtime._yacaClient(actor,{type:'ready'});
  assert.equal(runtime.get(actor,'yacaOwner').config.yaca.uniqueServerId,'isolated-plugin-test-uid');
  const handler=runtime._yacaClient;
  await loader.bootstrapPlugins(runtime,settings);
  assert.equal(runtime._yacaClient,handler); // Fresh temporary entry, same singleton.
  runtime.clear();runtime.clear();
  runtime.makeProperty('hostPreserved',{isVisibleByOwner:true,isVisibleByNeighbors:false,updateOwner:'',updateNeighbor:''});
  await new Promise(setImmediate);
  runtime._yacaClient(actor,{type:'ready'});
  runtime._yacaClient(actor,{type:'action',action:'range',value:2});
  assert.equal(runtime.get(actor,'yacaOwner').state.rangeIndex,2);
  if(!native)assert.ok(runtime.properties.hostPreserved);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(untouchedGamemode)).digest('hex'),hostHash);
  const controller=globalThis[Symbol.for('skymp-yaca-ts.plugins')].get(runtime);
  controller.stop();
  assert.equal(runtime.get(actor,'yacaOwner').disabled,true);
  if(native)runtime.destroyActor(actor);
  const result={passed:true,nativeRuntime:native,fork,loaderSourceSha256:loader.sourceSha256,
    pluginSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(pluginDir,'server.js'))).digest('hex'),
    checks:['actual manifest/discovery helpers','new plugin stays disabled','activation via discovery state','actual requireTemp loader',
      'renamed folder','no runtime dependencies or relative assets','duplicate entry is idempotent','gamemode reload restores voice',
      'existing gamemode remains unchanged','stop cleans up'],statuses,
    serverSourceChanged:false,skyrimStarted:false,teamspeakPluginStarted:false};
  fs.writeFileSync(path.join(artifactDir,native?'plugin-native-validation.json':'plugin-loader-validation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  globalThis.mp=previousMp;process.chdir(initialCwd);
  if(native)process.exit(process.exitCode||0);
});
