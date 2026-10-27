const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { startYacaPlugin } = require('../dist/plugin');
const { validateConfig } = require('../dist/configLoader');
const sample = require('../config.json');

function host() {
  const proto = {};
  Object.defineProperty(proto, 'clear', { value: function (...args) {
    this.clears.push(args); this.properties = {}; this.sources = {}; return 'native-result';
  } });
  return Object.assign(Object.create(proto), {
    properties: {}, sources: {}, values: new Map(), clears: [],
    makeProperty(name, options) {
      if (this.properties[name]) throw new Error('duplicate property ' + name);
      this.properties[name] = options;
    },
    makeEventSource(name, source) { this.sources[name] = source; },
    get(id, name) { return this.values.get(id + ':' + name); },
    set(id, name, value) { this.values.set(id + ':' + name, structuredClone(value)); },
  });
}

test('plugin preserves native clear behavior and restores only its own registrations after reload', async () => {
  const runtime = host();
  const original = runtime.clear;
  const config = validateConfig({...structuredClone(sample),yaca:{...sample.yaca,uniqueServerId:'plugin-test-uid'}});
  const plugin = startYacaPlugin({runtime,config,overlaySource:'/* test overlay */'});
  assert.equal(startYacaPlugin({runtime,config}),plugin);
  assert.equal(typeof runtime._yacaClient,'function');
  assert.equal(runtime.clear('arg'),'native-result');
  runtime.clear('second');
  runtime.makeProperty('hostProperty',{});
  await new Promise(setImmediate);
  assert.equal(runtime.clears.length,2);
  assert.deepEqual(runtime.clears[0],['arg']);
  assert.deepEqual(Object.keys(runtime.properties).sort(),['hostProperty','yacaOwner','yacaPeer']);
  runtime._yacaClient(101,{type:'ready'});
  assert.equal(runtime.get(101,'yacaOwner').state.rangeIndex,1);
  plugin.stop();
  assert.equal(runtime.clear,original);
  assert.equal(Object.hasOwn(runtime,'clear'),false);
  assert.equal(runtime.get(101,'yacaOwner').disabled,true);
});

test('stopping the plugin cancels a pending restore', async () => {
  const runtime = host();
  const config = validateConfig({...structuredClone(sample),yaca:{...sample.yaca,uniqueServerId:'plugin-test-uid'}});
  const plugin = startYacaPlugin({runtime,config,overlaySource:''});
  runtime.clear();
  plugin.stop();
  await new Promise(setImmediate);
  assert.deepEqual(Object.keys(runtime.properties),[]);
  assert.equal(runtime._yacaClient,undefined);
});

test('single-file entry loads from a temporary module using only plugin.json and config.json', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'yaca-bundle-test-'));
  t.after(()=>{
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const pluginDir=path.join(dir,'Plugins','Renamed Voice Folder');
  fs.mkdirSync(pluginDir,{recursive:true});
  const manifest=require('../dist/plugin/plugin.json');
  fs.writeFileSync(path.join(pluginDir,'plugin.json'),JSON.stringify(manifest));
  const config={...structuredClone(sample),yaca:{...sample.yaca,uniqueServerId:'bundle-test-uid'}};
  fs.writeFileSync(path.join(pluginDir,'config.json'),JSON.stringify(config));
  const tempEntry=path.join(dir,'temporary-module.js');
  fs.copyFileSync(path.resolve(__dirname,'../dist/plugin/server.js'),tempEntry);
  const script=`
    const assert=require('node:assert/strict');
    const props={};const values=new Map();
    globalThis.mp={clear(){for(const k of Object.keys(props))delete props[k];},
      makeProperty(n,p){assert.equal(props[n],undefined);props[n]=p;},makeEventSource(){},get(i,n){return values.get(i+':'+n);},set(i,n,v){values.set(i+':'+n,v);}};
    const plugin=require('./temporary-module.js');
    mp._yacaClient(101,{type:'ready'});
    assert.equal(mp.get(101,'yacaOwner').config.yaca.uniqueServerId,'bundle-test-uid');
    assert.ok(props.yacaOwner&&props.yacaPeer);
    plugin.stop();
    console.log('BUNDLED_PLUGIN_OK');
  `;
  const result=spawnSync(process.execPath,['-e',script],{cwd:dir,encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
  assert.ok(result.stdout.includes('BUNDLED_PLUGIN_OK'));
  assert.equal(fs.existsSync(path.join(pluginDir,'node_modules')),false);
  assert.equal(fs.existsSync(path.join(pluginDir,'dist')),false);
});

test('activation helper preserves other plugins, requires discovery and creates a state backup', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yaca-state-test-'));
  t.after(()=>{
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const pluginDir=path.join(dir,'Plugins','skymp-yaca-ts');
  fs.mkdirSync(pluginDir,{recursive:true});
  for(const name of ['plugin.json','set-enabled.cjs'])fs.copyFileSync(path.resolve(__dirname,'../dist/plugin',name),path.join(pluginDir,name));
  const run=(...args)=>spawnSync(process.execPath,[path.join(pluginDir,'set-enabled.cjs'),...args],{encoding:'utf8',windowsHide:true});
  assert.equal(run().status,1);
  const other={startupEnabled:false,version:'9.0.0',pluginPath:'Plugins/other',extra:'preserve'};
  const state={version:1,plugins:{other,'skymp-yaca-ts':{startupEnabled:false,version:'1.0.0',pluginPath:'Plugins/skymp-yaca-ts'}}};
  const statePath=path.join(dir,'Plugins','.discovery-state.json');
  fs.writeFileSync(statePath,JSON.stringify(state));
  assert.equal(run().status,0);
  let result=JSON.parse(fs.readFileSync(statePath,'utf8'));
  assert.equal(result.plugins['skymp-yaca-ts'].startupEnabled,true);
  assert.deepEqual(result.plugins.other,other);
  assert.equal(fs.readdirSync(path.dirname(statePath)).filter(n=>n.includes('yaca-backup')).length,1);
  assert.equal(run('--disable').status,0);
  result=JSON.parse(fs.readFileSync(statePath,'utf8'));
  assert.equal(result.plugins['skymp-yaca-ts'].startupEnabled,false);
  assert.deepEqual(result.plugins.other,other);
});
