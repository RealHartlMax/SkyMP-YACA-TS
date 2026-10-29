/* Runs in the existing SkyrimPlatform browser. ASSETS is supplied by build-ui.cjs. */
(function () {
  'use strict';
  var overlayVersion = '2026-10-28-ui-core-v2';
  if (window.SkyMpYaca) {
    if (window.SkyMpYaca.version === overlayVersion) return;
    window.SkyMpYaca.stop();
  }
  var protocol = window.SkyMpYacaProtocol;
  var host = document.createElement('div');
  host.id = 'skymp-yaca-root';
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = ASSETS.css;
  root.appendChild(style);
  var view = document.createElement('div');
  view.innerHTML = ASSETS.html;
  view.hidden = true;
  root.appendChild(view);
  (ASSETS.parent || document.body || document.documentElement).appendChild(host);
  var $ = function (id) { return root.getElementById(id); };
  var owner = null, bridgeId = null, socket = null, retry = null, connectTimer = null;
  var opened = false, stopped = false, lastFrame = 0, lastReport = 0, rangeSignature = '', error = '';
  var plugin = freshPlugin();
  var failedImage = null;
  var states = {
    NOT_CONNECTED: ['TeamSpeak verbinden', 'Starte TeamSpeak mit dem YACA-Plugin und verbinde dich mit dem Server deiner Spielwelt.'],
    CONNECTED: ['Sprachverbindung wird hergestellt', 'Warte auf die Verbindung zum richtigen TeamSpeak-Server und Ingame-Kanal.'],
    IN_INGAME_CHANNEL: ['Sprachverbindung aktiv', 'Du bist mit dem Ingame-Kanal verbunden.'],
    IN_EXCLUDED_CHANNEL: ['Ingame-Sprachkanal betreten', 'Du bist außerhalb des Ingame-Kanals. Wechsle zurück, um die anderen zu hören.'],
    WRONG_TS_SERVER: ['Falscher TeamSpeak-Server', 'Verbinde dich mit dem TeamSpeak-Server dieser Spielwelt.'],
    OUTDATED_VERSION: ['YACA-Plugin aktualisieren', 'Installiere die vom YACA-Server geforderte Plugin-Version.'],
  };
  var errors = {
    MOVE_ERROR: 'Der Beitritt zum TeamSpeak-Kanal ist fehlgeschlagen.',
    MAX_PLAYER_COUNT_REACHED: 'Die YACA-Lizenz hat ihre Spielergrenze erreicht.',
    LICENSE_SERVER_TIMED_OUT: 'Der YACA-Lizenzserver antwortet gerade nicht.',
  };
  function freshPlugin() {
    return { pluginState: 'NOT_CONNECTED', clientId: null, talking: false,
      microphoneMuted: false, microphoneDisabled: false, soundMuted: false, soundDisabled: false };
  }
  function emit(message) {
    if (ASSETS.focus && message.type === 'focus') { ASSETS.focus(message.open === true); return; }
    if (window.skyrimPlatform && typeof window.skyrimPlatform.sendMessage === 'function')
      window.skyrimPlatform.sendMessage(Object.assign({ source: 'skymp-yaca' }, message));
  }
  function online() { return plugin.pluginState === 'IN_INGAME_CHANNEL' && plugin.clientId !== null; }
  function micMuted() { return plugin.microphoneMuted || plugin.microphoneDisabled; }
  function effectivelyTalking() { return online() && plugin.talking && !micMuted() && !plugin.soundMuted && !plugin.soundDisabled; }
  function report() {
    if (stopped || !owner || owner.preview) return;
    lastReport = Date.now();
    emit(Object.assign({ type: 'report' }, plugin, { talking: effectivelyTalking() }));
  }
  function send(command) { if (socket && socket.readyState === 1) socket.send(JSON.stringify(command)); }
  function disconnect() {
    clearTimeout(retry); clearTimeout(connectTimer); retry = null;
    var previous = socket;
    socket = null;
    if (previous) { previous.onclose = null; previous.onopen = null; previous.onmessage = null; previous.onerror = null; previous.close(); }
    plugin = freshPlugin();
  }
  function scheduleReconnect() {
    if (stopped || !owner || owner.preview || Date.now() - lastFrame > 3000 || retry) return;
    retry = setTimeout(function () { retry = null; connect(); }, 1500);
  }
  function connect() {
    if (socket || retry || stopped || !owner || owner.preview) return;
    try { socket = new WebSocket(owner.config.client.webSocketUrl); }
    catch (_) { error = 'Die lokale Plugin-Verbindung konnte nicht geöffnet werden.'; scheduleReconnect(); render(); return; }
    var current = socket;
    connectTimer = setTimeout(function () { if (socket === current && !plugin.clientId) current.close(); }, 10000);
    current.onopen = function () {
      if (socket !== current) return;
      error = ''; plugin.pluginState = 'CONNECTED';
      send(protocol.init(owner.config, 'SkyMP-' + owner.state.actorId.toString(16)));
      report(); render();
    };
    current.onmessage = function (event) {
      if (socket !== current) return;
      var result = protocol.response(event.data);
      if (!result) return;
      if (result.kind === 'joined') {
        plugin.clientId = result.clientId;
        clearTimeout(connectTimer);
        // JOIN confirms admission to the configured server/channel. Some YACA
        // versions do not emit MOVED_CHANNEL for this initial automatic move.
        if (plugin.pluginState !== 'IN_EXCLUDED_CHANNEL') plugin.pluginState = 'IN_INGAME_CHANNEL';
        error = '';
      }
      else if (result.kind === 'state') {
        plugin.pluginState = result.state; error = '';
        if (!online()) plugin.talking = false;
      } else if (result.kind === 'talk') plugin.talking = result.talking;
      else if (result.kind === 'sound') Object.assign(plugin, result.sound);
      else if (result.kind === 'error') { error = errors[result.code]; plugin.pluginState = 'CONNECTED'; plugin.talking = false; }
      report(); render();
    };
    current.onerror = function () { /* onclose supplies the reconnect transition. */ };
    current.onclose = function () {
      if (socket !== current) return;
      clearTimeout(connectTimer); socket = null; plugin = freshPlugin();
      report(); render(); scheduleReconnect();
    };
  }
  function setOpen(value) {
    if (!owner || view.hidden || opened === value || (value && ASSETS.allowed === false)) return;
    opened = value;
    $('panel').hidden = !value;
    emit({ type: 'focus', open: value });
    if (value) $('close').focus();
  }
  function action(name, value) {
    if (!owner) return;
    if (owner.preview) {
      if (owner.state.rangeChangeAllowed) {
        var count = owner.config.voiceRanges.ranges.length;
        if (name === 'range') owner.state.rangeIndex = value;
        if (name === 'cycleRange') owner.state.rangeIndex = (owner.state.rangeIndex + value + count) % count;
      }
      render();
    } else emit({ type: 'action', action: name, value: value });
  }
  function text(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
  function render() {
    if (!owner) return;
    var config = owner.config, state = owner.state, ready = online(), talking = effectivelyTalking();
    var status = states[plugin.pluginState] || states.NOT_CONNECTED;
    text('title', config.ui.title);
    text('status-title', error ? 'Verbindung prüfen' : status[0]);
    text('status-text', error || status[1]);
    $('status-dot').classList.toggle('online', ready);
    $('speaking').classList.toggle('active', talking);
    text('speaking', talking ? 'Du sprichst' : ready ? 'Bereit' : 'Offline');
    // The persistent range indicator is owned by SkyMP UI Core, not this overlay.
    var ranges = config.voiceRanges.ranges, range = ranges[state.rangeIndex];
    $('range-value').replaceChildren(document.createTextNode(String(range)), Object.assign(document.createElement('span'), { textContent: ' m' }));
    text('range-name', state.rangeIndex === 0 ? 'Flüstern' : state.rangeIndex === 1 ? 'Normal' : state.rangeIndex === ranges.length - 1 ? 'Weit rufen' : 'Rufen');
    var signature = JSON.stringify(ranges);
    if (signature !== rangeSignature) {
      rangeSignature = signature; $('ranges').replaceChildren();
      ranges.forEach(function (r, i) {
        var button = document.createElement('button');
        button.textContent = r + ' m'; button.setAttribute('aria-label', 'Sprachreichweite ' + r + ' Meter');
        button.addEventListener('click', function () { action('range', i); });
        $('ranges').appendChild(button);
      });
    }
    Array.from($('ranges').children).forEach(function (b, i) {
      b.setAttribute('aria-pressed', String(i === state.rangeIndex)); b.disabled = !state.rangeChangeAllowed;
    });
    text('range-hint', state.rangeChangeAllowed ? config.keyBinds.cycleVoiceRange + ': Reichweite wechseln · Numpad + / −: vor / zurück' : 'Die Sprachreichweite ist vom Server gesperrt.');
    text('mic', !ready ? 'Nicht verbunden' : plugin.microphoneDisabled ? 'Deaktiviert' : plugin.microphoneMuted ? 'Stumm' : 'Aktiv');
    text('sound', !ready ? 'Nicht verbunden' : plugin.soundDisabled ? 'Deaktiviert' : plugin.soundMuted ? 'Stumm' : 'Aktiv');
    $('mic').classList.toggle('muted', micMuted()); $('sound').classList.toggle('muted', plugin.soundMuted || plugin.soundDisabled);
    var overlay = config.ui.connectionOverlay || {};
    $('connection-overlay').hidden = ready;
    $('connection-overlay').style.setProperty('--shade-opacity', overlay.backgroundOpacity === undefined ? 0.68 : overlay.backgroundOpacity);
    text('required-title', error ? 'Sprachverbindung prüfen' : status[0]);
    text('required-detail', error || status[1]);
    text('required-message', overlay.message || 'Verbinde dich mit dem TeamSpeak dieser Spielwelt.');
    text('required-address', config.teamspeak.serverUrl + ':' + config.teamspeak.serverPort);
    var image = $('required-image'), source = overlay.imageUrl || ASSETS.fallbackImage;
    if (source === failedImage) source = ASSETS.fallbackImage;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    image.alt = overlay.imageAlt || '';
    $('preview').hidden = !owner.preview;
  }
  function receive(frame) {
    if (stopped || !frame || !frame.owner || !frame.owner.config || !frame.owner.state) return;
    lastFrame = Date.now(); view.hidden = false;
    if (bridgeId !== frame.owner.bridgeId) { disconnect(); bridgeId = frame.owner.bridgeId; error = ''; }
    owner = frame.owner;
    if (owner.preview) plugin = Object.assign(freshPlugin(), owner.state);
    else {
      connect();
      if (online() && frame.local && Array.isArray(frame.peers))
        send(protocol.spatial(frame, owner.config.voiceRanges.ranges[owner.state.rangeIndex], micMuted()));
    }
    render();
  }
  function matches(event, binding) {
    return binding === 'ADD' ? event.code === 'NumpadAdd' : binding === 'SUBTRACT' ? event.code === 'NumpadSubtract' : binding === 'CAPITAL' ? event.key === 'CapsLock' : event.key.toUpperCase() === binding;
  }
  function keydown(event) {
    if (!opened || !owner) return;
    if (event.key === 'Escape' || event.key === owner.config.ui.toggleKey) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); return;
    }
    if (event.repeat || !owner.state.rangeChangeAllowed) return;
    var keys = owner.config.keyBinds;
    if (matches(event, keys.cycleVoiceRange) || matches(event, keys.increaseVoiceRange)) {
      event.preventDefault(); event.stopPropagation(); action('cycleRange', 1);
    } else if (matches(event, keys.decreaseVoiceRange)) {
      event.preventDefault(); event.stopPropagation(); action('cycleRange', -1);
    }
  }
  $('close').addEventListener('click', function () { setOpen(false); });
  $('required-image').addEventListener('error', function () {
    failedImage = this.getAttribute('src');
    if (this.getAttribute('src') !== ASSETS.fallbackImage) this.setAttribute('src', ASSETS.fallbackImage);
  });
  window.addEventListener('keydown', keydown, true);
  var interval = setInterval(function () {
    emit({ type: 'heartbeat' });
    if (!owner || owner.preview) return;
    if (Date.now() - lastFrame > 3000) {
      disconnect(); setOpen(false); view.hidden = true; return;
    }
    if (Date.now() - lastReport >= 2000) report();
  }, 1000);
  function stop() {
    if (stopped) return;
    stopped = true; disconnect();
    if (opened) setOpen(false);
    clearInterval(interval);
    window.removeEventListener('keydown', keydown, true); window.removeEventListener('pagehide', stop);
    host.remove(); delete window.SkyMpYaca;
  }
  window.addEventListener('pagehide', stop);
  window.SkyMpYaca = { version: overlayVersion, receive: receive, toggle: function () { setOpen(!opened); }, dismiss: function () { setOpen(false); }, stop: stop };
  emit({ type: 'ready' });
})();
