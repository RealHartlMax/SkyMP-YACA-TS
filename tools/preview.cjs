const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const { validateConfig } = require('../dist/configLoader');
const { connectionImage } = require('../dist/connectionImage');
const input = JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
input.yaca.uniqueServerId = 'preview-only';
const sample = validateConfig(input);
sample.ui.connectionOverlay.imageUrl = connectionImage(sample,root);
const preview = {
  bridgeId:'preview', preview:true, config:sample,
  state:{actorId:0xff000001,pluginState:'NOT_CONNECTED',clientId:null,rangeIndex:sample.voiceRanges.defaultIndex,rangeChangeAllowed:true},
};
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SkyMP Voice · UI-Vorschau</title><style>
html,body{margin:0;min-height:100%;font:15px/1.6 'Segoe UI',sans-serif;background:#141b22;color:#dcd8cc}body{min-height:100vh;background:radial-gradient(ellipse at 25% 80%,#344441 0,transparent 65%),linear-gradient(155deg,#343a41,#11171e)}main{padding:150px 6vw;max-width:570px}small{letter-spacing:.2em;color:#d9ba7a}h1{font:40px/1.2 Georgia,serif;font-weight:400}p{color:#b1b6b3;font-size:14px}code{color:#ddc590}.demo-controls{position:fixed;top:18px;left:18px;z-index:6600;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100vw - 36px)}button{font:12px 'Segoe UI',sans-serif;color:#ddd1b5;background:#1c2429;border:1px solid #74654a;padding:8px 10px;border-radius:3px;cursor:pointer} @media(max-width:850px){main{display:none}}
</style><main><small>SKYRIM MULTIPLAYER / YACA</small><h1>Eine Stimme für<br>deine Spielwelt.</h1><p>Lokale Vorschau mit Beispieldaten. Keine Verbindung zu TeamSpeak.</p><p><code>${sample.keyBinds.cycleVoiceRange}</code> ändert die Reichweite direkt. <code>${sample.ui.toggleKey}</code> öffnet die Einstellungen.</p><p>Die dauerhafte Reichweitenanzeige wird im Spiel von SkyMP UI Core gerendert und ist in dieser eigenständigen Vorschau nicht enthalten.</p></main><div class="demo-controls" aria-label="Vorschau steuern"><button data-state="NOT_CONNECTED">Nicht verbunden</button><button data-state="WRONG_TS_SERVER">Falscher Server</button><button data-state="IN_INGAME_CHANNEL">Verbunden</button><button id="settings">Einstellungen</button></div><script src="/overlay.js"></script><script>
var demo = ${JSON.stringify(preview).replace(/</g,'\\u003c')};
function show(){window.SkyMpYaca.receive({owner:demo});} show();
document.querySelectorAll('[data-state]').forEach(function(button){button.onclick=function(){demo.state.pluginState=button.dataset.state;demo.state.clientId=button.dataset.state==='IN_INGAME_CHANNEL'?11:null;show();};});
document.getElementById('settings').onclick=function(){window.SkyMpYaca.toggle();};
window.addEventListener('keydown',function(e){if(e.defaultPrevented||e.repeat)return;if(e.key===demo.config.ui.toggleKey){e.preventDefault();window.SkyMpYaca.toggle();}else if(e.key.toUpperCase()===demo.config.keyBinds.cycleVoiceRange){demo.state.rangeIndex=(demo.state.rangeIndex+1)%demo.config.voiceRanges.ranges.length;show();}});
</script></html>`;
const server = http.createServer((req,res)=>{
  if(req.url==='/overlay.js') {res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});return res.end(fs.readFileSync(path.join(root,'dist/ui/overlay.js')));}
  if(req.url==='/favicon.ico') {res.writeHead(204);return res.end();}
  if(req.url!=='/') {res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
});
const port = process.env.YACA_PREVIEW_PORT ? Number(process.env.YACA_PREVIEW_PORT) : 4173;
server.listen(port,'127.0.0.1',()=>console.log('UI preview: http://127.0.0.1:'+server.address().port+' (demo data, no TeamSpeak connection)'));
