/** RNFP event manifest — source for specs and dispatcher. */

export const RNFP_EVENTS = {
  INVITE: { intent: 'rnfp.invite', description: 'Open federation channel toward peer' },
  ACCEPT: { intent: 'rnfp.accept', description: 'Accept pending invite' },
  REJECT: { intent: 'rnfp.reject', description: 'Reject invite' },
  REVOKE: { intent: 'rnfp.revoke', description: 'Revoke active channel' },
  ANNOUNCE: { intent: 'rnfp.announce', description: 'Announce presence on channel' },
  REQUEST: { intent: 'rnfp.request', description: 'RNFP request' },
  PKG: { intent: 'rnfp.pkg', description: 'RNFP package' },
  CHANNEL_OPENED: { internal: true, description: 'Internal: channel became active' },
  CHANNEL_CLOSED: { internal: true, description: 'Internal: channel closed' }
};

export const RNFP_STATES = ['idle', 'awaiting_accept', 'active'];
