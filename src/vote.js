const http = require('node:http');
const { command } = require('./redis');
const choices = new Set(['aws', 'azure', 'gcp']);
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Votação Cloud</title><style>body{font:18px system-ui;max-width:600px;margin:6vh auto;padding:20px;color:#16304c}button{padding:14px;margin:8px;background:#126f93;color:white;border:0;border-radius:8px;cursor:pointer}</style><h1>Qual nuvem você quer estudar?</h1><p>Escolha uma opção. Os votos entram em uma fila e são contabilizados por um worker.</p><div id="buttons"></div><p id="message"></p><a href="/results">Ver resultados</a><script>for(const x of ['aws','azure','gcp']){const b=document.createElement('button');b.textContent=x.toUpperCase();b.onclick=async()=>{const r=await fetch('/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({choice:x})});document.getElementById('message').textContent=r.ok?'Voto recebido; a contagem pode levar alguns segundos.':'Não foi possível registrar o voto.'};document.getElementById('buttons').append(b)}</script></html>`;

function handler(redis = command) {
  return async (req, res) => {
    const send = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/health/live') return send(200, { status: 'ok' });
    if (req.method === 'GET' && req.url === '/health/ready') {
      try { await redis(['PING']); return send(200, { status: 'ready' }); } catch { return send(503, { status: 'unavailable' }); }
    }
    if (req.method === 'GET' && req.url === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html); }
    if (req.method === 'GET' && req.url === '/results') { res.statusCode = 302; res.setHeader('location', process.env.RESULTS_URL || 'http://localhost:3001/results'); return res.end(); }
    if (req.method !== 'POST' || req.url !== '/vote') return send(404, { error: 'Rota não encontrada' });
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 1024) return send(413, { error: 'Corpo muito grande' }); }
      const choice = JSON.parse(raw).choice;
      if (!choices.has(choice)) return send(400, { error: 'Opção inválida' });
      await redis(['LPUSH', 'votes:pending', choice]);
      return send(202, { status: 'queued' });
    } catch (err) { return send(err instanceof SyntaxError ? 400 : 503, { error: err instanceof SyntaxError ? 'JSON inválido' : 'Fila indisponível' }); }
  };
}
if (require.main === module) http.createServer(handler()).listen(3000, '0.0.0.0');
module.exports = { handler, choices };
