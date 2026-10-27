// Installed as Plugins/<plugin>/set-enabled.cjs. Run with the gameserver stopped.
// No arguments enables this plugin; --disable disables it.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
try {
  const args=process.argv.slice(2);
  if(args.length>1 || args.length===1 && args[0]!=='--disable') throw new Error('Usage: node set-enabled.cjs [--disable]');
  const enabled=args[0]!=='--disable';
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'plugin.json'),'utf8'));
  const statePath=path.resolve(__dirname,'..','.discovery-state.json');
  if(!fs.existsSync(statePath)) throw new Error('Start the gameserver once to discover the plugin, then stop it and run this command again.');
  const original=fs.readFileSync(statePath,'utf8');
  const state=JSON.parse(original);
  if(state.version!==1 || !state.plugins || typeof state.plugins!=='object' || Array.isArray(state.plugins) ||
    !Object.hasOwn(state.plugins,manifest.name) || !state.plugins[manifest.name] || typeof state.plugins[manifest.name]!=='object') {
    throw new Error('Plugin not found in a valid discovery state. Start the gameserver once to discover it.');
  }
  const entry=state.plugins[manifest.name];
  if(entry.startupEnabled===enabled) { console.log(manifest.name+': startupEnabled='+enabled+' (already set). Restart the gameserver to apply.'); }
  else {
    entry.startupEnabled=enabled;
    entry.updatedAt=new Date().toISOString();
    const suffix=Date.now()+'-'+randomUUID();
    const backup=statePath+'.yaca-backup-'+suffix;
    const temp=statePath+'.yaca-'+suffix+'.tmp';
    fs.copyFileSync(statePath,backup,fs.constants.COPYFILE_EXCL);
    try {
      fs.writeFileSync(temp,JSON.stringify(state,null,2)+'\n',{encoding:'utf8',flag:'wx'});
      if(fs.readFileSync(statePath,'utf8')!==original) throw new Error('Discovery state changed while updating; stop the gameserver and retry.');
      fs.renameSync(temp,statePath);
    } finally { if(fs.existsSync(temp))fs.unlinkSync(temp); }
    console.log(manifest.name+': startupEnabled='+enabled+'. Restart the gameserver to apply.\nBackup: '+backup);
  }
} catch(error) {
  console.error('[YacaPlugin] '+error.message);
  process.exitCode=1;
}
