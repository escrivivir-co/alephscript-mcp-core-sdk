export interface HandshakeAuth {
  token?: string;
  room?: string;
  user?: string;
  [key: string]: unknown;
}

export interface AuthDecision {
  ok: boolean;
  reason?: string;
  userId?: string;
  rooms?: string[];
}
