const http = require('node:http');
const { command } = require('./redis');
function handler(redis = command) {
  return async (req, res) => {
    const send = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/health/live') return send(200, { status: 'ok' });
    if (req.method === 'GET' && req.url === '/health/ready') {
      try { await redis(['PING']); return send(200, { status: 'ready' }); } catch { return send(503, { status: 'unavailable' }); }
    }
    if (req.method !== 'GET' || req.url !== '/results') return send(404, { error: 'Rota não encontrada' });
    try {
      const entries = await redis(['HGETALL', 'votes:totals']);
      const totals = { aws: 0, azure: 0, gcp: 0 };
      for (let i = 0; i < entries.length; i += 2) if (Object.hasOwn(totals, entries[i])) totals[entries[i]] = Number(entries[i + 1]);
      return send(200, totals);
    } catch { return send(503, { error: 'Contagem indisponível' }); }
  };
}
if (require.main === module) http.createServer(handler()).listen(3001, '0.0.0.0');
module.exports = { handler };
