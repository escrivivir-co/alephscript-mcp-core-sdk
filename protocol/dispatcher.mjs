/**
 * Maps IntentResult.intent strings to XState events.
 */

import { RNFP_EVENTS } from './rnfp-events.mjs';
import { IACM_EVENTS } from './iacm-events.mjs';

const INTENT_MAP = new Map();

for (const [type, meta] of Object.entries(RNFP_EVENTS)) {
  if (meta.intent) INTENT_MAP.set(meta.intent, { machine: 'rnfp', type });
}
for (const [type, meta] of Object.entries(IACM_EVENTS)) {
  if (meta.intent) INTENT_MAP.set(meta.intent, { machine: 'iacm', type });
}

/**
 * @param {{ intent: string, peerId?: string, payload?: unknown }} raw
 * @returns {{ peerId: string, machine: 'rnfp' | 'iacm', event: object } | null}
 */
export function toEvent(raw) {
  const mapping = INTENT_MAP.get(raw.intent);
  if (!mapping) return null;
  const peerId = raw.peerId ?? raw.from ?? 'unknown';
  return {
    peerId,
    machine: mapping.machine,
    event: { type: mapping.type, peerId, payload: raw.payload, intentType: mapping.type }
  };
}

/**
 * @param {string} intent
 * @param {object} [payload]
 */
export function intentToEvent(intent, payload = {}) {
  return toEvent({ intent, ...payload });
}

export { INTENT_MAP };
