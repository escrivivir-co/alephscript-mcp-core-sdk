/**
 * IACM state machine per peer with pre-channel queue (SM-A / block-03).
 */

import { setup, assign, enqueueActions } from 'xstate';
import { IACM_EVENTS } from './iacm-events.mjs';

const WORK_INTENTS = new Set(['REQUEST', 'URGENT', 'QUESTION', 'PROPOSAL']);

export const iacmMachine = setup({
  types: {
    context: {},
    events: {}
  },
  actions: {
    enqueue: assign({
      queue: ({ context, event }) => [...context.queue, event]
    }),
    captureForFlush: assign({
      pendingFlush: ({ context }) => [...context.queue],
      queue: () => []
    }),
    flushPending: ({ context, self }) => {
      for (const msg of context.pendingFlush) {
        self.send({ type: 'INBOUND', intentType: msg.intentType, payload: msg.payload });
      }
    },
    clearPending: assign({ pendingFlush: () => [] }),
    setChannelOpen: assign({ channelOpen: () => true }),
    setChannelClosed: assign({ channelOpen: () => false }),
    applyIntent: assign({
      flowState: ({ context, event }) => {
        const meta = IACM_EVENTS[event.intentType];
        return meta?.nextState ?? context.flowState;
      },
      lastProcessed: ({ event }) => event
    })
  },
  guards: {
    channelOpen: ({ context }) => context.channelOpen,
    channelClosed: ({ context }) => !context.channelOpen,
    isWorkIntent: ({ event }) => WORK_INTENTS.has(event.intentType)
  }
}).createMachine({
  id: 'iacm',
  initial: 'idle',
  context: {
    flowState: 'idle',
    channelOpen: false,
    queue: [],
    pendingFlush: [],
    lastProcessed: null
  },
  on: {
    CHANNEL_OPENED: {
      actions: ['setChannelOpen', 'captureForFlush', 'flushPending', 'clearPending']
    },
    CHANNEL_CLOSED: {
      actions: 'setChannelClosed'
    }
  },
  states: {
    idle: {
      on: {
        INBOUND: [
          { guard: 'channelClosed', actions: 'enqueue' },
          { guard: 'isWorkIntent', target: 'processing', actions: 'applyIntent' },
          { guard: 'channelOpen', actions: 'applyIntent' }
        ]
      }
    },
    processing: {
      on: {
        INBOUND: [
          { guard: 'channelClosed', actions: 'enqueue' },
          { guard: 'channelOpen', target: 'idle', actions: 'applyIntent' }
        ]
      }
    },
    awaiting_confirmation: {
      on: {
        INBOUND: [
          { guard: 'channelClosed', actions: 'enqueue' },
          { guard: 'channelOpen', target: 'idle', actions: 'applyIntent' }
        ]
      }
    }
  }
});
