/**
 * Browser-safe exports for @alephscript/mcp-core-sdk
 * 
 * This subpath exports ONLY types and isomorphic utilities.
 * It does NOT export server/client modules that depend on Node.js.
 * 
 * Usage in Angular/browser:
 * ```typescript
 * import type { PrologSession, QueryResponse } from '@alephscript/mcp-core-sdk/browser';
 * // or
 * import { Message, isLogable } from '@alephscript/mcp-core-sdk/browser';
 * ```
 * 
 * @module @alephscript/mcp-core-sdk/browser
 * @since 1.2.0
 */

// ============================================
// Types - All type exports (no runtime)
// ============================================

// Prolog types
export type {
  PrologSession,
  PrologSessionDTO,
  CreateSessionRequest,
  CreateSessionResponse,
  SessionResponse,
  ListSessionsResponse,
  QueryRequest,
  QueryResponse,
  QueryResult,
  Rule,
  RuleInput,
  RuleCreatedResponse,
  Template,
  TemplateContentResponse,
  UserAppInput,
  AssertFactRequest,
  AssertFactResponse,
  ConsultFileRequest,
  ConsultFileResponse,
  Telemetry,
  TelemetryInput,
  TelemetryResult,
  TelemetryStatus,
  TemplatesCatalog,
  ApiResponse,
  ApiError,
} from '../types/prolog';

export { PrologErrorType } from '../types/prolog';

// MCP types
export type {
  MCPEvent,
  MCPLogger,
  MCPServerCapabilities,
  MCPServerFeatures,
  BaseMCPServerConfig,
} from '../types/mcp';

export { MCPEventType, createDefaultLogger } from '../types/mcp';

// Socket/Room types (interfaces only, no runtime)
export type {
  ISocketDetails,
} from '../types/ISocketDetails';

export type {
  IUserDetails,
} from '../types/IUserDetails';

export type {
  NamespaceDetails,
} from '../types/NamespaceDetails';

export type {
  RoomDetails,
} from '../types/RoomDetails';

export type {
  SuscriptionDetails,
} from '../types/SuscriptionDetails';

export type {
  ArgsMeta,
} from '../types/ArgsMeta';

export type {
  IRoomDetails,
} from '../types/IRoomDetails';

export type {
  INamespaceDetails,
} from '../types/INamespaceDetails';

export type {
  IServerState,
} from '../types/IServerState';

// Browser/Client types
export type {
  ConnectionStatus,
  AlephClientConfig,
  AlephMessage,
  RoomMessage,
  EventHandler,
  ErrorHandler,
  ConnectionHandler,
  EventMap,
  EventName,
  GameAction,
  AgentSelection,
  HashOptions,
} from '../types/browser';

// ============================================
// Isomorphic Utilities - Safe for browser
// ============================================

export { Message, isLogable } from '../utils/message';
