/**
 * RNFP state machine per peer (block-03 phase 2).
 * Structural guard: idle has no ACCEPT transition.
 */

import { setup, assign } from 'xstate';

export const rnfpMachine = setup({
  types: {
    context: {},
    events: {}
  },
  actions: {
    setActivePeer: assign({
      activePeer: ({ event }) => event.peerId ?? null
    }),
    clearActivePeer: assign({ activePeer: () => null })
  }
}).createMachine({
  id: 'rnfp',
  initial: 'idle',
  context: {
    activePeer: null
  },
  states: {
    idle: {
      on: {
        INVITE: { target: 'awaiting_accept', actions: 'setActivePeer' },
        REJECT: { target: 'idle', actions: 'clearActivePeer' },
        REVOKE: { target: 'idle', actions: 'clearActivePeer' },
        ANNOUNCE: {},
        REQUEST: {},
        PKG: {}
      }
    },
    awaiting_accept: {
      on: {
        ACCEPT: { target: 'active' },
        REJECT: { target: 'idle', actions: 'clearActivePeer' },
        REVOKE: { target: 'idle', actions: 'clearActivePeer' },
        INVITE: { target: 'awaiting_accept', actions: 'setActivePeer' },
        ANNOUNCE: {},
        REQUEST: {},
        PKG: {}
      }
    },
    active: {
      on: {
        REJECT: { target: 'idle', actions: 'clearActivePeer' },
        REVOKE: { target: 'idle', actions: 'clearActivePeer' },
        ANNOUNCE: {},
        REQUEST: {},
        PKG: {}
      }
    }
  }
});

/**
 * @param {import('xstate').AnyActorRef} actor
 * @returns {'idle' | 'awaiting_accept' | 'active'}
 */
export function rnfpState(actor) {
  const snap = actor.getSnapshot();
  if (typeof snap.value === 'string') return snap.value;
  return 'idle';
}
