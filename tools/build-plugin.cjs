// Bundle our compiled CommonJS modules with Node builtins as the only imports.
// The fork copies the entry to a temp directory, so relative requires/assets
// cannot be used by the distributed server.js.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
manifest.version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const modules = ['yacaBridge', 'configLoader', 'clientSources', 'connectionImage', 'uiCoreAdapter', 'types/runtime', 'plugin'];
const definitions = modules.map(id => `${JSON.stringify(id)}: function (module, exports, require, __dirname) {\n${fs.readFileSync(path.join(root, 'dist', id + '.js'), 'utf8')}\n}`).join(',\n');
// Modern distribution downloads signed UI; never place it inside a bounded EventSource body.
const overlay = process.env.SKYMP_YACA_LEGACY_OVERLAY === '1' ? fs.readFileSync(path.join(root, 'dist', 'ui', 'overlay.js'), 'utf8') : '';

const entry = `// SkyMP YACA server plugin ${manifest.version}. GPL-3.0; corresponding source is included in sources/.\n
'use strict';
(function (nativeRequire) {
  const fs = nativeRequire('node:fs');
  const path = nativeRequire('node:path');
  const pluginsDir = path.join(process.cwd(), 'Plugins');
  const candidates = fs.readdirSync(pluginsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(pluginsDir, d.name)).filter(dir => {
    try { const m = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8')); return m.name === ${JSON.stringify(manifest.name)} && m.main === 'server.js'; }
    catch (_) { return false; }
  });
  if (candidates.length !== 1) throw new Error('[YacaPlugin] Expected exactly one Plugins/*/plugin.json named ${manifest.name}; found ' + candidates.length);
  const pluginRoot = candidates[0];
  const definitions = {\n${definitions}\n};
  const cache = Object.create(null);
  function load(id) {
    if (cache[id]) return cache[id].exports;
    if (!Object.prototype.hasOwnProperty.call(definitions, id)) throw new Error('[YacaPlugin] Missing bundled module: ' + id);
    const current = { exports: {} };
    cache[id] = current;
    const fromHere = function (request) {
      if (!request.startsWith('.')) return nativeRequire(request);
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(id), request)).replace(/\\.js$/, '');
      return load(resolved);
    };
    definitions[id](current, current.exports, fromHere, path.join(pluginRoot, 'dist'));
    return current.exports;
  }
  try {
    module.exports = load('plugin').startYacaPlugin({
      runtime: globalThis.mp,
      configPath: path.join(pluginRoot, 'config.json'),
      assetRoot: pluginRoot,
      overlaySource: ${JSON.stringify(overlay)}
    });
  } catch (error) {
    console.error('[YacaPlugin] Startup failed. Configure ' + path.join(pluginRoot, 'config.json') + ':', error);
    throw error;
  }
})(require);
`;
const destination = path.join(root, 'dist', 'plugin');
fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, 'server.js'), entry);
fs.writeFileSync(path.join(destination, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.cpSync(path.join(root, 'Runtime'), path.join(destination, 'Runtime'), { recursive: true });
fs.copyFileSync(path.join(root, 'config.json'), path.join(destination, 'config.json'));
fs.cpSync(path.join(root, 'assets'), path.join(destination, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'tools', 'plugin-state.cjs'), path.join(destination, 'set-enabled.cjs'));
console.log(`Built drop-in plugin: dist/plugin/ (${Buffer.byteLength(entry)} bytes, no npm runtime dependencies)`);
