import test from 'node:test';
import assert from 'node:assert/strict';
import { createActor } from 'xstate';
import { rnfpMachine, rnfpState } from '../protocol/rnfp-machine.mjs';
import { iacmMachine } from '../protocol/iacm-machine.mjs';
import { createActorRegistry } from '../protocol/actor-registry.mjs';

test('RNFP: ACCEPT without INVITE is ignored in idle', () => {
  const actor = createActor(rnfpMachine);
  actor.start();
  assert.equal(rnfpState(actor), 'idle');
  actor.send({ type: 'ACCEPT' });
  assert.equal(rnfpState(actor), 'idle');
});

test('RNFP: INVITE → ACCEPT → active', () => {
  const actor = createActor(rnfpMachine);
  actor.start();
  actor.send({ type: 'INVITE', peerId: 'peer-b' });
  assert.equal(rnfpState(actor), 'awaiting_accept');
  actor.send({ type: 'ACCEPT' });
  assert.equal(rnfpState(actor), 'active');
});

test('IACM: HORSE pre-channel is queued and flushed on CHANNEL_OPENED', async () => {
  const actor = createActor(iacmMachine);
  actor.start();
  actor.send({ type: 'INBOUND', intentType: 'REQUEST', payload: { n: 1 } });
  assert.equal(actor.getSnapshot().context.queue.length, 1);
  assert.equal(actor.getSnapshot().context.lastProcessed, null);

  actor.send({ type: 'CHANNEL_OPENED' });
  await new Promise((r) => setImmediate(r));
  const snap = actor.getSnapshot();
  assert.equal(snap.context.queue.length, 0);
  assert.equal(snap.context.channelOpen, true);
  assert.equal(snap.context.lastProcessed?.intentType, 'REQUEST');
});

test('registry forwards CHANNEL_OPENED from RNFP to IACM', () => {
  const registry = createActorRegistry();
  const { rnfp, iacm } = registry.ensurePeer('peer-x');
  iacm.send({ type: 'INBOUND', intentType: 'QUESTION', payload: { q: 'hi' } });
  assert.equal(iacm.getSnapshot().context.queue.length, 1);

  rnfp.send({ type: 'INVITE', peerId: 'peer-x' });
  rnfp.send({ type: 'ACCEPT' });
  assert.equal(iacm.getSnapshot().context.channelOpen, true);
  assert.equal(iacm.getSnapshot().context.queue.length, 0);
  registry.stopAll();
});
