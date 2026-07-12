/**
 * E4 — AsyncAPI + OpenAPI control-plane spec builders (DS2).
 */

import { RNFP_EVENTS, RNFP_STATES } from '../protocol/rnfp-events.mjs';
import { IACM_EVENTS, IACM_STATES } from '../protocol/iacm-events.mjs';

const CHANNEL_EVENTS = ['RABBIT', 'SPIDER', 'HORSE'];

export function buildRuntimeAsyncApi() {
  const rnfpIntents = Object.entries(RNFP_EVENTS)
    .filter(([, m]) => m.intent)
    .map(([k, m]) => ({ name: k, intent: m.intent }));
  const iacmIntents = Object.entries(IACM_EVENTS)
    .filter(([, m]) => m.intent)
    .map(([k, m]) => ({ name: k, intent: m.intent }));

  return `asyncapi: '3.0.0'
info:
  title: Zeus Scriptorium Runtime
  version: '1.0.0'
  description: |
    /runtime socket.io namespace — RABBIT/SPIDER/HORSE channels,
    RNFP handshake (SM-A), IACM queue pre-initialized (SM-A),
    MCP JSON-RPC envelope inside HORSE (SM-C).
defaultContentType: application/json
servers:
  scriptorium:
    host: localhost:3017
    pathname: /runtime
    protocol: socket.io
channels:
  runtime:
    address: /runtime
    messages:
${CHANNEL_EVENTS.map((e) => `      ${e}:
        name: ${e}
        payload:
          type: object
          properties:
            from: { type: string }
            to: { type: string }
            data: { type: object }`).join('\n')}
      ROOM_MESSAGE:
        name: ROOM_MESSAGE
        payload:
          type: object
          properties:
            event: { type: string }
            room: { type: string }
            data: { type: object }
      CLIENT_REGISTER:
        name: CLIENT_REGISTER
      CLIENT_SUSCRIBE:
        name: CLIENT_SUSCRIBE
components:
  schemas:
    RnfpStates:
      type: string
      enum: [${RNFP_STATES.map((s) => `'${s}'`).join(', ')}]
    IacmStates:
      type: string
      enum: [${IACM_STATES.map((s) => `'${s}'`).join(', ')}]
    RnfpIntents:
      type: array
      default: ${JSON.stringify(rnfpIntents)}
    IacmIntents:
      type: array
      default: ${JSON.stringify(iacmIntents)}
    McpHorseEnvelope:
      type: object
      description: JSON-RPC 2.0 inside HORSE ROOM_MESSAGE
      properties:
        jsonrpc: { type: string, const: '2.0' }
        method: { type: string }
        params: { type: object }
        id: { oneOf: [{ type: string }, { type: number }] }
`;
}

export function buildControlPlaneOpenApi() {
  return `openapi: 3.1.0
info:
  title: Zeus Runtime Control Plane
  version: '1.0.0'
  description: Bot lifecycle and actor-registry (E4 DS2)
paths:
  /bots:
    post:
      operationId: startBot
      summary: Start a role-config bot (rabbit|spider|horse)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [role, room]
              properties:
                role: { type: string, enum: [rabbit, spider, horse, ping, pong] }
                room: { type: string }
                peer: { type: string }
      responses:
        '200':
          description: Bot started
  /actor-registry:
    get:
      operationId: listActorRegistry
      summary: List per-peer RNFP/IACM actor states
      responses:
        '200':
          description: Registry snapshot
          content:
            application/json:
              schema:
                type: object
                properties:
                  peers:
                    type: array
                    items:
                      type: object
                      properties:
                        peerId: { type: string }
                        rnfp: { type: string }
                        iacm: { type: string }
  /actor-registry/{peerId}:
    get:
      operationId: getActorPeer
      summary: Get actor state for one peer
      parameters:
        - name: peerId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Peer actor state
  /peers:
    get:
      operationId: listPeers
      summary: Rabbit-discovered peers in room
      responses:
        '200':
          description: Peer list
`;
}

export function buildAllSpecs() {
  return {
    asyncapi: buildRuntimeAsyncApi(),
    openapi: buildControlPlaneOpenApi()
  };
}
