import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

import { SocketIoMeshLogics, makeSharedSecretValidator } from '../dist/server/index.js';
import { SocketClient } from '../dist/client/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await predicate();
    if (result) {
      return result;
    }

    await delay(50);
  }

  throw new Error(`Timeout waiting for ${label}`);
}

async function main() {
  const mesh = new SocketIoMeshLogics();
  let validClient;
  let invalidClient;

  try {
    await mesh.init({
      port: 0,
      host: '127.0.0.1',
      exposeAdminUI: false,
      authValidator: makeSharedSecretValidator({
        secrets: {
          ROOMS_LAB: 'sek'
        }
      })
    });

    await once(mesh.server, 'listening');

    const address = mesh.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine smoke test port');
    }

    const port = address.port;
    const runtimeUrl = `http://127.0.0.1:${port}`;

    validClient = new SocketClient('valid-client', runtimeUrl, '/runtime', {
      auth: {
        token: 'sek',
        room: 'ROOMS_LAB',
        user: 'u1'
      },
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false
    });
    invalidClient = new SocketClient('invalid-client', runtimeUrl, '/runtime', {
      auth: {
        token: 'mal',
        room: 'ROOMS_LAB',
        user: 'u2'
      },
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false
    });

    validClient.io.connect();
    await once(validClient, 'connect');
    validClient.io.emit('CLIENT_REGISTER', { usuario: 'u1', sesion: 'smoke-valid' });
    validClient.io.emit('CLIENT_SUSCRIBE', { room: 'ROOMS_LAB', out: false });

    await waitFor(() => {
      const joinedSockets = mesh.socketServer.roomsSockets.get('ROOMS_LAB') || [];
      return joinedSockets.includes(validClient.io.id || '') ? joinedSockets : null;
    }, 5000, 'valid authenticated JOIN');

    invalidClient.io.connect();
    const [connectError] = await once(invalidClient, 'connect_error');
    assert(/unauthorized/i.test(connectError?.message || ''), 'Invalid client did not receive unauthorized connect_error');

    const response = await fetch(`${runtimeUrl}/healthz`);
    assert(response.status === 200, `Expected /healthz to return 200, got ${response.status}`);

    console.log('✅ smoke:auth passed');
  } finally {
    validClient?.io.close();
    invalidClient?.io.close();
    if (mesh.server?.listening) {
      await new Promise((resolve, reject) => {
        mesh.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(undefined);
        });
      });
    }
    mesh.socketServer.io.close();
  }
}

main().catch((error) => {
  console.error('❌ smoke:auth failed');
  console.error(error);
  process.exitCode = 1;
});
