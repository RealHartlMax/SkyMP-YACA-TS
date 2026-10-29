const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fixture } = require('./fixture.cjs');

// Only the DOM methods used by the overlay; timers and the YACA socket are
// controlled independently of native Skyrim updates to reproduce load screens.
function overlay() {
  let now = 100000, timerId = 0;
  const timers = new Map(), nodes = new Map(), messages = [], sockets = [];
  const element = () => ({
    children: [], hidden: false, attributes: {},
    classList: { toggle() {} }, style: { setProperty() {} },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key] ?? null; },
    addEventListener() {}, focus() {}, remove() { this.removed = true; },
    attachShadow() { return this.shadow = element(); },
    getElementById(id) { return nodes.get(id); },
    set innerHTML(html) {
      for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        const node = element();
        node.hidden = /\bhidden\b/.test(match[0]);
        nodes.set(match[1], node);
      }
    },
  });
  const document = { body: element(), createElement: element, createTextNode: text => ({ textContent: text }) };
  class WebSocket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closes = 0; sockets.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    open() { this.readyState = 1; this.onopen?.(); }
    message(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
    close() { this.closes++; this.readyState = 3; this.onclose?.(); }
  }
  const schedule = (callback, delay, interval = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, at: now + delay, interval });
    return id;
  };
  const window = { addEventListener() {}, removeEventListener() {},
    skyrimPlatform: { sendMessage: value => messages.push(value) } };
  const context = { window, document, WebSocket, Date: class extends Date { static now() { return now; } },
    setTimeout: (cb, delay) => schedule(cb, delay), clearTimeout: id => timers.delete(id),
    setInterval: (cb, delay) => schedule(cb, delay, delay), clearInterval: id => timers.delete(id) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/ui/overlay.js'), 'utf8'), context);
  const advance = ms => {
    const target = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, timer] = next;
      now = timer.at;
      if (timer.interval) timer.at += timer.interval;
      else timers.delete(id);
      timer.callback();
    }
    now = target;
  };
  const f = fixture();
  f.event(101, { type: 'ready' });
  const frame = { owner: f.owner(101), local: { position: { x: 1, y: 2, z: 3 }, direction: { x: 0, y: 1, z: 0 } },
    peers: [{ clientId: 12, voiceRange: 8, position: { x: 2, y: 2, z: 3 }, direction: { x: 0, y: 1, z: 0 } }] };
  const receive = value => window.SkyMpYaca.receive(value ?? frame);
  const join = (socket = sockets.at(-1)) => {
    socket.open();
    socket.message({ code: 'OK', requestType: 'JOIN', message: '11' });
  };
  const reports = () => messages.filter(msg => msg.type === 'report');
  return { window, document, nodes, sockets, messages, timers, frame, receive, join, reports, advance,
    server: f, now: () => now, jump: ms => { now += ms; }, view: () => document.body.children[0].shadow.children[1] };
}

test('long native loading pauses keep the joined socket, suspend stale spatial audio and resume without another JOIN', () => {
  const o = overlay();
  o.receive(); o.join(); o.receive();
  const socket = o.sockets[0];
  assert.equal(o.nodes.get('connection-overlay').hidden, true); // JOIN without MOVED_CHANNEL.
  socket.message({ code: 'TALK_STATE', message: '1' });
  o.window.SkyMpYaca.toggle();
  o.advance(45000);
  assert.equal(o.sockets.length, 1);
  assert.equal(socket.closes, 0);
  assert.equal(o.view().hidden, true);
  assert.equal(o.nodes.get('panel').hidden, true);
  assert.equal(o.messages.filter(msg => msg.type === 'focus').at(-1).open, false);
  assert.equal(o.reports().at(-1).pluginState, 'IN_INGAME_CHANNEL');
  assert.equal(o.reports().at(-1).clientId, 11);
  assert.equal(o.reports().at(-1).talking, false);
  assert.deepEqual(socket.sent.at(-1).player.players_list, []);
  assert.equal(socket.sent.at(-1).player.player_is_muted, true);
  assert.equal(socket.sent.at(-1).player.player_range, 0);
  const reportsBefore = o.reports().length;
  o.receive();
  assert.equal(o.view().hidden, false);
  assert.equal(o.nodes.get('connection-overlay').hidden, true);
  assert.equal(o.reports().length, reportsBefore + 1);
  assert.equal(o.reports().at(-1).pluginState, 'IN_INGAME_CHANNEL');
  assert.equal(socket.sent.at(-1).player.players_list[0].client_id, 12);
  assert.equal(socket.sent.at(-1).player.player_is_muted, false);
  assert.equal(socket.sent.filter(packet => packet.base.request_type === 'INIT').length, 1);
  o.window.SkyMpYaca.stop();
  assert.equal(socket.closes, 1);
  assert.equal(o.timers.size, 0);
});

