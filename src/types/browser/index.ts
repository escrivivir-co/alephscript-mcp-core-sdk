/**
 * Browser/Client Types for AlephScript ecosystem
 * 
 * Types for browser-based clients (Angular, React, vanilla JS):
 * - Connection management
 * - Event handling
 * - Gaming/Agent interactions
 * 
 * @module @alephscript/mcp-core-sdk/types/browser
 * @since 1.3.0
 */

// ============================================
// Connection Types
// ============================================

/**
 * Connection status for WebSocket clients
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'offline';

/**
 * Client configuration options
 */
export interface AlephClientConfig {
  name?: string;
  url?: string;
  namespace?: string;
  autoConnect?: boolean;
  debug?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  timeout?: number;
  uiType?: string;
  uiId?: string;
}

// ============================================
// Message Types
// ============================================

/**
 * Generic message structure for AlephScript communication
 */
export interface AlephMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  source?: string;
  target?: string;
}

/**
 * Room-scoped message
 */
export interface RoomMessage {
  event: string;
  room: string;
  data: any;
}

// ============================================
// Event Handler Types
// ============================================

/**
 * Generic event handler
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Error handler callback
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Connection status change handler
 */
export type ConnectionHandler = (status: ConnectionStatus) => void;

// ============================================
// Event Map (type-safe event names)
// ============================================

/**
 * Strongly-typed event map for AlephScript clients
 */
export interface EventMap {
  // Connection events
  'connected': { roomName?: string };
  'disconnected': {};
  'connection_error': { error: string };
  'reconnecting': { attempt: number };
  'heartbeat': { timestamp: number };

  // Message events
  'message': AlephMessage;
  'ui_message': any;
  'agent_message': any;
  'system_message': any;
  'notification': any;
  'error_message': any;

  // Game/Agent events
  'agent_postulations': any;
  'agent_selection_result': any;
  'game_state_update': any;
  'phase_change': any;

  // System events
  'room_joined': { room: string };
  'room_left': { room: string };
}

/**
 * Union type of all event names
 */
export type EventName = keyof EventMap;

// ============================================
// Gaming Types
// ============================================

/**
 * Action performed in a game context
 */
export interface GameAction {
  action: string;
  payload: any;
  timestamp: number;
  room: string;
}

/**
 * Agent selection during gameplay
 */
export interface AgentSelection {
  agentIndex: number;
  reasoning?: string;
  timestamp: number;
  room: string;
}

// ============================================
// Utility Types
// ============================================

/**
 * Hash generation options
 */
export interface HashOptions {
  key?: string;
  length?: number;
}
