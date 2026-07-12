/**
 * E3 — MCP Transport over HORSE channel (JSON-RPC in ROOM_MESSAGE).
 */

const JSONRPC = '2.0';

/**
 * @typedef {object} HorseTransportOptions
 * @property {(msg: object) => void} sendHorse — emit HORSE ROOM_MESSAGE to peer
 * @property {() => boolean} [isChannelOpen]
 * @property {(cb: (msg: object) => void) => () => void} onHorse
 */

/**
 * Implements MCP SDK Transport interface over HORSE.
 */
export class HorseTransport {
  /**
   * @param {HorseTransportOptions} options
   */
  constructor(options) {
    this.sendHorse = options.sendHorse;
    this.isChannelOpen = options.isChannelOpen ?? (() => true);
    this.onHorse = options.onHorse;
    this._onmessage = null;
    this._queue = [];
    this._initialized = false;
    this._unsub = null;
  }

  async start() {
    this._unsub = this.onHorse((raw) => {
      const msg = raw?.data ?? raw;
      if (!msg?.jsonrpc) return;
      if (msg.method === 'notifications/initialized') {
        this._markInitialized();
      }
      this._onmessage?.(msg);
    });
  }

  async send(message) {
    if (message.method === 'initialize') {
      this._pendingInit = true;
    }
    if (!this.isChannelOpen() || (!this._initialized && message.method !== 'initialize')) {
      this._queue.push(message);
      return;
    }
    this.sendHorse({ jsonrpc: JSONRPC, ...message });
  }

  _markInitialized() {
    this._initialized = true;
    this._flush();
  }

  _flush() {
    while (this._queue.length > 0 && this.isChannelOpen()) {
      const msg = this._queue.shift();
      this.sendHorse({ jsonrpc: JSONRPC, ...msg });
    }
  }

  onmessage(handler) {
    this._onmessage = handler;
  }

  async close() {
    this._unsub?.();
    this._onmessage = null;
    this._queue = [];
  }
}

export function createHorseTransport(options) {
  return new HorseTransport(options);
}
