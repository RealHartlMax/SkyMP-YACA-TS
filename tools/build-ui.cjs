const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'ui', name), 'utf8');
const fallbackImage = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'assets', 'voice-required.svg')).toString('base64');
const assets = JSON.stringify({ css: read('style.css'), html: read('view.html'), fallbackImage });
const output = `(function () { var module; var ASSETS = ${assets};\n${read('protocol.js')}\n${read('voice.js')}\n})();\n`;
fs.mkdirSync(path.join(root, 'dist', 'ui'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'ui', 'overlay.js'), output);
console.log(`Built self-contained SkyrimPlatform overlay (${Buffer.byteLength(output)} bytes)`);

// Modern clients receive this module through the signed plugin download API.
const runtime = path.join(root, 'Runtime'); fs.mkdirSync(runtime, { recursive: true });
const runtimeEntry = '(function(){window.SkyMPPluginRuntime.register({pluginId:"skymp-yaca-ts",apiVersion:1,mount:function(ctx){var module;var ASSETS=' + assets + ';ASSETS.parent=ctx.root;ASSETS.focus=ctx.requestFocus;ctx.onDismiss(function(){if(window.SkyMpYaca)window.SkyMpYaca.dismiss();});ctx.onAllowed(function(allowed){ASSETS.allowed=allowed;if(!allowed&&window.SkyMpYaca)window.SkyMpYaca.dismiss();});\n' + read('protocol.js') + '\n' + read('voice.js') + '\nreturn function(){if(window.SkyMpYaca)window.SkyMpYaca.stop();delete window.SkyMpYacaProtocol;};}});})();\n';
fs.writeFileSync(path.join(runtime, 'ui.js'), runtimeEntry);
fs.copyFileSync(path.join(root, 'client/runtime.cjs'), path.join(runtime, 'client.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
require('./plugin-runtime/package.cjs').createRuntimeManifest({ root: runtime, pluginId: manifest.name, version: manifest.version, files: ['client.js','ui.js'], entrypoints: {client:'client.js',ui:'ui.js'}, allowUnsigned: true });
