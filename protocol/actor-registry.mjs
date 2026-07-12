/**
 * Per-peer RNFP + IACM actor registry (block-03 phase 2).
 */

import { createActor } from 'xstate';
import { rnfpMachine } from './rnfp-machine.mjs';
import { iacmMachine } from './iacm-machine.mjs';

/**
 * @typedef {{ rnfp: import('xstate').ActorRefFrom<typeof rnfpMachine>, iacm: import('xstate').ActorRefFrom<typeof iacmMachine> }} PeerActors
 */

export class ActorRegistry {
  constructor() {
    /** @type {Map<string, PeerActors>} */
    this.peers = new Map();
    /** @type {Map<string, () => void>} */
    this.unsubs = new Map();
  }

  /**
   * @param {string} peerId
   * @returns {PeerActors}
   */
  ensurePeer(peerId) {
    let entry = this.peers.get(peerId);
    if (entry) return entry;

    const rnfp = createActor(rnfpMachine);
    const iacm = createActor(iacmMachine);
    rnfp.start();
    iacm.start();

    let prevRnfp = 'idle';
    const unsub = rnfp.subscribe((snap) => {
      const value = typeof snap.value === 'string' ? snap.value : 'idle';
      if (value === 'active' && prevRnfp !== 'active') {
        iacm.send({ type: 'CHANNEL_OPENED' });
      } else if (prevRnfp === 'active' && value !== 'active') {
        iacm.send({ type: 'CHANNEL_CLOSED' });
      }
      prevRnfp = value;
    });

    entry = { rnfp, iacm };
    this.peers.set(peerId, entry);
    this.unsubs.set(peerId, () => unsub.unsubscribe());
    return entry;
  }

  /**
   * @param {string} peerId
   * @param {'rnfp' | 'iacm'} machine
   * @param {object} event
   */
  send(peerId, machine, event) {
    const { rnfp, iacm } = this.ensurePeer(peerId);
    if (machine === 'rnfp') rnfp.send(event);
    else iacm.send(event);
  }

  /**
   * @param {string} peerId
   */
  remove(peerId) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    this.unsubs.get(peerId)?.();
    entry.rnfp.stop();
    entry.iacm.stop();
    this.peers.delete(peerId);
    this.unsubs.delete(peerId);
  }

  /**
   * @param {string} peerId
   */
  get(peerId) {
    return this.peers.get(peerId);
  }

  peersList() {
    return [...this.peers.keys()];
  }

  stopAll() {
    for (const id of [...this.peers.keys()]) this.remove(id);
  }
}

export function createActorRegistry() {
  return new ActorRegistry();
}
