const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sample = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const preview = {
  bridgeId: 'preview', preview: true, config: sample,
  state: { actorId: 0xff000001, rangeIndex: sample.voiceRanges.defaultIndex, rangeChangeAllowed: true,
    radioEnabled: false, primaryChannel: sample.radio.defaultChannel, secondaryChannel: sample.radio.secondaryChannel, transmitting: null },
  roster: [],
};
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SkyMP Voice · UI-Vorschau</title><style>
html,body{margin:0;min-height:100%;font:15px/1.6 'Segoe UI',sans-serif;background:#141b22;color:#dcd8cc}body{min-height:100vh;background:radial-gradient(ellipse at 25% 80%,#344441 0,transparent 65%),linear-gradient(155deg,#252e3c,#11171e)}main{padding:80px 6vw;max-width:620px}small{letter-spacing:.2em;color:#d9ba7a}h1{font:40px/1.2 Georgia,serif;font-weight:400}p{color:#b1b6b3;font-size:14px}code{color:#ddc590} @media(max-width:850px){main{display:none}}
</style><main><small>SKYRIM MULTIPLAYER / YACA</small><h1>Eine Stimme für<br>deine Spielwelt.</h1><p>Lokale Vorschau des Ingame-Overlays. Reichweite, Kanäle und Lautstärke lassen sich hier ausprobieren. Diese Ansicht verwendet Beispieldaten.</p><p>Im Spiel öffnet <code>${sample.ui.toggleKey}</code> die Spracheinstellungen.</p></main><script src="/overlay.js"></script><script>window.SkyMpYaca.receive({owner:${JSON.stringify(preview).replace(/</g, '\\u003c')}});window.SkyMpYaca.toggle();</script></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/overlay.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(root, 'dist', 'ui', 'overlay.js')));
  }
  if (req.url !== '/' && req.url !== '/favicon.ico') { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
const port = process.env.YACA_PREVIEW_PORT ? Number(process.env.YACA_PREVIEW_PORT) : 4173;
server.listen(port, '127.0.0.1', () => console.log(`UI preview: http://127.0.0.1:${server.address().port} (demo data, no TeamSpeak connection)`));
