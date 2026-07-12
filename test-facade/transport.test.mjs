import test from 'node:test';
import assert from 'node:assert/strict';
import { createHorseTransport } from '../horse-transport/index.mjs';

test('HorseTransport queues pre-initialized messages (SM-A)', async () => {
  const sent = [];
  const listeners = [];
  const transport = createHorseTransport({
    sendHorse: (msg) => sent.push(msg),
    isChannelOpen: () => true,
    onHorse: (cb) => {
      listeners.push(cb);
      return () => {};
    }
  });

  await transport.start();
  transport.onmessage(() => {});

  await transport.send({ method: 'tools/list', id: 1 });
  assert.equal(sent.length, 0, 'should queue before initialized');

  for (const cb of listeners) {
    cb({ data: { jsonrpc: '2.0', method: 'notifications/initialized' } });
  }
  await transport.send({ method: 'initialize', id: 0 });
  assert.ok(sent.length >= 1, 'flush after initialized');
});

test('HorseTransport round-trip mock MCP message', async () => {
  const sent = [];
  let onMsg = null;
  const transport = createHorseTransport({
    sendHorse: (msg) => sent.push(msg),
    isChannelOpen: () => true,
    onHorse: (cb) => {
      onMsg = cb;
      return () => {};
    }
  });

  await transport.start();
  const received = [];
  transport.onmessage((m) => received.push(m));

  await transport.send({ jsonrpc: '2.0', method: 'initialize', id: 1, params: {} });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].method, 'initialize');

  onMsg({ data: { jsonrpc: '2.0', result: { capabilities: {} }, id: 1 } });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0].result, { capabilities: {} });
});
