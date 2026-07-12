import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createChannelsFacade } from '../channels/index.mjs';

function mockClient() {
  const io = new EventEmitter();
  io.id = 'self';
  return {
    io,
    room: (event, data, room) => io.emit(event, { ...data, room })
  };
}

test('facade: 5 roles in room mock — rabbit peers + spider handshake', () => {
  const client = mockClient();
  const facade = createChannelsFacade({ client, room: 'runtime.test', selfId: 'horse-a' });

  client.io.emit('RABBIT', { from: 'rabbit-b', to: 'horse-a' });
  client.io.emit('RABBIT', { from: 'spider-c', to: 'horse-a' });
  assert.deepEqual(facade.rabbit.peers().sort(), ['rabbit-b', 'spider-c']);

  facade.spider.open('rabbit-b');
  const { rnfp } = facade.registry.get('rabbit-b');
  rnfp.send({ type: 'ACCEPT' });
  assert.equal(rnfp.getSnapshot().value, 'active');
});
