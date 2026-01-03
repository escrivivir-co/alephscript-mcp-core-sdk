/**
 * Prolog Types - Shared types for PrologEditor ecosystem
 * 
 * These types are shared between:
 * - MCPGallery/mcp-mesh-sdk/src/MCPPrologServer.ts (MCP Server)
 * - PrologEditor/backend (REST API Gateway)
 * - PrologEditor/frontend (Angular UI)
 * 
 * Note: PrologSession is the DTO (serializable) version.
 * The runtime version with `engine: PrologEngine` lives in mcp-mesh-sdk.
 * 
 * @module @alephscript/mcp-core-sdk/types/prolog
 */

// ============================================
// Session Types
// ============================================

/**
 * Prolog session DTO - serializable for API transport
 * Does NOT include engine (that's runtime-only in mcp-mesh-sdk)
 */
export interface PrologSession {
  sessionId: string;
  obraId: string;
  createdAt: string; // ISO date string
  lastUsedAt: string; // ISO date string
}

/**
 * Alias for explicit naming
 */
export type PrologSessionDTO = PrologSession;

/**
 * Request to create a new Prolog session
 */
export interface CreateSessionRequest {
  sessionId: string;
  obraId: string;
}

/**
 * Response from session creation
 */
export interface CreateSessionResponse {
  success: boolean;
  sessionId?: string;
  obraId?: string;
  createdAt?: string;
  message?: string;
  error?: string;
}

/**
 * Alias for backwards compatibility
 * @deprecated Use CreateSessionResponse instead
 */
export type SessionResponse = CreateSessionResponse;

/**
 * Response from listing sessions
 */
export interface ListSessionsResponse {
  success: boolean;
  count: number;
  sessions: PrologSession[];
  error?: string;
}

// ============================================
// Query Types
// ============================================

/**
 * Request to execute a Prolog query
 */
export interface QueryRequest {
  text: string; // Prolog goal to execute
  sessionId?: string; // Optional session context (for MCP)
}

/**
 * Response from query execution
 */
export interface QueryResponse {
  success: boolean;
  status: number;
  payload: QueryResult[];
  query?: string;
  count?: number;
  error?: string;
}

/**
 * Single query result (variable bindings or value)
 */
export interface QueryResult {
  [key: string]: string | number | boolean | QueryResult[] | QueryResult;
}

// ============================================
// Rule Types
// ============================================

/**
 * Prolog rule stored in database
 */
export interface Rule {
  id?: number;
  name: string;
  content: string;
  app?: string;
  predicate?: string;
  arity?: string;
  example?: string;
  evalCompatible?: string;
}

/**
 * Request to create/update a rule
 */
export interface RuleInput {
  name: string;
  content: string;
  app?: string;
  predicate?: string;
  arity?: string;
  example?: string;
  evalCompatible?: string;
}

/**
 * Response from rule creation
 */
export interface RuleCreatedResponse {
  id: number;
  text: string;
}

// ============================================
// Template Types
// ============================================

/**
 * SDK template metadata
 */
export interface Template {
  name: string;
  description?: string;
  main?: string;
  files?: string[];
  exports?: string[];
}

/**
 * Template content response
 */
export interface TemplateContentResponse {
  content: string;
}

/**
 * Request to save user application
 */
export interface UserAppInput {
  appName: string;
  content: string;
}

// ============================================
// Fact Assertion Types
// ============================================

/**
 * Request to assert a fact
 */
export interface AssertFactRequest {
  sessionId?: string; // Optional - uses active session if not provided
  fact: string;
}

/**
 * Response from fact assertion
 */
export interface AssertFactResponse {
  success: boolean;
  fact?: string;
  message?: string;
  error?: string;
}

// ============================================
// Consult File Types
// ============================================

/**
 * Request to consult a Prolog file
 */
export interface ConsultFileRequest {
  sessionId: string;
  filePath: string;
}

/**
 * Response from file consultation
 */
export interface ConsultFileResponse {
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}

// ============================================
// Telemetry Types (IoT integration)
// ============================================

/**
 * Telemetry data point
 */
export interface Telemetry {
  sensor: string;
  value: number | string;
}

/**
 * Request to process telemetry
 */
export interface TelemetryInput {
  telemetry: Telemetry;
}

/**
 * Response from telemetry processing
 */
export interface TelemetryResult {
  status: string;
  alerts?: Record<string, unknown>[];
}

/**
 * Telemetry status for a sensor
 */
export interface TelemetryStatus {
  sensor: string;
  value: string | number;
}

// ============================================
// MCP Prolog Server Types
// ============================================

/**
 * Templates catalog response
 */
export interface TemplatesCatalog {
  templates: {
    id: string;
    description: string;
    path: string;
  }[];
  message?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Error Types
// ============================================

/**
 * API Error response
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Prolog-specific error types
 */
export enum PrologErrorType {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXISTS = 'SESSION_EXISTS',
  QUERY_FAILED = 'QUERY_FAILED',
  UNKNOWN_PROCEDURE = 'UNKNOWN_PROCEDURE',
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ENGINE_ERROR = 'ENGINE_ERROR',
  MCP_CONNECTION_ERROR = 'MCP_CONNECTION_ERROR',
}

// ============================================
// IoT/MQTT Types (AsyncAPI aligned)
// ============================================

/**
 * Sensor data reading (MQTT)
 * Used for real-time IoT telemetry via MQTT/WebSocket
 */
export interface SensorData {
  sensor: string;
  value: number | string | boolean;
  unit?: string;
  timestamp?: string; // ISO date string
  metadata?: Record<string, unknown>;
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert generated by Prolog rule evaluation
 */
export interface AlertData {
  alertId: string;
  type: string;
  message: string;
  sensor?: string;
  value?: number | string;
  threshold?: number;
  severity: AlertSeverity;
  timestamp?: string; // ISO date string
}

/**
 * Device command data
 */
export interface CommandData {
  commandId: string;
  action: string;
  device: string;
  parameters?: Record<string, unknown>;
  timestamp?: string; // ISO date string
}