test('explicit loading frames pause immediately and retain real mute and channel changes', () => {
  const o = overlay();
  o.receive(); o.join(); o.receive();
  o.receive({ owner: o.frame.owner, suspended: true });
  assert.equal(o.view().hidden, true);
  assert.deepEqual(o.sockets[0].sent.at(-1).player.players_list, []);
  o.sockets[0].message({ code: 'SOUND_STATE', message: JSON.stringify({ microphoneMuted: true,
    microphoneDisabled: false, soundMuted: false, soundDisabled: false }) });
  o.sockets[0].message({ code: 'MOVED_CHANNEL', message: 'EXCLUDED_CHANNEL' });
  o.advance(15000);
  o.receive();
  assert.equal(o.nodes.get('connection-overlay').hidden, false);
  assert.equal(o.nodes.get('required-title').textContent, 'Ingame-Sprachkanal betreten');
  o.sockets[0].message({ code: 'MOVED_CHANNEL', message: 'INGAME_CHANNEL' });
  o.receive();
  assert.equal(o.nodes.get('connection-overlay').hidden, true);
  assert.equal(o.sockets[0].sent.at(-1).player.player_is_muted, true);
  o.window.SkyMpYaca.stop();
});

test('real socket loss during loading reconnects on return and still needs a confirmed JOIN', () => {
  const o = overlay();
  o.receive(); o.join();
  o.advance(20000);
  o.sockets[0].close();
  assert.equal(o.reports().at(-1).pluginState, 'NOT_CONNECTED');
  o.advance(5000);
  o.receive();
  assert.equal(o.sockets.length, 2);
  assert.equal(o.nodes.get('connection-overlay').hidden, false);
  o.join();
  assert.equal(o.nodes.get('connection-overlay').hidden, true);
  o.window.SkyMpYaca.stop();
});

test('a pause of both CEF timers and native updates resynchronizes status without reconnecting', () => {
  const o = overlay();
  o.receive(); o.join();
  const reportsBefore = o.reports().length;
  o.jump(60000);
  o.receive();
  assert.equal(o.sockets.length, 1);
  assert.equal(o.sockets[0].closes, 0);
  assert.equal(o.reports().length, reportsBefore + 1);
  assert.equal(o.reports().at(-1).clientId, 11);
  assert.equal(o.nodes.get('connection-overlay').hidden, true);
  o.window.SkyMpYaca.stop();
});

test('resuming after server session expiry restores the confirmed TeamSpeak status immediately', t => {
  let o;
  t.mock.method(Date, 'now', () => o ? o.now() : 100000);
  o = overlay();
  o.receive(); o.join();
  o.server.event(101, o.reports().at(-1));
  assert.equal(o.server.owner(101).state.clientId, 11);
  o.server.join(102, 12);
  o.jump(45000);
  o.server.event(102, { type: 'ready' });
  assert.equal(o.server.runtime.get(101, 'yacaPeer'), null);
  o.server.event(101, { type: 'ready' });
  assert.equal(o.server.owner(101).state.pluginState, 'NOT_CONNECTED');
  o.receive({ ...o.frame, owner: o.server.owner(101) });
  o.server.event(101, o.reports().at(-1));
  assert.equal(o.server.owner(101).state.pluginState, 'IN_INGAME_CHANNEL');
  assert.equal(o.server.runtime.get(101, 'yacaPeer').clientId, 11);
  assert.equal(o.sockets.length, 1);
  assert.equal(o.sockets[0].closes, 0);
  assert.equal(o.nodes.get('connection-overlay').hidden, true);
  o.window.SkyMpYaca.stop();
});

test('a bridge change closes the previous socket and does not reuse its JOIN', () => {
  const o = overlay();
  o.receive(); o.join(); o.advance(5000);
  o.receive({ ...o.frame, owner: { ...o.frame.owner, bridgeId: 'another-bridge' } });
  assert.equal(o.sockets[0].closes, 1);
  assert.equal(o.sockets.length, 2);
  assert.equal(o.nodes.get('connection-overlay').hidden, false);
  o.window.SkyMpYaca.stop();
});
