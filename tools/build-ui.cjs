const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'ui', name), 'utf8');
const assets = JSON.stringify({ css: read('style.css'), html: read('view.html') });
const output = `(function () { var module; var ASSETS = ${assets};\n${read('protocol.js')}\n${read('voice.js')}\n})();\n`;
fs.mkdirSync(path.join(root, 'dist', 'ui'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'ui', 'overlay.js'), output);
console.log(`Built self-contained SkyrimPlatform overlay (${Buffer.byteLength(output)} bytes)`);
