import { KEY_CODES } from "./configLoader";
import { YacaBridgeConfig } from "./types/config";

/** Bodies executed by the fork's GamemodeUpdate/EventSource services. */
export function buildClientSources(overlay: string, config: YacaBridgeConfig) {
  const owner = `
var s = ctx.sp.storage.skympYaca;
if (s) {
  if (!s.owner || s.owner.bridgeId !== ctx.value.bridgeId || s.owner.revision !== ctx.value.revision) s.ownerSeenAt = Date.now();
  s.owner = ctx.value;
}
`;
  const neighbor = `
var s = ctx.sp.storage.skympYaca;
if (s && ctx.refr && ctx.value && ctx.value.clientId) {
  s.neighbors[ctx.refr.getFormID()] = { ref: ctx.refr, peer: ctx.value, seen: Date.now() };
}
`;
  const keys = {
    cycle: KEY_CODES[config.keyBinds.cycleVoiceRange],
    increase: KEY_CODES[config.keyBinds.increaseVoiceRange],
    decrease: KEY_CODES[config.keyBinds.decreaseVoiceRange],
    toggle: KEY_CODES[config.ui.toggleKey],
  };
  const events = `
var sp = ctx.sp;
var old = sp.storage.skympYaca;
if (old && old.browserHandler !== undefined && sp.unsubscribe) sp.unsubscribe(old.browserHandler);
var s = { neighbors: {}, owner: null, ownerSeenAt: 0, disabled: false, keys: {}, lastFrame: 0, lastBoot: 0, booted: false, heartbeat: 0, lastReady: 0, focusBefore: false };
sp.storage.skympYaca = s;
var codes = ${JSON.stringify(keys)};
var bootstrap = ${JSON.stringify(overlay)};
var alive = function () { return !ctx._expired && sp.storage.skympYaca === s; };
var send = function (payload) { if (alive()) ctx.sendEvent(payload); };
var execute = function (code) { sp.browser.executeJavaScript(code); };
var action = function (name, value) { send({ type: 'action', action: name, value: value }); };
var space = function (ref) {
  var cell = ref.getParentCell();
  var world = ref.getWorldSpace();
  return cell && cell.isInterior() ? 'c:' + cell.getFormID() : world ? 'w:' + world.getFormID() : cell ? 'c:' + cell.getFormID() : '';
};
var sample = function (ref, units) {
  var yaw = ref.getAngleZ() * Math.PI / 180;
  return { position: { x: ref.getPositionX() / units, y: ref.getPositionY() / units, z: ref.getPositionZ() / units },
    direction: { x: Math.sin(yaw), y: Math.cos(yaw), z: 0 } };
};
s.browserHandler = sp.on('browserMessage', function (event) {
  if (!alive()) return;
  var msg = event.arguments && event.arguments[0];
  if (!msg || msg.source !== 'skymp-yaca') return;
  if (msg.type === 'heartbeat') { s.heartbeat = Date.now(); return; }
  if (msg.type === 'focus') {
    if (msg.open === true) {
      s.focusBefore = sp.browser.isFocused();
      sp.browser.setVisible(true);
      sp.browser.setFocused(true);
    } else sp.browser.setFocused(s.focusBefore);
    return;
  }
  if (msg.type === 'ready' || msg.type === 'report' || msg.type === 'action') send(msg);
});
var tick = function () {
  if (!alive()) return;
  if (sp.mpClientPlugin && !sp.mpClientPlugin.isConnected()) {
    execute('window.SkyMpYaca && window.SkyMpYaca.stop()');
    if (sp.unsubscribe) sp.unsubscribe(s.browserHandler);
    delete sp.storage.skympYaca;
    return;
  }
  sp.once('update', tick);
  var now = Date.now();
  if (s.owner && s.owner.disabled) {
    if (!s.disabled) { s.disabled = true; execute('window.SkyMpYaca && window.SkyMpYaca.stop()'); }
    return;
  }
  if (!s.booted || (now - s.heartbeat > 3000 && now - s.lastBoot > 2000)) {
    s.booted = true;
    s.lastBoot = now;
    var moduleSettings = sp.settings && sp.settings['skymp5-client'];
    if (!moduleSettings || moduleSettings['plugin-runtime-api'] !== 1 || moduleSettings['plugin-runtime-managed'] === false) execute(bootstrap);
  }
  if (now - s.lastReady > 5000) {
    s.lastReady = now;
    send({ type: 'ready' });
  }
  var owner = s.owner;
  if (!owner || !owner.state || !owner.config || now - s.ownerSeenAt > 8000) return;
  var menu = sp.Utility.isInMenuMode();
  var focused = sp.browser.isFocused();
  var pressed = {};
  Object.keys(codes).forEach(function (key) { pressed[key] = sp.Input.isKeyPressed(codes[key]); });
  if (!menu && !focused && pressed.toggle && !s.keys.toggle) execute('window.SkyMpYaca && window.SkyMpYaca.toggle()');
  if (!menu && !focused && owner.state.rangeChangeAllowed) {
    if ((pressed.cycle && !s.keys.cycle) || (pressed.increase && !s.keys.increase)) action('cycleRange', 1);
    else if (pressed.decrease && !s.keys.decrease) action('cycleRange', -1);
  }
  s.keys = pressed;
  if (now - s.lastFrame < owner.config.client.updateIntervalMs) return;
  s.lastFrame = now;
  var deliver = function (frame) { execute('window.SkyMpYaca && window.SkyMpYaca.receive(' + JSON.stringify(frame) + ')'); };
  var player = sp.Game.getPlayer();
  if (!player || (sp.Ui && sp.Ui.isMenuOpen('Loading Menu'))) {
    s.neighbors = {};
    deliver({ owner: owner, suspended: true });
    return;
  }
  var localSpace;
  var local;
  try { localSpace = space(player); local = sample(player, owner.config.client.unitsPerMeter); }
  catch (_) { localSpace = ''; }
  if (!localSpace) { s.neighbors = {}; deliver({ owner: owner, suspended: true }); return; }
  var frame = { owner: owner, local: local, peers: [] };
  Object.keys(s.neighbors).forEach(function (id) {
    var n = s.neighbors[id];
    if (now - n.seen > 1000) { delete s.neighbors[id]; return; }
    try {
      if (!localSpace || space(n.ref) !== localSpace) return;
      var p = sample(n.ref, owner.config.client.unitsPerMeter);
      frame.peers.push({ clientId: n.peer.clientId, voiceRange: n.peer.voiceRange, position: p.position, direction: p.direction });
    } catch (_) { delete s.neighbors[id]; }
  });
  deliver(frame);
};
sp.once('update', tick);
`;
  // The native fork limits each generated function body to 100 KiB.
  for (const [name, body] of Object.entries({ owner, neighbor, events })) {
    if (Buffer.byteLength(body, "utf8") > 100 * 1024) throw new Error(`[YacaBridge] ${name} client source exceeds SkyMP's 100 KiB limit`);
  }
  return { owner, neighbor, events };
}
