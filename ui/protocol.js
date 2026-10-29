/* YaCA wire format, checked against fivem-yaca-typescript main (6d766a0).
 * Independent SkyMP implementation; see docs/COMPATIBILITY.md for sources. */
(function (root) {
  'use strict';
  function init(config, name) {
    return {
      base: { request_type: 'INIT' }, server_guid: config.yaca.uniqueServerId,
      ingame_name: name, ingame_channel: config.yaca.ingameChannelId,
      default_channel: config.yaca.defaultChannelId,
      ingame_channel_password: config.yaca.ingameChannelPassword,
      excluded_channels: config.yaca.excludeChannels,
      muffling_range: -1, build_type: 0, unmute_delay: 400,
      operation_mode: config.yaca.useWhisper ? 1 : 0,
      disabled_filters: [], custom_room_acoustics: [],
    };
  }
  function response(raw) {
    if (typeof raw !== 'string' || raw.length > 65536) return null;
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || typeof data.code !== 'string') return null;
      if (data.code === 'OK' && data.requestType === 'JOIN') {
        if (typeof data.message !== 'number' && typeof data.message !== 'string') return null;
        if (!/^[1-9]\d*$/.test(String(data.message))) return null;
        var id = Number(data.message);
        return id <= 65535 ? { kind: 'joined', clientId: id } : null;
      }
      if (data.code === 'TALK_STATE' && ['0', '1'].indexOf(data.message) !== -1) return { kind: 'talk', talking: data.message === '1' };
      if (data.code === 'SOUND_STATE') {
        var sound = typeof data.message === 'string' ? JSON.parse(data.message) : null;
        if (!sound || !['microphoneMuted', 'microphoneDisabled', 'soundMuted', 'soundDisabled'].every(function (key) { return typeof sound[key] === 'boolean'; })) return null;
        return { kind: 'sound', sound: sound };
      }
      if (data.code === 'MOVED_CHANNEL' && ['INGAME_CHANNEL', 'EXCLUDED_CHANNEL'].indexOf(data.message) !== -1) {
        return { kind: 'state', state: data.message === 'INGAME_CHANNEL' ? 'IN_INGAME_CHANNEL' : 'IN_EXCLUDED_CHANNEL' };
      }
      if (['WRONG_TS_SERVER', 'OUTDATED_VERSION'].indexOf(data.code) !== -1) return { kind: 'state', state: data.code };
      if (['MOVE_ERROR', 'MAX_PLAYER_COUNT_REACHED', 'LICENSE_SERVER_TIMED_OUT'].indexOf(data.code) !== -1) return { kind: 'error', code: data.code };
      return null;
    } catch (_) { return null; }
  }
  function spatial(frame, range, muted) {
    return { base: { request_type: 'INGAME' }, player: {
      player_direction: frame.local.direction, player_position: frame.local.position,
      player_range: range, player_is_underwater: false, player_is_muted: muted,
      players_list: frame.peers.map(function (p) { return {
        client_id: p.clientId, position: p.position, direction: p.direction,
        range: p.voiceRange, is_underwater: false, muffle_intensity: 0, is_muted: false,
      }; }),
    } };
  }
  var api = { init: init, response: response, spatial: spatial };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SkyMpYacaProtocol = api;
})(typeof window !== 'undefined' ? window : globalThis);
