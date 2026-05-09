import { AuthDecision, HandshakeAuth } from '../../types/auth';

export type { AuthDecision, HandshakeAuth };

export type AuthValidator = (
  namespace: string,
  auth: HandshakeAuth
) => AuthDecision | Promise<AuthDecision>;

export interface SharedSecretMap {
  [room: string]: string;
}

export interface SharedSecretValidatorOptions {
  secrets: SharedSecretMap;
  allowedRooms?: string[];
  requireRoom?: boolean;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function uniqueRooms(rooms: Iterable<string>): string[] {
  return [...new Set([...rooms].map((room) => room.trim()).filter(Boolean))];
}

export function makeSharedSecretValidator (
  options: SharedSecretValidatorOptions
): AuthValidator {
  const requireRoom = options.requireRoom !== false;
  const normalizedSecrets = new Map<string, string>();

  for (const [room, secret] of Object.entries(options.secrets)) {
    const normalizedRoom = room.trim();
    if (!normalizedRoom) {
      continue;
    }

    normalizedSecrets.set(normalizedRoom, String(secret ?? '').trim());
  }

  const allowedRooms = uniqueRooms(options.allowedRooms ?? normalizedSecrets.keys());
  const allowedRoomsSet = new Set(allowedRooms);

  return async (_namespace: string, auth: HandshakeAuth): Promise<AuthDecision> => {
    const room = normalizeString(auth.room);
    const token = normalizeString(auth.token);
    const userId = normalizeString(auth.user);

    if (!token) {
      return { ok: false, reason: 'unauthorized' };
    }

    if (room) {
      if (!allowedRoomsSet.has(room)) {
        return { ok: false, reason: 'room not allowed' };
      }

      const expectedSecret = normalizedSecrets.get(room);
      if (!expectedSecret || expectedSecret !== token) {
        return { ok: false, reason: 'unauthorized' };
      }

      return {
        ok: true,
        userId,
        rooms: [room]
      };
    }

    if (requireRoom) {
      return { ok: false, reason: 'room required' };
    }

    const matchedRooms = allowedRooms.filter((allowedRoom) => {
      return normalizedSecrets.get(allowedRoom) === token;
    });

    if (matchedRooms.length === 0) {
      return { ok: false, reason: 'unauthorized' };
    }

    return {
      ok: true,
      userId,
      rooms: uniqueRooms(matchedRooms)
    };
  };
}
