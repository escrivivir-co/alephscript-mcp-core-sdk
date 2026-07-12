/**
 * E5 — Native r/s/h facade over rooms + protocol machines + horse transport.
 */

import { createActorRegistry } from '../protocol/actor-registry.mjs';
import { toEvent } from '../protocol/dispatcher.mjs';
import { rnfpState } from '../protocol/rnfp-machine.mjs';
import { createHorseTransport } from '../horse-transport/index.mjs';

/**
 * @param {object} deps
 * @param {import('@alephscript/mcp-core-sdk/client').SocketClient} deps.client
 * @param {string} deps.room
 * @param {string} deps.selfId
 */
export function createChannelsFacade(deps) {
  const { client, room, selfId } = deps;
  const registry = createActorRegistry();
  const peers = new Set();
  const openHandlers = new Set();
  const closeHandlers = new Set();
  /** @type {Map<string, ReturnType<typeof createHorseTransport>>} */
  const transports = new Map();
  /** @type {{ tools: object[], resources: object[], prompts: object[], templates: object[] }} */
  let offer = { tools: [], resources: [], prompts: [], templates: [] };
  let msgId = 0;

  const sendChannel = (event, data, to) => {
    client.room(event, { ...data, from: selfId, to }, room);
  };

  const onChannel = (event, handler) => {
    const wrapped = (payload) => {
      if (payload?.to && payload.to !== selfId) return;
      handler(payload);
    };
    client.io.on(event, wrapped);
    return () => client.io.off(event, wrapped);
  };

  onChannel('RABBIT', (p) => {
    const from = p?.from;
    if (!from || from === selfId) return;
    peers.add(from);
    registry.ensurePeer(from);
  });

  onChannel('SPIDER', (p) => {
    const mapped = toEvent({ intent: p?.intent ?? 'rnfp.invite', peerId: p?.from, payload: p });
    if (!mapped) return;
    registry.send(mapped.peerId, mapped.machine, mapped.event);
    const state = rnfpState(registry.get(mapped.peerId).rnfp);
    if (state === 'active') {
      for (const h of openHandlers) h(mapped.peerId);
    }
  });

  const horse = {
    offer(capabilities) {
      if (capabilities?.from) {
        offer = { ...offer, ...capabilities.from };
      } else {
        offer = {
          tools: capabilities.tools ?? offer.tools,
          resources: capabilities.resources ?? offer.resources,
          prompts: capabilities.prompts ?? offer.prompts,
          templates: capabilities.templates ?? offer.templates
        };
      }
      sendChannel('HORSE', { method: 'offer', params: offer }, '*');
      return offer;
    },

    to(peerId) {
      if (!transports.has(peerId)) {
        const t = createHorseTransport({
          sendHorse: (msg) => sendChannel('HORSE', msg, peerId),
          isChannelOpen: () => rnfpState(registry.ensurePeer(peerId).rnfp) === 'active',
          onHorse: (cb) => onChannel('HORSE', (p) => {
            if (p?.from === peerId) cb(p);
          })
        });
        transports.set(peerId, t);
        t.start();
      }
      const transport = transports.get(peerId);

      const rpc = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++msgId;
        const timer = setTimeout(() => reject(new Error(`MCP timeout: ${method}`)), 5000);
        const off = onChannel('HORSE', (p) => {
          if (p?.from !== peerId) return;
          const msg = p?.data ?? p;
          if (msg?.id !== id) return;
          clearTimeout(timer);
          off();
          if (msg.error) reject(new Error(msg.error.message ?? 'MCP error'));
          else resolve(msg.result);
        });
        transport.send({ jsonrpc: '2.0', method, params, id });
      });

      return {
        listTools: () => rpc('tools/list'),
        callTool: (name, args) => rpc('tools/call', { name, arguments: args }),
        readResource: (uri) => rpc('resources/read', { uri }),
        getPrompt: (name, args) => rpc('prompts/get', { name, arguments: args })
      };
    }
  };

  const rabbit = {
    peers: () => [...peers],
    beacon: (data = {}) => sendChannel('RABBIT', data, '*')
  };

  const spider = {
    open: (peerId) => {
      registry.ensurePeer(peerId);
      sendChannel('SPIDER', { intent: 'rnfp.invite', peerId }, peerId);
      registry.send(peerId, 'rnfp', { type: 'INVITE', peerId });
    },
    onOpen: (cb) => {
      openHandlers.add(cb);
      return () => openHandlers.delete(cb);
    },
    onClose: (cb) => {
      closeHandlers.add(cb);
      return () => closeHandlers.delete(cb);
    }
  };

  return { rabbit, spider, horse, registry, getOffer: () => offer };
}

export { createChannelsFacade as createFacade };
