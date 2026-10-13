const net = require('node:net');

function encode(parts) {
  return `*${parts.length}\r\n` + parts.map(p => { const s = String(p); return `$${Buffer.byteLength(s)}\r\n${s}\r\n`; }).join('');
}

function parse(buffer, offset = 0) {
  const end = buffer.indexOf('\r\n', offset);
  if (end < 0) return null;
  const first = buffer.toString('utf8', offset + 1, end);
  const type = String.fromCharCode(buffer[offset]);
  if (type === '+' || type === '-' || type === ':') return { value: type === ':' ? Number(first) : first, next: end + 2, error: type === '-' };
  const size = Number(first);
  if (!Number.isInteger(size)) throw new Error('Resposta Redis inválida');
  if (size === -1) return { value: null, next: end + 2 };
  if (type === '$') {
    if (buffer.length < end + 2 + size + 2) return null;
    return { value: buffer.toString('utf8', end + 2, end + 2 + size), next: end + 2 + size + 2 };
  }
  if (type === '*') {
    const values = []; let next = end + 2;
    for (let i = 0; i < size; i++) {
      const item = parse(buffer, next);
      if (!item) return null;
      values.push(item.value); next = item.next;
    }
    return { value: values, next };
  }
  throw new Error('Tipo Redis não suportado');
}

function command(parts, timeout = 4000) {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = Number(process.env.REDIS_PORT || 6379);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let data = Buffer.alloc(0); let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true; socket.destroy(); err ? reject(err) : resolve(value);
    };
    socket.setTimeout(timeout, () => finish(new Error('Redis timeout')));
    socket.on('error', finish);
    socket.on('connect', () => socket.write(encode(parts)));
    socket.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
      try {
        const answer = parse(data);
        if (answer) finish(answer.error ? new Error(answer.value) : null, answer.value);
      } catch (err) { finish(err); }
    });
    socket.on('end', () => { if (!settled) finish(new Error('Redis fechou a conexão')); });
  });
}
module.exports = { encode, parse, command };
