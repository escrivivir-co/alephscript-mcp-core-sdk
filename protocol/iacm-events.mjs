/** IACM event manifest — source for specs and dispatcher. */

export const IACM_EVENTS = {
  REQUEST: { intent: 'iacm.request', nextState: 'processing', responds: 'autoAck', work: true },
  URGENT: { intent: 'iacm.urgent', nextState: 'processing', responds: 'autoAck', work: true },
  QUESTION: { intent: 'iacm.question', nextState: 'processing', responds: 'autoAck', work: true },
  PROPOSAL: { intent: 'iacm.proposal', nextState: 'awaiting_confirmation', responds: 'autoAck', work: true },
  REPORT: { intent: 'iacm.report', nextState: 'idle', responds: 'autoAck', work: false },
  ANSWER: { intent: 'iacm.answer', nextState: 'idle', responds: 'autoAck', work: false },
  ACCEPT: { intent: 'iacm.accept', nextState: 'idle', responds: 'text', work: false },
  REJECT: { intent: 'iacm.reject', nextState: 'idle', responds: 'text', work: false },
  DEFER: { intent: 'iacm.defer', nextState: 'idle', responds: 'text', work: false },
  ACK: { intent: 'iacm.ack', nextState: null, responds: null, work: false },
  FYI: { intent: 'iacm.fyi', nextState: null, responds: null, work: false },
  CHANNEL_OPENED: { internal: true },
  CHANNEL_CLOSED: { internal: true },
  INBOUND: { internal: true, description: 'Structured inbound message' }
};

export const IACM_STATES = ['idle', 'processing', 'awaiting_confirmation'];
