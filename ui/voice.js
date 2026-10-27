/* Runs in the existing SkyrimPlatform browser. ASSETS is supplied by build-ui.cjs. */
(function () {
  'use strict';
  if (window.SkyMpYaca) return;
  var protocol = window.SkyMpYacaProtocol;
  var host = document.createElement('div');
  host.id = 'skymp-yaca-root';
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = ASSETS.css;
  root.appendChild(style);
  var view = document.createElement('div');
  view.innerHTML = ASSETS.html;
  root.appendChild(view);
  (document.body || document.documentElement).appendChild(host);
  var $ = function (id) { return root.getElementById(id); };
  var owner = null;
  var bridgeId = null;
  var socket = null;
  var retry = null;
  var connectTimer = null;
  var opened = false;
  var stopped = false;
  var lastFrame = 0;
  var lastReport = 0;
  var radioDevices = {};
  var rangeSignature = '';
  var channelCount = 0;
  var volume = 0.7;
  var error = '';
  var plugin = freshPlugin();
  var states = {
    NOT_CONNECTED: ['TeamSpeak verbinden', 'Starte TeamSpeak und aktiviere das YACA-Plugin.'],
    CONNECTED: ['Plugin verbunden', 'Der Beitritt zum Sprachkanal wird vorbereitet.'],
    IN_INGAME_CHANNEL: ['Sprachverbindung aktiv', 'Du bist mit dem Ingame-Kanal verbunden.'],
    IN_EXCLUDED_CHANNEL: ['Außerhalb des Ingame-Kanals', 'Die räumliche Sprache ist in diesem Kanal pausiert.'],
    WRONG_TS_SERVER: ['Falscher TeamSpeak-Server', 'Verbinde dich mit dem TeamSpeak-Server deiner Spielwelt.'],
    OUTDATED_VERSION: ['Plugin aktualisieren', 'Installiere die vom YACA-Server geforderte Plugin-Version.'],
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
    if (window.skyrimPlatform && typeof window.skyrimPlatform.sendMessage === 'function') {
      window.skyrimPlatform.sendMessage(Object.assign({ source: 'skymp-yaca' }, message));
    }
  }
  function online() { return plugin.pluginState === 'IN_INGAME_CHANNEL' && plugin.clientId !== null; }
  function micMuted() { return plugin.microphoneMuted || plugin.microphoneDisabled; }
  function effectivelyTalking() { return online() && plugin.talking && !micMuted() && !plugin.soundMuted && !plugin.soundDisabled; }
  function report() {
    if (!owner || owner.preview) return;
    lastReport = Date.now();
    emit(Object.assign({ type: 'report' }, plugin, { talking: effectivelyTalking() }));
  }
  function send(command) {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(command));
  }
  function stopRadio() {
    Object.keys(radioDevices).forEach(function (channel) {
      var command = radioDevices[channel];
      send({ base: { request_type: 'INGAME' }, comm_device: Object.assign({}, command.comm_device, { on: false }) });
    });
    radioDevices = {};
  }
  function volumeSettings() {
    if (!owner) return;
    [owner.state.primaryChannel, owner.state.secondaryChannel].forEach(function (channel) {
      if (channel !== null) send({ base: { request_type: 'INGAME' }, comm_device_settings: {
        comm_type: 'RADIO', channel: channel, volume: volume, output_mode: 'STEREO',
      } });
    });
  }
  function syncRadio() {
    var next = online() ? protocol.radio(owner.state, owner.roster, plugin.clientId) : {};
    Object.keys(radioDevices).forEach(function (channel) {
      if (!next[channel] || JSON.stringify(next[channel]) !== JSON.stringify(radioDevices[channel])) {
        send({ base: { request_type: 'INGAME' }, comm_device: Object.assign({}, radioDevices[channel].comm_device, { on: false }) });
      }
    });
    Object.keys(next).forEach(function (channel) {
      if (JSON.stringify(next[channel]) !== JSON.stringify(radioDevices[channel])) {
        send(next[channel]);
        send({ base: { request_type: 'INGAME' }, comm_device_settings: { comm_type: 'RADIO', channel: Number(channel), volume: volume } });
      }
    });
    radioDevices = next;
  }
  function disconnect() {
    clearTimeout(retry);
    clearTimeout(connectTimer);
    retry = null;
    stopRadio();
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
      error = '';
      plugin.pluginState = 'CONNECTED';
      send(protocol.init(owner.config, 'SkyMP-' + owner.state.actorId.toString(16)));
      report();
      render();
    };
    current.onmessage = function (event) {
      if (socket !== current) return;
      var result = protocol.response(event.data);
      if (!result) return;
      if (result.kind === 'joined') {
        plugin.clientId = result.clientId;
        clearTimeout(connectTimer);
        volumeSettings();
      } else if (result.kind === 'state') {
        plugin.pluginState = result.state;
        error = '';
        if (!online()) { plugin.talking = false; stopRadio(); }
      } else if (result.kind === 'talk') plugin.talking = result.talking;
      else if (result.kind === 'sound') Object.assign(plugin, result.sound);
      else if (result.kind === 'error') { error = errors[result.code]; plugin.pluginState = 'CONNECTED'; plugin.talking = false; stopRadio(); }
      report();
      render();
    };
    current.onerror = function () { /* onclose supplies the reconnect transition. */ };
    current.onclose = function () {
      if (socket !== current) return;
      clearTimeout(connectTimer);
      socket = null;
      radioDevices = {};
      plugin = freshPlugin();
      report();
      render();
      scheduleReconnect();
    };
  }
  function setOpen(value) {
    if (opened === value) return;
    opened = value;
    $('panel').hidden = !value;
    $('hud').setAttribute('aria-expanded', String(value));
    emit({ type: 'focus', open: value });
    if (value) $('close').focus(); else $('hud').focus();
  }
  function action(name, value) {
    if (!owner) return;
    if (owner.preview) {
      if (name === 'range' && owner.state.rangeChangeAllowed) owner.state.rangeIndex = value;
      if (['radioEnabled', 'primaryChannel', 'secondaryChannel'].indexOf(name) !== -1) owner.state[name] = value;
      render();
    } else emit({ type: 'action', action: name, value: value });
  }
  function text(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
  function render() {
    if (!owner) return;
    var config = owner.config;
    var state = owner.state;
    var ready = owner.preview || online();
    var talking = effectivelyTalking();
    var status = states[plugin.pluginState] || states.NOT_CONNECTED;
    text('title', config.ui.title);
    text('hud-key', config.ui.toggleKey);
    text('status-title', owner.preview ? 'UI-Vorschau' : error ? 'Verbindung prüfen' : status[0]);
    text('status-text', owner.preview ? 'Beispieldaten · TeamSpeak ist hier nicht verbunden.' : error || status[1] + ' ' + config.teamspeak.serverUrl + ':' + config.teamspeak.serverPort);
    $('status-dot').classList.toggle('online', ready);
    $('hud-dot').classList.toggle('online', ready);
    $('hud-signal').classList.toggle('talking', talking);
    $('speaking').classList.toggle('active', talking);
    text('speaking', talking ? 'Du sprichst' : ready ? 'Bereit' : 'Offline');
    var ranges = config.voiceRanges.ranges;
    var range = ranges[state.rangeIndex];
    text('hud-range', range + ' m');
    $('range-value').replaceChildren(document.createTextNode(String(range)), Object.assign(document.createElement('span'), { textContent: ' m' }));
    text('range-name', state.rangeIndex === 0 ? 'Flüstern' : state.rangeIndex === 1 ? 'Normal' : state.rangeIndex === ranges.length - 1 ? 'Weit rufen' : 'Rufen');
    var signature = JSON.stringify(ranges);
    if (signature !== rangeSignature) {
      rangeSignature = signature;
      $('ranges').replaceChildren();
      ranges.forEach(function (r, i) {
        var button = document.createElement('button');
        button.textContent = r + ' m';
        button.setAttribute('aria-label', 'Sprachreichweite ' + r + ' Meter');
        button.addEventListener('click', function () { action('range', i); });
        $('ranges').appendChild(button);
      });
    }
    Array.from($('ranges').children).forEach(function (b, i) {
      b.setAttribute('aria-pressed', String(i === state.rangeIndex));
      b.disabled = !state.rangeChangeAllowed;
    });
    text('range-hint', state.rangeChangeAllowed ? config.keyBinds.increaseVoiceRange + ' / ' + config.keyBinds.decreaseVoiceRange + ': Reichweite wechseln' : 'Die Sprachreichweite ist vom Server gesperrt.');
    text('mic', !ready ? 'Nicht verbunden' : plugin.microphoneDisabled ? 'Deaktiviert' : plugin.microphoneMuted ? 'Stumm' : 'Aktiv');
    text('sound', !ready ? 'Nicht verbunden' : plugin.soundDisabled ? 'Deaktiviert' : plugin.soundMuted ? 'Stumm' : 'Aktiv');
    $('mic').classList.toggle('muted', micMuted());
    $('sound').classList.toggle('muted', plugin.soundMuted || plugin.soundDisabled);
    $('radio-power').setAttribute('aria-pressed', String(state.radioEnabled));
    text('radio-power', state.radioEnabled ? 'Eingeschaltet' : 'Ausgeschaltet');
    $('radio-fields').disabled = !state.radioEnabled;
    if (channelCount !== config.radio.maxChannels) {
      channelCount = config.radio.maxChannels;
      $('primary').replaceChildren();
      $('secondary').replaceChildren(new Option('Aus', 'none'));
      for (var i = 0; i < channelCount; i++) {
        $('primary').appendChild(new Option('Kanal ' + String(i + 1).padStart(2, '0'), String(i)));
        $('secondary').appendChild(new Option('Kanal ' + String(i + 1).padStart(2, '0'), String(i)));
      }
    }
    // Do not overwrite a native select while its menu is open.
    if (root.activeElement !== $('primary')) $('primary').value = String(state.primaryChannel);
    if (root.activeElement !== $('secondary')) $('secondary').value = state.secondaryChannel === null ? 'none' : String(state.secondaryChannel);
    var transmitting = ready && state.transmitting !== null;
    $('transmission').classList.toggle('active', transmitting);
    text('tx-text', !state.radioEnabled ? 'Funk ausgeschaltet' : !ready ? 'Warte auf die Sprachverbindung' : transmitting ? 'Sende auf Kanal ' + (state.transmitting + 1) : 'Empfangsbereit');
    text('keys', config.keyBinds.primaryRadioTransmit + ' halten: Sprechen · ' + config.keyBinds.secondaryRadioTransmit + ': Zweitkanal');
    $('preview').hidden = !owner.preview;
  }
  function receive(frame) {
    if (stopped || !frame || !frame.owner || !frame.owner.config || !frame.owner.state) return;
    lastFrame = Date.now();
    if (bridgeId !== frame.owner.bridgeId) {
      disconnect();
      bridgeId = frame.owner.bridgeId;
      error = '';
    }
    owner = frame.owner;
    if (!owner.preview) {
      connect();
      if (online() && frame.local && Array.isArray(frame.peers)) {
        send(protocol.spatial(frame, owner.config.voiceRanges.ranges[owner.state.rangeIndex], micMuted()));
      }
      syncRadio();
    }
    render();
  }
  function keydown(event) {
    if (opened && (event.key === 'Escape' || owner && event.key === owner.config.ui.toggleKey)) {
      event.preventDefault(); event.stopPropagation(); setOpen(false);
    }
  }
  $('hud').addEventListener('click', function () { setOpen(!opened); });
  $('close').addEventListener('click', function () { setOpen(false); });
  $('radio-power').addEventListener('click', function () { if (owner) action('radioEnabled', !owner.state.radioEnabled); });
  $('primary').addEventListener('change', function () { action('primaryChannel', Number($('primary').value)); });
  $('secondary').addEventListener('change', function () { action('secondaryChannel', $('secondary').value === 'none' ? null : Number($('secondary').value)); });
  $('volume').addEventListener('input', function () {
    volume = Number($('volume').value) / 100;
    text('volume-output', Math.round(volume * 100) + ' %');
    volumeSettings();
  });
  window.addEventListener('keydown', keydown, true);
  var interval = setInterval(function () {
    emit({ type: 'heartbeat' });
    if (!owner || owner.preview) return;
    if (Date.now() - lastFrame > 3000) {
      if (socket) { disconnect(); report(); render(); }
      return;
    }
    if (Date.now() - lastReport >= 2000) report();
  }, 1000);
  function stop() {
    if (stopped) return;
    stopped = true;
    disconnect();
    report();
    if (opened) setOpen(false);
    clearInterval(interval);
    window.removeEventListener('keydown', keydown, true);
    window.removeEventListener('pagehide', stop);
    host.remove();
    delete window.SkyMpYaca;
  }
  window.addEventListener('pagehide', stop);
  window.SkyMpYaca = { receive: receive, toggle: function () { setOpen(!opened); }, stop: stop };
  emit({ type: 'ready' });
})();
