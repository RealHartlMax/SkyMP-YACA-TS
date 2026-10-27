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
    increase: KEY_CODES[config.keyBinds.increaseVoiceRange],
    decrease: KEY_CODES[config.keyBinds.decreaseVoiceRange],
    primary: KEY_CODES[config.keyBinds.primaryRadioTransmit],
    secondary: KEY_CODES[config.keyBinds.secondaryRadioTransmit],
    toggle: KEY_CODES[config.ui.toggleKey],
  };
  const events = `
var sp = ctx.sp;
var old = sp.storage.skympYaca;
if (old && old.browserHandler !== undefined && sp.unsubscribe) sp.unsubscribe(old.browserHandler);
var s = { neighbors: {}, owner: null, ownerSeenAt: 0, disabled: false, keys: {}, lastFrame: 0, lastBoot: 0, heartbeat: 0, lastReady: 0, transmitting: null, focusBefore: false };
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
  sp.once('update', tick);
  var now = Date.now();
  if (s.owner && s.owner.disabled) {
    if (!s.disabled) { s.disabled = true; execute('window.SkyMpYaca && window.SkyMpYaca.stop()'); }
    return;
  }
  if (now - s.heartbeat > 3000 && now - s.lastBoot > 2000) {
    s.lastBoot = now;
    execute(bootstrap);
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
  if (!menu && pressed.toggle && !s.keys.toggle) execute('window.SkyMpYaca && window.SkyMpYaca.toggle()');
  if (!menu && !focused) {
    var count = owner.config.voiceRanges.ranges.length;
    if (pressed.increase && !s.keys.increase) action('range', (owner.state.rangeIndex + 1) % count);
    if (pressed.decrease && !s.keys.decrease) action('range', (owner.state.rangeIndex + count - 1) % count);
  }
  var transmitting = !menu && !focused && owner.state.radioEnabled &&
    owner.state.pluginState === 'IN_INGAME_CHANNEL' && owner.state.clientId &&
    !owner.state.microphoneMuted && !owner.state.microphoneDisabled ?
    (pressed.primary ? owner.state.primaryChannel : pressed.secondary ? owner.state.secondaryChannel : null) : null;
  if (s.transmitting !== transmitting) { s.transmitting = transmitting; action('transmit', transmitting); }
  s.keys = pressed;
  if (now - s.lastFrame < owner.config.client.updateIntervalMs) return;
  s.lastFrame = now;
  var player = sp.Game.getPlayer();
  if (!player) return;
  var frame = { owner: owner, local: sample(player, owner.config.client.unitsPerMeter), peers: [] };
  var localSpace = space(player);
  Object.keys(s.neighbors).forEach(function (id) {
    var n = s.neighbors[id];
    if (now - n.seen > 1000) { delete s.neighbors[id]; return; }
    try {
      if (!localSpace || space(n.ref) !== localSpace) return;
      var p = sample(n.ref, owner.config.client.unitsPerMeter);
      frame.peers.push({ clientId: n.peer.clientId, voiceRange: n.peer.voiceRange, position: p.position, direction: p.direction });
    } catch (_) { delete s.neighbors[id]; }
  });
  execute('window.SkyMpYaca && window.SkyMpYaca.receive(' + JSON.stringify(frame) + ')');
};
sp.once('update', tick);
`;
  // The native fork limits each generated function body to 100 KiB.
  for (const [name, body] of Object.entries({ owner, neighbor, events })) {
    if (Buffer.byteLength(body, "utf8") > 100 * 1024) throw new Error(`[YacaBridge] ${name} client source exceeds SkyMP's 100 KiB limit`);
  }
  return { owner, neighbor, events };
}
