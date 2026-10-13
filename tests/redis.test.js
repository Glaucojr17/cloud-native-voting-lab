const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encode, parse } = require('../src/redis');
const { choices } = require('../src/vote');
test('protocolo Redis suporta arrays, dados parciais e inteiros', () => {
  assert.equal(encode(['PING']), '*1\r\n$4\r\nPING\r\n');
  const data = Buffer.from('*2\r\n$13\r\nvotes:pending\r\n$3\r\naws\r\n');
  assert.equal(parse(data.subarray(0, 20)), null);
  assert.deepEqual(parse(data).value, ['votes:pending', 'aws']);
  assert.equal(parse(Buffer.from(':3\r\n')).value, 3);
  assert.deepEqual([...choices], ['aws', 'azure', 'gcp']);
});
